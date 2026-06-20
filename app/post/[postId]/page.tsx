"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { HiArrowLeft, HiSun, HiMoon } from 'react-icons/hi2'
import { FiSend, FiHeart, FiCornerDownLeft } from 'react-icons/fi'
import { FaHeart } from 'react-icons/fa'
import Link from 'next/link'
import { PostCard } from '@/components/post-card'
import { PostDetailSkeleton } from '@/components/skeleton-loader'
import { usePost } from '@/hooks/use-queries'

function formatCommentTime(timeStr: string) {
    if (!timeStr) return ''
    try {
        const date = new Date(timeStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return 'Hozirgina'
        if (diffMins < 60) return `${diffMins}d`
        if (diffHours < 24) return `${diffHours}s`
        if (diffDays < 7) return `${diffDays}k`
        return date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })
    } catch {
        return ''
    }
}

export default function PostDetailPage() {
    const params = useParams()
    const router = useRouter()
    const postId = params.postId as string

    const { data: post = null, isLoading: loading, error } = usePost(postId)
    const [isDark, setIsDark] = useState(false)
    const [comments, setComments] = useState<any[]>([])
    const [commentsLoading, setCommentsLoading] = useState(false)
    const [commentText, setCommentText] = useState('')
    const [replyingTo, setReplyingTo] = useState<any | null>(null)

    const commentsEndRef = useRef<HTMLDivElement>(null)
    const commentInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'))
    }, [])

    useEffect(() => {
        if (!postId) return
        const fetchComments = async () => {
            try {
                setCommentsLoading(true)
                const res = await fetch(`/api/posts/comments?postId=${postId}`)
                if (res.ok) {
                    const data = await res.json()
                    setComments(data)
                }
            } catch (err) {
                console.error("Kommentlarni yuklashda xato:", err)
            } finally {
                setCommentsLoading(false)
            }
        }
        fetchComments()
    }, [postId])

    const toggleTheme = () => {
        const nextDark = !isDark
        setIsDark(nextDark)
        if (nextDark) {
            document.documentElement.classList.add('dark')
            localStorage.setItem('theme', 'dark')
        } else {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('theme', 'light')
        }
    }

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!commentText.trim()) return

        const payload = {
            postId,
            content: commentText,
            parentId: replyingTo?.id || null
        }

        try {
            const res = await fetch('/api/posts/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                const newComment = await res.json()
                setComments(prev => [...prev, newComment])
                setCommentText('')
                setReplyingTo(null)
                setTimeout(() => {
                    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                }, 100)
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

    const handleLikeComment = useCallback(async (commentId: string) => {
        // Optimistic UI Update
        setComments(prev => prev.map(c => {
            if (c.id === commentId) {
                const nextLiked = !c.likedByMe
                return {
                    ...c,
                    likedByMe: nextLiked,
                    likesCount: nextLiked ? c.likesCount + 1 : Math.max(0, c.likesCount - 1)
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
                        likesCount: nextLiked ? c.likesCount + 1 : Math.max(0, c.likesCount - 1)
                    }
                }
                return c
            }))
        }
    }, [])

    const handleReplyTo = useCallback((comment: any) => {
        setReplyingTo(comment)
        commentInputRef.current?.focus()
    }, [])

    if (loading) {
        return <PostDetailSkeleton />
    }

    const postTitle = post?.content 
        ? (post.content.trim().split('\n')[0].slice(0, 35) + (post.content.trim().split('\n')[0].length > 35 ? '...' : '')) 
        : 'Post'

    // Separate Root comments and nested replies
    const rootComments = comments.filter(c => !c.parentId)
    const getRepliesFor = (parentId: string) => comments.filter(c => c.parentId === parentId)

    // Render individual comment component to reuse for replies
    const renderCommentNode = (comment: any, isReply = false) => {
        return (
            <div 
                key={comment.id} 
                className={`flex items-start gap-3 text-xs animate-comment-slide-in [will-change:transform,opacity]`}
            >
                <img 
                    src={comment.avatar} 
                    className="w-9 h-9 object-cover rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" 
                    alt="" 
                    loading="lazy"
                />
                <div className="flex-1 min-w-0">
                    <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-white/5 rounded-2xl px-4 py-2.5">
                        <span className="font-bold text-slate-950 dark:text-slate-100 block text-[11px] mb-0.5">
                            {comment.user}
                        </span>
                        <p className="text-slate-800 dark:text-slate-100 leading-relaxed font-normal break-words select-text">
                            {comment.text}
                        </p>
                    </div>
                    {/* Action buttons (Like / Reply Icons) */}
                    <div className="flex items-center gap-4 mt-1.5 ml-2 text-[10px] font-bold text-slate-400 dark:text-slate-550 select-none">
                        <span>{formatCommentTime(comment.createdAt)}</span>
                        <button 
                            onClick={() => handleLikeComment(comment.id)} 
                            className={`hover:text-rose-500 transition-colors flex items-center gap-1 ${comment.likedByMe ? 'text-rose-500 font-black' : ''}`}
                        >
                            {comment.likedByMe ? <FaHeart className="w-[17px] h-[17px] text-rose-500" /> : <FiHeart className="w-[17px] h-[17px]" />}
                            {comment.likesCount > 0 && <span className="text-[10px]">{comment.likesCount}</span>}
                        </button>
                        {!isReply && (
                            <button 
                                onClick={() => handleReplyTo(comment)} 
                                className="hover:text-blue-500 transition-colors flex items-center"
                            >
                                <FiCornerDownLeft className="w-[17px] h-[17px]" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="h-[100dvh] flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-hidden">
            {/* Header */}
            <header className="flex-shrink-0 flex items-center justify-between h-16 px-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-100 dark:border-white/5 select-none">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={() => {
                            if (window.history.length > 1) {
                                router.back()
                            } else {
                                router.push('/dashboard')
                            }
                        }}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800/40 rounded-xl active:scale-90 transition-all text-slate-700 dark:text-slate-300 cursor-pointer flex-shrink-0"
                    >
                        <HiArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="text-base font-black text-slate-900 dark:text-white truncate">
                        {postTitle}
                    </span>
                </div>

                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40 active:scale-90 transition-all cursor-pointer flex-shrink-0"
                >
                    {isDark ? <HiSun className="w-5 h-5 text-amber-500" /> : <HiMoon className="w-5 h-5" />}
                </button>
            </header>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto [will-change:scroll-position] overscroll-y-contain scrollbar-none -webkit-overflow-scrolling-touch">
                <main className="py-6 max-w-2xl mx-auto px-4 md:px-6 space-y-6">
                    {error || !post ? (
                        <div className="w-full p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl text-center flex flex-col items-center justify-center">
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-450 mb-3">
                                {error instanceof Error ? error.message : (typeof error === 'string' ? error : "Post topilmadi")}
                            </p>
                            <Link href="/dashboard" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl active:scale-95 transition-all">
                                Tasmasiga qaytish
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="animate-fade-in-up [will-change:transform,opacity]">
                                <PostCard post={{ ...post, commentsCount: comments.length }} isDetailPage={true} />
                            </div>

                            {/* Inline Comments Section */}
                            <div id="comments-section" className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-4 sm:p-6 space-y-4">
                                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                                    <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Izohlar</span>
                                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full">
                                        {comments.length}
                                    </span>
                                </div>

                                {commentsLoading && comments.length === 0 ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : comments.length === 0 ? (
                                    <div className="text-center py-8 text-slate-450 dark:text-slate-500 text-xs font-semibold">
                                        Hozircha izohlar yo'q. Birinchi bo'lib fikr bildiring! 💬
                                    </div>
                                ) : (
                                    <div className="space-y-4 [content-visibility:auto]">
                                        {rootComments.map((comment) => {
                                            const replies = getRepliesFor(comment.id)
                                            return (
                                                <div key={comment.id} className="space-y-3">
                                                    {/* Root Comment */}
                                                    {renderCommentNode(comment, false)}

                                                    {/* Nested replies */}
                                                    {replies.length > 0 && (
                                                        <div className="ml-10 sm:ml-12 pl-3 border-l-2 border-slate-100 dark:border-white/5 space-y-3">
                                                            {replies.map(reply => renderCommentNode(reply, true))}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                        <div ref={commentsEndRef} />
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </main>
            </div>

            {/* Replying to indicator preview */}
            {replyingTo && (
                <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-450 select-none animate-in fade-in slide-in-from-bottom-1 duration-150">
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

            {/* Pinned Bottom Input */}
            {post && (
                <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 p-4 sticky bottom-0 z-10 w-full">
                    <div className="max-w-2xl mx-auto">
                        <form onSubmit={handleAddComment} className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-white/10 rounded-2xl px-4 py-3 flex items-center gap-2 focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all">
                                <input
                                    ref={commentInputRef}
                                    type="text"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder={replyingTo ? "Javob yozing..." : "Fikr bildiring..."}
                                    className="w-full bg-transparent text-xs outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={!commentText.trim()} 
                                className="p-3.5 bg-blue-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-450 dark:disabled:text-slate-650 rounded-2xl transition active:scale-95 shrink-0 flex items-center justify-center cursor-pointer shadow-md shadow-blue-500/10"
                            >
                                <FiSend className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
