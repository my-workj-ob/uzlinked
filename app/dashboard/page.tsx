"use client"

import React, { useState, useEffect, useRef } from 'react'
import { PostCard, PostType } from '@/components/post-card'
import { Stories } from '@/components/stories'
import { FeedSkeleton } from '@/components/skeleton-loader'
import { usePosts, useUpdatePost, useDeletePost } from '@/hooks/use-queries'
import { useStories } from '@/hooks/use-stories'

export default function FeedList() {
    const { data: posts = [], isLoading: loading, error } = usePosts()
    const { otherStoryGroups = [], myProfile } = useStories()
    const updatePostMutation = useUpdatePost()
    const deletePostMutation = useDeletePost()

    // Stories tray visibility state (initially hidden by default)
    const [showStories, setShowStories] = useState(false)
    const [pullOffset, setPullOffset] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    
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
            alert(`Xatolik: ${err.message}`)
        }
    }

    const handleDeletePost = async (id: string | number) => {
        try {
            await deletePostMutation.mutateAsync(id)
        } catch (err: any) {
            alert(`Xatolik: ${err.message}`)
        }
    }

    // Calculate drag progress (0 to 1) for stories animation
    const rawProgress = isDragging
        ? (showStories 
            ? Math.max(0, 1 + pullOffset / 45) 
            : Math.min(pullOffset / 75, 1))
        : (showStories ? 1 : 0)
    const progress = Math.max(0, Math.min(rawProgress, 1))

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
                </div>
            ) : (
                <>
                    {/* Collapsible Stories Tray */}
                    <div
                        style={{
                            height: isDragging 
                                ? (showStories 
                                    ? `${Math.max(104 + pullOffset, 0)}px` 
                                    : `${Math.max(pullOffset, 0)}px`)
                                : (showStories ? '104px' : '0px'),
                            opacity: showStories || (isDragging && (showStories ? (104 + pullOffset > 15) : (pullOffset > 15))) ? 1 : 0,
                            overflow: showStories || isDragging ? 'visible' : 'hidden',
                            transition: isDragging ? 'none' : 'height 0.4s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.3s ease-in-out'
                        }}
                        className="w-full"
                    >
                        <div className="py-2 px-1">
                            <Stories progress={progress} isDragging={isDragging} showStories={showStories} />
                        </div>
                    </div>

                    {posts.length === 0 ? (
                        <div className="w-full py-16 bg-slate-50/50 dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-white/5 rounded-2xl text-center animate-fade-in-up">
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">Hozircha hech qanday post yo'q 🏜️</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 relative">
                            {posts.map((post, idx) => (
                                <div 
                                    key={post.id} 
                                    className="animate-fade-in-up relative z-10 transition-all duration-300 transform hover:scale-[1.002]"
                                    style={{ animationDelay: `${idx * 80}ms` }}
                                >
                                    <PostCard
                                        post={post}
                                        onDeletePost={handleDeletePost}
                                        onUpdatePost={handleUpdatePost}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}