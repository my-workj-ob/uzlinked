"use client"

import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react'
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
    initialState?: 'peek' | 'full'
}

export const BottomSheet = forwardRef<any, BottomSheetProps>(({
    isOpen,
    onClose,
    title,
    children,
    expandable = false,
    headerAction,
    initialState = 'peek'
}, ref) => {
    const [mounted, setMounted] = useState(false)
    const [sheetState, setSheetState] = useState<'peek' | 'full'>(initialState)
    const startYRef = useRef(0)
    const contentRef = useRef<HTMLDivElement>(null)

    useImperativeHandle(ref, () => ({
        expand: () => setSheetState('full'),
        collapse: () => setSheetState('peek')
    }))

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
            setSheetState(initialState) // Reset to initial state height when opened
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, initialState])

    useEffect(() => {
        if (sheetState === 'peek' && contentRef.current) {
            contentRef.current.scrollTop = 0
        }
    }, [sheetState])

    // Native touchmove listener to allow dragging on the entire modal (including scrollable content)
    useEffect(() => {
        const contentEl = contentRef.current
        if (!contentEl) return

        const onTouchStart = (e: TouchEvent) => {
            startYRef.current = e.touches[0].clientY
        }

        const onTouchMove = (e: TouchEvent) => {
            const currentY = e.touches[0].clientY
            const diffY = currentY - startYRef.current
            const scrollTop = contentEl.scrollTop

            if (expandable) {
                if (sheetState === 'peek') {
                    // In peek state, swipe up/down drags the modal, prevent native scrolling
                    if (e.cancelable) e.preventDefault()
                } else if (sheetState === 'full') {
                    // In full state, swipe down at the top collapses the modal, prevent native scrolling
                    if (scrollTop === 0 && diffY > 0) {
                        if (e.cancelable) e.preventDefault()
                    }
                }
            } else {
                // Non-expandable: swipe down at top collapses/closes
                if (scrollTop === 0 && diffY > 0) {
                    if (e.cancelable) e.preventDefault()
                }
            }
        }

        contentEl.addEventListener('touchstart', onTouchStart, { passive: true })
        contentEl.addEventListener('touchmove', onTouchMove, { passive: false })
        return () => {
            contentEl.removeEventListener('touchstart', onTouchStart)
            contentEl.removeEventListener('touchmove', onTouchMove)
        }
    }, [expandable, sheetState])

    if (!mounted) return null

    // Height and position configuration based on expandable mode
    const containerVariants = {
        closed: {
            y: "100%",
            transition: { type: "spring" as const, damping: 30, stiffness: 300 }
        },
        peek: {
            y: "0%",
            height: expandable ? "calc(var(--vh, 100vh) * 0.60)" : "auto",
            maxHeight: expandable ? "calc(var(--vh, 100vh) * 0.60)" : "calc(var(--vh, 100vh) * 0.85)",
            transition: { type: "spring" as const, damping: 25, stiffness: 220 }
        },
        full: {
            y: "0%",
            height: "calc(var(--vh, 100vh) * 0.95)",
            maxHeight: "calc(var(--vh, 100vh) * 0.95)",
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

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed top-0 left-0 right-0 z-[999999] flex items-end justify-center select-none"
                    style={{ bottom: 'calc(100vh - var(--vh, 100vh))' }}
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
                        className="relative z-[1000000] bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 w-full md:max-w-[450px] rounded-t-[28px] flex flex-col shadow-2xl transition-colors"
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

                        <div
                            ref={contentRef}
                            className="flex-1 overflow-y-auto p-3 scrollbar-none select-text text-xs sm:text-sm text-slate-700 dark:text-slate-300"
                            style={{ overscrollBehaviorY: 'contain', touchAction: 'pan-y' }}
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
})

BottomSheet.displayName = 'BottomSheet'
