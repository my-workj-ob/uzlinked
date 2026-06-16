"use client"

import React, { useState, useRef, useEffect } from 'react'
import { FiHeart, FiMessageSquare, FiSend, FiTrash2, FiEdit3, FiCopy, FiAlertTriangle, FiUser } from 'react-icons/fi'
import { FaHeart } from 'react-icons/fa'
import { HiEllipsisHorizontal, HiXMark } from 'react-icons/hi2'
import { get } from 'lodash'

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
}

export const PostCard = ({ post, onDeletePost, onUpdatePost }: PostCardProps) => {
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
  const menuRef = useRef<HTMLDivElement>(null)

  // Tashqariga bosilganda menyuni yopish
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Kommentariyalar bo'limi ochilganda bazadan yuklash
  useEffect(() => {
    loadComments()
  }, [])

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
    // Qiymatlarni aniq hisoblab olamiz
    const nextLiked = !liked
    const previousLiked = liked
    const previousCount = likesCount

    // UI'ni darhol yangilaymiz (Foydalanuvchiga tez ko'rinishi uchun)
    setLiked(nextLiked)
    setLikesCount(prev => nextLiked ? prev + 1 : prev - 1)

    try {
      const res = await fetch('/api/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }) // post.id UUID bo'lishi shart!
      })

      if (!res.ok) {
        const errorData = await res.json()
        console.error("Server xatoligi:", errorData)
        throw new Error("Serverda xato")
      }
    } catch (err) {
      // Agar serverda xato bo'lsa, eski holatga qaytaramiz
      console.error("Like bosishda xatolik:", err)
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`)
    alert("Post havolasi nusxalandi!")
    setShowMenu(false)
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden mt-4 relative transition-all ">

      <div className="flex items-center justify-between p-4 relative">
        <div className="flex items-center gap-3">
          <img src={post.avatar.startsWith('http') ? post.avatar : `${window.location.origin}${post.avatar}`} className="w-10 h-10 object-cover rounded-full bg-slate-100" alt="" />
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-slate-900 leading-none">{post.author}</h4>
              {post.isOwner && (
                <span className="bg-blue-50 text-blue-600 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider">Siz</span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">{post.time} • {post.location}</span>
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button onClick={() => setShowMenu(!showMenu)} className={`p-1 rounded-full transition-colors ${showMenu ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:text-slate-700'}`}>
            <HiEllipsisHorizontal className="w-6 h-6" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-100 rounded-xl shadow-xl z-40 p-1.5 animate-in fade-in zoom-in-95 duration-100">
              {post.isOwner ? (
                <>
                  <button onClick={() => { setIsEditing(true); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left">
                    <FiEdit3 className="w-4 h-4 text-slate-400" /> Tahrirlash
                  </button>
                  <button onClick={() => { if (onDeletePost) onDeletePost(post.id); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-left">
                    <FiTrash2 className="w-4 h-4" /> Postni o'chirish
                  </button>
                </>
              ) : (
                <>
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left"><FiUser className="w-4 h-4 text-slate-400" /> Profilni ko'rish</button>
                  <button onClick={handleCopyLink} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left"><FiCopy className="w-4 h-4 text-slate-400" /> Havolani nusxalash</button>
                  <div className="h-px bg-slate-100 my-1" />
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50 rounded-lg transition-colors text-left"><FiAlertTriangle className="w-4 h-4" /> Shikoyat qilish</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {post.image && (
        <div className="px-4">
          <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden bg-slate-100">
            <img src={post.image} alt="Post content" className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <button onClick={handleLikeToggle} className="flex items-center gap-1.5 text-slate-700 hover:text-rose-500 transition active:scale-90">
            {liked ? <FaHeart className="w-5 h-5 text-rose-500 animate-jump" /> : <FiHeart className="w-5 h-5" />}
            <span className="text-xs font-semibold text-slate-600">{likesCount}</span>
          </button>

          <button onClick={() => setShowComments(!showComments)} className={`flex items-center gap-1.5 transition active:scale-90 ${showComments ? 'text-blue-600' : 'text-slate-700 hover:text-blue-500'}`}>
            <FiMessageSquare className="w-5 h-5" />
            <span className="text-xs font-semibold text-slate-600">{commentsCount}</span>
          </button>

          <button className="text-slate-700 hover:text-indigo-500 transition"><FiSend className="w-5 h-5" /></button>
        </div>

        <button className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-xs font-bold transition active:scale-95">
          <div className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-white font-extrabold text-[9px]">$</div> Tip
        </button>
      </div>

      <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-b border-slate-50">
        <span className="font-bold text-slate-900 mr-1">{post.author}</span> {post.content}
      </div>

      {showComments && (
        <div className="bg-slate-50/70 p-4 space-y-3 border-t border-slate-100 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-3 duration-200">
          {loadingComments ? (
            <p className="text-[11px] text-slate-400 text-center py-2 font-medium">Izohlar yuklanmoqda...</p>
          ) : comments.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-2 font-medium">Birinchi bo'lib izoh qoldiring 💬</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2.5 text-xs">
                <img src={comment.avatar} className="w-6 h-6 object-cover rounded-full bg-slate-200 mt-0.5" alt="" />
                <div className="bg-white border border-slate-100 rounded-xl px-3 py-2 shadow-2xs max-w-[85%]">
                  <span className="font-bold text-slate-900 block text-[11px] mb-0.5">{comment.user}</span>
                  <p className="text-slate-700 leading-tight">{comment.text}</p>
                </div>
              </div>
            ))
          )}

          <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-2 border-t border-slate-200/60 sticky bottom-0 bg-slate-50/90">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Fikr bildiring..."
              className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500 transition-all"
            />
            <button type="submit" disabled={!commentText.trim()} className="p-2 bg-blue-600 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl transition active:scale-95">
              <FiSend className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsEditing(false)} />
          <form onSubmit={handleSaveEdit} className="bg-white border border-slate-100 w-full max-w-md rounded-2xl p-5 relative z-10 shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FiEdit3 className="w-4 h-4 text-blue-600" />
                <h3 className="font-black text-sm text-slate-900 tracking-tight">Postni tahrirlash</h3>
              </div>
              <button type="button" onClick={() => setIsEditing(false)} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600"><HiXMark className="w-5 h-5" /></button>
            </div>
            <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={4} className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none mb-4" maxLength={500} />
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl">Bekor qilish</button>
              <button type="submit" disabled={!editContent.trim() || editContent === post.content} className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-md ${editContent.trim() && editContent !== post.content ? 'bg-blue-600 hover:bg-blue-700 active:scale-95' : 'bg-slate-300 cursor-not-allowed shadow-none'}`}>Saqlash</button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}