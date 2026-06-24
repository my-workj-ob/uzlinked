"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { HiArrowLeft } from 'react-icons/hi2'
import { CreateWizard } from '@/components/create-wizard'

export default function CreatePage() {
    const router = useRouter()

    const handleClose = () => {
        if (window.history.length > 1) {
            router.back()
        } else {
            router.push('/dashboard')
        }
    }

    return (
        <div className="min-h-[calc(var(--vh,100dvh)-4rem)] md:min-h-screen w-full px-4 py-5 md:py-10">
            <div className="mx-auto w-full max-w-2xl">
                {/* Header */}
                <div className="mb-5 flex items-center gap-3">
                    <button
                        onClick={handleClose}
                        className="p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 active:scale-90 transition-all cursor-pointer"
                    >
                        <HiArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                            Yangi yaratish
                        </h1>
                        <p className="text-[12px] md:text-[13px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                            Post yoki Reels joylang — kayfiyatingizni ulashing
                        </p>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="rounded-3xl border border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900 p-4 md:p-6 shadow-sm"
                >
                    <CreateWizard variant="page" onClose={handleClose} />
                </motion.div>
            </div>
        </div>
    )
}
