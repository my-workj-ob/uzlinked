"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { HiSignal, HiUserGroup } from 'react-icons/hi2'
import { FiMonitor } from 'react-icons/fi'

export interface LiveRoomFeed {
    id: string
    host_id: string
    title: string
    game: string | null
    thumbnail_url: string | null
    viewer_count: number
    created_at: string
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

function getGradient(game: string | null): string {
    if (!game) return 'from-[#7c3aed]/90 to-[#0f0e17]'
    const key = game.toLowerCase()
    for (const [name, grad] of Object.entries(GAME_GRADIENTS)) {
        if (key.includes(name)) return grad
    }
    return 'from-[#e11d48]/90 to-[#0f0e17]'
}

// Jonli efirdan beri o'tgan vaqt
function useElapsed(createdAt: string) {
    const [label, setLabel] = useState('')
    useEffect(() => {
        const calc = () => {
            const ms = Date.now() - new Date(createdAt).getTime()
            const m = Math.floor(ms / 60000)
            const h = Math.floor(m / 60)
            setLabel(h > 0 ? `${h}s ${m % 60}d` : `${m}d`)
        }
        calc()
        const t = setInterval(calc, 30000)
        return () => clearInterval(t)
    }, [createdAt])
    return label
}

export function LivePostCard({ room, index = 0 }: { room: LiveRoomFeed; index?: number }) {
    const router = useRouter()
    const elapsed = useElapsed(room.created_at)
    const grad = getGradient(room.game)
    const displayName = room.host_nickname || room.host_username || 'Anonim'

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: index * 0.06 }}
            onClick={() => router.push(`/dashboard/live/${room.id}`)}
            className="relative cursor-pointer rounded-3xl overflow-hidden select-none group"
            style={{ isolation: 'isolate' }}
        >
            {/* Tashqi glow — live postni ajratib turadi */}
            <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-rose-500 via-fuchsia-500 to-rose-600 opacity-60 group-hover:opacity-90 transition-opacity duration-500 blur-[1px]" />

            {/* Asosiy karta */}
            <div className="relative rounded-[calc(1.5rem-1px)] overflow-hidden bg-slate-950 border border-white/5">

                {/* ── Thumbnail / Video maydon ── */}
                <div className={`relative w-full bg-gradient-to-br ${grad} flex items-center justify-center overflow-hidden`} style={{ aspectRatio: '16/7' }}>

                    {/* Background monitor icon */}
                    <FiMonitor className="absolute inset-0 m-auto w-20 h-20 text-white/5 group-hover:text-white/10 transition-colors duration-500" />

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    {/* Pulse rings — live ko'rinishi */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        <span className="absolute inset-0 -m-5 rounded-full border border-rose-500/40 animate-ping" style={{ animationDuration: '2s' }} />
                        <span className="absolute inset-0 -m-10 rounded-full border border-rose-500/20 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
                        <div className="w-14 h-14 rounded-full bg-rose-600/20 border border-rose-500/40 backdrop-blur-sm flex items-center justify-center">
                            <HiSignal className="w-7 h-7 text-rose-400" />
                        </div>
                    </div>

                    {/* Top badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                        {/* LIVE badge */}
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-900/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            LIVE
                        </span>
                        {/* Game tag */}
                        {room.game && (
                            <span className="px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white/80 text-[10px] font-semibold">
                                {room.game}
                            </span>
                        )}
                    </div>

                    {/* Viewer + elapsed */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm text-white text-[11px] font-bold">
                            <HiUserGroup className="w-3.5 h-3.5 text-rose-400" />
                            {room.viewer_count}
                        </span>
                        {elapsed && (
                            <span className="px-2 py-1 rounded-full bg-black/55 backdrop-blur-sm text-slate-300 text-[10px] font-semibold">
                                {elapsed}
                            </span>
                        )}
                    </div>

                    {/* Bottom CTA */}
                    <div className="absolute bottom-3 right-3">
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-lg transition-colors">
                            Tomosha qilish →
                        </span>
                    </div>
                </div>

                {/* ── Host info qatori ── */}
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/80">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <img
                            src={room.host_avatar_url || '/default-avatar.png'}
                            alt={displayName}
                            className="w-9 h-9 rounded-full object-cover bg-slate-800 ring-2 ring-rose-500/40"
                        />
                        {/* Online dot */}
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-500 border-2 border-slate-900 animate-pulse" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold text-white truncate leading-tight">{displayName}</p>
                        <p className="text-xs font-medium text-slate-400 truncate mt-0.5">{room.title}</p>
                    </div>

                    {/* Shimmer "JONLI" text */}
                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider animate-pulse shrink-0">
                        Jonli efir
                    </span>
                </div>
            </div>
        </motion.div>
    )
}
