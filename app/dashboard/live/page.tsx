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
import { FiMonitor } from 'react-icons/fi'
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

const GAME_GRADIENTS: Record<string, [string, string]> = {
    'Valorant': ['#ff4655', '#0f0e17'],
    'Dota 2': ['#c23c2a', '#1a1a2e'],
    'CS2': ['#f0b429', '#1c1c1e'],
    'Minecraft': ['#5d8a3c', '#1a2e1a'],
    'GTA': ['#000000', '#1a1a2e'],
}

function getGradient(game: string | null): [string, string] {
    if (game) {
        for (const [key, val] of Object.entries(GAME_GRADIENTS)) {
            if (game.toLowerCase().includes(key.toLowerCase())) return val
        }
    }
    return ['#7c3aed', '#0f0e17']
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

    // Mobilda "Efirni boshlash" bosganda: ekran ulashish desktop only
    const handleGoLiveClick = () => {
        if (!isDesktop) {
            alert("Jonli efirni boshlash faqat kompyuterda ishlaydi.\nTomosha qilish uchun efirni boshing!")
            return
        }
        setShowCreate(true)
    }

    return (
        <div className="w-full px-5 md:px-8 xl:px-10 py-8">

            {/* ── Hero header ── */}
            <div className="flex items-center justify-between mb-10 gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-fuchsia-600 flex items-center justify-center shadow-2xl shadow-rose-500/30 shrink-0">
                        <HiSignal className="w-7 h-7 text-white" />
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-950 animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                            Live Share
                        </h1>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                            Gamerlar uchun jonli efir — ekraningizni real vaqtda ulashing
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleGoLiveClick}
                    className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-600 hover:from-rose-600 hover:to-fuchsia-700 text-white text-sm font-extrabold shadow-xl shadow-rose-500/25 active:scale-95 transition-all cursor-pointer"
                >
                    <HiPlay className="w-5 h-5" />
                    {isDesktop ? 'Efirni boshlash' : 'Efirlar'}
                </button>
            </div>

            {/* ── Rooms grid ── */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="aspect-video rounded-3xl bg-slate-100 dark:bg-slate-900/60 animate-pulse" />
                    ))}
                </div>
            ) : rooms.length === 0 ? (
                /* ── Empty state ── */
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full py-24 flex flex-col items-center gap-5 rounded-3xl border border-dashed border-slate-200 dark:border-white/8 bg-slate-50/50 dark:bg-slate-900/20 text-center"
                >
                    <div className="relative">
                        <div className="absolute inset-0 rounded-3xl bg-slate-400/10 blur-xl scale-150" />
                        <div className="relative w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/5 flex items-center justify-center">
                            <HiOutlineVideoCamera className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                        </div>
                    </div>
                    <div>
                        <p className="text-base font-black text-slate-700 dark:text-slate-200">{"Hozircha jonli efir yo'q"}</p>
                        <p className="text-sm font-medium text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                            {"Birinchi bo'lib efirni boshlang va o'yiningizni ulashing 🎮"}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white text-sm font-bold shadow-lg shadow-rose-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                        <HiPlay className="w-4 h-4" /> Efirni boshlash
                    </button>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {rooms.map((room, i) => {
                        const [g1, g2] = getGradient(room.game)
                        return (
                            <motion.button
                                key={room.id}
                                layout
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => router.push(`/dashboard/live/${room.id}`)}
                                className="group text-left rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 hover:border-rose-300 dark:hover:border-rose-500/30 hover:shadow-2xl hover:shadow-rose-500/10 dark:hover:shadow-rose-500/5 transition-all duration-300 cursor-pointer"
                            >
                                {/* Thumbnail */}
                                <div
                                    className="relative aspect-video flex items-center justify-center overflow-hidden"
                                    style={{ background: `linear-gradient(135deg, ${g1}cc, ${g2})` }}
                                >
                                    <FiMonitor className="w-14 h-14 text-white/10 group-hover:scale-110 group-hover:text-white/20 transition-all duration-500" />

                                    {/* LIVE badge */}
                                    <span className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-lg">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                        LIVE
                                    </span>

                                    {/* Viewer count */}
                                    <span className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-[11px] font-bold">
                                        <HiUserGroup className="w-3.5 h-3.5" />
                                        {room.viewer_count}
                                    </span>

                                    {/* Game tag */}
                                    {room.game && (
                                        <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white/80 text-[10px] font-bold">
                                            {room.game}
                                        </span>
                                    )}

                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300" />
                                </div>

                                {/* Info */}
                                <div className="p-4 flex items-center gap-3">
                                    <img
                                        src={room.host?.avatar_url || '/default-avatar.png'}
                                        alt=""
                                        className="w-10 h-10 rounded-full object-cover bg-slate-200 dark:bg-slate-800 shrink-0 ring-2 ring-slate-100 dark:ring-white/5"
                                    />
                                    <div className="min-w-0">
                                        <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate leading-tight">
                                            {room.title}
                                        </p>
                                        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                            {room.host?.username || 'Anonim'}
                                        </p>
                                    </div>
                                    <div className="ml-auto shrink-0">
                                        <div className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold">
                                            Tomosha
                                        </div>
                                    </div>
                                </div>
                            </motion.button>
                        )
                    })}
                </div>
            )}

            {/* ── Create modal ── */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[80] flex items-center justify-center p-4"
                    >
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            onClick={() => setShowCreate(false)}
                        />

                        {/* Panel */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.94, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.94, y: 16 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                            className="relative z-10 w-full max-w-md"
                        >
                            {/* Glow */}
                            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-rose-500/20 to-fuchsia-600/20 blur-2xl scale-105" />

                            <div className="relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 p-7 shadow-2xl">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-7">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-fuchsia-600 flex items-center justify-center">
                                            <HiSignal className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 leading-none">Yangi jonli efir</h2>
                                            <p className="text-xs text-slate-400 mt-0.5">Hamma ko&apos;ra oladi</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowCreate(false)}
                                        className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                    >
                                        <HiXMark className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Fields */}
                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                                            Efir nomi
                                        </label>
                                        <input
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Masalan: Valorant rank push 🔥"
                                            maxLength={80}
                                            className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/8 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-rose-400 dark:focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                                            {"O'yin"} <span className="font-medium normal-case text-slate-400">(ixtiyoriy)</span>
                                        </label>
                                        <input
                                            value={game}
                                            onChange={(e) => setGame(e.target.value)}
                                            placeholder="Masalan: Dota 2, CS2, Valorant"
                                            maxLength={40}
                                            className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/8 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-rose-400 dark:focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Submit */}
                                <button
                                    onClick={handleGoLive}
                                    disabled={creating}
                                    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-fuchsia-600 hover:from-rose-600 hover:to-fuchsia-700 disabled:opacity-60 text-white text-sm font-extrabold shadow-xl shadow-rose-500/25 active:scale-[0.98] transition-all cursor-pointer"
                                >
                                    {creating ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Boshlanmoqda...
                                        </>
                                    ) : (
                                        <>
                                            <HiSignal className="w-5 h-5" />
                                            Efirga chiqish
                                        </>
                                    )}
                                </button>

                                <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-4">
                                    {"Keyingi qadamda ekran yoki o'yin oynasini tanlaysiz."}
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
