"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    HiPaperAirplane, HiOutlinePaperClip, HiChevronLeft,
    HiOutlineEllipsisVertical, HiOutlineArrowUturnLeft,
    HiOutlinePencil, HiOutlineTrash, HiOutlineDocumentDuplicate,
    HiOutlineSpeakerWave, HiOutlineUserMinus,
    HiOutlineGlobeAlt, HiLockClosed, HiXMark, HiOutlineShieldCheck,
    HiOutlineArrowRightOnRectangle, HiChevronDown, HiCheckBadge, HiOutlineLink
} from 'react-icons/hi2'
import { IoSearchOutline } from 'react-icons/io5'
import { BottomSheet } from '@/components/bottom-sheet'

const supabase = createClient()

interface Profile {
    id: string
    nickname: string
    username: string
    avatar_url: string | null
    role: string
}

interface ChannelData {
    id: string
    name: string
    username: string | null
    avatar_url: string | null
    description: string | null
    type: 'group' | 'channel'
    is_public: boolean
    creator_id: string
    created_at: string
}

interface Member {
    id: string
    group_id: string
    user_id: string
    role: 'creator' | 'admin' | 'member'
    created_at: string
    profile: Profile
}

interface Message {
    id: string
    group_id: string
    sender_id: string
    text: string | null
    file_url: string | null
    file_type: 'image' | 'video' | 'audio' | null
    created_at: string
    reply_to_id?: string | null
    is_edited?: boolean
    is_deleted?: boolean
    reactions?: any
    _pending?: boolean
    sender?: Profile
}

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'

const isValidUUID = (id?: string | null): boolean => {
    if (!id) return false
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
}

const formatDateLabel = (iso: string) => {
    const date = new Date(iso)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
    if (sameDay(date, today)) return 'Bugun'
    if (sameDay(date, yesterday)) return 'Kecha'
    return date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

const bubbleVariants: Variants = {
    hidden: { opacity: 0, y: 8, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 350, damping: 26 } }
}

export default function ChannelDetailPage() {
    const params = useParams()
    const router = useRouter()
    const channelId = params?.id as string

    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [channel, setChannel] = useState<ChannelData | null>(null)
    const [members, setMembers] = useState<Member[]>([])
    const [isLoadingChannel, setIsLoadingChannel] = useState(true)
    const [isLoadingMessages, setIsLoadingMessages] = useState(true)
    const [messages, setMessages] = useState<Message[]>([])
    const [typedMessage, setTypedMessage] = useState("")

    const [isSubscribersSheetOpen, setIsSubscribersSheetOpen] = useState(false)
    const [subscriberSearchQuery, setSubscriberSearchQuery] = useState("")
    const [isEllipsisOpen, setIsEllipsisOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)

    const [editName, setEditName] = useState("")
    const [editUsername, setEditUsername] = useState("")
    const [editDescription, setEditDescription] = useState("")
    const [editIsPublic, setEditIsPublic] = useState(false)
    const [isSavingEdit, setIsSavingEdit] = useState(false)

    const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
    const [replyingMessage, setReplyingMessage] = useState<Message | null>(null)
    const [activeContextMsg, setActiveContextMsg] = useState<Message | null>(null)
    const [contextMenuPos, setContextMenuPos] = useState<{ x: number, y: number }>({ x: 0, y: 0 })
    const longPressTimeoutRef = useRef<any>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const messagesContainerRef = useRef<HTMLDivElement>(null)
    const freshMessageIds = useRef<Set<string>>(new Set())

    const userIdReady = isValidUUID(currentUserId)
    const myMembership = members.find(m => m.user_id === currentUserId)
    const isSubscribed = !!myMembership
    const isAdmin = myMembership?.role === 'admin' || myMembership?.role === 'creator'
    const isCreator = myMembership?.role === 'creator'

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user && isValidUUID(user.id)) setCurrentUserId(user.id)
        }
        checkUser()
    }, [])

    const fetchChannel = useCallback(async () => {
        if (!channelId) return
        setIsLoadingChannel(true)
        const { data, error } = await supabase
            .from('groups_channels')
            .select('*')
            .eq('id', channelId)
            .eq('type', 'channel')
            .single()

        if (error || !data) {
            toast.error("Kanal topilmadi")
            router.push('/dashboard/messages')
            return
        }
        setChannel(data)
        setEditName(data.name)
        setEditUsername(data.username || "")
        setEditDescription(data.description || "")
        setEditIsPublic(data.is_public)
        setIsLoadingChannel(false)
    }, [channelId, router])

    const fetchMembers = useCallback(async () => {
        if (!channelId) return
        const { data, error } = await supabase
            .from('group_members')
            .select('*, profile:profiles!group_members_user_id_fkey(*)')
            .eq('group_id', channelId)
            .order('created_at', { ascending: true })

        if (!error && data) setMembers(data as any)
    }, [channelId])

    const markFresh = (ids: string[]) => {
        ids.forEach(id => freshMessageIds.current.add(id))
    }

    const fetchMessages = useCallback(async () => {
        if (!channelId) return
        setIsLoadingMessages(true)
        const { data, error } = await supabase
            .from('messages')
            .select('*, sender:profiles!messages_sender_id_fkey(*)')
            .eq('group_id', channelId)
            .order('created_at', { ascending: true })

        if (!error && data) setMessages(data as any)
        setIsLoadingMessages(false)
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 50)
    }, [channelId])

    useEffect(() => { fetchChannel() }, [fetchChannel])
    useEffect(() => { fetchMembers() }, [fetchMembers])
    useEffect(() => { fetchMessages() }, [fetchMessages])

    useEffect(() => {
        if (!channelId) return
        const channelSub = supabase
            .channel(`channel:${channelId}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${channelId}` },
                async (payload: any) => {
                    const incoming = payload.new as Message
                    let sender: Profile | undefined
                    const cached = members.find(m => m.user_id === incoming.sender_id)?.profile
                    if (cached) {
                        sender = cached
                    } else {
                        const { data } = await supabase.from('profiles').select('*').eq('id', incoming.sender_id).single()
                        sender = data || undefined
                    }
                    setMessages(prev => {
                        if (prev.some(m => m.id === incoming.id)) return prev
                        const pendingMatch = prev.find(m => m._pending && m.sender_id === incoming.sender_id && m.text === incoming.text)
                        if (pendingMatch) return prev.map(m => m.id === pendingMatch.id ? { ...incoming, sender } : m)
                        markFresh([incoming.id])
                        return [...prev, { ...incoming, sender }]
                    })
                    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
                }
            )
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'messages', filter: `group_id=eq.${channelId}` },
                (payload: any) => {
                    const updated = payload.new as Message
                    setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m))
                }
            )
            .on('postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'messages', filter: `group_id=eq.${channelId}` },
                (payload: any) => {
                    const deleted = payload.old as { id: string }
                    setMessages(prev => prev.filter(m => m.id !== deleted.id))
                }
            )
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${channelId}` },
                () => fetchMembers()
            )
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'groups_channels', filter: `id=eq.${channelId}` },
                (payload: any) => setChannel(prev => prev ? { ...prev, ...payload.new } : prev)
            )
            .subscribe()

        return () => { supabase.removeChannel(channelSub) }
    }, [channelId, members, fetchMembers])

    const adjustTextareaHeight = () => {
        const el = textareaRef.current
        if (!el) return
        el.style.height = 'auto'
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`
    }

    const handleSubscribe = async () => {
        if (!currentUserId || !channelId) return
        const { error } = await supabase.from('group_members').insert([{ group_id: channelId, user_id: currentUserId, role: 'member' }])
        if (error) {
            toast.error("Obuna bo'lishda xatolik yuz berdi")
        } else {
            toast.success("Kanalga obuna bo'ldingiz")
            fetchMembers()
        }
    }

    const handleUnsubscribe = async () => {
        if (!currentUserId || !channelId) return
        if (isCreator) {
            toast.error("Kanal egasi obunani bekor qila olmaydi. Avval uni o'chiring yoki egalikni topshiring.")
            return
        }
        const { error } = await supabase.from('group_members').delete().eq('group_id', channelId).eq('user_id', currentUserId)
        if (!error) {
            toast.success("Obuna bekor qilindi")
            router.push('/dashboard/messages')
        }
    }

    const handleRemoveSubscriber = async (member: Member) => {
        if (!isAdmin) return
        if (member.role === 'creator') {
            toast.error("Kanal egasini o'chirib bo'lmaydi")
            return
        }
        if (!confirm(`${member.profile.nickname}ni kanaldan chiqarishni xohlaysizmi?`)) return
        const { error } = await supabase.from('group_members').delete().eq('id', member.id)
        if (!error) {
            toast.success("Obunachi chiqarildi")
            fetchMembers()
        }
    }

    const handleToggleAdmin = async (member: Member) => {
        if (!isCreator || member.role === 'creator') return
        const newRole = member.role === 'admin' ? 'member' : 'admin'
        const { error } = await supabase.from('group_members').update({ role: newRole }).eq('id', member.id)
        if (!error) {
            toast.success(newRole === 'admin' ? "Administrator etib tayinlandi" : "Administratorlikdan tushirildi")
            fetchMembers()
        }
    }

    const handleDeleteChannel = async () => {
        if (!isCreator || !channelId) return
        if (!confirm("Kanalni butunlay o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.")) return
        const { error } = await supabase.from('groups_channels').delete().eq('id', channelId)
        if (!error) {
            toast.success("Kanal o'chirildi")
            router.push('/dashboard/messages')
        } else {
            toast.error("O'chirishda xatolik yuz berdi")
        }
    }

    const handleSaveEdit = async () => {
        if (!channelId || !editName.trim()) return
        setIsSavingEdit(true)
        const { error } = await supabase
            .from('groups_channels')
            .update({
                name: editName.trim(),
                username: editUsername.trim() || null,
                description: editDescription.trim() || null,
                is_public: editIsPublic
            })
            .eq('id', channelId)

        if (error) {
            toast.error("Saqlashda xatolik yuz berdi")
        } else {
            toast.success("Kanal ma'lumotlari yangilandi")
            setIsEditModalOpen(false)
            fetchChannel()
        }
        setIsSavingEdit(false)
    }

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        const text = typedMessage.trim()
        if (!text || !channelId || !currentUserId || !isAdmin) return

        setTypedMessage("")
        requestAnimationFrame(adjustTextareaHeight)

        if (editingMessageId) {
            const msgId = editingMessageId
            setEditingMessageId(null)
            const { error } = await supabase.from('messages').update({ text, is_edited: true }).eq('id', msgId)
            if (error) {
                toast.error("Xabarni o'zgartirib bo'lmadi")
            } else {
                setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text, is_edited: true } : m))
            }
            return
        }

        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
        const replyId = replyingMessage?.id || null
        const myProfile = myMembership?.profile

        const optimisticMessage: Message = {
            id: tempId,
            group_id: channelId,
            sender_id: currentUserId,
            text,
            file_url: null,
            file_type: null,
            created_at: new Date().toISOString(),
            reply_to_id: replyId,
            _pending: true,
            sender: myProfile
        }

        markFresh([tempId])
        setMessages(prev => [...prev, optimisticMessage])
        setReplyingMessage(null)
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 30)

        const { data, error } = await supabase
            .from('messages')
            .insert([{ group_id: channelId, sender_id: currentUserId, text, reply_to_id: replyId }])
            .select()
            .single()

        if (error) {
            setMessages(prev => prev.filter(m => m.id !== tempId))
            setTypedMessage(text)
            toast.error("Xabar yuborishda xatolik yuz berdi")
            return
        }

        if (data) {
            markFresh([data.id])
            setMessages(prev => prev.map(m => m.id === tempId ? { ...data, sender: myProfile } : m))
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage(e as any)
        }
    }

    const handleEditMessage = (msg: Message) => {
        setEditingMessageId(msg.id)
        setReplyingMessage(null)
        setTypedMessage(msg.text || "")
        setTimeout(() => textareaRef.current?.focus(), 50)
    }

    const handleDeleteMessage = async (msg: Message) => {
        if (!confirm("Ushbu postni o'chirishni xohlaysizmi?")) return
        const { error } = await supabase.from('messages').update({ text: "Bu post o'chirilgan", is_deleted: true }).eq('id', msg.id)
        if (!error) {
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, text: "Bu post o'chirilgan", is_deleted: true } : m))
        }
    }

    const handleCopyMessage = (msg: Message) => {
        if (!msg.text) return
        navigator.clipboard.writeText(msg.text)
        toast.success("Post buferga nusxalandi")
    }

    const handleToggleReaction = async (msg: Message, emoji: string) => {
        if (!currentUserId || !msg.id || !isSubscribed) return
        setActiveContextMsg(null)

        let currentReactions: any[] = []
        try {
            currentReactions = typeof msg.reactions === 'string' ? JSON.parse(msg.reactions) : (msg.reactions || [])
        } catch {
            currentReactions = []
        }
        if (!Array.isArray(currentReactions)) currentReactions = []

        const existingIdx = currentReactions.findIndex(r => r.user_id === currentUserId && r.emoji === emoji)
        if (existingIdx >= 0) {
            currentReactions.splice(existingIdx, 1)
        } else {
            const userPrevIdx = currentReactions.findIndex(r => r.user_id === currentUserId)
            if (userPrevIdx >= 0) currentReactions.splice(userPrevIdx, 1)
            currentReactions.push({ user_id: currentUserId, emoji })
        }

        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, reactions: currentReactions } : m))
        await supabase.from('messages').update({ reactions: currentReactions }).eq('id', msg.id)
    }

    const handleTouchStart = (e: React.TouchEvent, msg: Message) => {
        if (msg.is_deleted) return
        const touch = e.touches[0]
        const x = touch.clientX
        const y = touch.clientY
        if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current)
        longPressTimeoutRef.current = setTimeout(() => {
            setContextMenuPos({ x, y: y - 50 })
            setActiveContextMsg(msg)
            if (navigator.vibrate) navigator.vibrate(50)
        }, 500)
    }

    const handleTouchEnd = () => {
        if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current)
    }

    const handleContextMenu = (e: React.MouseEvent, msg: Message) => {
        if (msg.is_deleted) return
        e.preventDefault()
        setContextMenuPos({ x: e.clientX, y: e.clientY })
        setActiveContextMsg(msg)
    }

    const filteredSubscribers = members.filter(m => {
        if (!subscriberSearchQuery.trim()) return true
        const q = subscriberSearchQuery.toLowerCase()
        return m.profile.nickname.toLowerCase().includes(q) || m.profile.username.toLowerCase().includes(q)
    })

    const roleLabel = (role: string) => role === 'creator' ? 'Egasi' : role === 'admin' ? 'Admin' : 'Obunachi'

    const handleCopyChannelLink = () => {
        const link = `${window.location.origin}/dashboard/channels/${channelId}`
        navigator.clipboard.writeText(link)
        toast.success("Kanal havolasi nusxalandi!")
    }

    if (isLoadingChannel || !channel) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-white dark:bg-slate-950">
                <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="bg-slate-50 dark:bg-[#0B1120] w-full h-full flex flex-col overflow-hidden select-none relative">

            <AnimatePresence>
                {activeContextMsg && (
                    <>
                        <div className="fixed inset-0 z-[80] bg-black/5 dark:bg-black/20 backdrop-blur-sm transition-all" onClick={() => setActiveContextMsg(null)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            style={{
                                position: 'fixed',
                                top: Math.min(contextMenuPos.y, window.innerHeight - 300),
                                left: Math.min(contextMenuPos.x, window.innerWidth - 240),
                            }}
                            className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] rounded-2xl p-1.5 w-56 z-[90] flex flex-col text-left font-medium text-sm text-slate-700 dark:text-slate-200 select-none"
                        >
                            {isSubscribed && (
                                <div className="flex justify-between items-center px-2 py-2 border-b border-slate-200/50 dark:border-white/10 mb-1.5 select-none">
                                    {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                                        <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} key={emoji} type="button" onClick={() => handleToggleReaction(activeContextMsg, emoji)} className="text-xl cursor-pointer p-1">
                                            {emoji}
                                        </motion.button>
                                    ))}
                                </div>
                            )}

                            {isAdmin && (
                                <button onClick={() => { setReplyingMessage(activeContextMsg); setActiveContextMsg(null) }} className="flex items-center gap-3 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl cursor-pointer transition-colors">
                                    <HiOutlineArrowUturnLeft className="w-4 h-4 text-violet-500" />
                                    <span className="whitespace-nowrap">Javob berish</span>
                                </button>
                            )}

                            {activeContextMsg.text && (
                                <button onClick={() => { handleCopyMessage(activeContextMsg); setActiveContextMsg(null) }} className="flex items-center gap-3 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl cursor-pointer transition-colors">
                                    <HiOutlineDocumentDuplicate className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                    <span className="whitespace-nowrap">Nusxalash</span>
                                </button>
                            )}

                            {isAdmin && (
                                <>
                                    {activeContextMsg.text && (
                                        <button onClick={() => { handleEditMessage(activeContextMsg); setActiveContextMsg(null) }} className="flex items-center gap-3 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl cursor-pointer transition-colors">
                                            <HiOutlinePencil className="w-4 h-4 text-emerald-500" />
                                            <span className="whitespace-nowrap">Tahrirlash</span>
                                        </button>
                                    )}
                                    <div className="h-px bg-slate-200/50 dark:bg-white/10 my-1.5 mx-2" />
                                    <button onClick={() => { handleDeleteMessage(activeContextMsg); setActiveContextMsg(null) }} className="flex items-center gap-3 px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl cursor-pointer transition-colors">
                                        <HiOutlineTrash className="w-4 h-4 text-rose-500" />
                                        <span className="whitespace-nowrap">O'chirish</span>
                                    </button>
                                </>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isEditModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-md p-4"
                        onClick={(e) => { if (e.target === e.currentTarget) setIsEditModalOpen(false) }}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.97 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md border border-white/50 dark:border-white/10 overflow-hidden"
                        >
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/50 dark:border-white/10">
                                <h2 className="text-base font-black text-slate-900 dark:text-slate-100">Kanalni tahrirlash</h2>
                                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-slate-500 dark:text-slate-400 transition-colors">
                                    <HiXMark className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-5">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block">Kanal nomi</label>
                                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={80} className="w-full bg-slate-100/50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all shadow-inner" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block">Username</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
                                        <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value.replace(/[^a-z0-9_]/gi, '').toLowerCase())} maxLength={32} className="w-full bg-slate-100/50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl pl-9 pr-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all shadow-inner" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block">Tavsif</label>
                                    <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} maxLength={200} className="w-full bg-slate-100/50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all resize-none shadow-inner" />
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-100/50 dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${editIsPublic ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                                            {editIsPublic ? <HiOutlineGlobeAlt className="w-5 h-5" /> : <HiLockClosed className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{editIsPublic ? 'Hammaga ochiq' : 'Maxfiy'}</p>
                                            <p className="text-[10px] font-medium text-slate-500">{editIsPublic ? 'Barcha qidirib topishi mumkin' : 'Faqat taklif havolasi orqali'}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setEditIsPublic(!editIsPublic)} className={`relative w-12 h-6 rounded-full transition-all duration-300 ${editIsPublic ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${editIsPublic ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3.5 rounded-2xl border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
                                        Bekor qilish
                                    </button>
                                    <button onClick={handleSaveEdit} disabled={!editName.trim() || isSavingEdit} className={`flex-1 py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-95 shadow-lg ${editName.trim() && !isSavingEdit ? 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/25' : 'bg-slate-300 dark:bg-slate-700 shadow-none cursor-not-allowed'}`}>
                                        {isSavingEdit ? 'Saqlanmoqda...' : 'Saqlash'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="z-40 px-4 py-3 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/10 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => router.push('/dashboard/messages')} className="p-2 -ml-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-slate-700 dark:text-slate-300 active:scale-90 transition-all">
                        <HiChevronLeft className="w-6 h-6 stroke-[2.5]" />
                    </button>
                    <div onClick={() => setIsSubscribersSheetOpen(true)} className="flex items-center gap-3 cursor-pointer min-w-0 hover:opacity-80 transition-opacity">
                        <div className="relative shrink-0">
                            {channel.avatar_url ? (
                                <img src={channel.avatar_url} alt="" className="w-11 h-11 object-cover rounded-2xl shadow-sm" />
                            ) : (
                                <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm shadow-violet-500/20">
                                    <HiOutlineSpeakerWave className="w-6 h-6" />
                                </div>
                            )}
                        </div>
                        <div className="text-left min-w-0">
                            <h3 className="font-bold text-[15px] text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                                {channel.name}
                                {channel.is_public ? <HiOutlineGlobeAlt className="w-4 h-4 text-emerald-500 shrink-0" /> : <HiLockClosed className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                            </h3>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                                {members.length} obunachi
                            </p>
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <button onClick={() => setIsEllipsisOpen(!isEllipsisOpen)} className="p-2.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-slate-600 dark:text-slate-400 active:scale-90 transition-all">
                        <HiOutlineEllipsisVertical className="w-6 h-6" />
                    </button>
                    <AnimatePresence>
                        {isEllipsisOpen && (
                            <>
                                <div className="fixed inset-0 z-45" onClick={() => setIsEllipsisOpen(false)} />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    className="absolute right-0 mt-2 w-64 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] p-1.5 z-50 text-left text-sm font-semibold text-slate-700 dark:text-slate-200"
                                >
                                    <button onClick={() => { setIsSubscribersSheetOpen(true); setIsEllipsisOpen(false) }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl cursor-pointer transition-colors">
                                        <HiOutlineSpeakerWave className="w-5 h-5 text-violet-500" />
                                        <span>Obunachilarni ko'rish</span>
                                    </button>
                                    <button onClick={() => { handleCopyChannelLink(); setIsEllipsisOpen(false) }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl cursor-pointer transition-colors">
                                        <HiOutlineLink className="w-5 h-5 text-violet-500" />
                                        <span>Havolani nusxalash</span>
                                    </button>
                                    {isCreator && (
                                        <button onClick={() => { setIsEditModalOpen(true); setIsEllipsisOpen(false) }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl cursor-pointer transition-colors">
                                            <HiOutlinePencil className="w-5 h-5 text-emerald-500" />
                                            <span>Kanalni tahrirlash</span>
                                        </button>
                                    )}
                                    <div className="h-px bg-slate-200/50 dark:bg-white/10 my-1 mx-2" />
                                    {isSubscribed && !isCreator && (
                                        <button onClick={() => { handleUnsubscribe(); setIsEllipsisOpen(false) }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-xl cursor-pointer transition-colors">
                                            <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
                                            <span>Obunani bekor qilish</span>
                                        </button>
                                    )}
                                    {isCreator && (
                                        <button onClick={() => { handleDeleteChannel(); setIsEllipsisOpen(false) }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-500 rounded-xl cursor-pointer transition-colors">
                                            <HiOutlineTrash className="w-5 h-5" />
                                            <span>Kanalni o'chirish</span>
                                        </button>
                                    )}
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div ref={messagesContainerRef} className="flex-1 p-4 overflow-y-auto flex flex-col gap-1.5 [&::-webkit-scrollbar]:hidden select-none relative z-10">
                {isLoadingMessages ? (
                    <div className="flex-1 flex flex-col gap-4 py-2">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="h-16 rounded-2xl bg-slate-200/50 dark:bg-white/5 animate-pulse w-[80%] md:w-[70%]" />
                        ))}
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-70">
                        <div className="w-24 h-24 mb-4 rounded-full bg-violet-500/10 dark:bg-violet-500/20 flex items-center justify-center text-violet-500 text-4xl">
                            📢
                        </div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Kanalda hali post yo'q.</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const prevMsg = messages[idx - 1]
                        const showDateDivider = !prevMsg || formatDateLabel(prevMsg.created_at) !== formatDateLabel(msg.created_at)
                        const isFresh = freshMessageIds.current.has(msg.id)
                        const repliedToMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null

                        return (
                            <React.Fragment key={msg.id}>
                                {showDateDivider && (
                                    <div className="flex items-center justify-center my-4 select-none">
                                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md shadow-sm px-4 py-1.5 rounded-full border border-slate-200/50 dark:border-white/10">
                                            {formatDateLabel(msg.created_at)}
                                        </span>
                                    </div>
                                )}

                                <div className="flex flex-col w-full max-w-[85%] md:max-w-[75%] self-start mb-2 relative">
                                    <motion.div
                                        onDoubleClick={() => !msg.is_deleted && isSubscribed && handleToggleReaction(msg, '❤️')}
                                        onTouchStart={(e) => handleTouchStart(e, msg)}
                                        onTouchEnd={handleTouchEnd}
                                        onContextMenu={(e) => handleContextMenu(e, msg)}
                                        variants={isFresh ? bubbleVariants : undefined}
                                        initial={isFresh ? 'hidden' : undefined}
                                        animate={isFresh ? 'visible' : undefined}
                                        className={`text-[15px] font-medium leading-relaxed relative select-none cursor-default z-10 bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-white/5 text-slate-800 dark:text-slate-100 rounded-3xl ${msg._pending ? 'opacity-60' : ''}`}
                                    >
                                        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                                            {channel.avatar_url ? (
                                                <img src={channel.avatar_url} alt="" className="w-6 h-6 object-cover rounded-full shadow-sm" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-violet-100 dark:bg-violet-900/40 text-violet-600">
                                                    <HiOutlineSpeakerWave className="w-3.5 h-3.5" />
                                                </div>
                                            )}
                                            <span className="text-[12px] font-black text-violet-600 dark:text-violet-400 flex items-center gap-1">
                                                {channel.name} <HiCheckBadge className="w-3.5 h-3.5" />
                                            </span>
                                        </div>

                                        {repliedToMsg && (
                                            <div className="mx-4 mb-1 p-2.5 rounded-xl text-xs border-l-[3px] bg-slate-50 dark:bg-slate-900/50 border-violet-500 text-slate-600 dark:text-slate-300 text-left flex flex-col gap-0.5 select-none transition-colors cursor-pointer hover:opacity-90">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-violet-500 dark:text-violet-400">
                                                    {repliedToMsg.sender?.nickname || 'Admin'}
                                                </span>
                                                <span className="truncate max-w-[200px] font-medium">{repliedToMsg.is_deleted ? "O'chirilgan post" : (repliedToMsg.text || "Fayl yuborilgan")}</span>
                                            </div>
                                        )}

                                        <div className="px-4 pb-3 pt-1">
                                            {msg.text && (
                                                <div className={msg.is_deleted ? 'italic text-[13px] opacity-70' : 'text-slate-800 dark:text-slate-100'}>
                                                    {msg.text}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>

                                    {msg.reactions && (typeof msg.reactions === 'string' ? JSON.parse(msg.reactions) : msg.reactions).length > 0 && (
                                        <div className="absolute -bottom-3 left-4 flex gap-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200/50 dark:border-white/10 rounded-full px-1.5 py-0.5 shadow-sm select-none z-20 text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                            {(() => {
                                                const reactList = (typeof msg.reactions === 'string' ? JSON.parse(msg.reactions) : msg.reactions) as any[]
                                                const counts: { [emoji: string]: number } = {}
                                                reactList.forEach(r => { counts[r.emoji] = (counts[r.emoji] || 0) + 1 })
                                                return Object.entries(counts).map(([emoji, count]) => (
                                                    <motion.span whileHover={{ scale: 1.1 }} key={emoji} className="flex items-center gap-1 px-1" onClick={() => isSubscribed && handleToggleReaction(msg, emoji)}>
                                                        <span>{emoji}</span>
                                                        {reactList.length > 1 && <span className="text-violet-500">{count}</span>}
                                                    </motion.span>
                                                ))
                                            })()}
                                        </div>
                                    )}

                                    <div className={`flex items-center gap-1 mt-1 px-3 ${msg.reactions && (typeof msg.reactions === 'string' ? JSON.parse(msg.reactions) : msg.reactions).length > 0 ? 'mt-4' : ''}`}>
                                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                            {msg._pending ? 'yuborilmoqda...' : new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {msg.is_edited && !msg.is_deleted && (
                                            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 italic">(tahrirlandi)</span>
                                        )}
                                    </div>
                                </div>
                            </React.Fragment>
                        )
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="shrink-0 select-none z-30">
                <AnimatePresence>
                    {editingMessageId && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-5 py-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200/50 dark:border-white/10 flex items-center justify-between text-sm font-semibold text-violet-600 dark:text-violet-400 shadow-[0_-4px_20px_rgb(0,0,0,0.05)]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-violet-500/10 rounded-full">
                                    <HiOutlinePencil className="w-4 h-4" />
                                </div>
                                <div>
                                    <p>Postni tahrirlash</p>
                                    <p className="text-[11px] font-medium text-slate-500 truncate max-w-[200px]">{typedMessage}</p>
                                </div>
                            </div>
                            <button onClick={() => { setEditingMessageId(null); setTypedMessage("") }} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                                <HiXMark className="w-5 h-5" />
                            </button>
                        </motion.div>
                    )}
                    {replyingMessage && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-5 py-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200/50 dark:border-white/10 flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300 shadow-[0_-4px_20px_rgb(0,0,0,0.05)]">
                            <div className="flex items-center gap-3 truncate pr-4 text-left">
                                <div className="p-2 bg-violet-500/10 text-violet-600 rounded-full">
                                    <HiOutlineArrowUturnLeft className="w-4 h-4" />
                                </div>
                                <div className="truncate">
                                    <p className="font-bold text-violet-600 dark:text-violet-400 text-xs uppercase tracking-wider mb-0.5">Javob berish</p>
                                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{replyingMessage.text || "Fayl biriktirilgan"}</p>
                                </div>
                            </div>
                            <button onClick={() => setReplyingMessage(null)} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                                <HiXMark className="w-5 h-5" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="p-3 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-white/10 shrink-0 z-30 relative">
                {!userIdReady ? null : isAdmin ? (
                    <form onSubmit={handleSendMessage} className="flex items-end gap-2 text-left max-w-4xl mx-auto w-full">
                        <input type="file" accept="image/*,video/*" ref={fileInputRef} className="hidden" />
                        <button type="button" className="p-3 mb-0.5 text-slate-400 hover:text-violet-500 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-full active:scale-90 transition-all cursor-pointer">
                            <HiOutlinePaperClip className="w-6 h-6" />
                        </button>
                        <div className="relative flex-1 flex items-end bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-white/10 rounded-3xl shadow-inner transition-colors focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:border-violet-500/30">
                            <textarea
                                ref={textareaRef}
                                rows={1}
                                placeholder="Kanalga post yozing..."
                                value={typedMessage}
                                onChange={(e) => { setTypedMessage(e.target.value); adjustTextareaHeight() }}
                                onKeyDown={handleKeyDown}
                                className="w-full bg-transparent text-slate-800 dark:text-slate-100 text-[15px] font-medium pl-5 pr-4 py-3.5 outline-none transition-all duration-200 resize-none max-h-[140px] [&::-webkit-scrollbar]:hidden"
                            />
                        </div>
                        <motion.button
                            type="submit"
                            disabled={!typedMessage.trim()}
                            whileTap={{ scale: 0.85 }}
                            className={`p-3.5 mb-0.5 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shrink-0 shadow-md ${typedMessage.trim() ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-violet-500/30' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 shadow-none cursor-not-allowed'}`}
                        >
                            <HiPaperAirplane className={`w-5 h-5 -rotate-45 ${typedMessage.trim() ? 'translate-x-[2px] -translate-y-[1px]' : ''}`} />
                        </motion.button>
                    </form>
                ) : isSubscribed ? (
                    <div className="p-4 bg-slate-100/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-sm font-semibold rounded-2xl text-center border border-slate-200/50 dark:border-white/5">
                        Faqat administratorlar kanalga post yuborishi mumkin
                    </div>
                ) : channel.is_public ? (
                    <button onClick={handleSubscribe} className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-wide shadow-lg shadow-violet-500/25">
                        <HiOutlineSpeakerWave className="w-5 h-5" /> Obuna bo'lish
                    </button>
                ) : (
                    <div className="p-4 bg-slate-100/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-sm font-semibold rounded-2xl text-center border border-slate-200/50 dark:border-white/5">
                        Bu kanal maxfiy. Obuna bo'lish uchun taklif qilinishingiz kerak.
                    </div>
                )}
            </div>

            <BottomSheet isOpen={isSubscribersSheetOpen} onClose={() => setIsSubscribersSheetOpen(false)} title={`Obunachilar (${members.length})`}>
                <div className="flex flex-col gap-4 py-2">
                    <div className="relative flex items-center px-1">
                        <IoSearchOutline className="w-5 h-5 text-slate-400 absolute left-4" />
                        <input
                            type="text"
                            placeholder="Obunachi qidirish..."
                            value={subscriberSearchQuery}
                            onChange={(e) => setSubscriberSearchQuery(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm font-semibold pl-12 pr-4 py-3 rounded-2xl border border-transparent outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
                        />
                    </div>

                    <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto [&::-webkit-scrollbar]:hidden px-1">
                        {filteredSubscribers.map(member => (
                            <div key={member.id} className="p-3 flex items-center gap-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <img src={member.profile.avatar_url || FALLBACK_AVATAR} alt="" className="w-12 h-12 object-cover rounded-full shadow-sm shrink-0" />
                                <div className="flex-1 min-w-0 text-left">
                                    <h4 className="font-bold text-[15px] text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                                        {member.profile.nickname}
                                        {member.role === 'creator' && <HiChevronDown className="w-4 h-4 text-amber-500" />}
                                        {member.role === 'admin' && <HiOutlineShieldCheck className="w-4 h-4 text-violet-500" />}
                                    </h4>
                                    <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 truncate">@{member.profile.username} · {roleLabel(member.role)}</p>
                                </div>
                                {isCreator && member.role !== 'creator' && (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button onClick={() => handleToggleAdmin(member)} className="p-2.5 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-full text-slate-400 hover:text-violet-500 transition-colors" title={member.role === 'admin' ? 'Adminlikdan tushirish' : 'Admin qilish'}>
                                            <HiOutlineShieldCheck className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => handleRemoveSubscriber(member)} className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full text-slate-400 hover:text-rose-500 transition-colors" title="Chiqarish">
                                            <HiOutlineUserMinus className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                                {isAdmin && !isCreator && member.role === 'member' && (
                                    <button onClick={() => handleRemoveSubscriber(member)} className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full text-slate-400 hover:text-rose-500 shrink-0 transition-colors" title="Chiqarish">
                                        <HiOutlineUserMinus className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </BottomSheet>
        </div>
    )
}