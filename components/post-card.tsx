"use client"

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { FiHeart, FiMessageSquare, FiSend, FiTrash2, FiEdit3, FiCopy, FiAlertTriangle, FiUser } from 'react-icons/fi'
import { useLikeToggle } from '@/hooks/use-queries'
import { FaHeart } from 'react-icons/fa'
import { HiEllipsisHorizontal, HiXMark } from 'react-icons/hi2'
import { BottomSheet } from '@/components/bottom-sheet'

export interface CommentType {
  id: string | number
  user: string
  avatar: string
  text: string
  createdAt: string
  userId: string
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

  const [showMenu, setShowMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content)
  const [commentText, setCommentText] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const likeMutation = useLikeToggle()

  useEffect(() => {
    setMounted(true)
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

  // Kommentariya qo'shish logikasi
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return

    try {
      const res = await fetch('/api/posts/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, content: commentText })
      })

      if (res.ok) {
        const newComment = await res.json()
        setComments(prev => [...prev, newComment])
        setCommentsCount(prev => prev + 1)
        setCommentText('')
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

  return (
    <>
      <div 
        onClick={handleCardClick}
        className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden relative transition-all duration-300 ${showMenu ? 'z-50' : 'z-10'} ${isDetailPage ? '' : 'cursor-pointer hover:shadow-md hover:border-slate-200 dark:hover:border-white/10'}`}
      >
        <div className="flex items-center justify-between p-4 relative">
          <div
            onClick={(e) => goToProfile(e)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <img
              src={post.avatar.startsWith('http') ? post.avatar : `${window.location.origin}${post.avatar}`}
              className="w-10 h-10 object-cover rounded-full bg-slate-100 dark:bg-slate-800 group-hover:opacity-85 transition-opacity"
              alt=""
            />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-none group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{post.author}</h4>
                {post.isOwner && (
                  <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider">Siz</span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{formatTime(post.time)} • {post.location}</span>
            </div>
          </div>

          <div className="relative" ref={menuRef}>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} 
              className={`p-1 rounded-full transition-colors ${showMenu ? 'bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <HiEllipsisHorizontal className="w-6 h-6" />
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
          <div className="px-4">
            <div 
              onClick={(e) => handleImageClick(e)} 
              className={`relative w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 cursor-pointer select-none ${isDetailPage ? 'max-h-[70vh] flex items-center justify-center' : 'aspect-4/3'}`}
            >
              <img 
                src={post.image} 
                alt="Post content" 
                className={`w-full h-full ${isDetailPage ? 'object-contain max-h-[70vh]' : 'object-cover'} transition-transform duration-500 hover:scale-[1.02]`} 
              />
              {showDoubleTapHeart && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-double-tap-heart">
                  <FaHeart className="w-20 h-20 text-rose-500" />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={(e) => { e.stopPropagation(); handleLikeToggle(); }} 
              className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 transition active:scale-90"
            >
              {liked ? <FaHeart className="w-5 h-5 text-rose-500 animate-jump" /> : <FiHeart className="w-5 h-5" />}
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{likesCount}</span>
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); setShowComments(true); }} 
              className={`flex items-center gap-1.5 transition active:scale-90 ${showComments ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300 hover:text-blue-500 dark:hover:text-blue-400'}`}>
              <FiMessageSquare className="w-5 h-5" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{commentsCount}</span>
            </button>

            <button 
              onClick={(e) => e.stopPropagation()} 
              className="text-slate-700 dark:text-slate-300 hover:text-indigo-500 dark:hover:text-indigo-400 transition"
            >
              <FiSend className="w-5 h-5" />
            </button>
          </div>

          <button 
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full text-xs font-bold transition active:scale-95 border border-amber-200/30"
          >
            <div className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-white font-extrabold text-[9px]">$</div> Tip
          </button>
        </div>

        <div className="px-4 pb-4 text-xs text-slate-600 dark:text-slate-450 leading-relaxed border-b border-slate-50 dark:border-white/5">
          <span
            onClick={(e) => goToProfile(e)}
            className="font-bold text-slate-900 dark:text-slate-100 mr-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {post.author}
          </span> {post.content}
        </div>

         <div
          onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
          className="p-3 bg-slate-50/50 dark:bg-slate-900/10 border-t border-slate-50 dark:border-white/5 flex items-center justify-between cursor-pointer text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <span>Fikr bildiring...</span>
          <FiSend className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
        </div>
      </div>

      {/* PORTALS UCHUN KODLAR: DOMning eng tepasida (body ichida) chiqadi */}
      {mounted && showComments && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-end justify-center">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
            onClick={() => setShowComments(false)}
          />

          <div className="relative z-[1000000] bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 w-full md:max-w-[450px] rounded-t-[28px] max-h-[70vh] flex flex-col animate-drawer-slide-up select-none">
            <div className="absolute top-2.5 left-0 right-0 flex justify-center cursor-pointer py-1" onClick={() => setShowComments(false)}>
              <div className="w-10 h-1 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-4 pt-6 pb-3 border-b border-slate-100 dark:border-white/5">
              <span className="text-slate-950 dark:text-slate-100 font-extrabold text-sm">Izohlar ({commentsCount})</span>
              <button onClick={() => setShowComments(false)} className="p-1.5 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition-colors">
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">
              {loadingComments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Birinchi bo'lib izoh qoldiring 💬</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-2.5 text-xs animate-comment-slide-in">
                    <img src={comment.avatar} className="w-8 h-8 object-cover rounded-full bg-slate-200 dark:bg-slate-800 mt-0.5" alt="" />
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/5 rounded-2xl px-3.5 py-2 max-w-[85%]">
                      <span className="font-bold text-slate-950 dark:text-slate-100 block text-[11px] mb-0.5">{comment.user}</span>
                      <p className="text-slate-700 dark:text-slate-300 leading-tight">{comment.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 flex items-center gap-2 pb-[calc(1.2rem+env(safe-area-inset-bottom))]">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Fikr bildiring..."
                className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-2.5 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-900 dark:text-slate-100"
              />
              <button type="submit" disabled={!commentText.trim()} className="p-2.5 bg-blue-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 dark:disabled:text-slate-650 rounded-2xl transition active:scale-95">
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