"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { FiHeart, FiMessageSquare, FiShare2, FiFlag, FiLink, FiSend, FiEdit3 } from 'react-icons/fi'
import { FaHeart, FaTelegram, FaBookmark, FaRegBookmark } from 'react-icons/fa'
import { HiSpeakerWave, HiSpeakerXMark, HiPlay, HiPause, HiXMark, HiChevronDown } from 'react-icons/hi2'
import { BsFilm } from 'react-icons/bs'


interface ReelType {
    id: string
    videoUrl: string
    thumbnailUrl: string | null
    title: string
    description: string
    author: string
    username: string
    avatar: string
    likes: number
    isLikedByMe: boolean
    commentsCount: number
    sharesCount: number
    savesCount: number
    views: number
    isOwner: boolean
    isSavedByMe: boolean
    createdAt: string
}

interface CommentType {
    id: string
    text: string
    parentId: string | null
    likesCount: number
    isLikedByMe: boolean
    createdAt: string
    user: {
        id: string
        nickname: string
        username: string
        avatar: string
    }
    replies: CommentType[]
}

// ========== VAQT FORMATI ==========

function formatTimeAgo(dateStr: string): string {
    if (!dateStr) return ''
    try {
        const diff = Date.now() - new Date(dateStr).getTime()
        const mins = Math.floor(diff / 60000)
        const hrs = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)
        if (mins < 1) return 'Hozirgina'
        if (mins < 60) return `${mins}d`
        if (hrs < 24) return `${hrs}s`
        if (days < 7) return `${days}k`
        return `${Math.floor(days / 7)}h`
    } catch { return '' }
}

// ========== KOMMENTLAR DRAWER ==========

function CommentsDrawer({
    reelId,
    isOpen,
    onClose,
    commentsCount,
    onCommentsCountChange
}: {
    reelId: string
    isOpen: boolean
    onClose: () => void
    commentsCount: number
    onCommentsCountChange: (count: number) => void
}) {
    const [comments, setComments] = useState<CommentType[]>([])
    const [loading, setLoading] = useState(true)
    const [text, setText] = useState('')
    const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null)
    const [sending, setSending] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (isOpen) {
            setLoading(true)
            fetch(`/api/reels/comments?reelId=${reelId}`)
                .then(r => r.json())
                .then(data => {
                    if (Array.isArray(data)) setComments(data)
                })
                .catch(() => { })
                .finally(() => setLoading(false))
        }
    }, [isOpen, reelId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!text.trim() || sending) return

        setSending(true)
        try {
            const res = await fetch('/api/reels/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reelId,
                    text: text.trim(),
                    parentId: replyTo?.id || null,
                })
            })
            if (res.ok) {
                const newComment = await res.json()
                if (replyTo) {
                    setComments(prev => prev.map(c =>
                        c.id === replyTo.id
                            ? { ...c, replies: [...c.replies, newComment] }
                            : c
                    ))
                } else {
                    setComments(prev => [...prev, newComment])
                }
                onCommentsCountChange(commentsCount + 1)
                setText('')
                setReplyTo(null)
                setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 100)
            }
        } catch { }
        setSending(false)
    }

    const handleCommentLike = async (commentId: string) => {
        try {
            const res = await fetch('/api/reels/comments/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ commentId })
            })
            if (res.ok) {
                const { liked } = await res.json()
                const updateComment = (c: CommentType): CommentType => {
                    if (c.id === commentId) {
                        return { ...c, isLikedByMe: liked, likesCount: liked ? c.likesCount + 1 : c.likesCount - 1 }
                    }
                    return { ...c, replies: c.replies.map(updateComment) }
                }
                setComments(prev => prev.map(updateComment))
            }
        } catch { }
    }

    if (!isOpen || !mounted) return null

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center md:items-stretch md:justify-end">
            {/* Backdrop — desktopda yengilroq (yon panel, modal emas) */}
            <div className="fixed inset-0 bg-black/60 md:bg-black/20 animate-overlay-in" onClick={onClose} />

            {/* Drawer — mobilda pastdan, desktopda o'ng yondan chiqadi */}
            <div className="relative z-10 bg-white dark:bg-slate-900 w-full md:w-[400px] rounded-t-2xl md:rounded-none max-h-[70vh] md:max-h-none md:h-full flex flex-col animate-drawer-slide-up md:animate-slide-from-right border-slate-200 dark:border-white/10 md:border-l shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10">
                    <span className="text-slate-900 dark:text-white font-bold text-sm">Izohlar ({commentsCount})</span>
                    <button onClick={onClose} className="p-1.5 text-slate-400 dark:text-white/60 hover:text-slate-700 dark:hover:text-white transition-colors">
                        <HiXMark className="w-5 h-5" />
                    </button>
                </div>

                {/* Kommentlar ro'yxati */}
                <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-5 h-5 border-2 border-slate-300 dark:border-white/40 border-t-blue-600 dark:border-t-white rounded-full animate-spin" />
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <FiMessageSquare className="w-8 h-8 text-slate-300 dark:text-white/20 mb-2" />
                            <p className="text-slate-400 dark:text-white/40 text-xs font-medium">Hali izohlar yo'q. Birinchi bo'ling!</p>
                        </div>
                    ) : (
                        comments.map((comment, i) => (
                            <div key={comment.id} className="animate-comment-slide-in" style={{ animationDelay: `${i * 30}ms` }}>
                                {/* Asosiy komment */}
                                <div className="flex gap-2.5">
                                    <img
                                        src={comment.user.avatar}
                                        alt=""
                                        className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-900 dark:text-white font-bold text-xs">{comment.user.nickname}</span>
                                            <span className="text-slate-400 dark:text-white/30 text-[10px]">{formatTimeAgo(comment.createdAt)}</span>
                                        </div>
                                        <p className="text-slate-700 dark:text-white/80 text-xs leading-relaxed mt-0.5">{comment.text}</p>
                                        <div className="flex items-center gap-4 mt-1.5">
                                            <button
                                                onClick={() => handleCommentLike(comment.id)}
                                                className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/70 transition-colors"
                                            >
                                                {comment.isLikedByMe ? (
                                                    <FaHeart className="w-3 h-3 text-rose-500" />
                                                ) : (
                                                    <FiHeart className="w-3 h-3" />
                                                )}
                                                {comment.likesCount > 0 && comment.likesCount}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setReplyTo({ id: comment.id, username: comment.user.nickname })
                                                    inputRef.current?.focus()
                                                }}
                                                className="text-[10px] font-bold text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/70 transition-colors"
                                            >
                                                Javob
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Reply'lar */}
                                {comment.replies.length > 0 && (
                                    <div className="ml-10 mt-2 space-y-3 border-l border-slate-200 dark:border-white/10 pl-3">
                                        {comment.replies.map(reply => (
                                            <div key={reply.id} className="flex gap-2">
                                                <img src={reply.user.avatar} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-900 dark:text-white font-bold text-[11px]">{reply.user.nickname}</span>
                                                        <span className="text-slate-400 dark:text-white/30 text-[9px]">{formatTimeAgo(reply.createdAt)}</span>
                                                    </div>
                                                    <p className="text-slate-600 dark:text-white/70 text-[11px] leading-relaxed mt-0.5">{reply.text}</p>
                                                    <button
                                                        onClick={() => handleCommentLike(reply.id)}
                                                        className="flex items-center gap-1 mt-1 text-[10px] font-bold text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/70 transition-colors"
                                                    >
                                                        {reply.isLikedByMe ? <FaHeart className="w-2.5 h-2.5 text-rose-500" /> : <FiHeart className="w-2.5 h-2.5" />}
                                                        {reply.likesCount > 0 && reply.likesCount}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="p-3 border-t border-slate-200 dark:border-white/10 flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm pb-[calc(0.5rem+env(safe-area-inset-bottom))] relative">
                    {replyTo && (
                        <div className="absolute -top-7 left-3 right-3 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-1 flex items-center justify-between">
                            <span className="text-slate-500 dark:text-white/50 text-[10px]">↳ {replyTo.username} ga javob</span>
                            <button type="button" onClick={() => setReplyTo(null)} className="text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/70">
                                <HiXMark className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                    <input
                        ref={inputRef}
                        type="text"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder={replyTo ? `${replyTo.username} ga javob...` : "Izoh qoldiring..."}
                        className="flex-1 bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 text-xs rounded-full px-4 py-2.5 outline-none focus:bg-slate-200 dark:focus:bg-white/15 transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={!text.trim() || sending}
                        className="p-2.5 bg-blue-600 disabled:bg-slate-200 dark:disabled:bg-white/10 text-white disabled:text-slate-400 dark:disabled:text-white/30 rounded-full transition-all active:scale-90"
                    >
                        <FiSend className="w-3.5 h-3.5" />
                    </button>
                </form>
            </div>
        </div>,
        document.body
    )
}

// ========== SHARE SHEET ==========

function ShareSheet({
    reelId,
    reelTitle,
    onClose
}: {
    reelId: string
    reelTitle: string
    onClose: () => void
}) {
    const [copied, setCopied] = useState(false)
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

    const reelUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/dashboard/reels?id=${reelId}`
        : ''

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(reelUrl)
            setCopied(true)
            // Share hodisasini qayd qilish
            fetch('/api/reels/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reelId, method: 'link' })
            }).catch(() => { })
            setTimeout(() => setCopied(false), 2000)
        } catch { }
    }

    const handleTelegramShare = () => {
        const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(reelUrl)}&text=${encodeURIComponent(reelTitle || 'VibeGrid Reel')}`
        window.open(telegramUrl, '_blank')
        fetch('/api/reels/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reelId, method: 'telegram' })
        }).catch(() => { })
    }

    const handleNativeShare = () => {
        if (navigator.share) {
            navigator.share({
                title: reelTitle || 'VibeGrid Reel',
                url: reelUrl,
            })
            fetch('/api/reels/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reelId, method: 'native' })
            }).catch(() => { })
        }
    }

    if (!mounted) return null

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center">
            <div className="fixed inset-0 bg-black/60 animate-overlay-in" onClick={onClose} />
            <div className="relative z-10 bg-white dark:bg-slate-900 w-full md:max-w-[420px] rounded-t-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] animate-share-fade-in">
                <div className="flex items-center justify-between mb-5">
                    <span className="text-slate-900 dark:text-white font-bold text-sm">Ulashish</span>
                    <button onClick={onClose} className="p-1.5 text-slate-400 dark:text-white/60 hover:text-slate-700 dark:hover:text-white transition-colors">
                        <HiXMark className="w-5 h-5" />
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                    <button
                        onClick={handleCopyLink}
                        className="flex flex-col items-center gap-2 p-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl transition-all active:scale-95"
                    >
                        <div className="w-12 h-12 bg-slate-200 dark:bg-white/10 rounded-full flex items-center justify-center">
                            <FiLink className="w-5 h-5 text-slate-700 dark:text-white" />
                        </div>
                        <span className="text-slate-700 dark:text-slate-200 text-[11px] font-extrabold tracking-wide">
                            {copied ? '✓ Nusxalandi' : 'Havola'}
                        </span>
                    </button>

                    <button
                        onClick={handleTelegramShare}
                        className="flex flex-col items-center gap-2 p-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl transition-all active:scale-95"
                    >
                        <div className="w-12 h-12 bg-sky-500/20 rounded-full flex items-center justify-center">
                            <FaTelegram className="w-6 h-6 text-sky-400" />
                        </div>
                        <span className="text-slate-700 dark:text-slate-200 text-[11px] font-extrabold tracking-wide">Telegram</span>
                    </button>

                    {'share' in navigator && (
                        <button
                            onClick={handleNativeShare}
                            className="flex flex-col items-center gap-2 p-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl transition-all active:scale-95"
                        >
                            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                                <FiShare2 className="w-5 h-5 text-green-400" />
                            </div>
                            <span className="text-slate-700 dark:text-slate-200 text-[11px] font-extrabold tracking-wide">Boshqa</span>
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}

// ========== REPORT MODAL ==========

function ReportModal({
    reelId,
    onClose
}: {
    reelId: string
    onClose: () => void
}) {
    const [selectedReason, setSelectedReason] = useState('')
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

    const reasons = [
        'Noqonuniy kontent',
        'Zo\'ravonlik yoki xavfli xatti-harakatlar',
        'Noto\'g\'ri ma\'lumot (spam)',
        'Jinsi aloqaga oid kontent',
        'Mualliflik huquqi buzilgan',
        'Boshqa sabab',
    ]

    const handleSubmit = async () => {
        if (!selectedReason || sending) return
        setSending(true)
        try {
            const res = await fetch('/api/reels/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reelId, reason: selectedReason })
            })
            if (res.ok) {
                setSent(true)
                setTimeout(onClose, 1500)
            } else {
                const data = await res.json()
                alert(data.error || 'Xatolik')
            }
        } catch { alert('Xatolik') }
        setSending(false)
    }

    if (!mounted) return null

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70 animate-overlay-in" onClick={onClose} />
            <div className="relative z-10 bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-5 animate-share-fade-in border border-slate-200 dark:border-white/10">
                {sent ? (
                    <div className="flex flex-col items-center py-6 text-center">
                        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-3">
                            <span className="text-2xl">✓</span>
                        </div>
                        <h3 className="text-slate-900 dark:text-white font-bold text-sm">Shikoyat qabul qilindi</h3>
                        <p className="text-slate-400 dark:text-white/40 text-xs mt-1">Tez orada ko'rib chiqiladi</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-900 dark:text-white font-bold text-sm">Shikoyat qilish</h3>
                            <button onClick={onClose} className="p-1.5 text-slate-400 dark:text-white/60 hover:text-slate-700 dark:hover:text-white transition-colors">
                                <HiXMark className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-slate-400 dark:text-white/40 text-xs mb-4">Bu kontent nima uchun noto'g'ri?</p>
                        <div className="space-y-2 mb-5">
                            {reasons.map(reason => (
                                <button
                                    key={reason}
                                    onClick={() => setSelectedReason(reason)}
                                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-medium transition-all ${selectedReason === reason
                                        ? 'bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30'
                                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70 border border-transparent hover:bg-slate-200 dark:hover:bg-white/10'
                                        }`}
                                >
                                    {reason}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={!selectedReason || sending}
                            className="w-full py-3 bg-rose-600 disabled:bg-slate-200 dark:disabled:bg-white/10 text-white disabled:text-slate-400 dark:disabled:text-white/30 font-bold text-xs rounded-xl transition-all active:scale-[0.98]"
                        >
                            {sending ? 'Yuborilmoqda...' : 'Shikoyat yuborish'}
                        </button>
                    </>
                )}
            </div>
        </div>,
        document.body
    )
}

// ========== REEL EDIT MODAL ==========

function EditReelModal({
    reel,
    onClose,
    onUpdateReel,
}: {
    reel: ReelType
    onClose: () => void
    onUpdateReel: (id: string, updates: Partial<ReelType>) => void
}) {
    const [title, setTitle] = useState(reel.title || '')
    const [description, setDescription] = useState(reel.description || '')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

    const handleSave = async () => {
        if (saving) return
        setSaving(true)
        setError('')
        try {
            const res = await fetch('/api/reels', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: reel.id,
                    title: title.trim(),
                    description: description.trim(),
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi')
            onUpdateReel(reel.id, { title: title.trim(), description: description.trim() })
            onClose()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Saqlashda xatolik yuz berdi')
        } finally {
            setSaving(false)
        }
    }

    if (!mounted) return null

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70 animate-overlay-in" onClick={onClose} />
            <div className="relative z-10 bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-5 animate-share-fade-in border border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-slate-900 dark:text-white font-bold text-sm">Reelni tahrirlash</h3>
                    <button onClick={onClose} className="p-1.5 text-slate-400 dark:text-white/60 hover:text-slate-700 dark:hover:text-white transition-colors">
                        <HiXMark className="w-5 h-5" />
                    </button>
                </div>

                <label className="block text-slate-400 dark:text-white/40 text-xs font-semibold mb-1.5">Sarlavha</label>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                    placeholder="Reel sarlavhasi"
                    className="w-full mb-4 px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors"
                />

                <label className="block text-slate-400 dark:text-white/40 text-xs font-semibold mb-1.5">Tavsif</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Tavsif (#hashtag qo'shishingiz mumkin)"
                    className="w-full mb-2 px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
                />

                {error && <p className="text-rose-500 dark:text-rose-400 text-xs mb-3">{error}</p>}

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full mt-2 py-3 bg-blue-600 disabled:bg-slate-200 dark:disabled:bg-white/10 text-white disabled:text-slate-400 dark:disabled:text-white/30 font-bold text-xs rounded-xl transition-all active:scale-[0.98]"
                >
                    {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
            </div>
        </div>,
        document.body
    )
}

// ========== REEL CARD ==========

function ReelCard({
    reel,
    isActive,
    isAdjacent,
    isMuted,
    onToggleMute,
    onUpdateReel
}: {
    reel: ReelType
    isActive: boolean
    isAdjacent: boolean
    isMuted: boolean
    onToggleMute: () => void
    onUpdateReel: (id: string, updates: Partial<ReelType>) => void
}) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [liked, setLiked] = useState(reel.isLikedByMe)
    const [likesCount, setLikesCount] = useState(reel.likes)
    const [saved, setSaved] = useState(reel.isSavedByMe)
    const [showPlayIcon, setShowPlayIcon] = useState(false)
    const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false)
    const [doubleTapPos, setDoubleTapPos] = useState({ x: 0, y: 0 })
    const [progress, setProgress] = useState(0)
    const [commentsCount, setCommentsCount] = useState(reel.commentsCount)

    // Drawer/Sheet/Modal statelari
    const [commentsOpen, setCommentsOpen] = useState(false)
    const [shareOpen, setShareOpen] = useState(false)
    const [reportOpen, setReportOpen] = useState(false)
    const [editOpen, setEditOpen] = useState(false)

    // Watch time tracking
    const watchStartRef = useRef<number>(0)
    const watchSentRef = useRef(false)
    const lastTapRef = useRef<number>(0)

    // Video play/pause — active bo'lganda
    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        if (isActive) {
            watchStartRef.current = Date.now()
            watchSentRef.current = false
            video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
        } else {
            video.pause()
            video.currentTime = 0
            setIsPlaying(false)

            // Watch time yuborish
            if (watchStartRef.current && !watchSentRef.current) {
                const watchSec = (Date.now() - watchStartRef.current) / 1000
                if (watchSec >= 1) {
                    watchSentRef.current = true
                    fetch('/api/reels/view', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            reelId: reel.id,
                            watchSeconds: Math.round(watchSec),
                            videoDuration: video.duration || 0,
                            completed: watchSec >= (video.duration || 999) * 0.9,
                        })
                    }).catch(() => { })
                }
            }
        }
    }, [isActive, reel.id])

    useEffect(() => {
        if (videoRef.current) videoRef.current.muted = isMuted
    }, [isMuted])

    useEffect(() => {
        const video = videoRef.current
        if (!video) return
        const handleTimeUpdate = () => {
            if (video.duration) setProgress((video.currentTime / video.duration) * 100)
        }
        video.addEventListener('timeupdate', handleTimeUpdate)
        return () => video.removeEventListener('timeupdate', handleTimeUpdate)
    }, [])

    // Sahifadan chiqayotganda watch time yuborish
    useEffect(() => {
        return () => {
            if (watchStartRef.current && !watchSentRef.current && isActive) {
                const watchSec = (Date.now() - watchStartRef.current) / 1000
                if (watchSec >= 1) {
                    navigator.sendBeacon?.('/api/reels/view', JSON.stringify({
                        reelId: reel.id,
                        watchSeconds: Math.round(watchSec),
                        videoDuration: videoRef.current?.duration || 0,
                        completed: false,
                    }))
                }
            }
        }
    }, [isActive, reel.id])

    const togglePlay = () => {
        const video = videoRef.current
        if (!video) return
        if (video.paused) { video.play(); setIsPlaying(true) }
        else { video.pause(); setIsPlaying(false) }
        setShowPlayIcon(true)
        setTimeout(() => setShowPlayIcon(false), 600)
    }

    // Double-tap like
    const handleVideoClick = (e: React.MouseEvent) => {
        const now = Date.now()
        if (now - lastTapRef.current < 300) {
            // Double tap — like
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
            setDoubleTapPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
            setShowDoubleTapHeart(true)
            setTimeout(() => setShowDoubleTapHeart(false), 1200)

            if (!liked) {
                setLiked(true)
                setLikesCount(prev => prev + 1)
                fetch('/api/reels/like', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reelId: reel.id })
                }).catch(() => { setLiked(false); setLikesCount(prev => prev - 1) })
            }
            lastTapRef.current = 0
        } else {
            lastTapRef.current = now
            setTimeout(() => {
                if (lastTapRef.current === now) togglePlay()
            }, 300)
        }
    }

    const handleLike = async () => {
        const prevLiked = liked
        const prevCount = likesCount
        setLiked(!liked)
        setLikesCount(prev => liked ? prev - 1 : prev + 1)
        try {
            const res = await fetch('/api/reels/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reelId: reel.id })
            })
            if (!res.ok) throw new Error()
        } catch {
            setLiked(prevLiked)
            setLikesCount(prevCount)
        }
    }

    const handleSave = async () => {
        const prevSaved = saved
        setSaved(!saved)
        try {
            const res = await fetch('/api/reels/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reelId: reel.id })
            })
            if (!res.ok) throw new Error()
        } catch { setSaved(prevSaved) }
    }

    // Smart preloading attr
    const preloadAttr = isActive ? "auto" : isAdjacent ? "metadata" : "none"

    return (
        <div className="relative w-full h-full bg-black flex-shrink-0">
            {/* Smooth transition container */}
            <div className={`w-full h-full relative transition-all duration-700 ease-out ${isActive ? 'scale-100 opacity-100 blur-none' : 'scale-93 opacity-35 blur-[2px]'
                }`}>
                {/* Video */}
                <video
                    ref={videoRef}
                    src={reel.videoUrl}
                    poster={reel.thumbnailUrl || undefined}
                    loop
                    playsInline
                    muted={isMuted}
                    preload={preloadAttr}
                    controlsList="nodownload noplaybackrate"
                    disablePictureInPicture
                    onContextMenu={(e) => e.preventDefault()}
                    onClick={handleVideoClick}
                    className="no-media-save absolute inset-0 w-full h-full object-contain bg-black cursor-pointer"
                />

                {/* Double-tap Heart (No shadows!) */}
                {showDoubleTapHeart && (
                    <div
                        className="absolute z-30 pointer-events-none animate-double-tap-heart"
                        style={{ left: doubleTapPos.x - 40, top: doubleTapPos.y - 40 }}
                    >
                        <FaHeart className="w-20 h-20 text-rose-500" />
                    </div>
                )}

                {/* Play/Pause */}
                {showPlayIcon && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                        <div className="w-16 h-16 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center animate-ping-once">
                            {isPlaying
                                ? <HiPlay className="w-8 h-8 text-white ml-1" />
                                : <HiPause className="w-8 h-8 text-white" />
                            }
                        </div>
                    </div>
                )}

                {/* Progress bar */}
                <div className="absolute top-0 left-0 right-0 z-30 h-[2px] bg-white/15">
                    <div className="h-full bg-white/80 transition-all duration-200" style={{ width: `${progress}%` }} />
                </div>

                {/* Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none z-10" />

                {/* O'ng — Action buttons (Shadowless!) */}
                <div className="absolute right-4 bottom-24 md:bottom-28 z-20 flex flex-col items-center gap-4">
                    {/* Like */}
                    <button data-like-button onClick={handleLike} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
                        {liked
                            ? <FaHeart className="w-7 h-7 text-rose-500 animate-jump" />
                            : <FiHeart className="w-7 h-7 text-white" />
                        }
                        <span className="text-white text-[10px] font-bold">{likesCount}</span>
                    </button>

                    {/* Comments */}
                    <button onClick={() => setCommentsOpen(true)} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
                        <FiMessageSquare className="w-7 h-7 text-white" />
                        <span className="text-white text-[10px] font-bold">{commentsCount}</span>
                    </button>

                    {/* Save / Bookmark */}
                    <button onClick={handleSave} className={`flex flex-col items-center gap-1 active:scale-90 transition-transform ${saved ? 'animate-bookmark-bounce' : ''}`}>
                        {saved
                            ? <FaBookmark className="w-6 h-6 text-amber-400" />
                            : <FaRegBookmark className="w-6 h-6 text-white" />
                        }
                        <span className="text-white text-[10px] font-bold">{saved ? 'Saqlandi' : 'Saqlash'}</span>
                    </button>

                    {/* Share */}
                    <button onClick={() => setShareOpen(true)} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
                        <FiShare2 className="w-6 h-6 text-white" />
                        <span className="text-white text-[10px] font-bold">Ulashish</span>
                    </button>

                    {/* Tahrirlash (faqat egasi) */}
                    {reel.isOwner && (
                        <button onClick={() => setEditOpen(true)} className="mt-1 active:scale-90 transition-transform" title="Tahrirlash">
                            <FiEdit3 className="w-5 h-5 text-white/60 hover:text-white transition-colors" />
                        </button>
                    )}

                    {/* Report */}
                    {!reel.isOwner && (
                        <button onClick={() => setReportOpen(true)} className="mt-1 active:scale-90 transition-transform">
                            <FiFlag className="w-5 h-5 text-white/50 hover:text-white/80 transition-colors" />
                        </button>
                    )}

                    {/* Mute */}
                    <button onClick={onToggleMute} className="mt-1 w-9 h-9 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center active:scale-90 transition-transform">
                        {isMuted
                            ? <HiSpeakerXMark className="w-4 h-4 text-white" />
                            : <HiSpeakerWave className="w-4 h-4 text-white" />
                        }
                    </button>
                </div>

                {/* Pastki qism — Author (Shadowless!) */}
                <div className="absolute bottom-20 md:bottom-8 left-4 right-16 z-20">
                    <div className="flex items-center gap-3 mb-2">
                        <img
                            src={reel.avatar.startsWith('http') ? reel.avatar : `${typeof window !== 'undefined' ? window.location.origin : ''}${reel.avatar}`}
                            alt={reel.author}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-white/30"
                        />
                        <div className="flex-1 min-w-0">
                            <h4 className="text-white font-bold text-sm truncate">{reel.author}</h4>
                            <span className="text-white/60 text-xs font-medium">@{reel.username}</span>
                        </div>
                    </div>

                    {reel.title && (
                        <p className="text-white text-sm font-semibold mb-0.5 line-clamp-1">{reel.title}</p>
                    )}
                    {reel.description && (
                        <p className="text-white/70 text-xs leading-relaxed line-clamp-2">{reel.description}</p>
                    )}
                </div>
            </div>

            {/* Modals */}
            <CommentsDrawer
                reelId={reel.id}
                isOpen={commentsOpen}
                onClose={() => setCommentsOpen(false)}
                commentsCount={commentsCount}
                onCommentsCountChange={setCommentsCount}
            />
            {shareOpen && (
                <ShareSheet
                    reelId={reel.id}
                    reelTitle={reel.title}
                    onClose={() => setShareOpen(false)}
                />
            )}
            {reportOpen && (
                <ReportModal
                    reelId={reel.id}
                    onClose={() => setReportOpen(false)}
                />
            )}
            {editOpen && (
                <EditReelModal
                    reel={reel}
                    onClose={() => setEditOpen(false)}
                    onUpdateReel={onUpdateReel}
                />
            )}
        </div>
    )
}

// ========== ASOSIY REELS SAHIFASI ==========

export default function ReelsPage() {
    const [reels, setReels] = useState<ReelType[]>([])
    const [loading, setLoading] = useState(true)
    const [isMuted, setIsMuted] = useState(true)
    const [activeIndex, setActiveIndex] = useState(0)
    const [activeTab, setActiveTab] = useState<'foryou' | 'following'>('foryou')
    const containerRef = useRef<HTMLDivElement>(null)

    const fetchReels = useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/reels?mode=${activeTab}`)
            if (res.ok) {
                const data = await res.json()
                setReels(data)
                setActiveIndex(0)
            }
        } catch (err) {
            console.error('Reellarni yuklashda xato:', err)
        } finally {
            setLoading(false)
        }
    }, [activeTab])

    useEffect(() => { fetchReels() }, [fetchReels])

    // Intersection Observer to detect active video card
    useEffect(() => {
        const container = containerRef.current
        if (!container || loading || reels.length === 0) return

        const observerOptions = {
            root: container,
            threshold: 0.6
        }

        const observerCallback = (entries: IntersectionObserverEntry[]) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const idxStr = entry.target.getAttribute('data-index')
                    if (idxStr !== null) {
                        const idx = parseInt(idxStr, 10)
                        setActiveIndex(idx)
                    }
                }
            })
        }

        const observer = new IntersectionObserver(observerCallback, observerOptions)
        const targets = container.querySelectorAll('.reel-card-wrapper')
        targets.forEach((target) => observer.observe(target))

        return () => observer.disconnect()
    }, [reels, loading])

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (loading || reels.length === 0) return

            // Don't intercept if user is typing in comments/input
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return
            }

            if (e.key === 'ArrowDown') {
                e.preventDefault()
                if (activeIndex < reels.length - 1) {
                    const nextIdx = activeIndex + 1
                    setActiveIndex(nextIdx)
                    containerRef.current?.children[nextIdx]?.scrollIntoView({ behavior: 'smooth' })
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                if (activeIndex > 0) {
                    const prevIdx = activeIndex - 1
                    setActiveIndex(prevIdx)
                    containerRef.current?.children[prevIdx]?.scrollIntoView({ behavior: 'smooth' })
                }
            } else if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault()
                const activeVideo = containerRef.current?.children[activeIndex]?.querySelector('video')
                if (activeVideo) {
                    if (activeVideo.paused) {
                        activeVideo.play()
                    } else {
                        activeVideo.pause()
                    }
                }
            } else if (e.key === 'm' || e.key === 'M') {
                setIsMuted(prev => !prev)
            } else if (e.key === 'l' || e.key === 'L') {
                const likeBtn = containerRef.current?.children[activeIndex]?.querySelector('[data-like-button]') as HTMLButtonElement
                if (likeBtn) {
                    likeBtn.click()
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [activeIndex, reels.length, loading])

    const handleUpdateReel = (id: string, updates: Partial<ReelType>) => {
        setReels(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
    }

    if (loading) {
        return (
            <div className="relative w-full h-svh bg-slate-950 md:max-w-[450px] md:mx-auto md:border-x md:border-white/10 overflow-hidden animate-pulse select-none">
                {/* Simulated Video Placeholder */}
                <div className="absolute inset-0 bg-slate-900/40" />

                {/* Simulated Right Action Buttons */}
                <div className="absolute right-4 bottom-24 md:bottom-28 z-20 flex flex-col items-center gap-5">
                    {/* Like button skeleton */}
                    <div className="flex flex-col items-center gap-1">
                        <div className="w-8 h-8 bg-slate-800 rounded-full" />
                        <div className="w-6 h-2 bg-slate-800 rounded-md" />
                    </div>
                    {/* Comment button skeleton */}
                    <div className="flex flex-col items-center gap-1">
                        <div className="w-8 h-8 bg-slate-800 rounded-full" />
                        <div className="w-5 h-2 bg-slate-800 rounded-md" />
                    </div>
                    {/* Bookmark button skeleton */}
                    <div className="flex flex-col items-center gap-1">
                        <div className="w-8 h-8 bg-slate-800 rounded-full" />
                        <div className="w-7 h-2 bg-slate-800 rounded-md" />
                    </div>
                    {/* Share button skeleton */}
                    <div className="flex flex-col items-center gap-1">
                        <div className="w-8 h-8 bg-slate-800 rounded-full" />
                        <div className="w-6 h-2 bg-slate-800 rounded-md" />
                    </div>
                    {/* Mute button skeleton */}
                    <div className="w-9 h-9 bg-slate-800 rounded-full" />
                </div>

                {/* Simulated Bottom Info */}
                <div className="absolute bottom-20 md:bottom-8 left-4 right-16 z-20 space-y-3">
                    <div className="flex items-center gap-3">
                        {/* Avatar skeleton */}
                        <div className="w-10 h-10 rounded-full bg-slate-800 ring-2 ring-white/10" />
                        <div className="space-y-1.5 flex-1">
                            {/* Author name skeleton */}
                            <div className="w-24 h-3 bg-slate-800 rounded-md" />
                            {/* Username skeleton */}
                            <div className="w-16 h-2 bg-slate-800 rounded-md" />
                        </div>
                    </div>
                    {/* Description skeleton lines */}
                    <div className="w-3/4 h-3 bg-slate-800 rounded-md" />
                    <div className="w-1/2 h-3 bg-slate-800 rounded-md" />
                </div>

                {/* Progress bar skeleton */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-slate-800/40" />

                {/* Tab switcher skeleton */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center bg-slate-900/60 rounded-full p-0.5 border border-white/5 gap-1.5">
                    <div className="w-16 h-6 bg-slate-800 rounded-full" />
                    <div className="w-16 h-6 bg-slate-850 rounded-full" />
                </div>
            </div>
        )
    }

    if (reels.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4 px-6">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center">
                    <BsFilm className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                    {activeTab === 'following' ? 'Obunalaringizda reel yo\'q' : 'Hozircha reellar yo\'q'}
                </h3>
                <p className="text-xs text-slate-400 font-medium text-center max-w-xs">
                    {activeTab === 'following'
                        ? 'Obuna bo\'lgan odamlar hali reel yuklamagan.'
                        : 'Birinchi bo\'lib reel yuklang! Videolaringizni ulashing.'}
                </p>
                {activeTab === 'following' && (
                    <button
                        onClick={() => setActiveTab('foryou')}
                        className="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl active:scale-95 transition-all"
                    >
                        Siz uchun reellarni ko'rish
                    </button>
                )}
            </div>
        )
    }

    return (
        <div className="relative w-full h-svh bg-black md:max-w-[450px] md:mx-auto md:border-x md:border-white/10 md:shadow-none select-none">
            {/* Tab switcher — Siz uchun / Obuna */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center bg-black/40 backdrop-blur-md rounded-full p-0.5 border border-white/5">
                <button
                    onClick={() => { setActiveTab('foryou'); containerRef.current?.scrollTo({ top: 0 }) }}
                    className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${activeTab === 'foryou'
                        ? 'bg-white text-black'
                        : 'text-white/70 hover:text-white'
                        }`}
                >
                    Siz uchun
                </button>
                <button
                    onClick={() => { setActiveTab('following'); containerRef.current?.scrollTo({ top: 0 }) }}
                    className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${activeTab === 'following'
                        ? 'bg-white text-black'
                        : 'text-white/70 hover:text-white'
                        }`}
                >
                    Obuna
                </button>
            </div>

            {/* Reels container */}
            <div
                ref={containerRef}
                className="h-svh w-full overflow-y-auto snap-y snap-mandatory scroll-smooth scrollbar-none"
                style={{ scrollbarWidth: 'none' }}
            >
                {reels.map((reel, index) => (
                    <div
                        key={reel.id}
                        data-index={index}
                        className="h-svh w-full snap-start snap-always reel-card-wrapper"
                    >
                        <ReelCard
                            reel={reel}
                            isActive={index === activeIndex}
                            isAdjacent={index === activeIndex + 1 || index === activeIndex - 1}
                            isMuted={isMuted}
                            onToggleMute={() => setIsMuted(!isMuted)}
                            onUpdateReel={handleUpdateReel}
                        />
                    </div>
                ))}
            </div>

            {/* Reel indicator */}
            <div className="absolute top-5 left-4 z-30 flex items-center gap-2">
                <BsFilm className="w-5 h-5 text-white" />
                <span className="text-white font-black text-sm">Reels</span>
                <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {activeIndex + 1}/{reels.length}
                </span>
            </div>
        </div>
    )
}