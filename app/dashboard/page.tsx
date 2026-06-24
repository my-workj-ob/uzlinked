"use client"

import React, { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { PostCard, PostType } from '@/components/post-card'
import { Stories } from '@/components/stories'
import { FeedSkeleton } from '@/components/skeleton-loader'
import { usePosts, useUpdatePost, useDeletePost } from '@/hooks/use-queries'
import { useStories } from '@/hooks/use-stories'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { useVibe, matchesVibe, VIBES, VibeBar } from '@/components/vibe-bar'
import { WarpOverlay } from '@/components/warp-overlay'

export default function FeedList() {
    const { data: posts = [], isLoading: loading, error } = usePosts()
    const { otherStoryGroups = [], myProfile } = useStories()
    const updatePostMutation = useUpdatePost()
    const deletePostMutation = useDeletePost()
    const queryClient = useQueryClient()
    const supabase = createClient()

    // QADAM 1 — Vibe Vector filtri (reload yo'q, faqat client-side dissolve)
    const { activeVibe } = useVibe()
    const currentVibe = VIBES.find(v => v.id === activeVibe) || VIBES[0]
    const visiblePosts = posts.filter(p => matchesVibe(`${p.content} ${p.location}`, currentVibe))

    // QADAM 2 — Gidro-Warp: geografik teleport holati
    const [warping, setWarping] = useState(false)
    const [warpLocation, setWarpLocation] = useState<string>('')
    const postRefs = useRef<Record<string, HTMLDivElement | null>>({})

    const handleWarp = (location: string, postId: string | number) => {
        const list = visiblePosts
        const idx = list.findIndex(p => String(p.id) === String(postId))
        if (idx === -1) return

        let target: PostType | null = null
        for (let i = 1; i <= list.length; i++) {
            const cand = list[(idx + i) % list.length]
            if (!cand || String(cand.id) === String(postId)) continue
            if (cand.location === location) { target = cand; break }
        }
        if (!target) return

        setWarpLocation(location)
        setWarping(true)
        window.setTimeout(() => {
            postRefs.current[String(target!.id)]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 380)
        window.setTimeout(() => setWarping(false), 900)
    }

    // Realtime subscriptions for posts feed (posts, likes, comments)
    useEffect(() => {
        const channel = supabase.channel('dashboard-feed-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
                queryClient.invalidateQueries({ queryKey: ['posts'] })
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => {
                queryClient.invalidateQueries({ queryKey: ['posts'] })
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
                queryClient.invalidateQueries({ queryKey: ['posts'] })
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, queryClient])

    // Stories tray visibility state (initially hidden by default)
    const [showStories, setShowStories] = useState(false)
    const [pullOffset, setPullOffset] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    // Desktopda (md+) stories doim ochiq turadi (yashirilmaydi)
    const [isDesktop, setIsDesktop] = useState(false)

    useEffect(() => {
        const mq = window.matchMedia('(min-width: 768px)')
        const update = () => setIsDesktop(mq.matches)
        update()
        mq.addEventListener('change', update)
        return () => mq.removeEventListener('change', update)
    }, [])

    const startY = useRef(0)
    const activeDrag = useRef(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // State refs to prevent event listener tearing down during active scroll/drag
    const showStoriesRef = useRef(showStories)
    const pullOffsetRef = useRef(pullOffset)

    useEffect(() => {
        showStoriesRef.current = showStories
    }, [showStories])

    useEffect(() => {
        pullOffsetRef.current = pullOffset
    }, [pullOffset])

    // Helper to get actual scroll depth inside the layout container
    const getScrollTop = () => {
        const main = containerRef.current?.closest('main')
        return main ? main.scrollTop : window.scrollY
    }

    // Gesture & Programmatic Drag Binding
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const onTouchStart = (e: TouchEvent) => {
            // Drag only starts if we are at the very top of the scrolling parent
            if (getScrollTop() === 0) {
                startY.current = e.touches[0].clientY
                activeDrag.current = true
                setIsDragging(true)
            }
        }

        const onTouchMove = (e: TouchEvent) => {
            if (!activeDrag.current) return
            const currentY = e.touches[0].clientY
            const diff = currentY - startY.current

            if (showStoriesRef.current) {
                // If stories are already shown, dragging UP shrinks it
                if (diff < 0) {
                    setPullOffset(diff * 0.55)
                    if (e.cancelable) e.preventDefault()
                } else {
                    setPullOffset(0)
                }
            } else {
                // If stories are hidden, dragging DOWN pulls the droplet/springs open
                if (diff > 0) {
                    const offset = Math.min(diff * 0.55, 120)
                    setPullOffset(offset)
                    if (e.cancelable) e.preventDefault()
                } else {
                    setPullOffset(0)
                }
            }
        }

        const onTouchEnd = () => {
            if (!activeDrag.current) return
            activeDrag.current = false
            setIsDragging(false)

            const currentOffset = pullOffsetRef.current
            if (showStoriesRef.current) {
                if (currentOffset < -45) {
                    setShowStories(false)
                }
            } else {
                if (currentOffset > 75) {
                    setShowStories(true)
                }
            }
            setPullOffset(0)
        }

        // Programmatic Mouse Events (Desktop dragging support)
        const onMouseDown = (e: MouseEvent) => {
            if (getScrollTop() === 0) {
                startY.current = e.clientY
                activeDrag.current = true
                setIsDragging(true)
            }
        }

        const onMouseMove = (e: MouseEvent) => {
            if (!activeDrag.current) return
            const currentY = e.clientY
            const diff = currentY - startY.current

            if (showStoriesRef.current) {
                if (diff < 0) {
                    setPullOffset(diff * 0.55)
                } else {
                    setPullOffset(0)
                }
            } else {
                if (diff > 0) {
                    setPullOffset(Math.min(diff * 0.55, 120))
                } else {
                    setPullOffset(0)
                }
            }
        }

        const onMouseUp = () => {
            if (!activeDrag.current) return
            activeDrag.current = false
            setIsDragging(false)

            const currentOffset = pullOffsetRef.current
            if (showStoriesRef.current) {
                if (currentOffset < -45) {
                    setShowStories(false)
                }
            } else {
                if (currentOffset > 75) {
                    setShowStories(true)
                }
            }
            setPullOffset(0)
        }

        container.addEventListener('touchstart', onTouchStart, { passive: true })
        container.addEventListener('touchmove', onTouchMove, { passive: false })
        container.addEventListener('touchend', onTouchEnd, { passive: true })

        container.addEventListener('mousedown', onMouseDown, { passive: true })
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)

        return () => {
            container.removeEventListener('touchstart', onTouchStart)
            container.removeEventListener('touchmove', onTouchMove)
            container.removeEventListener('touchend', onTouchEnd)

            container.removeEventListener('mousedown', onMouseDown)
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('mouseup', onMouseUp)
        }
    }, [isDragging]) // Bind only on drag state boundaries to minimize re-creation

    // Hide stories when scrolling down the page past 100px (capture scroll on nested elements)
    useEffect(() => {
        const handleScroll = (e: Event) => {
            const target = e.target as HTMLElement
            if (target && target.tagName === 'MAIN') {
                const scrollTop = target.scrollTop
                if (scrollTop > 100) {
                    setShowStories(false)
                }
            }
        }
        window.addEventListener('scroll', handleScroll, true) // capture phase is required for nested main tag
        return () => window.removeEventListener('scroll', handleScroll, true)
    }, [])

    const handleUpdatePost = async (id: string | number, newContent: string) => {
        try {
            await updatePostMutation.mutateAsync({ id, content: newContent })
        } catch (err: any) {
            console.error('Error updating post:', err)
            alert(`Postni yangilashda xatolik yuz berdi: ${err.message}`)
        }
    }

    const handleDeletePost = async (id: string | number) => {
        try {
            await deletePostMutation.mutateAsync(id)
        } catch (err: any) {
            console.error('Error deleting post:', err)
            alert(`Postni o'chirishda xatolik yuz berdi: ${err.message}`)
        }
    }

    // Calculate drag progress (0 to 1) for stories animation
    const rawProgress = isDragging
        ? (showStories
            ? Math.max(0, 1 + pullOffset / 45)
            : Math.min(pullOffset / 75, 1))
        : (showStories ? 1 : 0)
    const progress = isDesktop ? 1 : Math.max(0, Math.min(rawProgress, 1))

    return (
        <div
            ref={containerRef}
            className="flex flex-col gap-4 select-none min-h-screen pb-10 relative"
        >
            {loading ? (
                <FeedSkeleton />
            ) : error ? (
                <div className="w-full p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold text-center border border-red-100 dark:border-red-900/10">
                    {error instanceof Error ? error.message : String(error)}. Sahifani qayta yangilang.
                    <button
                        onClick={() => window.location.reload()}
                        className="ml-2 px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-xs font-bold hover:bg-red-200 dark:hover:bg-red-800/30 transition-colors"
                    >
                        Yangilash
                    </button>
                </div>
            ) : (
                <>
                    {/* Collapsible Stories Tray */}
                    <div
                        style={{
                            height: isDesktop
                                ? '104px'
                                : (isDragging
                                    ? (showStories
                                        ? `${Math.max(104 + pullOffset, 0)}px`
                                        : `${Math.max(pullOffset, 0)}px`)
                                    : (showStories ? '104px' : '0px')),
                            opacity: isDesktop || showStories || (isDragging && (showStories ? (104 + pullOffset > 15) : (pullOffset > 15))) ? 1 : 0,
                            overflow: isDesktop || showStories || isDragging ? 'visible' : 'hidden',
                            transition: isDragging ? 'none' : 'height 0.4s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.3s ease-in-out'
                        }}
                        className="w-full"
                    >
                        <div className="py-2 px-1">
                            <Stories progress={progress} isDragging={isDragging} showStories={showStories} />
                        </div>
                    </div>

                    {/* QADAM 1 — Desktop Vibe Vector qatori (xl'da o'ng panelga ko'chadi) */}
                    <div className="hidden md:block xl:hidden sticky top-0 z-30 -mx-1 px-1 py-2 mb-1 bg-[#F8FAFC]/80 dark:bg-slate-950/80 backdrop-blur-xl">
                        <VibeBar />
                    </div>

                    {posts.length === 0 ? (
                        <div className="w-full py-16 bg-slate-50/50 dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-white/5 rounded-2xl text-center animate-fade-in-up">
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">Hozircha hech qanday post yo'q 🏜️</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors"
                            >
                                Yangilash
                            </button>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeVibe}
                                initial={{ opacity: 0, filter: 'blur(8px)' }}
                                animate={{ opacity: 1, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, filter: 'blur(8px)' }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                                className="flex flex-col gap-4 relative"
                            >
                                {visiblePosts.length === 0 ? (
                                    <div className="w-full py-16 bg-slate-50/50 dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-white/5 rounded-2xl text-center">
                                        <p className="text-2xl mb-1">{currentVibe.emoji}</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">
                                            {`"${currentVibe.label}" chastotasida hozircha post yo'q`}
                                        </p>
                                    </div>
                                ) : (
                                    visiblePosts.map((post, idx) => (
                                        <div
                                            key={post.id}
                                            ref={(el) => { postRefs.current[String(post.id)] = el }}
                                            className="animate-fade-in-up relative z-10 transition-all duration-300 transform hover:scale-[1.002]"
                                            style={{ animationDelay: `${idx * 80}ms` }}
                                        >
                                            <PostCard
                                                post={post}
                                                onDeletePost={handleDeletePost}
                                                onUpdatePost={handleUpdatePost}
                                                onWarp={handleWarp}
                                            />
                                        </div>
                                    ))
                                )}
                            </motion.div>
                        </AnimatePresence>
                    )}
                </>
            )}

            {/* QADAM 2 — Gidro-Warp giperfazo overlay */}
            <WarpOverlay active={warping} location={warpLocation} />
        </div>
    )
}
