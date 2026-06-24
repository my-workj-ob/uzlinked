"use client"

import React, { createContext, useContext, useState } from 'react'
import { motion } from 'framer-motion'

export interface Vibe {
    id: string
    emoji: string
    label: string
    keywords: string[]
}

// "Emotsional Chastota" (Vibe Vector) kapsulalari.
// "all" — standart holat (barcha postlar). Qolganlari kontent bo'yicha filtrlaydi.
export const VIBES: Vibe[] = [
    { id: 'all', emoji: '🌐', label: 'Hammasi', keywords: [] },
    {
        id: 'ilhom', emoji: '⚡️', label: 'Ilhom',
        keywords: ['ilhom', 'motivatsiya', 'maqsad', "g'alaba", 'muvaffaqiyat', 'rivojlanish', 'orzu', 'inspiration', 'dream', 'goal', 'success']
    },
    {
        id: 'qahva', emoji: '☕️', label: 'Qahva ustida',
        keywords: ['qahva', 'kofe', 'tong', 'ertalab', 'choy', 'kayfiyat', 'dam', 'coffee', 'morning', 'chill']
    },
    {
        id: 'falsafa', emoji: '🌧', label: 'Falsafa',
        keywords: ['falsafa', 'hayot', "o'y", 'fikr', "ma'no", 'hikmat', 'savol', 'borliq', 'vaqt', 'life', 'meaning', 'philosophy']
    },
    {
        id: 'dard', emoji: '🤬', label: 'Dardi borlar',
        keywords: ['dard', 'charchadim', 'qiyin', "yolg'iz", "og'ir", 'tushkun', 'stress', 'muammo', 'adolat', 'pain', 'tired', 'sad']
    },
    {
        id: 'focus', emoji: '🎧', label: 'Deep Focus',
        keywords: ['focus', 'kod', 'code', 'ish', 'dasturlash', "o'qish", 'loyiha', 'productivity', 'deep', 'work', 'study', 'project']
    },
]

export function matchesVibe(text: string, vibe: Vibe): boolean {
    if (vibe.id === 'all' || vibe.keywords.length === 0) return true
    const lower = (text || '').toLowerCase()
    return vibe.keywords.some(k => lower.includes(k))
}

interface VibeContextValue {
    activeVibe: string
    setActiveVibe: (id: string) => void
}

const VibeContext = createContext<VibeContextValue | null>(null)

export function VibeProvider({ children }: { children: React.ReactNode }) {
    const [activeVibe, setActiveVibe] = useState('all')
    return (
        <VibeContext.Provider value={{ activeVibe, setActiveVibe }}>
            {children}
        </VibeContext.Provider>
    )
}

export function useVibe(): VibeContextValue {
    const ctx = useContext(VibeContext)
    if (!ctx) return { activeVibe: 'all', setActiveVibe: () => { } }
    return ctx
}

// Gorizontaliga barmoq bilan surib bo'ladigan Vibe Vector qatori (Framer Motion)
export function VibeBar({ className = '' }: { className?: string }) {
    const { activeVibe, setActiveVibe } = useVibe()

    return (
        <div
            className={`flex items-center gap-2 overflow-x-auto overflow-y-hidden no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x ${className}`}
        >
            {VIBES.map((vibe) => {
                const isActive = vibe.id === activeVibe
                return (
                    <motion.button
                        key={vibe.id}
                        onClick={() => setActiveVibe(vibe.id)}
                        whileTap={{ scale: 0.9 }}
                        className={`relative shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors duration-200 select-none ${isActive
                            ? 'text-white'
                            : 'text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10'
                            }`}
                    >
                        {isActive && (
                            <motion.span
                                layoutId="vibe-active-pill"
                                transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                                className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm shadow-blue-600/30"
                            />
                        )}
                        <span className="relative z-10 text-sm leading-none">{vibe.emoji}</span>
                        <span className="relative z-10">{vibe.label}</span>
                    </motion.button>
                )
            })}
        </div>
    )
}
