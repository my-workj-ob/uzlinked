"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  FiHeart, FiMessageSquare, FiSend, FiTrash2, FiEdit3, FiCopy,
  FiAlertTriangle, FiUser, FiCornerDownLeft, FiMapPin, FiExternalLink,
  FiCheckCircle, FiDollarSign, FiChevronsRight, FiBookmark, FiClock
} from 'react-icons/fi'
import { Loader2 } from 'lucide-react'
import { useLikeToggle } from '@/hooks/use-queries'
import { FaHeart, FaBookmark } from 'react-icons/fa'
import { HiEllipsisHorizontal, HiXMark } from 'react-icons/hi2'
import { BottomSheet, BottomSheetRef } from '@/components/bottom-sheet'
import { motion } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'

export interface CommentType {
  id: string | number
  user: string
  avatar: string
  text: string
  createdAt: string
  userId: string
  parentId?: string | number | null
  likesCount?: number
  likedByMe?: boolean
}

export interface PostType {
  id: string | number
  authorId: string
  author: string
  avatar: string
  time: string
  location: string
  image: string | null
  content: string
  likes: string | number
  isOwner: boolean
  likedByMe?: boolean
  commentsCount?: number
  authorIsPremium?: boolean
  // Vaqtinchalik (efemer) post maydonlari
  expiresAt?: string | null
  savesCount?: number
  savedByMe?: boolean
  // Ko'p media (rasm/video) galereyasi — tartiblangan
  media?: { url: string; type: 'image' | 'video'; duration?: number | null }[]
}

// Vaqtinchalik post countdown — o'chishigacha qolgan vaqt
function KapsulaCountdown({ expiresAt, saved, className = '' }: { expiresAt: string; saved: boolean; className?: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  if (saved) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 ${className}`}>
        <FaBookmark className="w-2.5 h-2.5" /> Saqlangan
      </span>
    )
  }

  const msLeft = new Date(expiresAt).getTime() - now
  if (msLeft <= 0) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-slate-500/15 text-slate-500 dark:text-slate-400 text-[10px] font-extrabold px-2 py-0.5 ${className}`}>
        <FiClock className="w-2.5 h-2.5" /> Vaqti tugadi
      </span>
    )
  }

  const hours = Math.floor(msLeft / 3600000)
  const mins = Math.floor((msLeft % 3600000) / 60000)
  const label = hours >= 1 ? `${hours} soat qoldi` : `${mins} daqiqa qoldi`
  const urgent = msLeft < 6 * 3600000
  return (
    <span
      title="Vaqtinchalik post — saqlamasangiz o'chib ketadi"
      className={`inline-flex items-center gap-1 rounded-full text-[10px] font-extrabold px-2 py-0.5 ${urgent
        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 animate-pulse'
        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'} ${className}`}
    >
      <FiClock className="w-2.5 h-2.5" /> {label}
    </span>
  )
}

// Ko'p media (rasm/video) galereyasi — silliq swipe (scroll-snap) + nuqtali indikator
function PostMediaCarousel({
  media,
  isDetailPage,
  onImageClick,
  overlay,
}: {
  media: { url: string; type: 'image' | 'video'; duration?: number | null }[]
  isDetailPage: boolean
  onImageClick: (e: React.MouseEvent) => void
  overlay?: React.ReactNode
}) {
  const [active, setActive] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const multi = media.length > 1

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el || el.clientWidth === 0) return
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    if (idx !== active) setActive(idx)
  }

  const goTo = (i: number) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className={`no-media-save relative w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 select-none group/img ${isDetailPage ? 'max-h-[70vh]' : 'aspect-4/3'}`}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-smooth"
        style={{ scrollbarWidth: 'none' }}
      >
        {media.map((m, i) => (
          <div key={i} className="relative shrink-0 w-full h-full snap-center flex items-center justify-center bg-slate-100 dark:bg-slate-950">
            {m.type === 'video' ? (
              <video
                src={m.url}
                controls
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                playsInline
                preload="metadata"
                onContextMenu={(e) => e.preventDefault()}
                onClick={(e) => e.stopPropagation()}
                className={`w-full h-full bg-black ${isDetailPage ? 'object-contain max-h-[70vh]' : 'object-cover'}`}
              />
            ) : (
              <img
                src={m.url}
                alt="Post media"
                onClick={onImageClick}
                className={`w-full h-full cursor-pointer ${isDetailPage ? 'object-contain max-h-[70vh]' : 'object-cover'} transition-transform duration-700 ease-out group-hover/img:scale-[1.03]`}
              />
            )}
          </div>
        ))}
      </div>

      {multi && (
        <>
          <div className="absolute top-3 left-3 z-20 backdrop-blur-md bg-black/45 border border-white/10 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full">
            {active + 1}/{media.length}
          </div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 backdrop-blur-md bg-black/30 px-2 py-1 rounded-full">
            {media.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.stopPropagation(); goTo(i) }}
                aria-label={`${i + 1}-media`}
                className={`rounded-full transition-all duration-300 ${i === active ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'}`}
              />
            ))}
          </div>
        </>
      )}

      {overlay}
    </div>
  )
}

interface PostCardProps {
  post: PostType
  onDeletePost?: (id: string | number) => void
  onUpdatePost?: (id: string | number, newContent: string) => void
  isDetailPage?: boolean
  // QADAM 2 — Gidro-Warp: joylashuv kapsulasini o'ngga surganda chaqiriladi
  onWarp?: (location: string, postId: string | number) => void
}

function formatTime(timeStr: string) {
  if (!timeStr) return ''
  try {
    const date = new Date(timeStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Hozirgina'
    if (diffMins < 60) return `${diffMins} daqiqa oldin`
    if (diffHours < 24) return `${diffHours} soat oldin`
    if (diffDays === 1) return 'Kecha'
    if (diffDays < 7) return `${diffDays} kun oldin`

    return date.toLocaleDateString('uz-UZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  } catch {
    return timeStr
  }
}

export const PostCard = ({ post, onDeletePost, onUpdatePost, isDetailPage = false, onWarp }: PostCardProps) => {
  const router = useRouter()
  const supabase = createClient()

  const [liked, setLiked] = useState(post.likedByMe || false)
  const [likesCount, setLikesCount] = useState(Number(post.likes) || 0)
  const [saved, setSaved] = useState(post.savedByMe || false)
  const [savesCount, setSavesCount] = useState(Number(post.savesCount) || 0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<CommentType[]>([])
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0)
  const [loadingComments, setLoadingComments] = useState(false)
  const [replyingTo, setReplyingTo] = useState<CommentType | null>(null)
  const commentInputRef = useRef<HTMLInputElement>(null)
const [isSheetReady, setIsSheetReady] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content)
  const [commentText, setCommentText] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const likeMutation = useLikeToggle()

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(false)
  const sheetRef = useRef<BottomSheetRef>(null)

  const [showTipModal, setShowTipModal] = useState(false)
  const [tipAmount, setTipAmount] = useState('5000')
  const [customTip, setCustomTip] = useState('')
  const [isSendingTip, setIsSendingTip] = useState(false)
  const [tipSuccess, setTipSuccess] = useState(false)

  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const closeComments = () => {
    setShowComments(false)
    setReplyingTo(null)
  }

  const handleInputFocus = () => {
    sheetRef.current?.expand()
  }

  const handleTipClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!post.authorIsPremium) {
      alert("Faqat premium ijodkorlarga tip yuborish mumkin!")
      return
    }
    setShowTipModal(true)
  }

  const handleSendTipSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = customTip.trim() ? Number(customTip) : Number(tipAmount)
    if (!amount || amount <= 0) return

    setIsSendingTip(true)
    try {
      const res = await fetch('/api/posts/tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, amount })
      })

      if (res.ok) {
        setTipSuccess(true)
        setTimeout(() => {
          setTipSuccess(false)
          setShowTipModal(false)
          setCustomTip('')
        }, 2000)
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Tip yuborishda xatolik yuz berdi")
      }
    } catch {
      alert("Tip yuborishda xatolik yuz berdi")
    } finally {
      setIsSendingTip(false)
    }
  }

  const renderContentWithHashtags = (content: string) => {
    if (!content) return null
    const parts = content.split(/(\s+)/)
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <span
            key={index}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent font-bold hover:underline cursor-pointer select-none"
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/dashboard/explore?q=${encodeURIComponent(part)}`)
            }}
          >
            {part}
          </span>
        )
      } else if (part.startsWith('@')) {
        return (
          <span
            key={index}
            className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer select-none"
            onClick={(e) => {
              e.stopPropagation()
              const cleanUsername = part.replace('@', '')
              router.push(`/dashboard/explore?q=${encodeURIComponent(cleanUsername)}`)
            }}
          >
            {part}
          </span>
        )
      }
      return part
    })
  }
// Modal ochilgandan keyin 280ms (animatsiya tugaguncha) kommentlarni ushlab turadi
  useEffect(() => {
    if (isDetailModalOpen) {
      const timer = setTimeout(() => setIsSheetReady(true), 280)
      return () => clearTimeout(timer)
    } else {
      setIsSheetReady(false)
    }
  }, [isDetailModalOpen])
  const loadComments = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoadingComments(true)
      const res = await fetch(`/api/posts/comments?postId=${post.id}`, { signal })
      if (res.ok) {
        const data = await res.json()
        setComments(data)
        setCommentsCount(data.length)
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error("Kommentlarni yuklashda xato:", err)
      }
    } finally {
      setLoadingComments(false)
    }
  }, [post.id])

  // Boshlang'ich yuklash + foydalanuvchining online holatini kuzatish
  useEffect(() => {
    const controller = new AbortController()
    loadComments(controller.signal)

   

    const onlineIds = (window as any).supabaseOnlineUserIds || []
    setIsOnline(onlineIds.includes(post.authorId))

    const handleOnlineUsersChange = (e: Event) => {
      const ids = (e as CustomEvent).detail || []
      setIsOnline(ids.includes(post.authorId))
    }
    window.addEventListener('supabase-online-users', handleOnlineUsersChange)

    return () => {
      controller.abort()
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current)
      window.removeEventListener('supabase-online-users', handleOnlineUsersChange)
    }
  }, [post.authorId, loadComments])

  // Tashqariga bosilganda kontekst menyusini yopish
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Izohlar oynasi (drawer yoki detail modal) ochilganda real-time obuna + yangilash.
  // DIQQAT: bu yerda document.body.style.overflow ataylab boshqarilmaydi.
  // BottomSheet komponenti o'zining isOpen holatiga mos overflow'ni mustaqil
  // boshqaradi — ikki joydan bitta DOM xususiyatini yozish aynan shu state
  // race condition (modalning "sakrab" ochilishi) sababi edi.
  useEffect(() => {
    if (!showComments && !isDetailModalOpen) return
     console.log("modal chiqdi yoki izohlar ochildi")
    const controller = new AbortController()
    loadComments(controller.signal)

    const channel = supabase.channel(`post-comments-${post.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${post.id}`
      }, () => {
        loadComments()
      })
      .subscribe()

    return () => {
      controller.abort()
      supabase.removeChannel(channel)
       console.log("modal yopildi yoki izohlar yopildi, channel olib tashlandi")
    }
  }, [ post.id, ])

  // Faqat pastki inline "izohlar" drawer scroll'ni qotiradi — bu BottomSheet
  // komponentidan foydalanmaydigan mustaqil portal, shuning uchun o'zi
  // overflow'ni boshqarishi shart.
  

  // Tahrirlash oynasi ochilganda inputni postning eng so'nggi content'i bilan
  // sinxronlash (oldin faqat birinchi mount'da olingan edi).
  useEffect(() => {
    if (isEditing) setEditContent(post.content)
  }, [isEditing, post.content])

  const handleLikeToggle = async () => {
    const nextLiked = !liked
    const previousLiked = liked
    const previousCount = likesCount

    setLiked(nextLiked)
    setLikesCount(prev => nextLiked ? prev + 1 : prev - 1)

    try {
      await likeMutation.mutateAsync(post.id)
    } catch (err: any) {
      console.error("Like bosishda xatolik:", err)
      if (err?.message === 'UNAUTHORIZED') {
        alert("Iltimos, postga like bosish uchun tizimga kiring!")
        router.push('/login')
      } else {
        alert("Xatolik yuz berdi")
      }
      setLiked(previousLiked)
      setLikesCount(previousCount)
    }
  }

  const handleSaveToggle = async () => {
    const next = !saved
    setSaved(next)
    setSavesCount(c => Math.max(0, c + (next ? 1 : -1)))
    try {
      const res = await fetch('/api/posts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id })
      })
      if (!res.ok) throw new Error('save failed')
      const data = await res.json()
      if (typeof data.saved === 'boolean' && data.saved !== next) {
        setSaved(data.saved)
        setSavesCount(c => Math.max(0, c + (data.saved ? 1 : -1)))
      }
    } catch {
      // rollback
      setSaved(!next)
      setSavesCount(c => Math.max(0, c + (next ? -1 : 1)))
    }
  }

  const handleLikeComment = async (commentId: string | number) => {
    const toggle = (list: CommentType[]) => list.map(c => {
      if (c.id !== commentId) return c
      const nextLiked = !c.likedByMe
      return {
        ...c,
        likedByMe: nextLiked,
        likesCount: nextLiked ? (c.likesCount || 0) + 1 : Math.max(0, (c.likesCount || 0) - 1)
      }
    })

    setComments(prev => toggle(prev))

    try {
      const res = await fetch('/api/posts/comments/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId })
      })
      if (!res.ok) throw new Error('Like toggle failed')
    } catch {
      setComments(prev => toggle(prev))
    }
  }

  const handleReplyTo = (comment: CommentType) => {
    setReplyingTo(comment)
    setTimeout(() => {
      commentInputRef.current?.focus()
    }, 100)
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return

    try {
      const res = await fetch('/api/posts/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          content: commentText,
          parentId: replyingTo?.id || null
        })
      })

      if (res.ok) {
        const newComment = await res.json()
        setComments(prev => [...prev, newComment])
        setCommentsCount(prev => prev + 1)
        setCommentText('')
        setReplyingTo(null)
      } else {
        if (res.status === 401) {
          alert("Iltimos, izoh qoldirish uchun tizimga kiring!")
          router.push('/login')
          return
        }
        alert("Komment qoldirishda xatolik yuz berdi")
      }
    } catch {
      alert("Komment qoldirishda xatolik yuz berdi")
    }
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editContent.trim()) return
    onUpdatePost?.(post.id, editContent)
    setIsEditing(false)
  }

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`)
    alert("Post havolasi nusxalandi!")
    setShowMenu(false)
  }

  const navigateToProfile = () => {
    if (post.isOwner) {
      router.push('/dashboard/profile')
    } else {
      router.push(`/dashboard/profile/${post.authorId}`)
    }
  }

  const goToProfile = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigateToProfile()
  }

  // Postni ochish: desktopda (md+) alohida sahifa, mobilda bottom-sheet modal
  const openDetail = () => {
    if (isDetailPage) return
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
      router.push(`/post/${post.id}`)
    } else {
      setIsDetailModalOpen(true)
    }
  }

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
      clickTimeoutRef.current = null

      setShowDoubleTapHeart(true)
      setTimeout(() => setShowDoubleTapHeart(false), 1000)
      if (!liked) {
        handleLikeToggle()
      }
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null
        openDetail()
      }, 250)
    }
  }

  const handleCardClick = () => {
    openDetail()
  }

  // Ko'rsatiladigan media: yangi `media` galereyasi bo'lsa o'shani, aks holda
  // orqaga moslik uchun bitta `image`ni ishlatamiz.
  const displayMedia: { url: string; type: 'image' | 'video'; duration?: number | null }[] =
    post.media && post.media.length > 0
      ? post.media
      : post.image
        ? [{ url: post.image, type: 'image' }]
        : []

  return (
    <>
      <motion.div
        ref={cardRef}
        onClick={handleCardClick}
        initial={isDetailPage ? {} : { opacity: 0, y: 35, scale: 0.96 }}
        whileInView={isDetailPage ? {} : { opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ type: "spring", stiffness: 120, damping: 16, mass: 0.8 }}
        className={`group bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-3xl overflow-hidden relative transition-all duration-500 ${showMenu ? 'z-50' : 'z-10'} ${isDetailPage ? '' : 'cursor-pointer hover:shadow-[0_20px_50px_rgba(8,112,184,0.05)] hover:border-slate-200/80 dark:hover:border-white/10 dark:hover:shadow-[0_20px_50px_rgba(59,130,246,0.02)]'}`}
      >
        {!isDetailPage && (
          <div className="absolute -inset-px rounded-[24px] bg-gradient-to-tr from-blue-500/10 via-indigo-500/5 to-purple-500/10 opacity-0 group-hover:opacity-100 blur-xl transition duration-700 pointer-events-none" />
        )}

        <div className="flex items-center justify-between p-4 relative z-10">
          <div
            onClick={(e) => { e.stopPropagation(); goToProfile(e); }}
            className="flex items-center gap-3 cursor-pointer group/author"
          >
            <div className="relative">
              <img
                src={post.avatar}
                className="w-10 h-10 object-cover rounded-full bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-100 dark:ring-slate-800 group-hover/author:ring-blue-500/60 transition-all duration-300"
                alt=""
              />
              {isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 leading-none group-hover/author:text-blue-600 dark:group-hover/author:text-blue-400 transition-colors">{post.author}</h4>
                {post.isOwner && (
                  <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">Siz</span>
                )}
                {post.authorIsPremium && (
                  <span className="bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">PRO</span>
                )}
                {!post.image && post.expiresAt && (
                  <KapsulaCountdown expiresAt={post.expiresAt} saved={saved} />
                )}
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-0.5 mt-0.5">
                {formatTime(post.time)} {!post.image && post.location && (
                  <>
                    <span>•</span>
                    <FiMapPin className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                    <span>{post.location}</span>
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className={`p-1.5 rounded-full transition-colors ${showMenu ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
            >
              <HiEllipsisHorizontal className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl z-[9999] p-1.5 animate-in fade-in zoom-in-95 duration-100 shadow-xl">
                {post.isOwner ? (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsEditing(true); setShowMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg transition-colors text-left"
                    >
                      <FiEdit3 className="w-4 h-4 text-slate-400" /> Tahrirlash
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); setShowMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-950/20 rounded-lg transition-colors text-left"
                    >
                      <FiTrash2 className="w-4 h-4" /> Postni o'chirish
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={(e) => { goToProfile(e); setShowMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg transition-colors text-left"
                    >
                      <FiUser className="w-4 h-4 text-slate-400" /> Profilni ko'rish
                    </button>
                    <button
                      onClick={(e) => handleCopyLink(e)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg transition-colors text-left"
                    >
                      <FiCopy className="w-4 h-4 text-slate-400" /> Havolani nusxalash
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-white/5 my-1" />
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-950/20 rounded-lg transition-colors text-left"
                    >
                      <FiAlertTriangle className="w-4 h-4" /> Shikoyat qilish
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {displayMedia.length > 0 && (
          <div className="px-4 relative z-10">
            <PostMediaCarousel
              media={displayMedia}
              isDetailPage={!!isDetailPage}
              onImageClick={(e) => handleImageClick(e)}
              overlay={
                <>
                  {post.location && (
                    <motion.div
                      drag={onWarp ? 'x' : false}
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.45}
                      dragSnapToOrigin
                      whileDrag={{ scale: 1.08 }}
                      style={onWarp ? { touchAction: 'pan-y' } : undefined}
                      onClick={(e) => e.stopPropagation()}
                      onDragEnd={(_e, info) => {
                        if (onWarp && info.offset.x > 90) onWarp(post.location, post.id)
                      }}
                      className={`absolute bottom-3 left-3 z-30 backdrop-blur-md bg-black/40 border border-white/10 text-white text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm transition-colors duration-350 hover:bg-black/60 ${onWarp ? 'cursor-grab active:cursor-grabbing' : ''}`}
                      title={onWarp ? "O'ngga suring — shu hududdagi keyingi postga sakrang" : undefined}
                    >
                      <FiMapPin className="w-3.5 h-3.5 text-blue-400" />
                      <span>{post.location}</span>
                      {onWarp && <FiChevronsRight className="w-3.5 h-3.5 text-blue-300/90 animate-pulse" />}
                    </motion.div>
                  )}

                  {post.expiresAt && (
                    <div className="absolute top-3 right-3 z-30 backdrop-blur-md bg-black/40 border border-white/10 rounded-full">
                      <KapsulaCountdown expiresAt={post.expiresAt} saved={saved} className="!bg-transparent !text-white px-2.5" />
                    </div>
                  )}

                  {showDoubleTapHeart && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-double-tap-heart">
                      <FaHeart className="w-20 h-20 text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.6)]" />
                    </div>
                  )}
                </>
              }
            />
          </div>
        )}

        <div className="flex items-center justify-between p-4 relative z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => { e.stopPropagation(); handleLikeToggle(); }}
              className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:text-rose-500 dark:hover:text-rose-500 transition active:scale-90"
            >
              {liked ? <FaHeart className="w-5 h-5 text-rose-500 animate-jump" /> : <FiHeart className="w-5 h-5" />}
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{likesCount}</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                if (isDetailPage) {
                  document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })
                } else {
                  openDetail()
                }
              }}
              className={`flex items-center gap-1.5 transition active:scale-90 ${isDetailPage || showComments ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300 hover:text-blue-500 dark:hover:text-blue-400'}`}
            >
              <FiMessageSquare className="w-5 h-5" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{commentsCount}</span>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); handleSaveToggle(); }}
              title={saved ? 'Saqlanganlardan olib tashlash' : 'Saqlash'}
              className={`flex items-center gap-1.5 transition active:scale-90 ${saved
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-700 dark:text-slate-300 hover:text-emerald-500 dark:hover:text-emerald-400'}`}
            >
              {saved ? <FaBookmark className="w-5 h-5 animate-jump" /> : <FiBookmark className="w-5 h-5" />}
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{savesCount}</span>
            </button>

            <button
              onClick={(e) => e.stopPropagation()}
              className="text-slate-700 dark:text-slate-300 hover:text-indigo-500 dark:hover:text-indigo-400 transition"
            >
              <FiSend className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={handleTipClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition active:scale-95 border ${post.authorIsPremium
              ? 'bg-gradient-to-r from-amber-500/10 to-yellow-500/10 hover:from-amber-500/20 hover:to-yellow-500/20 text-amber-600 dark:text-amber-400 border-amber-500/25 shadow-xs shadow-amber-500/5'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-transparent cursor-not-allowed'
              }`}
          >
            {post.authorIsPremium && (
              <span className="relative flex h-1.5 w-1.5 mr-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
              </span>
            )}
            Tip
          </button>
        </div>

        <div className="px-4 pb-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-b border-slate-50 dark:border-white/5 relative z-10 select-text">
          <span
            onClick={(e) => { e.stopPropagation(); goToProfile(e); }}
            className="font-bold text-slate-900 dark:text-slate-100 mr-1.5 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {post.author}
          </span>
          {renderContentWithHashtags(post.content)}
        </div>

        {!isDetailPage && (
          <div
            onClick={(e) => { e.stopPropagation(); openDetail(); }}
            className="p-3.5 bg-slate-50/50 dark:bg-slate-900/10 border-t border-slate-50 dark:border-white/5 flex items-center justify-between cursor-pointer text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors relative z-10"
          >
            <span>Fikr bildiring...</span>
            <FiSend className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />
          </div>
        )}
      </motion.div>

      {showComments && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-end justify-center">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
            onClick={closeComments}
          />

          <div className="relative z-[1000000] bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 w-full md:max-w-[450px] rounded-t-[28px] max-h-[70vh] flex flex-col animate-drawer-slide-up select-none">
            <div className="absolute top-2.5 left-0 right-0 flex justify-center cursor-pointer py-1" onClick={closeComments}>
              <div className="w-10 h-1 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-4 pt-6 pb-3 border-b border-slate-100 dark:border-white/5">
              <span className="text-slate-900 dark:text-slate-100 font-extrabold text-sm">Izohlar ({commentsCount})</span>
              <button onClick={closeComments} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none [will-change:scroll-position] overscroll-y-contain -webkit-overflow-scrolling-touch">
              {loadingComments && comments.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                  <p className="text-xs font-semibold">Birinchi bo'lib izoh qoldiring 💬</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.filter(c => !c.parentId).map((comment) => {
                    const replies = comments.filter(c => c.parentId === comment.id)
                    return (
                      <div key={comment.id} className="space-y-3">
                        <div className="flex items-start gap-3 text-xs animate-comment-slide-in [will-change:transform,opacity]">
                          <img src={comment.avatar} className="w-8 h-8 object-cover rounded-full bg-slate-200 dark:bg-slate-800 shrink-0 mt-0.5" alt="" />
                          <div className="flex-1 min-w-0">
                            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-white/5 rounded-2xl px-3.5 py-2">
                              <span className="font-bold text-slate-900 dark:text-slate-100 block text-[11px] mb-0.5">{comment.user}</span>
                              <p className="text-slate-800 dark:text-slate-100 leading-relaxed font-normal break-words select-text">{comment.text}</p>
                            </div>
                            <div className="flex items-center gap-4 mt-1.5 ml-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 select-none">
                              <span>{formatTime(comment.createdAt)}</span>
                              <button
                                onClick={() => handleLikeComment(comment.id)}
                                className={`hover:text-rose-500 transition-colors flex items-center gap-1 ${comment.likedByMe ? 'text-rose-500 font-black' : ''}`}
                              >
                                {comment.likedByMe ? <FaHeart className="w-[17px] h-[17px] text-rose-500" /> : <FiHeart className="w-[17px] h-[17px]" />}
                                {(comment.likesCount || 0) > 0 && <span className="text-[10px]">{comment.likesCount}</span>}
                              </button>
                              <button
                                onClick={() => handleReplyTo(comment)}
                                className="hover:text-blue-500 transition-colors flex items-center"
                              >
                                <FiCornerDownLeft className="w-[17px] h-[17px]" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {replies.length > 0 && (
                          <div className="ml-10 pl-3 border-l-2 border-slate-100 dark:border-white/5 space-y-3">
                            {replies.map((reply) => (
                              <div key={reply.id} className="flex items-start gap-3 text-xs animate-comment-slide-in [will-change:transform,opacity]">
                                <img src={reply.avatar} className="w-8 h-8 object-cover rounded-full bg-slate-200 dark:bg-slate-800 shrink-0 mt-0.5" alt="" />
                                <div className="flex-1 min-w-0">
                                  <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-white/5 rounded-2xl px-3.5 py-2">
                                    <span className="font-bold text-slate-900 dark:text-slate-100 block text-[11px] mb-0.5">{reply.user}</span>
                                    <p className="text-slate-800 dark:text-slate-100 leading-relaxed font-normal break-words select-text">{reply.text}</p>
                                  </div>
                                  <div className="flex items-center gap-4 mt-1.5 ml-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 select-none">
                                    <span>{formatTime(reply.createdAt)}</span>
                                    <button
                                      onClick={() => handleLikeComment(reply.id)}
                                      className={`hover:text-rose-500 transition-colors flex items-center gap-1 ${reply.likedByMe ? 'text-rose-500 font-black' : ''}`}
                                    >
                                      {reply.likedByMe ? <FaHeart className="w-[17px] h-[17px] text-rose-500" /> : <FiHeart className="w-[17px] h-[17px]" />}
                                      {(reply.likesCount || 0) > 0 && <span className="text-[10px]">{reply.likesCount}</span>}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {replyingTo && (
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400 select-none">
                <span>
                  <strong>@{replyingTo.user}</strong> ga javob berilmoqda
                </span>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
                >
                  Bekor qilish
                </button>
              </div>
            )}

            <form onSubmit={handleAddComment} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 flex items-center gap-2 pb-[calc(1.2rem+env(safe-area-inset-bottom))]">
              <input
                ref={commentInputRef}
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={replyingTo ? "Javob yozing..." : "Fikr bildiring..."}
                className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-900 dark:text-slate-100"
              />
              <button type="submit" disabled={!commentText.trim()} className="p-2.5 bg-blue-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 dark:disabled:text-slate-600 rounded-2xl transition active:scale-95">
                <FiSend className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Post Bottom Sheet */}
      <BottomSheet isOpen={isEditing} onClose={() => setIsEditing(false)} title="Postni tahrirlash">
        <form onSubmit={handleSaveEdit} className="flex flex-col select-none">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={4}
            className="w-full text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3.5 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-900 transition-all resize-none mb-4 font-semibold border border-slate-200 dark:border-white/10"
            maxLength={500}
          />
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={!editContent.trim() || editContent === post.content}
              className={`px-4 py-2.5 text-xs font-bold text-white rounded-xl transition-all cursor-pointer ${editContent.trim() && editContent !== post.content
                ? 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                : 'bg-slate-100 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                }`}
            >
              Saqlash
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* Delete Confirmation Bottom Sheet */}
      <BottomSheet isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Postni o'chirish">
        <div className="flex flex-col gap-4 text-center select-none">
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/20 rounded-full flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/10">
            <FiTrash2 className="w-5 h-5 text-rose-600 dark:text-rose-500" />
          </div>
          <div>
            <h4 className="text-slate-900 dark:text-slate-100 font-extrabold text-sm">Postni o'chirib tashlaysizmi?</h4>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold mt-1">Ushbu harakatni ortga qaytarib bo'lmaydi va post butunlay o'chiriladi.</p>
          </div>
          <div className="flex gap-2.5 mt-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-2xl active:scale-95 transition-all cursor-pointer border border-transparent dark:border-white/5"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              onClick={() => {
                onDeletePost?.(post.id)
                setShowDeleteConfirm(false)
              }}
              className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-2xl active:scale-95 transition-all cursor-pointer"
            >
              Ha, o'chirilsin
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Premium Tipping Modal Bottom Sheet */}
      <BottomSheet isOpen={showTipModal} onClose={() => setShowTipModal(false)} title="Ijodkorni qo'llab-quvvatlash">
        {tipSuccess ? (
          <div className="flex flex-col items-center justify-center py-6 text-center select-none animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-green-50 dark:bg-green-950/20 rounded-full flex items-center justify-center border border-green-100 mb-3">
              <FiCheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <h4 className="text-slate-900 dark:text-slate-100 font-extrabold text-sm">To'lov muvaffaqiyatli yuborildi!</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1">Siz @{post.author} ijodini qo'llab-quvvatlash uchun pul yubordingiz. Rahmat!</p>
          </div>
        ) : (
          <form onSubmit={handleSendTipSubmit} className="flex flex-col gap-4 select-none">
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 rounded-full flex items-center justify-center mx-auto border border-amber-100/30 mb-3">
                <FiDollarSign className="w-5 h-5 text-amber-500 animate-pulse" />
              </div>
              <h4 className="text-slate-900 dark:text-slate-100 font-extrabold text-sm">Ijodkorni rag'batlantirish (Tip)</h4>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold mt-0.5">@{post.author} uchun moddiy rag'bat summasini tanlang</p>
            </div>

            <div className="grid grid-cols-3 gap-2 my-2">
              {['1000', '5000', '10000'].map(amount => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => { setTipAmount(amount); setCustomTip(''); }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${tipAmount === amount && !customTip
                    ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-slate-900/60'
                    }`}
                >
                  {Number(amount).toLocaleString('uz-UZ')} UZS
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Boshqa miqdor</label>
              <input
                type="number"
                value={customTip}
                onChange={(e) => { setCustomTip(e.target.value); setTipAmount(''); }}
                placeholder="Miqdorni kiriting (UZS)..."
                className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-900 dark:text-slate-100"
              />
            </div>

            <button
              type="submit"
              disabled={isSendingTip || (!customTip && !tipAmount)}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-extrabold text-xs rounded-2xl active:scale-95 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSendingTip ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Yuborilmoqda...</span>
                </>
              ) : (
                <span>Yuborish</span>
              )}
            </button>
          </form>
        )}
      </BottomSheet>

      {/* Quick View Post Details Bottom Sheet */}
      <BottomSheet
        key={`detail-sheet-${post.id}`}
        ref={sheetRef}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title=""
        expandable={true}
        initialState="full"
        headerAction={
          <button
            onClick={() => {
              setIsDetailModalOpen(false)
              router.push(`/post/${post.id}`)
            }}
            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            title="To'liq ko'rish"
          >
            <FiExternalLink className="w-5 h-5" />
          </button>
        }
        headerContent={
          <div className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900 flex flex-col gap-4 select-none">
            <div className="flex items-center justify-between">
              <div
                onClick={() => { setIsDetailModalOpen(false); navigateToProfile(); }}
                className="flex items-center gap-3 cursor-pointer group/det"
                data-no-drag
              >
                <div className="relative">
                  <img
                    src={post.avatar}
                    className="w-10 h-10 object-cover rounded-full bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-100 dark:ring-slate-800"
                    alt=""
                  />
                  {isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 leading-none group-hover/det:text-blue-600 transition-colors">{post.author}</h4>
                    {post.isOwner && (
                      <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">Siz</span>
                    )}
                    {post.authorIsPremium && (
                      <span className="bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">PRO</span>
                    )}
                    {post.expiresAt && (
                      <KapsulaCountdown expiresAt={post.expiresAt} saved={saved} />
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-0.5 mt-0.5">
                    {formatTime(post.time)} {post.location && (
                      <>
                        <span>•</span>
                        <FiMapPin className="w-2.5 h-2.5 inline text-slate-400 dark:text-slate-500" />
                        <span>{post.location}</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {displayMedia.length > 0 && (
              <div className="max-h-[35vh]">
                <PostMediaCarousel
                  media={displayMedia}
                  isDetailPage={false}
                  onImageClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </div>
        }
        footerContent={
          <form
            onSubmit={handleAddComment}
            className="flex items-center gap-2 px-5 pt-3 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900"
            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
          >
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onFocus={handleInputFocus}
              placeholder="Fikr yozing..."
              className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-900 dark:text-slate-100"
            />
            <button type="submit" disabled={!commentText.trim()} className="p-2.5 bg-blue-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white rounded-xl transition active:scale-95 cursor-pointer">
              <FiSend className="w-4 h-4" />
            </button>
          </form>
        }
      >
        <div className="flex flex-col gap-4 select-none">
          <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal break-words select-text">
            {renderContentWithHashtags(post.content)}
          </p>

          <div className="flex items-center justify-between py-2 border-y border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-4">
              <button
                onClick={handleLikeToggle}
                className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:text-rose-500 transition active:scale-90"
                data-no-drag
              >
                {liked ? <FaHeart className="w-5 h-5 text-rose-500 animate-jump" /> : <FiHeart className="w-5 h-5" />}
                <span className="text-xs font-semibold">{likesCount}</span>
              </button>
              <div className="flex items-center gap-1.5 text-slate-500">
                <FiMessageSquare className="w-5 h-5" />
                <span className="text-xs font-semibold">{commentsCount}</span>
              </div>
            </div>

            <button
              onClick={handleTipClick}
              data-no-drag
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition active:scale-95 border ${post.authorIsPremium
                ? 'bg-gradient-to-r from-amber-500/10 to-yellow-500/10 hover:from-amber-500/20 hover:to-yellow-500/20 text-amber-600 dark:text-amber-400 border-amber-500/25 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-transparent cursor-not-allowed'
                }`}
            >
              {post.authorIsPremium && (
                <span className="relative flex h-1.5 w-1.5 mr-0.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                </span>
              )}
              Tip
            </button>
          </div>

          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1 shrink-0">Munozaralar ({commentsCount})</div>
          <div className="space-y-3.5 pb-4">
            {loadingComments && comments.length === 0 ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold text-center py-4">Birinchi bo'lib fikr bildiring!</p>
            ) : (
              <div className="space-y-3.5 pb-4 min-h-[150px]">
            {!isSheetReady || (loadingComments && comments.length === 0) ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold text-center py-4 animate-fade-in">Birinchi bo'lib fikr bildiring!</p>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ duration: 0.2 }}
                className="space-y-3.5"
              >
                {comments.filter(c => !c.parentId).map((comment) => (
                  <div key={comment.id} className="flex items-start gap-2.5 text-xs animate-comment-slide-in">
                    <img src={comment.avatar} className="w-7 h-7 object-cover rounded-full bg-slate-200 dark:bg-slate-800 shrink-0 mt-0.5" alt="" />
                    <div className="flex-1 min-w-0">
                      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-white/5 rounded-2xl px-3 py-1.5">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block text-[10px] mb-0.5">{comment.user}</span>
                        <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-normal break-words select-text">{comment.text}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 ml-1 text-[9px] font-bold text-slate-400 dark:text-slate-500">
                        <span>{formatTime(comment.createdAt)}</span>
                        <button onClick={() => handleLikeComment(comment.id)} data-no-drag className={`hover:text-rose-500 flex items-center gap-0.5 ${comment.likedByMe ? 'text-rose-500' : ''}`}>
                          {comment.likedByMe ? <FaHeart className="w-3.5 h-3.5 text-rose-500" /> : <FiHeart className="w-3.5 h-3.5" />}
                          {(comment.likesCount || 0) > 0 && <span>{comment.likesCount}</span>}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
            )}
          </div>
        </div>
      </BottomSheet>
    </>
  )
}