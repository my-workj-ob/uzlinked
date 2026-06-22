"use client"

import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { HiXMark } from 'react-icons/hi2'
import { motion, AnimatePresence } from 'framer-motion'

interface BottomSheetProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    children: React.ReactNode
    expandable?: boolean
    headerAction?: React.ReactNode
}

export const BottomSheet = ({
    isOpen,
    onClose,
    title,
    children,
    expandable = false,
    headerAction
}: BottomSheetProps) => {
    const [mounted, setMounted] = useState(false)
    const [sheetState, setSheetState] = useState<'peek' | 'full'>('peek')
    const startYRef = useRef(0)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
            setSheetState('peek') // Reset to peek height when opened
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    if (!mounted) return null

    // Height and position configuration based on expandable mode
    const containerVariants = {
        closed: {
            y: "100%",
            transition: { type: "spring" as const, damping: 30, stiffness: 300 }
        },
        peek: {
            y: expandable ? "35%" : "0%",
            transition: { type: "spring" as const, damping: 25, stiffness: 220 }
        },
        full: {
            y: "0%",
            transition: { type: "spring" as const, damping: 25, stiffness: 220 }
        }
    }

    const backdropVariants = {
        closed: { opacity: 0 },
        open: { opacity: 1 }
    }

    const handleDragEnd = (event: any, info: any) => {
        const offset = info.offset.y
        const velocity = info.velocity.y

        if (expandable) {
            if (sheetState === 'peek') {
                if (offset < -120 || velocity < -400) {
                    setSheetState('full')
                } else if (offset > 120 || velocity > 400) {
                    onClose()
                }
            } else if (sheetState === 'full') {
                if (offset > 250 || velocity > 600) {
                    onClose()
                } else if (offset > 120 || velocity > 350) {
                    setSheetState('peek')
                }
            }
        } else {
            // Non-expandable sheet: drag down to close
            if (offset > 150 || velocity > 400) {
                onClose()
            }
        }
    }

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        startYRef.current = e.touches[0].clientY
    }

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        const currentY = e.touches[0].clientY
        const diffY = currentY - startYRef.current
        const scrollTop = e.currentTarget.scrollTop

        if (expandable) {
            if (sheetState === 'peek') {
                // In peek state, any gesture triggers dragging, do not stop propagation.
            } else if (sheetState === 'full') {
                // In full screen, swiping down (diffY > 0) at top of scroll collapses to peek.
                // Dragging up or scrolling down should propagate to the scrollable content.
                if (scrollTop === 0 && diffY > 0) {
                    // Let the parent drag down
                } else {
                    e.stopPropagation()
                }
            }
        } else {
            // Non-expandable sheet: only drag down at the top of scroll should move/close the sheet.
            if (scrollTop === 0 && diffY > 0) {
                // Let parent drag down
            } else {
                e.stopPropagation()
            }
        }
    }

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-[999999] flex items-end justify-center select-none"
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                >
                    {/* Backdrop */}
                    <motion.div
                        initial="closed"
                        animate="open"
                        exit="closed"
                        variants={backdropVariants}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer"
                        onClick={onClose}
                        data-no-pull="true"
                    />

                    {/* Sheet Container */}
                    <motion.div
                        drag="y"
                        dragDirectionLock
                        dragElastic={{ top: expandable && sheetState === 'full' ? 0.15 : 0.85, bottom: 0.85 }}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        onDragEnd={handleDragEnd}
                        initial="closed"
                        animate={expandable ? sheetState : "peek"}
                        exit="closed"
                        variants={containerVariants}
                        className={`relative z-[1000000] bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 w-full md:max-w-[450px] rounded-t-[28px] flex flex-col shadow-2xl transition-colors ${expandable
                            ? 'h-[95vh]'
                            : 'max-h-[85vh]'
                            }`}
                        style={{ touchAction: 'none' }}
                        data-no-pull="true"
                    >
                        {/* Drag / Pull Indicator Handle */}
                        <div className="w-full py-3 shrink-0 cursor-grab active:cursor-grabbing flex justify-center">
                            <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full" />
                        </div>

                        {/* Header */}
                        {(title || headerAction) && (
                            <div className={`flex items-center justify-between px-5 pb-3 shrink-0 ${title ? 'border-b border-slate-100 dark:border-white/5' : ''}`}>
                                <span className="text-slate-900 dark:text-slate-100 font-extrabold text-sm truncate pr-4">
                                    {title}
                                </span>
                                <div className="flex items-center gap-2">
                                    {headerAction}
                                    <button
                                        onClick={onClose}
                                        className="p-1.5 -mr-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-655 dark:hover:text-slate-350 transition-colors rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                                    >
                                        <HiXMark className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Scrollable Content */}
                        <div
                            className="flex-1 overflow-y-auto p-3 scrollbar-none select-text text-xs sm:text-sm text-slate-700 dark:text-slate-300"
                            style={{ overscrollBehaviorY: 'contain' }}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onPointerDown={(e) => {
                                // Stop pointer event bubbling on mouse devices (desktop selection/clicking)
                                if (e.pointerType === 'mouse') {
                                    e.stopPropagation()
                                }
                            }}
                        >
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    )
}
