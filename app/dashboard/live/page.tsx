"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    HiSignal,
    HiPlay,
    HiOutlineVideoCamera,
    HiUserGroup,
    HiXMark,
    HiOutlineComputerDesktop,
} from 'react-icons/hi2'
import { createClient } from '@/utils/supabase/client'

interface LiveRoom {
    id: string
    host_id: string
    title: string
    game: string | null
    is_live: boolean
    viewer_count: number
    created_at: string
    host?: { username: string | null; avatar_url: string | null } | null
}

export default function LivePage() {
    const router = useRouter()
    const supabase = createClient()

    const [rooms, setRooms] = useState<LiveRoom[]>([])
    const [loading, setLoading] = useState(true)
    const [isDesktop, setIsDesktop] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [title, setTitle] = useState('')
    const [game, setGame] = useState('')
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1024px)')
        const update = () => setIsDesktop(mq.matches)
        update()
        mq.addEventListener('change', update)
        return () => mq.removeEventListener('change', update)
    }, [])

    const fetchRooms = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('live_rooms')
                .select('id, host_id, title, game, is_live, viewer_count, created_at')
                .eq('is_live', true)
                .order('created_at', { ascending: false })

            if (error || !data) {
                // Jadval hali yaratilmagan bo'lishi mumkin — jim o'tamiz
                setRooms([])
                return
            }

            const rows = data as unknown as Omit<LiveRoom, 'host'>[]
            const hostIds = Array.from(new Set(rows.map((r) => r.host_id)))
            let hostMap: Record<string, { username: string | null; avatar_url: string | null }> = {}
            if (hostIds.length > 0) {
                const { data: profs } = await supabase
                    .from('profiles')
                    .select('id, username, avatar_url')
                    .in('id', hostIds)
                const profRows = (profs || []) as unknown as { id: string; username: string | null; avatar_url: string | null }[]
                hostMap = Object.fromEntries(
                    profRows.map((p) => [p.id, { username: p.username, avatar_url: p.avatar_url }])
                )
            }

            setRooms(rows.map((r) => ({ ...r, host: hostMap[r.host_id] || null })))
        } catch {
            setRooms([])
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchRooms()
        const channel = supabase
            .channel('live-rooms-lobby')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'live_rooms' }, () => {
                fetchRooms()
            })
            .subscribe()
        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, fetchRooms])

    const handleGoLive = async () => {
        if (creating) return
        setCreating(true)
        try {
            const { data: userData } = await supabase.auth.getUser()
            const user = userData?.user
            if (!user) {
                router.push('/login')
                return
            }
            const { data, error } = await supabase
                .from('live_rooms')
                .insert({
                    host_id: user.id,
                    title: title.trim() || 'Jonli efir',
                    game: game.trim() || null,
                    is_live: true,
                    viewer_count: 0,
                })
                .select('id')
                .single()

            if (error || !data) {
                alert("Efirni boshlashda xatolik. Avval database/live-share.sql ni Supabase'da ishga tushiring.")
                return
            }
            router.push(`/dashboard/live/${data.id}`)
        } catch {
            alert('Efirni boshlashda xatolik yuz berdi.')
        } finally {
            setCreating(false)
        }
    }

    // Mobil: hozircha disable
    if (!isDesktop) {
        return (
            <div className="min-h-[calc(100dvh-8rem)] flex flex-col items-center justify-center px-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                    <HiOutlineComputerDesktop className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                </div>
                <h1 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-1.5">
                    Live Share faqat kompyuterda
                </h1>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-xs">
                    {"Jonli efir (gamerlar uchun) hozircha faqat desktop versiyada ishlaydi. Telefonda tez orada qo'shiladi."}
                </p>
                <button
                    onClick={() => router.push('/dashboard')}
                    className="mt-6 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors cursor-pointer"
                >
                    Bosh sahifaga qaytish
                </button>
            </div>
        )
    }

    return (
        <div className="w-full px-4 md:px-6 xl:px-8 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
                        <HiSignal className="w-6 h-6 text-white" />
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-950 animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                            Live Share
                        </h1>
                        <p className="text-[12px] md:text-[13px] font-medium text-slate-500 dark:text-slate-400">
                            Gamerlar uchun jonli efir — ekraningizni real vaqtda ulashing
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-600 hover:from-rose-600 hover:to-fuchsia-700 text-white text-sm font-extrabold shadow-lg shadow-rose-500/25 active:scale-95 transition-all cursor-pointer"
                >
                    <HiPlay className="w-5 h-5" />
                    Efirni boshlash
                </button>
            </div>

            {/* Rooms grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="aspect-video rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
                    ))}
                </div>
            ) : rooms.length === 0 ? (
                <div className="w-full py-20 bg-slate-50/60 dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-white/5 rounded-3xl text-center">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                        <HiOutlineVideoCamera className="w-7 h-7 text-slate-400 dark:text-slate-500" />
                    </div>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{"Hozircha jonli efir yo'q"}</p>
                    <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-1">
                        {"Birinchi bo'lib efirni boshlang va o'yiningizni ulashing 🎮"}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {rooms.map((room) => (
                        <motion.button
                            key={room.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => router.push(`/dashboard/live/${room.id}`)}
                            className="group text-left rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 hover:border-rose-300 dark:hover:border-rose-500/40 hover:shadow-xl transition-all cursor-pointer"
                        >
                            <div className="relative aspect-video bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center overflow-hidden">
                                <HiOutlineVideoCamera className="w-12 h-12 text-white/15 group-hover:scale-110 transition-transform" />
                                <span className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wide">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                    Live
                                </span>
                                <span className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/55 backdrop-blur text-white text-[11px] font-bold">
                                    <HiUserGroup className="w-3.5 h-3.5" />
                                    {room.viewer_count}
                                </span>
                            </div>
                            <div className="p-3.5 flex items-center gap-3">
                                <img
                                    src={room.host?.avatar_url || '/default-avatar.png'}
                                    alt=""
                                    className="w-9 h-9 rounded-full object-cover bg-slate-200 dark:bg-slate-800 shrink-0"
                                />
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{room.title}</p>
                                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate">
                                        {room.host?.username || 'Anonim'}{room.game ? ` · ${room.game}` : ''}
                                    </p>
                                </div>
                            </div>
                        </motion.button>
                    ))}
                </div>
            )}

            {/* Create modal */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[80] flex items-center justify-center p-4"
                    >
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 12 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                            className="relative z-10 w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 p-6 shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">Yangi jonli efir</h2>
                                <button
                                    onClick={() => setShowCreate(false)}
                                    className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                    <HiXMark className="w-5 h-5" />
                                </button>
                            </div>

                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Efir nomi</label>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Masalan: Valorant rank push 🔥"
                                maxLength={80}
                                className="w-full mb-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-rose-400 dark:focus:border-rose-500 transition-colors"
                            />

                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">{"O'yin (ixtiyoriy)"}</label>
                            <input
                                value={game}
                                onChange={(e) => setGame(e.target.value)}
                                placeholder="Masalan: Dota 2, CS2, Valorant"
                                maxLength={40}
                                className="w-full mb-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-rose-400 dark:focus:border-rose-500 transition-colors"
                            />

                            <button
                                onClick={handleGoLive}
                                disabled={creating}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-fuchsia-600 hover:from-rose-600 hover:to-fuchsia-700 disabled:opacity-60 text-white text-sm font-extrabold shadow-lg shadow-rose-500/25 active:scale-95 transition-all cursor-pointer"
                            >
                                {creating ? 'Boshlanmoqda...' : (<><HiSignal className="w-5 h-5" /> Efirga chiqish</>)}
                            </button>
                            <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-3">
                                {"Keyingi qadamda ekran yoki o'yin oynasini tanlaysiz."}
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
