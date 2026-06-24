"use client"

import React, { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { RealtimeChannel } from '@supabase/supabase-js'
import {
    HiArrowLeft,
    HiSignal,
    HiUserGroup,
    HiOutlineComputerDesktop,
    HiStop,
    HiPaperAirplane,
    HiXMark,
    HiChatBubbleLeftRight,
} from 'react-icons/hi2'
import { createClient } from '@/utils/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { uploadFiles } from '@/utils/uploadthing/uploadthing'

interface RoomInfo {
    id: string
    host_id: string
    title: string
    game: string | null
    is_live: boolean
    video_url: string | null
}

interface ChatMsg {
    id: string
    user: string
    avatar: string | null
    text: string
    ts: number
}

type BroadcastArgs<T> = { type: string; event: string; payload: T }

const ICE_CONFIG: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
}

export default function LiveRoomPage() {
    const params = useParams()
    const router = useRouter()
    const supabase = createClient()
    const roomId = params.id as string

    const [room, setRoom] = useState<RoomInfo | null>(null)
    const [isHost, setIsHost] = useState(false)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)

    // Mobil uchun isDesktop check olib tashlandi — hamma ko'ra oladi
    // Lekin host faqat desktop da ulasha oladi (getDisplayMedia cheklov)
    const [isDesktop, setIsDesktop] = useState(false)

    const [sharing, setSharing] = useState(false)
    const [viewerCount, setViewerCount] = useState(0)
    const [waitingForHost, setWaitingForHost] = useState(true)

    const [chat, setChat] = useState<ChatMsg[]>([])
    const [chatText, setChatText] = useState('')
    // Mobilda chat / video almashtirish tab
    const [mobileTab, setMobileTab] = useState<'video' | 'chat'>('video')
    // Desktop da chat paneli toggle
    const [chatOpen, setChatOpen] = useState(true)

    const videoRef = useRef<HTMLVideoElement>(null)
    const chatEndRef = useRef<HTMLDivElement>(null)

    const channelRef = useRef<RealtimeChannel | null>(null)
    const localStreamRef = useRef<MediaStream | null>(null)
    const hostPcsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
    const viewerPcRef = useRef<RTCPeerConnection | null>(null)
    const isHostRef = useRef(false)
    const clientIdRef = useRef<string>('')
    const meRef = useRef<{ username: string; avatar: string | null }>({ username: 'Anonim', avatar: null })

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const recordedChunksRef = useRef<Blob[]>([])
    const [savingVideo, setSavingVideo] = useState(false)

    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1024px)')
        const update = () => setIsDesktop(mq.matches)
        update()
        mq.addEventListener('change', update)
        return () => mq.removeEventListener('change', update)
    }, [])

    useEffect(() => {
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }, [chat])

    const pushChat = (msg: ChatMsg) => {
        setChat((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
    }

    // ====== Host: viewer uchun peer connection yaratish ======
    const createHostPc = (viewerId: string) => {
        const existing = hostPcsRef.current.get(viewerId)
        if (existing) { existing.close(); hostPcsRef.current.delete(viewerId) }
        const pc = new RTCPeerConnection(ICE_CONFIG)
        hostPcsRef.current.set(viewerId, pc)

        const stream = localStreamRef.current
        if (stream) stream.getTracks().forEach((track) => pc.addTrack(track, stream))

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                channelRef.current?.send({
                    type: 'broadcast', event: 'ice-to-viewer',
                    payload: { to: viewerId, candidate: e.candidate.toJSON() },
                })
            }
        }

        pc.createOffer()
            .then((offer) => pc.setLocalDescription(offer).then(() => offer))
            .then((offer) => {
                channelRef.current?.send({
                    type: 'broadcast', event: 'offer',
                    payload: { to: viewerId, sdp: offer },
                })
            })
            .catch(() => { })

        return pc
    }

    // ====== Viewer: host bilan peer connection ======
    const ensureViewerPc = () => {
        if (viewerPcRef.current) return viewerPcRef.current
        const pc = new RTCPeerConnection(ICE_CONFIG)
        viewerPcRef.current = pc

        pc.ontrack = (e) => {
            if (videoRef.current && e.streams[0]) {
                videoRef.current.srcObject = e.streams[0]
                setWaitingForHost(false)
                // Video kelganda video tab ga o'tish
                setMobileTab('video')
            }
        }
        pc.onicecandidate = (e) => {
            if (e.candidate) {
                channelRef.current?.send({
                    type: 'broadcast', event: 'ice-to-host',
                    payload: { from: clientIdRef.current, candidate: e.candidate.toJSON() },
                })
            }
        }
        return pc
    }

    // ====== Asosiy setup ======
    useEffect(() => {
        if (!roomId) return
        let cancelled = false
        if (!clientIdRef.current) {
            clientIdRef.current = typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${performance.now()}`
        }
        const hostPcs = hostPcsRef.current

        const setup = async () => {
            const { data: userData } = await supabase.auth.getUser()
            const user = userData?.user

            const { data: roomData, error } = await supabase
                .from('live_rooms')
                .select('id, host_id, title, game, is_live, video_url')
                .eq('id', roomId)
                .single()

            if (cancelled) return
            if (error || !roomData) { setNotFound(true); setLoading(false); return }

            const host = !!user && user.id === roomData.host_id
            isHostRef.current = host
            setRoom(roomData as RoomInfo)
            setIsHost(host)
            setLoading(false)

            // Fetch live chat history
            try {
                const { data: oldMsgs } = await supabase
                    .from('live_chat_messages')
                    .select('*')
                    .eq('room_id', roomId)
                    .order('created_at', { ascending: true })

                if (oldMsgs && !cancelled) {
                    setChat(oldMsgs.map((m: any) => ({
                        id: m.id,
                        user: m.user_name,
                        avatar: m.user_avatar,
                        text: m.message,
                        ts: new Date(m.created_at).getTime()
                    })))
                }
            } catch (chatErr) {
                console.error("Failed to load chat history:", chatErr)
            }

            if (user) {
                const { data: prof } = await supabase
                    .from('profiles').select('username, avatar_url').eq('id', user.id).single()
                if (prof) meRef.current = { username: prof.username || 'Anonim', avatar: prof.avatar_url }
            }

            const channel = supabase.channel(`live:${roomId}`, {
                config: { broadcast: { self: false }, presence: { key: clientIdRef.current } },
            })
            channelRef.current = channel

            // Chat
            channel.on('broadcast', { event: 'chat' }, ({ payload }: BroadcastArgs<ChatMsg>) => {
                pushChat(payload)
            })

            if (host) {
                channel.on('broadcast', { event: 'viewer-join' }, ({ payload }: BroadcastArgs<{ viewerId: string }>) => {
                    if (localStreamRef.current) createHostPc(payload.viewerId)
                })
                channel.on('broadcast', { event: 'answer' }, async ({ payload }: BroadcastArgs<{ from: string; sdp: RTCSessionDescriptionInit }>) => {
                    const pc = hostPcsRef.current.get(payload.from)
                    if (pc) try { await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp)) } catch { }
                })
                channel.on('broadcast', { event: 'ice-to-host' }, async ({ payload }: BroadcastArgs<{ from: string; candidate: RTCIceCandidateInit }>) => {
                    const pc = hostPcsRef.current.get(payload.from)
                    if (pc) try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)) } catch { }
                })
            } else {
                channel.on('broadcast', { event: 'offer' }, async ({ payload }: BroadcastArgs<{ to: string; sdp: RTCSessionDescriptionInit }>) => {
                    if (payload.to !== clientIdRef.current) return
                    const pc = ensureViewerPc()
                    try {
                        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
                        const answer = await pc.createAnswer()
                        await pc.setLocalDescription(answer)
                        channel.send({ type: 'broadcast', event: 'answer', payload: { from: clientIdRef.current, sdp: answer } })
                    } catch { }
                })
                channel.on('broadcast', { event: 'ice-to-viewer' }, async ({ payload }: BroadcastArgs<{ to: string; candidate: RTCIceCandidateInit }>) => {
                    if (payload.to !== clientIdRef.current) return
                    const pc = ensureViewerPc()
                    try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)) } catch { }
                })
                channel.on('broadcast', { event: 'host-ready' }, () => {
                    channel.send({ type: 'broadcast', event: 'viewer-join', payload: { viewerId: clientIdRef.current } })
                })
                channel.on('broadcast', { event: 'host-ended' }, () => {
                    setWaitingForHost(true)
                    if (videoRef.current) videoRef.current.srcObject = null
                })
            }

            // Presence — tomoshabinlar soni
            channel.on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState()
                const viewers = Object.keys(state).filter((k) => {
                    const meta = (state[k]?.[0] as { role?: string } | undefined)
                    return meta?.role !== 'host'
                })
                setViewerCount(viewers.length)
                if (host) {
                    supabase.from('live_rooms').update({ viewer_count: viewers.length }).eq('id', roomId).then(() => { })
                }
            })

            channel.subscribe(async (status: string) => {
                if (status !== 'SUBSCRIBED') return
                await channel.track({ role: host ? 'host' : 'viewer', id: clientIdRef.current })
                if (!host) {
                    setWaitingForHost(true)
                    channel.send({ type: 'broadcast', event: 'viewer-join', payload: { viewerId: clientIdRef.current } })
                }
            })
        }

        setup()

        return () => {
            cancelled = true
            if (channelRef.current && isHostRef.current) {
                channelRef.current.send({ type: 'broadcast', event: 'host-ended', payload: {} })
            }
            localStreamRef.current?.getTracks().forEach((t) => t.stop())
            localStreamRef.current = null
            hostPcs.forEach((pc) => pc.close())
            hostPcs.clear()
            viewerPcRef.current?.close()
            viewerPcRef.current = null
            if (channelRef.current) supabase.removeChannel(channelRef.current)
            channelRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId])

    // ====== Host: ekranni ulashishni boshlash ======
    const startSharing = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true })
            localStreamRef.current = stream
            if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true }
            setSharing(true)

            // Start recording chunks
            recordedChunksRef.current = []
            if (typeof MediaRecorder !== 'undefined') {
                let options = { mimeType: 'video/webm; codecs=vp9' }
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options = { mimeType: 'video/webm; codecs=vp8' }
                }
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options = { mimeType: 'video/webm' }
                }
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options = { mimeType: '' }
                }
                try {
                    const mediaRecorder = new MediaRecorder(stream, options)
                    mediaRecorder.ondataavailable = (e) => {
                        if (e.data && e.data.size > 0) {
                            recordedChunksRef.current.push(e.data)
                        }
                    }
                    mediaRecorder.start(1000)
                    mediaRecorderRef.current = mediaRecorder
                } catch (e) {
                    console.error("Recorder start failed:", e)
                }
            }

            stream.getVideoTracks()[0].addEventListener('ended', () => stopSharing())
            channelRef.current?.send({ type: 'broadcast', event: 'host-ready', payload: {} })
        } catch { }
    }

    const stopSharing = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try { mediaRecorderRef.current.stop() } catch {}
        }
        mediaRecorderRef.current = null

        localStreamRef.current?.getTracks().forEach((t) => t.stop())
        localStreamRef.current = null
        hostPcsRef.current.forEach((pc) => pc.close())
        hostPcsRef.current.clear()
        if (videoRef.current) videoRef.current.srcObject = null
        setSharing(false)
        channelRef.current?.send({ type: 'broadcast', event: 'host-ended', payload: {} })
    }

    const endLive = async () => {
        setSavingVideo(true)

        const stopRecorderPromise = new Promise<Blob | null>((resolve) => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.onstop = () => {
                    if (recordedChunksRef.current.length > 0) {
                        resolve(new Blob(recordedChunksRef.current, { type: 'video/webm' }))
                    } else {
                        resolve(null)
                    }
                }
                try { mediaRecorderRef.current.stop() } catch { resolve(null) }
            } else if (recordedChunksRef.current.length > 0) {
                resolve(new Blob(recordedChunksRef.current, { type: 'video/webm' }))
            } else {
                resolve(null)
            }
        })

        const blob = await stopRecorderPromise
        stopSharing()

        let videoUrl = null
        if (blob && blob.size > 1024) { // at least 1KB
            try {
                const file = new File([blob], `live-${roomId}-${Date.now()}.webm`, { type: 'video/webm' })
                const uploadRes = await uploadFiles('mediaUploader', { files: [file] })
                if (uploadRes && uploadRes[0]?.url) {
                    videoUrl = uploadRes[0].url
                }
            } catch (err) {
                console.error("Recording upload failed:", err)
            }
        }

        const { data: userData } = await supabase.auth.getUser()
        const user = userData?.user

        if (videoUrl && user && room) {
            try {
                // 1. Create post
                const { data: newPost } = await supabase.from('posts').insert({
                    user_id: user.id,
                    content: `🔴 JONLI EFIR YOZUVI: ${room.title}`,
                    image_url: room.thumbnail_url || null
                }).select().single()

                if (newPost) {
                    // 2. Insert video to post_media
                    await supabase.from('post_media').insert({
                        post_id: newPost.id,
                        url: videoUrl,
                        type: 'video',
                        position: 0
                    })

                    // 3. Move chat history to comments
                    const { data: chatMsgs } = await supabase
                        .from('live_chat_messages')
                        .select('*')
                        .eq('room_id', roomId)
                        .order('created_at', { ascending: true })

                    if (chatMsgs && chatMsgs.length > 0) {
                        const commentRows = chatMsgs.map((m: any) => ({
                            post_id: newPost.id,
                            user_id: m.user_id || user.id, // anonymous is fallback to host
                            content: m.message,
                            created_at: m.created_at
                        }))
                        await supabase.from('comments').insert(commentRows)
                    }
                }
            } catch (err) {
                console.error("Failed to migrate stream to post:", err)
            }
        }

        // Update live room status in DB
        await supabase
            .from('live_rooms')
            .update({
                is_live: false,
                ended_at: new Date().toISOString(),
                video_url: videoUrl
            })
            .eq('id', roomId)

        setSavingVideo(false)
        router.push('/dashboard/live')
    }

    const sendChat = async (e: React.FormEvent) => {
        e.preventDefault()
        const text = chatText.trim()
        if (!text) return

        const { data: userData } = await supabase.auth.getUser()
        const user = userData?.user

        const msg: ChatMsg = {
            id: clientIdRef.current + '-' + Date.now(),
            user: meRef.current.username,
            avatar: meRef.current.avatar,
            text,
            ts: Date.now(),
        }
        channelRef.current?.send({ type: 'broadcast', event: 'chat', payload: msg })
        pushChat(msg)
        setChatText('')

        try {
            await supabase.from('live_chat_messages').insert({
                room_id: roomId,
                user_id: user?.id || null,
                user_name: meRef.current.username,
                user_avatar: meRef.current.avatar,
                message: text
            })
        } catch (dbErr) {
            console.error("Failed to save comment to DB:", dbErr)
        }
    }

    // ── Loading ─────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-slate-400 font-medium">Yuklanmoqda...</p>
                </div>
            </div>
        )
    }

    // ── Not found ───────────────────────────────────────────────────────────
    if (notFound || !room) {
        return (
            <div className="min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center px-6 text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <HiXMark className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                    <p className="text-base font-bold text-slate-700 dark:text-slate-200">Efir topilmadi yoki tugagan</p>
                    <p className="text-sm text-slate-400 mt-1">Bu efir allaqachon yakunlangan bo&apos;lishi mumkin</p>
                </div>
                <button
                    onClick={() => router.push('/dashboard/live')}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors cursor-pointer"
                >
                    Efirlarga qaytish
                </button>
            </div>
        )
    }

    // ── Shared sub-components ───────────────────────────────────────────────

    // Video panel content
    const VideoContent = (
        <div
            className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden no-media-save animate-fade-in"
            onContextMenu={(e) => e.preventDefault()}
        >
            {!room.is_live && room.video_url ? (
                <video
                    src={room.video_url}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                />
            ) : (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    controlsList="nodownload noplaybackrate"
                    disablePictureInPicture
                    className="w-full h-full object-contain"
                />
            )}

            {/* Host: hali ulashmagan */}
            <AnimatePresence>
                {room.is_live && isHost && !sharing && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-slate-950/95 backdrop-blur-sm px-6"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-rose-500/20 blur-2xl scale-150" />
                            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500 to-fuchsia-600 flex items-center justify-center shadow-2xl shadow-rose-500/40">
                                <HiSignal className="w-10 h-10 text-white" />
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="text-white font-black text-xl mb-1.5">Efirga tayyormisiz?</p>
                            <p className="text-slate-400 text-sm max-w-xs">
                                {isDesktop
                                    ? "Ekran yoki o'yin oynasini tanlab, tomoshabinlarga ulashing"
                                    : "Ekranni ulashish faqat kompyuterda ishlaydi"}
                            </p>
                        </div>
                        {isDesktop && (
                            <button
                                onClick={startSharing}
                                className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-600 hover:from-rose-600 hover:to-fuchsia-700 text-white font-extrabold text-sm shadow-2xl shadow-rose-500/30 active:scale-95 transition-all cursor-pointer"
                            >
                                <HiOutlineComputerDesktop className="w-5 h-5" />
                                Ekranni ulashish
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Viewer: kutilmoqda */}
            <AnimatePresence>
                {room.is_live && !isHost && waitingForHost && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/90 backdrop-blur-sm"
                    >
                        <div className="relative w-14 h-14 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-2 border-rose-500/30 animate-ping" />
                            <div className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                        <div className="text-center px-6">
                            <p className="text-white font-bold text-sm">Host efirni boshlashini kutyapmiz</p>
                            <p className="text-slate-500 text-xs mt-1">Tez kunda ulanasiz...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Ended without video */}
            <AnimatePresence>
                {!room.is_live && !room.video_url && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/95"
                    >
                        <div className="relative w-16 h-16 rounded-3xl bg-slate-900 border border-white/5 flex items-center justify-center">
                            <HiStop className="w-8 h-8 text-slate-500" />
                        </div>
                        <div className="text-center px-6">
                            <p className="text-white font-black text-base">Jonli efir yakunlangan</p>
                            <p className="text-slate-500 text-xs mt-1.5">Bu efir yozib olinmagan yoki saqlanmagan.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )

    // Chat panel content
    const ChatContent = (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-none min-h-0">
                {chat.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 py-10 text-center">
                        <div className="text-3xl">💬</div>
                        <div>
                            <p className="text-sm font-bold text-slate-400 dark:text-slate-500">Chat bo&apos;sh</p>
                            <p className="text-xs text-slate-400/80 dark:text-slate-600 mt-0.5">Birinchi bo&apos;ling!</p>
                        </div>
                    </div>
                ) : (
                    chat.map((m) => (
                        <motion.div
                            key={m.id}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-start gap-2.5"
                        >
                            <img
                                src={m.avatar || '/default-avatar.png'} alt=""
                                className="w-7 h-7 rounded-full object-cover bg-slate-200 dark:bg-slate-800 shrink-0 ring-1 ring-black/5 dark:ring-white/5"
                            />
                            <div className="min-w-0 flex-1">
                                <span className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400">{m.user}</span>
                                <p className="text-xs text-slate-700 dark:text-slate-300 break-words leading-relaxed mt-0.5">{m.text}</p>
                            </div>
                        </motion.div>
                    ))
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input / Lock */}
            {room.is_live ? (
                <form
                    onSubmit={sendChat}
                    className="px-3 py-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2 shrink-0 bg-slate-50/50 dark:bg-slate-950/40"
                >
                    <input
                        value={chatText}
                        onChange={(e) => setChatText(e.target.value)}
                        placeholder="Xabar yozing..."
                        maxLength={300}
                        className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/8 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-rose-500/50 focus:bg-white dark:focus:bg-white/8 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!chatText.trim()}
                        className="p-2.5 bg-rose-600 disabled:bg-slate-200 dark:disabled:bg-white/5 disabled:text-slate-400 dark:disabled:text-slate-600 text-white rounded-xl transition-all active:scale-90 cursor-pointer hover:bg-rose-500 disabled:cursor-default shrink-0"
                    >
                        <HiPaperAirplane className="w-4 h-4" />
                    </button>
                </form>
            ) : (
                <div className="px-4 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-950/20 text-center text-xs font-bold text-slate-400 dark:text-slate-500">
                    🔒 Jonli chat yakunlangan (Read-only)
                </div>
            )}
        </div>
    )

    // ── Top bar (shared) ────────────────────────────────────────────────────
    const TopBar = (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl shrink-0 text-slate-900 dark:text-white">
            <div className="flex items-center gap-2.5 min-w-0">
                <button
                    onClick={() => router.push('/dashboard/live')}
                    className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/8 active:scale-90 transition-all cursor-pointer shrink-0"
                >
                    <HiArrowLeft className="w-5 h-5" />
                </button>
                {room.is_live ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-600/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        LIVE
                    </span>
                ) : (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-200 dark:bg-white/10 border border-slate-350 dark:border-white/20 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                        Yozuv
                    </span>
                )}
                <div className="min-w-0">
                    <h1 className="text-sm font-black text-slate-900 dark:text-white truncate leading-tight">{room.title}</h1>
                    {room.game && <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">{room.game}</p>}
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                {room.is_live ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/8 text-slate-750 dark:text-slate-300 text-xs font-bold">
                        <HiUserGroup className="w-3.5 h-3.5 text-rose-500" />
                        {viewerCount}
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/8 text-slate-750 dark:text-slate-300 text-xs font-bold">
                        <HiUserGroup className="w-3.5 h-3.5 text-slate-400" />
                        {viewerCount || room.peak_viewers} max
                    </div>
                )}
                {/* Desktop: chat toggle */}
                {isDesktop && (
                    <button
                        onClick={() => setChatOpen((p) => !p)}
                        className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/8 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        {chatOpen ? 'Chatni yopish' : 'Chat'}
                    </button>
                )}
            </div>
        </div>
    )

    // ── Host controls bar (shared, desktop only yoki host mobilda ham) ──────
    const HostBar = isHost && room.is_live && (
        <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 bg-slate-100/90 dark:bg-slate-900/80 border-t border-slate-200 dark:border-white/5 backdrop-blur-xl">
            {isDesktop && (
                sharing ? (
                    <button
                        onClick={stopSharing}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-white/8 hover:bg-slate-200 dark:hover:bg-white/12 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                    >
                        <HiStop className="w-4 h-4 text-amber-500" />
                        Ulashishni to&apos;xtatish
                    </button>
                ) : (
                    <button
                        onClick={startSharing}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer"
                    >
                        <HiOutlineComputerDesktop className="w-4 h-4" />
                        Ekranni ulashish
                    </button>
                )
            )}
            {sharing && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                    Uzatilmoqda
                </span>
            )}
            <div className="ml-auto">
                <button
                    onClick={endLive}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                >
                    <HiXMark className="w-4 h-4" />
                    Efirni tugatish
                </button>
            </div>
        </div>
    )

    // ── MOBILE layout ───────────────────────────────────────────────────────
    if (!isDesktop) {
        return (
            <div className="w-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white" style={{ height: 'calc(100dvh - 4rem)' }}>
                {TopBar}

                {/* Mobil tab switcher */}
                <div className="flex shrink-0 border-b border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-900/60">
                    <button
                        onClick={() => setMobileTab('video')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-colors cursor-pointer ${mobileTab === 'video' ? 'text-slate-900 dark:text-white border-b-2 border-rose-500' : 'text-slate-500'}`}
                    >
                        <HiSignal className="w-3.5 h-3.5" />
                        Efir
                    </button>
                    <button
                        onClick={() => setMobileTab('chat')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-colors cursor-pointer relative ${mobileTab === 'chat' ? 'text-slate-900 dark:text-white border-b-2 border-rose-500' : 'text-slate-500'}`}
                    >
                        <HiChatBubbleLeftRight className="w-3.5 h-3.5" />
                        Chat
                        {chat.length > 0 && mobileTab !== 'chat' && (
                            <span className="absolute top-2 right-6 w-1.5 h-1.5 rounded-full bg-rose-500" />
                        )}
                    </button>
                </div>

                {/* Tab content */}
                <div className="flex-1 min-h-0 overflow-hidden relative">
                    <div className={`w-full h-full ${mobileTab === 'video' ? 'block' : 'hidden'}`}>
                        {VideoContent}
                    </div>
                    <div className={`w-full h-full bg-white dark:bg-slate-900 ${mobileTab === 'chat' ? 'block' : 'hidden'}`}>
                        {ChatContent}
                    </div>
                </div>

                {HostBar}
            </div>
        )
    }

    // ── DESKTOP layout ──────────────────────────────────────────────────────
    return (
        <div className="w-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white animate-fade-in" style={{ height: 'calc(100dvh - 4rem)' }}>
            {savingVideo && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md">
                    <div className="flex flex-col items-center gap-4 text-center px-6">
                        <div className="w-14 h-14 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
                        <h3 className="text-white font-extrabold text-lg">Efir yakunlanmoqda</h3>
                        <p className="text-slate-400 text-sm max-w-xs">Video yozuv tayyorlanmoqda va tarmoqqa yuklanmoqda. Iltimos, sahifadan chiqmang...</p>
                    </div>
                </div>
            )}
            {TopBar}

            <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* Video area */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex-1 min-h-0">
                        {VideoContent}
                    </div>
                    {HostBar}
                </div>

                {/* Chat sidebar */}
                <AnimatePresence initial={false}>
                    {chatOpen && (
                        <motion.div
                            key="chat"
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 320, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="shrink-0 flex flex-col border-l border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 overflow-hidden"
                            style={{ minWidth: 0 }}
                        >
                            {/* Chat header */}
                            <div className="px-4 py-3 border-b border-slate-200 dark:border-white/5 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-950/20">
                                <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">Jonli chat</span>
                                    <span className="px-2 py-0.5 bg-rose-500/15 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-[10px] font-bold rounded-full">
                                        {room.is_live ? `${viewerCount} tomoshabin` : 'Yakunlangan'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setChatOpen(false)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                >
                                    <HiXMark className="w-4 h-4" />
                                </button>
                            </div>
                            {ChatContent}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
