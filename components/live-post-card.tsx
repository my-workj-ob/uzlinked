"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { HiSignal, HiUserGroup, HiClock } from 'react-icons/hi2'
import { FiMonitor } from 'react-icons/fi'

export interface LiveRoomFeed {
    id: string
    host_id: string
    title: string
    game: string | null
    thumbnail_url: string | null
    viewer_count: number
    peak_viewers: number
    is_live: boolean
    created_at: string
    ended_at: string | null
    host_username: string | null
    host_avatar_url: string | null
    host_nickname: string | null
}

// O'yin bo'yicha gradient
const GAME_GRADIENTS: Record<string, string> = {
    valorant:  'from-[#ff4655]/90 to-[#0f0e17]',
    dota:      'from-[#c23c2a]/90 to-[#1a1a2e]',
    cs2:       'from-[#f0b429]/80 to-[#1c1c1e]',
    minecraft: 'from-[#5d8a3c]/90 to-[#1a2e1a]',
    gta:       'from-[#3a3a3a]/90 to-[#0d0d0d]',
    pubg:      'from-[#e67e22]/90 to-[#1a1209]',
    fortnite:  'from-[#1d78db]/90 to-[#05030f]',
}

function getGradient(game: string | null, ended = false): string {
    if (ended) return 'from-slate-700/80 to-slate-900'
    if (!game) return 'from-[#7c3aed]/90 to-[#0f0e17]'
    const key = game.toLowerCase()
    for (const [name, grad] of Object.entries(GAME_GRADIENTS)) {
        if (key.includes(name)) return grad
    }
    return 'from-[#e11d48]/90 to-[#0f0e17]'
}

// Jonli efirdan beri o'tgan vaqt (davom etmoqda)
function useElapsed(createdAt: string, active: boolean) {
    const [label, setLabel] = useState('')
    useEffect(() => {
        if (!active) return
        const calc = () => {
            const ms = Date.now() - new Date(createdAt).getTime()
            const m = Math.floor(ms / 60000)
            const h = Math.floor(m / 60)
            setLabel(h > 0 ? `${h}s ${m % 60}d` : `${m}d`)
        }
        calc()
        const t = setInterval(calc, 30000)
        return () => clearInterval(t)
    }, [createdAt, active])
    return label
}

// Qancha oldin tugadi
function formatEndedAgo(endedAt: string): string {
    const ms = Date.now() - new Date(endedAt).getTime()
    const m = Math.floor(ms / 60000)
    const h = Math.floor(m / 60)
    const d = Math.floor(h / 24)
    if (d > 0) return `${d} kun oldin`
    if (h > 0) return `${h} soat oldin`
    if (m > 0) return `${m} daqiqa oldin`
    return 'Hozirgina'
}

// Efir davomiyligi
function formatDuration(createdAt: string, endedAt: string): string {
    const ms = new Date(endedAt).getTime() - new Date(createdAt).getTime()
    const m = Math.floor(ms / 60000)
    const h = Math.floor(m / 60)
    if (h > 0) return `${h}s ${m % 60}d`
    return `${m} daqiqa`
}

export function LivePostCard({ room, index = 0 }: { room: LiveRoomFeed; index?: number }) {
    const router = useRouter()
    const isEnded = !room.is_live
    const elapsed = useElapsed(room.created_at, !isEnded)
    const grad = getGradient(room.game, isEnded)
    const displayName = room.host_nickname || room.host_username || 'Anonim'

    const handleClick = () => {
        if (isEnded) return // Tugagan efirga kirish mumkin emas
        router.push(`/dashboard/live/${room.id}`)
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: index * 0.06 }}
            onClick={handleClick}
            className={`relative rounded-3xl overflow-hidden select-none group ${isEnded ? 'cursor-default' : 'cursor-pointer'}`}
            style={{ isolation: 'isolate' }}
        >
            {/* Tashqi glow — faqat aktiv efirda */}
            {!isEnded && (
                <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-rose-500 via-fuchsia-500 to-rose-600 opacity-60 group-hover:opacity-90 transition-opacity duration-500 blur-[1px]" />
            )}
            {/* Tugagan efirda oddiy border */}
            {isEnded && (
                <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-slate-600/40 to-slate-700/40 blur-[0.5px]" />
            )}

            {/* Asosiy karta */}
            <div className={`relative rounded-[calc(1.5rem-1px)] overflow-hidden border border-white/5 ${isEnded ? 'bg-slate-900' : 'bg-slate-950'}`}>

                {/* ── Thumbnail / Video maydon ── */}
                <div
                    className={`relative w-full bg-gradient-to-br ${grad} flex items-center justify-center overflow-hidden`}
                    style={{ aspectRatio: '16/7' }}
                >
                    {/* Background monitor icon */}
                    <FiMonitor className={`absolute inset-0 m-auto w-20 h-20 transition-colors duration-500 ${isEnded ? 'text-white/8' : 'text-white/5 group-hover:text-white/10'}`} />

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    {/* Ended overlay — qoraytirish */}
                    {isEnded && (
                        <div className="absolute inset-0 bg-black/40" />
                    )}

                    {/* Markaziy icon */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        {isEnded ? (
                            // Tugagan — oddiy icon
                            <div className="w-14 h-14 rounded-full bg-slate-700/60 border border-slate-500/30 backdrop-blur-sm flex items-center justify-center">
                                <HiSignal className="w-7 h-7 text-slate-400" />
                            </div>
                        ) : (
                            // Aktiv — pulsating rings
                            <>
                                <span className="absolute inset-0 -m-5 rounded-full border border-rose-500/40 animate-ping" style={{ animationDuration: '2s' }} />
                                <span className="absolute inset-0 -m-10 rounded-full border border-rose-500/20 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
                                <div className="w-14 h-14 rounded-full bg-rose-600/20 border border-rose-500/40 backdrop-blur-sm flex items-center justify-center">
                                    <HiSignal className="w-7 h-7 text-rose-400" />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Top badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                        {isEnded ? (
                            // Tugagan badge
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-700/90 text-slate-300 text-[10px] font-black uppercase tracking-widest">
                                <HiClock className="w-3 h-3" />
                                Efir tugadi
                            </span>
                        ) : (
                            // LIVE badge
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-900/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                LIVE
                            </span>
                        )}
                        {room.game && (
                            <span className="px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white/80 text-[10px] font-semibold">
                                {room.game}
                            </span>
                        )}
                    </div>

                    {/* Top right: viewer count + elapsed/ended time */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        {isEnded ? (
                            // Tugagan: peak tomoshabinlar va qancha oldin
                            <>
                                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm text-slate-400 text-[11px] font-bold">
                                    <HiUserGroup className="w-3.5 h-3.5" />
                                    {room.peak_viewers} max
                                </span>
                                {room.ended_at && (
                                    <span className="px-2 py-1 rounded-full bg-black/55 backdrop-blur-sm text-slate-400 text-[10px] font-semibold">
                                        {formatEndedAgo(room.ended_at)}
                                    </span>
                                )}
                            </>
                        ) : (
                            // Aktiv: hozirgi tomoshabinlar + vaqt
                            <>
                                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm text-white text-[11px] font-bold">
                                    <HiUserGroup className="w-3.5 h-3.5 text-rose-400" />
                                    {room.viewer_count}
                                </span>
                                {elapsed && (
                                    <span className="px-2 py-1 rounded-full bg-black/55 backdrop-blur-sm text-slate-300 text-[10px] font-semibold">
                                        {elapsed}
                                    </span>
                                )}
                            </>
                        )}
                    </div>

                    {/* Bottom: CTA yoki davomiylik */}
                    <div className="absolute bottom-3 right-3">
                        {isEnded ? (
                            room.ended_at && (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-700/80 text-slate-400 text-xs font-semibold">
                                    Davomiyligi: {formatDuration(room.created_at, room.ended_at)}
                                </span>
                            )
                        ) : (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-lg transition-colors">
                                Tomosha qilish →
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Host info qatori ── */}
                <div className={`flex items-center gap-3 px-4 py-3 ${isEnded ? 'bg-slate-800/60' : 'bg-slate-900/80'}`}>
                    <div className="relative shrink-0">
                        <img
                            src={room.host_avatar_url || '/default-avatar.png'}
                            alt={displayName}
                            className={`w-9 h-9 rounded-full object-cover bg-slate-800 ring-2 ${isEnded ? 'ring-slate-600/40' : 'ring-rose-500/40'}`}
                        />
                        {/* Online dot — faqat aktiv efirda */}
                        {!isEnded && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-500 border-2 border-slate-900 animate-pulse" />
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className={`text-sm font-extrabold truncate leading-tight ${isEnded ? 'text-slate-300' : 'text-white'}`}>
                            {displayName}
                        </p>
                        <p className="text-xs font-medium text-slate-400 truncate mt-0.5">{room.title}</p>
                    </div>

                    <span className={`text-[10px] font-black uppercase tracking-wider shrink-0 ${isEnded ? 'text-slate-500' : 'text-rose-400 animate-pulse'}`}>
                        {isEnded ? 'Tugadi' : 'Jonli efir'}
                    </span>
                </div>
            </div>
        </motion.div>
    )
}
