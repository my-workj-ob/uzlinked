"use client"

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { FiHeart, FiMessageSquare, FiSend, FiTrash2, FiEdit3, FiCopy, FiAlertTriangle, FiUser, FiCornerDownLeft } from 'react-icons/fi'
import { useLikeToggle } from '@/hooks/use-queries'
import { FaHeart } from 'react-icons/fa'
import { HiEllipsisHorizontal, HiXMark } from 'react-icons/hi2'
import { BottomSheet } from '@/components/bottom-sheet'
import { motion, useScroll, useTransform } from 'framer-motion'

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
  authorId: string // profilga o'tish uchun shart
  author: string
  avatar: string
  time: string
  location: string
  image: string | null
  content: string
  likes: string | number // bazadan keladigan likelar soni
  isOwner: boolean
  likedByMe?: boolean // joriy user like bosganmi?
  commentsCount?: number // kommentlar soni
}

interface PostCardProps {
  post: PostType
  onDeletePost?: (id: string | number) => void
  onUpdatePost?: (id: string | number, newContent: string) => void
  isDetailPage?: boolean
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

export const PostCard = ({ post, onDeletePost, onUpdatePost, isDetailPage = false }: PostCardProps) => {
  const router = useRouter()

  // Hydration uchun mounted state
  const [mounted, setMounted] = useState(false)

  const [liked, setLiked] = useState(post.likedByMe || false)
  const [likesCount, setLikesCount] = useState(Number(post.likes) || 0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<CommentType[]>([])
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0)
  const [loadingComments, setLoadingComments] = useState(false)
  const [replyingTo, setReplyingTo] = useState<CommentType | null>(null)
  const commentInputRef = useRef<HTMLInputElement>(null)

  const closeComments = () => {
    setShowComments(false)
    setReplyingTo(null)
  }

  const [showMenu, setShowMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content)
  const [commentText, setCommentText] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const likeMutation = useLikeToggle()

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

  useEffect(() => {
    setMounted(true)
    loadComments()
    return () => {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (showComments) {
      loadComments()
      // Orqa fonni qotirib qo'yish
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [showComments])

  const loadComments = async () => {
    try {
      setLoadingComments(true)
      const res = await fetch(`/api/posts/comments?postId=${post.id}`)
      if (res.ok) {
        const data = await res.json()
        setComments(data)
        setCommentsCount(data.length)
      }
    } catch (err) {
      console.error("Kommentlarni yuklashda xato:", err)
    } finally {
      setLoadingComments(false)
    }
  }

  // Like bosish/o'chirish logikasi
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
      if (err.message === 'UNAUTHORIZED') {
        alert("Iltimos, postga like bosish uchun tizimga kiring!")
        router.push('/login')
      } else {
        alert("Xatolik yuz berdi")
      }
      setLiked(previousLiked)
      setLikesCount(previousCount)
    }
  }

  const handleLikeComment = async (commentId: string | number) => {
    // Optimistic UI Update
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        const nextLiked = !c.likedByMe
        return {
          ...c,
          likedByMe: nextLiked,
          likesCount: nextLiked ? (c.likesCount || 0) + 1 : Math.max(0, (c.likesCount || 0) - 1)
        }
      }
      return c
    }))

    try {
      const res = await fetch('/api/posts/comments/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId })
      })
      if (!res.ok) throw new Error('Like toggle failed')
    } catch (err) {
      // Revert changes on failure
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          const nextLiked = !c.likedByMe
          return {
            ...c,
            likedByMe: nextLiked,
            likesCount: nextLiked ? (c.likesCount || 0) + 1 : Math.max(0, (c.likesCount || 0) - 1)
          }
        }
        return c
      }))
    }
  }

  const handleReplyTo = (comment: CommentType) => {
    setReplyingTo(comment)
    setTimeout(() => {
      commentInputRef.current?.focus()
    }, 100)
  }

  // Kommentariya qo'shish logikasi
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
    } catch (err) {
      alert("Komment qoldirishda xatolik yuz berdi")
    }
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editContent.trim()) return
    if (onUpdatePost) onUpdatePost(post.id, editContent)
    setIsEditing(false)
  }

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`)
    alert("Post havolasi nusxalandi!")
    setShowMenu(false)
  }

  // Profilga o'tish — agar o'zining posti bo'lsa, shaxsiy profilga,
  // aks holda boshqa userning dinamik profil sahifasiga
  const goToProfile = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (post.isOwner) {
      router.push('/dashboard/profile')
    } else {
      router.push(`/dashboard/profile/${post.authorId}`)
    }
  }

  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false)

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (clickTimeoutRef.current) {
      // Double tap detected: trigger like, cancel navigation
      clearTimeout(clickTimeoutRef.current)
      clickTimeoutRef.current = null
      
      setShowDoubleTapHeart(true)
      setTimeout(() => setShowDoubleTapHeart(false), 1000)
      if (!liked) {
        handleLikeToggle()
      }
    } else {
      // Potential single tap: wait to differentiate from double tap
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null
        if (!isDetailPage) {
          router.push(`/post/${post.id}`)
        }
      }, 250)
    }
  }

  const handleCardClick = () => {
    if (!isDetailPage) {
      router.push(`/post/${post.id}`)
    }
  }

  const cardRef = useRef<HTMLDivElement>(null)

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
        {/* Ambient Backlight Glow for Hover in Dark Mode */}
        {!isDetailPage && (
          <div className="absolute -inset-px rounded-[24px] bg-gradient-to-tr from-blue-500/10 via-indigo-500/5 to-purple-500/10 opacity-0 group-hover:opacity-100 blur-xl transition duration-700 pointer-events-none" />
        )}

        <div className="flex items-center justify-between p-4 relative z-10">
          <div
            onClick={(e) => goToProfile(e)}
            className="flex items-center gap-3 cursor-pointer group/author"
          >
            <div className="relative">
              <img
                src={post.avatar.startsWith('http') ? post.avatar : `${window.location.origin}${post.avatar}`}
                className="w-10 h-10 object-cover rounded-full bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-100 dark:ring-slate-800 group-hover/author:ring-blue-500/60 transition-all duration-300"
                alt=""
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-900" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 leading-none group-hover/author:text-blue-600 dark:group-hover/author:text-blue-400 transition-colors">{post.author}</h4>
                {post.isOwner && (
                  <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">Siz</span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">
                {formatTime(post.time)} {!post.image && post.location && `• ${post.location}`}
              </span>
            </div>
          </div>

          <div className="relative" ref={menuRef}>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} 
              className={`p-1.5 rounded-full transition-colors ${showMenu ? 'bg-slate-150 dark:bg-slate-800 text-slate-700 dark:text-slate-300' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
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

        {post.image && (
          <div className="px-4 relative z-10">
            <div 
              onClick={(e) => handleImageClick(e)} 
              className={`relative w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 cursor-pointer select-none group/img ${isDetailPage ? 'max-h-[70vh] flex items-center justify-center' : 'aspect-4/3'}`}
            >
              <img 
                src={post.image} 
                alt="Post content" 
                className={`w-full h-full ${isDetailPage ? 'object-contain max-h-[70vh]' : 'object-cover'} transition-transform duration-700 ease-out group-hover/img:scale-[1.03]`} 
              />
              
              {/* Floating location tag inside the image */}
              {post.location && (
                <div className="absolute bottom-3 left-3 backdrop-blur-md bg-black/40 border border-white/10 text-white text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm transition-all duration-300 hover:bg-black/60">
                  <span>📍 {post.location}</span>
                </div>
              )}

              {showDoubleTapHeart && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-double-tap-heart">
                  <FaHeart className="w-20 h-20 text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.6)]" />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-4 relative z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={(e) => { e.stopPropagation(); handleLikeToggle(); }} 
              className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:text-rose-500 dark:hover:text-rose-450 transition active:scale-90"
            >
              {liked ? <FaHeart className="w-5 h-5 text-rose-500 animate-jump" /> : <FiHeart className="w-5 h-5" />}
              <span className="text-xs font-semibold text-slate-650 dark:text-slate-400">{likesCount}</span>
            </button>

            <button 
              onClick={(e) => {
                e.stopPropagation()
                if (isDetailPage) {
                  document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })
                } else {
                  setShowComments(true)
                }
              }} 
              className={`flex items-center gap-1.5 transition active:scale-90 ${
                isDetailPage || showComments ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300 hover:text-blue-500 dark:hover:text-blue-450'
              }`}>
              <FiMessageSquare className="w-5 h-5" />
              <span className="text-xs font-semibold text-slate-650 dark:text-slate-400">{commentsCount}</span>
            </button>

            <button 
              onClick={(e) => e.stopPropagation()} 
              className="text-slate-700 dark:text-slate-300 hover:text-indigo-500 dark:hover:text-indigo-405 transition"
            >
              <FiSend className="w-5 h-5" />
            </button>
          </div>

          {/* Premium Breathing Tip Button */}
          <button 
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 hover:from-amber-500/20 hover:to-yellow-500/20 text-amber-600 dark:text-amber-450 px-3 py-1.5 rounded-full text-xs font-black transition active:scale-95 border border-amber-500/25 shadow-xs hover:shadow-sm"
          >
            <span className="relative flex h-1.5 w-1.5 mr-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
            </span>
            Tip
          </button>
        </div>

        <div className="px-4 pb-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-b border-slate-50 dark:border-white/5 relative z-10 select-text">
          <span
            onClick={(e) => goToProfile(e)}
            className="font-bold text-slate-900 dark:text-slate-100 mr-1.5 cursor-pointer hover:text-blue-600 dark:hover:text-blue-450 transition-colors"
          >
            {post.author}
          </span>
          {renderContentWithHashtags(post.content)}
        </div>

        {!isDetailPage && (
          <div
            onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
            className="p-3.5 bg-slate-50/50 dark:bg-slate-900/10 border-t border-slate-50 dark:border-white/5 flex items-center justify-between cursor-pointer text-xs text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-350 transition-colors relative z-10"
          >
            <span>Fikr bildiring...</span>
            <FiSend className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />
          </div>
        )}
      </motion.div>

      {mounted && showComments && createPortal(
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
              <span className="text-slate-950 dark:text-slate-100 font-extrabold text-sm">Izohlar ({commentsCount})</span>
              <button onClick={closeComments} className="p-1.5 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition-colors">
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none [will-change:scroll-position] overscroll-y-contain -webkit-overflow-scrolling-touch">
              {loadingComments && comments.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-slate-450">
                  <p className="text-xs font-semibold">Birinchi bo'lib izoh qoldiring 💬</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.filter(c => !c.parentId).map((comment) => {
                    const replies = comments.filter(c => c.parentId === comment.id)
                    return (
                      <div key={comment.id} className="space-y-3">
                        {/* Parent Comment */}
                        <div className="flex items-start gap-3 text-xs animate-comment-slide-in [will-change:transform,opacity]">
                          <img src={comment.avatar} className="w-8 h-8 object-cover rounded-full bg-slate-200 dark:bg-slate-800 shrink-0 mt-0.5" alt="" />
                          <div className="flex-1 min-w-0">
                            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-white/5 rounded-2xl px-3.5 py-2">
                              <span className="font-bold text-slate-950 dark:text-slate-100 block text-[11px] mb-0.5">{comment.user}</span>
                              <p className="text-slate-850 dark:text-slate-100 leading-relaxed font-normal break-words select-text">{comment.text}</p>
                            </div>
                            <div className="flex items-center gap-4 mt-1.5 ml-2 text-[10px] font-bold text-slate-400 dark:text-slate-550 select-none">
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

                        {/* Nested Replies */}
                        {replies.length > 0 && (
                          <div className="ml-10 pl-3 border-l-2 border-slate-100 dark:border-white/5 space-y-3">
                            {replies.map((reply) => (
                              <div key={reply.id} className="flex items-start gap-3 text-xs animate-comment-slide-in [will-change:transform,opacity]">
                                <img src={reply.avatar} className="w-8 h-8 object-cover rounded-full bg-slate-200 dark:bg-slate-800 shrink-0 mt-0.5" alt="" />
                                <div className="flex-1 min-w-0">
                                  <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-white/5 rounded-2xl px-3.5 py-2">
                                    <span className="font-bold text-slate-950 dark:text-slate-100 block text-[11px] mb-0.5">{reply.user}</span>
                                    <p className="text-slate-850 dark:text-slate-100 leading-relaxed font-normal break-words select-text">{reply.text}</p>
                                  </div>
                                  <div className="flex items-center gap-4 mt-1.5 ml-2 text-[10px] font-bold text-slate-400 dark:text-slate-550 select-none">
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

            {/* Replying to indicator preview */}
            {replyingTo && (
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-450 select-none">
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
              <button type="submit" disabled={!commentText.trim()} className="p-2.5 bg-blue-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-450 dark:disabled:text-slate-650 rounded-2xl transition active:scale-95">
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
              className={`px-4 py-2.5 text-xs font-bold text-white rounded-xl transition-all cursor-pointer ${
                editContent.trim() && editContent !== post.content 
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
            <FiTrash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
           <div>
            <h4 className="text-slate-950 dark:text-slate-100 font-extrabold text-sm">Postni o'chirib tashlaysizmi?</h4>
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
                if (onDeletePost) onDeletePost(post.id);
                setShowDeleteConfirm(false);
              }} 
              className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-2xl active:scale-95 transition-all cursor-pointer"
            >
              Ha, o'chirilsin
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  )
}