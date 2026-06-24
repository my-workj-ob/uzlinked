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
} from 'react-icons/hi2'
import { createClient } from '@/utils/supabase/client'

interface RoomInfo {
    id: string
    host_id: string
    title: string
    game: string | null
    is_live: boolean
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
    const [isDesktop, setIsDesktop] = useState(true)

    const [sharing, setSharing] = useState(false)
    const [viewerCount, setViewerCount] = useState(0)
    const [waitingForHost, setWaitingForHost] = useState(true)

    const [chat, setChat] = useState<ChatMsg[]>([])
    const [chatText, setChatText] = useState('')

    const videoRef = useRef<HTMLVideoElement>(null)
    const chatEndRef = useRef<HTMLDivElement>(null)

    const channelRef = useRef<RealtimeChannel | null>(null)
    const localStreamRef = useRef<MediaStream | null>(null)
    const hostPcsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
    const viewerPcRef = useRef<RTCPeerConnection | null>(null)
    const isHostRef = useRef(false)
    const clientIdRef = useRef<string>('')
    const meRef = useRef<{ username: string; avatar: string | null }>({ username: 'Anonim', avatar: null })

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
        if (existing) {
            existing.close()
            hostPcsRef.current.delete(viewerId)
        }
        const pc = new RTCPeerConnection(ICE_CONFIG)
        hostPcsRef.current.set(viewerId, pc)

        const stream = localStreamRef.current
        if (stream) {
            stream.getTracks().forEach((track) => pc.addTrack(track, stream))
        }

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                channelRef.current?.send({
                    type: 'broadcast',
                    event: 'ice-to-viewer',
                    payload: { to: viewerId, candidate: e.candidate.toJSON() },
                })
            }
        }

        pc.createOffer()
            .then((offer) => pc.setLocalDescription(offer).then(() => offer))
            .then((offer) => {
                channelRef.current?.send({
                    type: 'broadcast',
                    event: 'offer',
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
            }
        }
        pc.onicecandidate = (e) => {
            if (e.candidate) {
                channelRef.current?.send({
                    type: 'broadcast',
                    event: 'ice-to-host',
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
                .select('id, host_id, title, game, is_live')
                .eq('id', roomId)
                .single()

            if (cancelled) return
            if (error || !roomData) {
                setNotFound(true)
                setLoading(false)
                return
            }

            const host = !!user && user.id === roomData.host_id
            isHostRef.current = host
            setRoom(roomData as RoomInfo)
            setIsHost(host)
            setLoading(false)

            if (user) {
                const { data: prof } = await supabase
                    .from('profiles')
                    .select('username, avatar_url')
                    .eq('id', user.id)
                    .single()
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
                // Host: viewer qo'shilganda offer yuboramiz
                channel.on('broadcast', { event: 'viewer-join' }, ({ payload }: BroadcastArgs<{ viewerId: string }>) => {
                    const viewerId = payload.viewerId
                    if (localStreamRef.current) createHostPc(viewerId)
                })
                channel.on('broadcast', { event: 'answer' }, async ({ payload }: BroadcastArgs<{ from: string; sdp: RTCSessionDescriptionInit }>) => {
                    const { from, sdp } = payload
                    const pc = hostPcsRef.current.get(from)
                    if (pc) {
                        try { await pc.setRemoteDescription(new RTCSessionDescription(sdp)) } catch { }
                    }
                })
                channel.on('broadcast', { event: 'ice-to-host' }, async ({ payload }: BroadcastArgs<{ from: string; candidate: RTCIceCandidateInit }>) => {
                    const { from, candidate } = payload
                    const pc = hostPcsRef.current.get(from)
                    if (pc) {
                        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)) } catch { }
                    }
                })
            } else {
                // Viewer: offer kelganda answer qaytaramiz
                channel.on('broadcast', { event: 'offer' }, async ({ payload }: BroadcastArgs<{ to: string; sdp: RTCSessionDescriptionInit }>) => {
                    const { to, sdp } = payload
                    if (to !== clientIdRef.current) return
                    const pc = ensureViewerPc()
                    try {
                        await pc.setRemoteDescription(new RTCSessionDescription(sdp))
                        const answer = await pc.createAnswer()
                        await pc.setLocalDescription(answer)
                        channel.send({
                            type: 'broadcast',
                            event: 'answer',
                            payload: { from: clientIdRef.current, sdp: answer },
                        })
                    } catch { }
                })
                channel.on('broadcast', { event: 'ice-to-viewer' }, async ({ payload }: BroadcastArgs<{ to: string; candidate: RTCIceCandidateInit }>) => {
                    const { to, candidate } = payload
                    if (to !== clientIdRef.current) return
                    const pc = ensureViewerPc()
                    try { await pc.addIceCandidate(new RTCIceCandidate(candidate)) } catch { }
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
                const keys = Object.keys(state)
                // host'ni ayirib tashlaymiz
                const viewers = keys.filter((k) => {
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
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { frameRate: 30 },
                audio: true,
            })
            localStreamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.muted = true
            }
            setSharing(true)

            // Foydalanuvchi "Stop sharing" bossa
            stream.getVideoTracks()[0].addEventListener('ended', () => {
                stopSharing()
            })

            // Mavjud va kelajakdagi viewerlarni xabardor qilamiz
            channelRef.current?.send({ type: 'broadcast', event: 'host-ready', payload: {} })
        } catch {
            // foydalanuvchi bekor qildi
        }
    }

    const stopSharing = () => {
        localStreamRef.current?.getTracks().forEach((t) => t.stop())
        localStreamRef.current = null
        hostPcsRef.current.forEach((pc) => pc.close())
        hostPcsRef.current.clear()
        if (videoRef.current) videoRef.current.srcObject = null
        setSharing(false)
        channelRef.current?.send({ type: 'broadcast', event: 'host-ended', payload: {} })
    }

    const endLive = async () => {
        stopSharing()
        await supabase.from('live_rooms').update({ is_live: false, ended_at: new Date().toISOString() }).eq('id', roomId)
        router.push('/dashboard/live')
    }

    const sendChat = (e: React.FormEvent) => {
        e.preventDefault()
        const text = chatText.trim()
        if (!text) return
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
    }

    if (!isDesktop) {
        return (
            <div className="min-h-[calc(100dvh-8rem)] flex flex-col items-center justify-center px-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                    <HiOutlineComputerDesktop className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                </div>
                <h1 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-1.5">Live Share faqat kompyuterda</h1>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-xs">
                    Jonli efir hozircha faqat desktop versiyada ishlaydi.
                </p>
                <button onClick={() => router.push('/dashboard')} className="mt-6 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors cursor-pointer">
                    Bosh sahifa
                </button>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-[calc(100dvh-8rem)] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (notFound || !room) {
        return (
            <div className="min-h-[calc(100dvh-8rem)] flex flex-col items-center justify-center px-6 text-center">
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4">Efir topilmadi yoki tugagan</p>
                <button onClick={() => router.push('/dashboard/live')} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors cursor-pointer">
                    {"Efirlar ro'yxati"}
                </button>
            </div>
        )
    }

    return (
        <div className="w-full h-[calc(100dvh-4rem)] flex flex-col xl:flex-row gap-4 p-4 md:p-6">
            {/* Video maydon */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between mb-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <button onClick={() => router.push('/dashboard/live')} className="p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all cursor-pointer">
                            <HiArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-base md:text-lg font-black text-slate-900 dark:text-slate-100 truncate">{room.title}</h1>
                            {room.game && <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 truncate">{room.game}</p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-600 text-white text-[11px] font-black uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live
                        </span>
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[12px] font-bold">
                            <HiUserGroup className="w-4 h-4" /> {viewerCount}
                        </span>
                    </div>
                </div>

                <div className="relative flex-1 rounded-2xl overflow-hidden bg-slate-950 border border-slate-100 dark:border-white/5 flex items-center justify-center no-media-save" onContextMenu={(e) => e.preventDefault()}>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        controlsList="nodownload noplaybackrate"
                        disablePictureInPicture
                        className="w-full h-full object-contain bg-black"
                    />

                    {/* Host: hali ulashmagan */}
                    {isHost && !sharing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/90 backdrop-blur-sm text-center px-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
                                <HiSignal className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <p className="text-white font-black text-lg">Efirga tayyormisiz?</p>
                                <p className="text-slate-400 text-sm mt-1">{"Ekran yoki o'yin oynasini tanlab ulashing"}</p>
                            </div>
                            <button onClick={startSharing} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-fuchsia-600 hover:from-rose-600 hover:to-fuchsia-700 text-white font-extrabold shadow-lg shadow-rose-500/25 active:scale-95 transition-all cursor-pointer">
                                <HiOutlineComputerDesktop className="w-5 h-5" /> Ekranni ulashish
                            </button>
                        </div>
                    )}

                    {/* Viewer: host hali efirga chiqmagan */}
                    {!isHost && waitingForHost && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
                            <div className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-slate-300 font-bold text-sm">Host efirni boshlashini kutyapmiz...</p>
                        </div>
                    )}
                </div>

                {/* Host boshqaruvi */}
                {isHost && (
                    <div className="flex items-center gap-3 mt-3">
                        {sharing ? (
                            <button onClick={stopSharing} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm font-bold transition-colors cursor-pointer">
                                <HiStop className="w-5 h-5" /> {"Ulashishni to'xtatish"}
                            </button>
                        ) : (
                            <button onClick={startSharing} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors cursor-pointer">
                                <HiOutlineComputerDesktop className="w-5 h-5" /> Ekranni ulashish
                            </button>
                        )}
                        <button onClick={endLive} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-colors cursor-pointer ml-auto">
                            <HiXMark className="w-5 h-5" /> Efirni tugatish
                        </button>
                    </div>
                )}
            </div>

            {/* Chat paneli */}
            <div className="w-full xl:w-80 2xl:w-96 shrink-0 flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Jonli chat</span>
                    <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[11px] font-bold rounded-full">{viewerCount} tomoshabin</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-none min-h-0">
                    {chat.length === 0 ? (
                        <p className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500 py-8">{"Hali xabar yo'q. Birinchi bo'ling! 💬"}</p>
                    ) : (
                        chat.map((m) => (
                            <div key={m.id} className="flex items-start gap-2.5 animate-comment-slide-in">
                                <img src={m.avatar || '/default-avatar.png'} alt="" className="w-7 h-7 rounded-full object-cover bg-slate-200 dark:bg-slate-800 shrink-0" />
                                <div className="min-w-0">
                                    <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100">{m.user}</span>
                                    <p className="text-xs text-slate-700 dark:text-slate-300 break-words leading-relaxed">{m.text}</p>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={chatEndRef} />
                </div>

                <form onSubmit={sendChat} className="p-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2">
                    <input
                        value={chatText}
                        onChange={(e) => setChatText(e.target.value)}
                        placeholder="Xabar yozing..."
                        maxLength={300}
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-full px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-rose-400 dark:focus:border-rose-500 transition-colors"
                    />
                    <button type="submit" disabled={!chatText.trim()} className="p-2.5 bg-rose-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 rounded-full transition active:scale-90 cursor-pointer">
                        <HiPaperAirplane className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    )
}
