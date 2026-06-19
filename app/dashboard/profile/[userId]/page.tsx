"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { HiArrowLeft } from 'react-icons/hi2'
import { PostCard, PostType } from '@/components/post-card'
import { ProfileSkeleton } from '@/components/skeleton-loader'
import { useProfile, useFollowToggle, useUpdatePost, useDeletePost } from '@/hooks/use-queries'

interface ProfileData {
    id: string
    username: string
    nickname: string | null
    avatar_url: string | null
    bio: string | null
}

export default function UserProfilePage() {
    const params = useParams()
    const router = useRouter()
    const userId = params.userId as string

    const { data, isLoading: loading, error } = useProfile(userId)
    const followMutation = useFollowToggle()
    const updatePostMutation = useUpdatePost()
    const deletePostMutation = useDeletePost()
    
    const [followLoading, setFollowLoading] = useState(false)

    const profile = data?.profile
    const isOwnProfile = data?.isOwnProfile || false
    const isFollowing = data?.isFollowing || false
    const followersCount = data?.followersCount || 0
    const followingCount = data?.followingCount || 0
    const hideContent = data?.hideContent || false

    const posts: PostType[] = data?.posts.map((p: any) => ({
        id: p.id,
        authorId: p.authorId,
        author: data.profile.nickname || data.profile.username,
        avatar: data.profile.avatar_url || '/default-avatar.png',
        time: p.createdAt,
        location: '',
        image: p.image,
        content: p.content,
        likes: p.likes,
        isOwner: data.isOwnProfile,
        likedByMe: p.likedByMe,
        commentsCount: p.commentsCount,
    })) || []

    // Agar bu o'zining profili bo'lsa, shaxsiy profil sahifasiga yo'naltirish
    useEffect(() => {
        if (isOwnProfile) {
            router.replace('/dashboard/profile')
        }
    }, [isOwnProfile, router])

    const handleFollowToggle = async () => {
        if (followLoading || !profile) return
        setFollowLoading(true)
        try {
            await followMutation.mutateAsync(profile.id)
        } catch (err: any) {
            alert(`Xatolik: ${err.message}`)
        } finally {
            setFollowLoading(false)
        }
    }

    const handleDeletePost = async (id: string | number) => {
        const confirmDelete = window.confirm("Ushbu postni butunlay o'chirishni xohlaysizmi?")
        if (!confirmDelete) return

        try {
            await deletePostMutation.mutateAsync(id)
        } catch (err: any) {
            alert(`Xatolik: ${err.message}`)
        }
    }

    const handleUpdatePost = async (id: string | number, newContent: string) => {
        try {
            await updatePostMutation.mutateAsync({ id, content: newContent })
        } catch (err: any) {
            alert(`Xatolik: ${err.message}`)
        }
    }

    if (loading) {
        return <ProfileSkeleton />
    }

    if (error || !profile) {
        return (
            <div className="w-full p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold text-center mt-4">
                {error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Foydalanuvchi topilmadi')}
            </div>
        )
    }

    return (
        <div className="pb-20 text-slate-800 dark:text-slate-200">
            <div className="flex items-center gap-3 pt-2 px-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800/40 rounded-xl active:scale-90 transition-all text-slate-700 dark:text-slate-300"
                >
                    <HiArrowLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-black text-slate-900 dark:text-slate-100">Profil</span>
            </div>

            {/* Mesh Gradient Cover */}
            <div className="relative h-32 sm:h-44 w-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 animate-mesh-gradient overflow-hidden sm:rounded-b-2xl border-b border-slate-100 dark:border-white/5 mt-3">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(0,0,0,0.15),transparent_50%)] mix-blend-overlay" />
            </div>

            <div className="px-4 -mt-12 relative z-10 text-center sm:text-left sm:flex sm:items-end sm:gap-6 sm:px-6">
                <div className="relative inline-block">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 p-[3px] mx-auto">
                        <div className="w-full h-full bg-white dark:bg-slate-950 rounded-full p-[3px]">
                            <img
                                src={profile.avatar_url || 'https://ui-avatars.com/api/?name=' + (profile.nickname || profile.username) + '&background=e2e8f0&color=1e293b'}
                                alt={profile.nickname || profile.username}
                                className="w-full h-full object-cover rounded-full"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-3 sm:mt-0 sm:mb-2 flex-1">
                    <h2 className="font-black text-xl text-slate-900 dark:text-slate-100 leading-tight">
                        {profile.nickname || profile.username}
                    </h2>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                        @{profile.username}
                    </p>
                </div>
            </div>

            <div className="px-4 mt-3 text-center sm:text-left sm:px-6">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-450 max-w-lg leading-relaxed font-medium">
                    {profile.bio || 'Bu yerda bio ma\'lumoti chiqadi.'}
                </p>
            </div>

            {/* Stats Block (Premium Borderless) */}
            <div className="mx-4 mt-6 py-2 flex items-center justify-around text-center select-none bg-transparent">
                <div className="flex flex-col items-center justify-center flex-1">
                    <span className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                        {followersCount}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider mt-1.5">
                        Obunachilar
                    </span>
                </div>
                <div className="w-px h-6 bg-slate-200/60 dark:bg-white/10 shrink-0" />
                <div className="flex flex-col items-center justify-center flex-1">
                    <span className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                        {followingCount}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider mt-1.5">
                        Obunalar
                    </span>
                </div>
                <div className="w-px h-6 bg-slate-200/60 dark:bg-white/10 shrink-0" />
                <div className="flex flex-col items-center justify-center flex-1">
                    <span className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                        {hideContent ? '—' : posts.length}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider mt-1.5">
                        Postlar
                    </span>
                </div>
            </div>

            {/* Profile Action Buttons */}
            <div className="mx-4 mt-4 flex gap-2">
                <button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    className={`flex-1 py-3 font-bold text-xs rounded-xl active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer ${
                        isFollowing
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                >
                    {followLoading ? '...' : isFollowing ? 'Obunani bekor qilish' : 'Obuna bo\'lish'}
                </button>
            </div>

            {/* If profile is private and user is not following */}
            {hideContent ? (
                <div className="mx-4 mt-8 py-12 px-6 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl transition-colors">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 border border-slate-100 dark:border-white/5">
                        <svg className="w-6 h-6 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 mb-1">
                        Bu hisob maxfiy (Private)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed font-semibold">
                        Ushbu foydalanuvchining postlarini ko'rish uchun unga obuna bo'ling.
                    </p>
                </div>
            ) : (
                <>
                    {/* Profile Tab Header */}
                    <div className="mx-4 mt-6 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-slate-950 sticky top-0 z-20 transition-colors">
                        <div className="flex max-w-lg mx-auto">
                            <button className="flex-1 py-2.5 text-xs font-bold text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 cursor-default">
                                Postlar ({posts.length})
                            </button>
                        </div>
                    </div>

                    {/* Posts Pane */}
                    <div className="w-full p-4 max-w-2xl mx-auto">
                        {posts.length > 0 ? (
                            <div className="space-y-6 text-left">
                                {posts.map((post) => {
                                    const postTitle = post.content.trim().slice(0, 45) + (post.content.trim().length > 45 ? '...' : '')
                                    const postDate = new Date(post.time).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })
                                    
                                    return (
                                        <div key={post.id} className="group border-b border-slate-100 dark:border-white/5 pb-5 last:border-0 select-text">
                                            {/* URL Breadcrumb */}
                                            <div className="text-[11px] text-slate-500 dark:text-slate-450 truncate mb-1">
                                                vibegrid.com <span className="text-[9px]">›</span> post <span className="text-[9px]">›</span> {typeof post.id === 'string' ? post.id.slice(0, 8) : post.id}
                                            </div>
                                            {/* Clickable Blue Title */}
                                            <h3 className="text-sm sm:text-base font-semibold text-blue-600 dark:text-blue-400 group-hover:underline cursor-pointer leading-tight mb-1" onClick={() => router.push(`/post/${post.id}`)}>
                                                {postTitle || 'VibeGrid Post'}
                                            </h3>
                                            {/* Content Snippet */}
                                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-350 leading-relaxed line-clamp-2 mb-2 font-normal">
                                                {post.content}
                                            </p>
                                            {/* Metadata Row */}
                                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5 select-none">
                                                <span>{Number(post.likes) || 0} layk</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                                <span>{Number(post.commentsCount) || 0} izoh</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                                <span>{postDate}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs font-medium bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-white/5 transition-colors">
                                Hozircha postlar yo'q
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}