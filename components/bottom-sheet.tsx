"use client"

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { HiXMark } from 'react-icons/hi2'

interface BottomSheetProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    children: React.ReactNode
}

export const BottomSheet = ({ isOpen, onClose, title, children }: BottomSheetProps) => {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    if (!isOpen || !mounted) return null

    return createPortal(
        <div className="fixed inset-0 z-[999999] flex items-end justify-center select-none">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in cursor-pointer" 
                onClick={onClose} 
            />

            {/* Sheet Container */}
            <div className="relative z-[1000000] bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 w-full md:max-w-[450px] rounded-t-[28px] max-h-[85vh] flex flex-col animate-drawer-slide-up shadow-2xl transition-colors">
                {/* Drag / Pull Indicator Handle */}
                <div 
                    className="w-12 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mt-3 mb-1 shrink-0 cursor-pointer" 
                    onClick={onClose} 
                />

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-white/5 shrink-0">
                    <span className="text-slate-900 dark:text-slate-100 font-extrabold text-sm truncate pr-4">
                        {title}
                    </span>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 -mr-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350 transition-colors rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                        <HiXMark className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-5 scrollbar-none select-text text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    )
}
