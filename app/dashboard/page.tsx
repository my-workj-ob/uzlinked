"use client"

import React, { useState, useEffect, useRef } from 'react'
import { PostCard, PostType } from '@/components/post-card'
import { Stories } from '@/components/stories'
import { FeedSkeleton } from '@/components/skeleton-loader'
import { usePosts, useUpdatePost, useDeletePost } from '@/hooks/use-queries'

export default function FeedList() {
    const { data: posts = [], isLoading: loading, error } = usePosts()
    const updatePostMutation = useUpdatePost()
    const deletePostMutation = useDeletePost()

    // Stories tray visibility state (initially open for beautiful arrival UX)
    const [showStories, setShowStories] = useState(true)
    const [pullOffset, setPullOffset] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const startY = useRef(0)
    const activeDrag = useRef(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Gesture & Programmatic Drag Binding
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const onTouchStart = (e: TouchEvent) => {
            // Drag only starts if we are at the very top of the page
            if (window.scrollY === 0) {
                startY.current = e.touches[0].clientY
                activeDrag.current = true
                setIsDragging(true)
            }
        }

        const onTouchMove = (e: TouchEvent) => {
            if (!activeDrag.current) return
            const currentY = e.touches[0].clientY
            const diff = currentY - startY.current

            if (showStories) {
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
            
            if (showStories) {
                if (pullOffset < -45) {
                    setShowStories(false)
                }
            } else {
                if (pullOffset > 75) {
                    setShowStories(true)
                }
            }
            setPullOffset(0)
        }

        // Programmatic Mouse Events (Desktop dragging support)
        const onMouseDown = (e: MouseEvent) => {
            if (window.scrollY === 0) {
                startY.current = e.clientY
                activeDrag.current = true
                setIsDragging(true)
            }
        }

        const onMouseMove = (e: MouseEvent) => {
            if (!activeDrag.current) return
            const currentY = e.clientY
            const diff = currentY - startY.current

            if (showStories) {
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

            if (showStories) {
                if (pullOffset < -45) {
                    setShowStories(false)
                }
            } else {
                if (pullOffset > 75) {
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
    }, [isDragging, showStories, pullOffset])

    // Hide stories when scrolling down the page past 100px
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 100) {
                setShowStories(false)
            }
        }
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
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

    // Teardrop droplet renderer (looks like water pull drop)
    const renderDroplet = () => {
        if (!isDragging || showStories || pullOffset <= 8) return null

        const y = Math.min(pullOffset, 120)
        const centerX = 100
        
        // Base neck shrinks as it is stretched down
        const topWidth = Math.max(68 - y * 0.35, 18)
        // Bubble bubble shrinks as it stretches thin
        const bottomRadius = Math.max(16 - y * 0.08, 7.5)
        
        const x1 = centerX - topWidth / 2
        const x2 = centerX + topWidth / 2
        const x3 = centerX - bottomRadius
        const x4 = centerX + bottomRadius
        const cy = y + 15

        const pathData = `
            M ${x1} 15
            C ${centerX - topWidth / 4.5} 15, ${centerX - bottomRadius - 4} ${cy - bottomRadius}, ${x3} ${cy}
            A ${bottomRadius} ${bottomRadius} 0 1 0 ${x4} ${cy}
            C ${centerX + bottomRadius + 4} ${cy - bottomRadius}, ${centerX + topWidth / 4.5} 15, ${x2} 15
            Z
        `

        // Glow indicator changes at snaps threshold
        const isCloseToSnap = y > 75

        return (
            <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none z-[999] animate-fade-in">
                <svg 
                    width="200" 
                    height={y + 55} 
                    viewBox={`0 0 200 ${y + 55}`} 
                    className="overflow-visible filter drop-shadow-[0_4px_12px_rgba(59,130,246,0.3)]"
                >
                    <defs>
                        <linearGradient id="droplet-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={isCloseToSnap ? "#EC4899" : "#3B82F6"} />
                            <stop offset="50%" stopColor={isCloseToSnap ? "#F43F5E" : "#6366F1"} />
                            <stop offset="100%" stopColor={isCloseToSnap ? "#EF4444" : "#8B5CF6"} />
                        </linearGradient>
                    </defs>
                    <path 
                        d={`M ${centerX - 45} 15 Q ${centerX} 18 ${centerX + 45} 15`}
                        fill="none" 
                        stroke="url(#droplet-grad)" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        opacity="0.25"
                    />
                    <path 
                        d={pathData} 
                        fill="url(#droplet-grad)"
                        className="transition-all duration-75"
                    />
                    <circle 
                        cx={centerX - bottomRadius / 3} 
                        cy={cy - bottomRadius / 3} 
                        r={bottomRadius / 4} 
                        fill="#FFFFFF" 
                        opacity="0.7" 
                    />
                </svg>
            </div>
        )
    }

    if (loading) {
        return <FeedSkeleton />
    }

    if (error) {
        return (
            <div className="w-full p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold text-center border border-red-100 dark:border-red-900/10">
                {error instanceof Error ? error.message : String(error)}. Sahifani qayta yangilang.
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            className="flex flex-col gap-4 select-none min-h-screen pb-10 relative"
        >
            {/* Stretching droplet pull indicator */}
            {renderDroplet()}

            {/* Collapsible Stories Tray */}
            <div
                style={{
                    height: isDragging 
                        ? (showStories 
                            ? `${Math.max(104 + pullOffset, 0)}px` 
                            : `${Math.max(pullOffset, 0)}px`)
                        : (showStories ? '104px' : '0px'),
                    opacity: showStories || (isDragging && (showStories ? (104 + pullOffset > 15) : (pullOffset > 15))) ? 1 : 0,
                    transition: isDragging ? 'none' : 'height 0.4s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.3s ease-in-out'
                }}
                className="w-full overflow-hidden"
            >
                <div className="py-2 px-1">
                    <Stories />
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
        </div>
    )
}