"use client"

import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react'
import { createPortal } from 'react-dom'
import { HiXMark } from 'react-icons/hi2'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'

interface BottomSheetProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    children: React.ReactNode
    expandable?: boolean
    headerAction?: React.ReactNode
    initialState?: 'peek' | 'full'
    headerContent?: React.ReactNode
    footerContent?: React.ReactNode
}

const INTERACTIVE_SELECTOR = 'input, textarea, button, a, select, [data-no-drag]'

export const BottomSheet = forwardRef<any, BottomSheetProps>(({
    isOpen,
    onClose,
    title,
    children,
    expandable = false,
    headerAction,
    initialState = 'peek',
    headerContent,
    footerContent
}, ref) => {
    const [mounted, setMounted] = useState(false)
    const [sheetState, setSheetState] = useState<'peek' | 'full'>(initialState)
    const contentRef = useRef<HTMLDivElement>(null)
    const dragControls = useDragControls()

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
            setSheetState(initialState)
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

    useEffect(() => {
        if (!isOpen) return

        const setVh = () => {
            const vh = window.visualViewport?.height ?? window.innerHeight
            document.documentElement.style.setProperty('--vh', `${vh}px`)
        }

        setVh()
        window.visualViewport?.addEventListener('resize', setVh)
        window.visualViewport?.addEventListener('scroll', setVh)
        window.addEventListener('resize', setVh)

        return () => {
            window.visualViewport?.removeEventListener('resize', setVh)
            window.visualViewport?.removeEventListener('scroll', setVh)
            window.removeEventListener('resize', setVh)
        }
    }, [isOpen])

    if (!mounted) return null

const containerVariants = {
    closed: {
        y: "100%",
        transition: { type: "spring" as const, damping: 20, stiffness: 250 }
    },
    peek: {
        y: "0%",
        height: expandable ? "calc(var(--vh, 100vh) * 0.60)" : "auto",
        maxHeight: expandable ? "calc(var(--vh, 100vh) * 0.60)" : "calc(var(--vh, 100vh) * 0.85)",
        transition: { type: "spring" as const, damping: 15, stiffness: 200 }
    },
    full: {
        y: "0%",
        height: "calc(var(--vh, 100vh) * 0.95)",
        maxHeight: "calc(var(--vh, 100vh) * 0.95)",
        transition: { type: "spring" as const, damping: 15, stiffness: 200 }
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
            if (offset > 150 || velocity > 400) {
                onClose()
            }
        }
    }

    const isInteractive = (target: EventTarget | null) => {
        if (!(target instanceof Element)) return false
        return !!target.closest(INTERACTIVE_SELECTOR)
    }

    const startDragFromChrome = (e: React.PointerEvent) => {
        if (isInteractive(e.target)) return
        dragControls.start(e)
    }

    const handlePanStart = (e: any, info: any) => {
        if (e?.pointerType === 'mouse') return
        if (isInteractive(e?.target)) return

        const el = contentRef.current
        const scrollTop = el?.scrollTop ?? 0
        const goingDown = info.delta.y > 0

        if (!expandable) {
            if (scrollTop <= 0 && goingDown) dragControls.start(e)
            return
        }

        if (sheetState === 'peek') {
            dragControls.start(e)
        } else if (scrollTop <= 0 && goingDown) {
            dragControls.start(e)
        }
    }

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed top-0 left-0 right-0 z-[999999] flex items-end justify-center select-none"
                    style={{ bottom: 'calc(100vh - var(--vh, 100vh))' }}
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
                        dragListener={false}
                        dragControls={dragControls}
                        dragDirectionLock
                        dragMomentum={false}
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
                        <div
                            onPointerDown={startDragFromChrome}
                            className="w-full py-3 shrink-0 cursor-grab active:cursor-grabbing flex justify-center"
                        >
                            <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full" />
                        </div>

                        {/* Header */}
                        {(title || headerAction) && (
                            <div
                                onPointerDown={startDragFromChrome}
                                className={`flex items-center justify-between px-5 pb-3 shrink-0 ${title ? 'border-b border-slate-100 dark:border-white/5' : ''}`}
                            >
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

                        {/* Optional fixed header content (does not scroll) */}
                        {headerContent && (
                            <div onPointerDown={startDragFromChrome} className="shrink-0">
                                {headerContent}
                            </div>
                        )}

                        {/* Scrollable content */}
                        <motion.div
                            ref={contentRef}
                            onPanStart={handlePanStart}
                            className="flex-1 overflow-y-auto p-3 scrollbar-none select-text text-xs sm:text-sm text-slate-700 dark:text-slate-300"
                            style={{ overscrollBehaviorY: 'contain', touchAction: 'pan-y' }}
                        >
                            {children}
                        </motion.div>

                        {/* Optional fixed footer content (does not scroll) */}
                        {footerContent && (
                            <div onPointerDown={startDragFromChrome} className="shrink-0">
                                {footerContent}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    )
})

BottomSheet.displayName = 'BottomSheet'
