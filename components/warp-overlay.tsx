"use client"

import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// Star Wars uslubidagi "Gidro-Warp" giperfazo effekti — geografik teleport paytida ko'rsatiladi.
export function WarpOverlay({ active, location }: { active: boolean; location?: string }) {
    return (
        <AnimatePresence>
            {active && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="fixed inset-0 z-[9998] pointer-events-none flex items-center justify-center overflow-hidden bg-slate-950/50 backdrop-blur-md"
                >
                    <div className="warp-tunnel">
                        {Array.from({ length: 28 }).map((_, i) => (
                            <span
                                key={i}
                                className="warp-star"
                                style={{
                                    // @ts-expect-error CSS custom property
                                    '--angle': `${(i * 360) / 28}deg`,
                                    animationDelay: `${(i % 7) * 0.04}s`,
                                }}
                            />
                        ))}
                    </div>

                    <motion.div
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.7, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white text-sm font-black shadow-2xl"
                    >
                        <span className="text-base">📍</span>
                        <span>{location ? `${location} → keyingi nuqta` : 'Teleportatsiya...'}</span>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
