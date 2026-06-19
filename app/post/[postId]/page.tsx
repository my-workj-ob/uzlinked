"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { HiArrowLeft, HiSun, HiMoon } from 'react-icons/hi2'
import Link from 'next/link'
import { PostCard, PostType } from '@/components/post-card'
import { PostDetailSkeleton } from '@/components/skeleton-loader'
import { usePost } from '@/hooks/use-queries'

export default function PostDetailPage() {
    const params = useParams()
    const router = useRouter()
    const postId = params.postId as string

    const { data: post = null, isLoading: loading, error } = usePost(postId)
    const [isDark, setIsDark] = useState(false)

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'))
    }, [])

    const toggleTheme = () => {
        const nextDark = !isDark
        setIsDark(nextDark)
        if (nextDark) {
            document.documentElement.classList.add('dark')
            localStorage.setItem('theme', 'dark')
        } else {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('theme', 'light')
        }
    }

    if (loading) {
        return <PostDetailSkeleton />
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
            {/* Header */}
            <header className="sticky top-0 z-50 flex items-center justify-between h-16 px-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-100 dark:border-white/5 select-none">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            if (window.history.length > 1) {
                                router.back()
                            } else {
                                router.push('/dashboard')
                            }
                        }}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800/40 rounded-xl active:scale-90 transition-all text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                        <HiArrowLeft className="w-5 h-5" />
                    </button>
                    <Link href="/dashboard" className="text-xl font-black tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent active:scale-95 transition-transform">
                        VibeGrid
                    </Link>
                </div>

                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40 active:scale-90 transition-all cursor-pointer"
                >
                    {isDark ? <HiSun className="w-5 h-5 text-amber-500" /> : <HiMoon className="w-5 h-5" />}
                </button>
            </header>

            {/* Main Content */}
            <main className="py-8 max-w-2xl mx-auto px-4 md:px-6">
                {error || !post ? (
                    <div className="w-full p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl text-center flex flex-col items-center justify-center">
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-450 mb-3">
                            {error instanceof Error ? error.message : (typeof error === 'string' ? error : "Post topilmadi")}
                        </p>
                        <Link href="/dashboard" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl active:scale-95 transition-all">
                            Tasmasiga qaytish
                        </Link>
                    </div>
                ) : (
                    <div className="animate-fade-in-up">
                        <PostCard post={post} isDetailPage={true} />
                    </div>
                )}
            </main>
        </div>
    )
}
