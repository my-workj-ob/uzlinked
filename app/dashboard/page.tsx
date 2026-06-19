"use client"

import React, { useState, useEffect, useRef } from 'react'
import { PostCard, PostType } from '@/components/post-card'
import { Stories } from '@/components/stories'
import { HiChevronDown } from 'react-icons/hi2'
import { FeedSkeleton } from '@/components/skeleton-loader'

export default function FeedList() {
    const [posts, setPosts] = useState<PostType[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    // Pull down stories states
    const [showStories, setShowStories] = useState(false)
    const [pullOffset, setPullOffset] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const startY = useRef(0)

    const fetchPosts = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/posts')
            if (!response.ok) throw new Error('Postlarni yuklashda xatolik yuz berdi')
            const data = await response.json()
            setPosts(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPosts()
    }, [])

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 20 && showStories) {
                setShowStories(false)
            }
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [showStories])

    // Gesture detection
    const handleTouchStart = (e: React.TouchEvent) => {
        if (window.scrollY === 0) {
            startY.current = e.touches[0].clientY
            setIsDragging(true)
            setPullOffset(0)
        }
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return
        const currentY = e.touches[0].clientY
        const diff = currentY - startY.current
        if (showStories) {
            if (diff < 0) {
                setPullOffset(diff * 0.5)
            } else {
                setPullOffset(0)
            }
        } else {
            if (diff > 0) {
                setPullOffset(Math.min(diff * 0.5, 110))
            } else {
                setPullOffset(0)
            }
        }
    }

    const handleTouchEnd = () => {
        setIsDragging(false)
        if (showStories) {
            if (pullOffset < -40) {
                setShowStories(false)
            }
        } else {
            if (pullOffset > 50) {
                setShowStories(true)
            }
        }
        setPullOffset(0)
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        if (window.scrollY === 0) {
            startY.current = e.clientY
            setIsDragging(true)
            setPullOffset(0)
        }
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return
        const currentY = e.clientY
        const diff = currentY - startY.current
        if (showStories) {
            if (diff < 0) {
                setPullOffset(diff * 0.5)
            } else {
                setPullOffset(0)
            }
        } else {
            if (diff > 0) {
                setPullOffset(Math.min(diff * 0.5, 110))
            } else {
                setPullOffset(0)
            }
        }
    }

    const handleMouseUp = () => {
        setIsDragging(false)
        if (showStories) {
            if (pullOffset < -40) {
                setShowStories(false)
            }
        } else {
            if (pullOffset > 50) {
                setShowStories(true)
            }
        }
        setPullOffset(0)
    }

    const handleUpdatePost = async (id: string | number, newContent: string) => {
        try {
            const response = await fetch('/api/posts', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id, content: newContent }),
            })

            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || "Postni tahrirlash imkonsiz bo'ldi")
            }

            setPosts(prevPosts =>
                prevPosts.map(post =>
                    post.id === id ? { ...post, content: newContent } : post
                )
            )
        } catch (err: any) {
            alert(`Xatolik: ${err.message}`)
        }
    }

    const handleDeletePost = async (id: string | number) => {
        const confirmDelete = window.confirm("Ushbu postni butunlay o'chirishni xohlaysizmi?")
        if (!confirmDelete) return

        try {
            const response = await fetch(`/api/posts?id=${id}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || "Postni o'chirish imkonsiz bo'ldi")
            }

            setPosts(prevPosts => prevPosts.filter(post => post.id !== id))
        } catch (err: any) {
            alert(`Xatolik: ${err.message}`)
        }
    }

    if (loading) {
        return <FeedSkeleton />
    }

    if (error) {
        return (
            <div className="w-full p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold text-center border border-red-100 dark:border-red-900/10">
                {error}. Sahifani qayta yangilang.
            </div>
        )
    }

    return (
        <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="flex flex-col gap-4 select-none min-h-screen pb-10 relative"
        >

            {/* Collapsible Stories Tray */}
            <div
                style={{
                    height: isDragging 
                        ? (showStories 
                            ? `${Math.max(100 + pullOffset, 0)}px` 
                            : `${pullOffset}px`)
                        : (showStories ? '100px' : '0px'),
                    opacity: showStories || (isDragging && (showStories ? (100 + pullOffset > 15) : (pullOffset > 15))) ? 1 : 0,
                    transition: isDragging ? 'none' : 'all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
                className="w-full overflow-hidden bg-white/50 dark:bg-slate-900/10 rounded-2xl border border-transparent dark:border-white/5"
                onMouseDown={(e) => e.stopPropagation()}
                onMouseMove={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
            >
                <Stories />
            </div>

            {posts.length === 0 ? (
                <div className="w-full py-16 bg-slate-50/50 dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-white/5 rounded-2xl text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">Hozircha hech qanday post yo'q 🏜️</p>
                </div>
            ) : (
                <div
                    className="flex flex-col gap-4 relative"
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                >
                    {posts.map((post, idx) => (
                        <div key={post.id} className={`animate-fade-in-up stagger-${(idx % 5) + 1} relative z-10`}>
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