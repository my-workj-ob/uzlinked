"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { HiArrowLeft } from 'react-icons/hi2'
import { PostCard, PostType } from '@/components/post-card'

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

    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [posts, setPosts] = useState<PostType[]>([])
    const [isOwnProfile, setIsOwnProfile] = useState(false)
    const [isFollowing, setIsFollowing] = useState(false)
    const [followLoading, setFollowLoading] = useState(false)
    const [followersCount, setFollowersCount] = useState(0)
    const [followingCount, setFollowingCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true)
                setError(null)
                const res = await fetch(`/api/profile/${userId}`)
                if (!res.ok) {
                    const errData = await res.json()
                    throw new Error(errData.error || 'Profilni yuklashda xatolik')
                }
                const data = await res.json()

                setProfile(data.profile)
                setIsOwnProfile(data.isOwnProfile)
                setIsFollowing(data.isFollowing)
                setFollowersCount(data.followersCount)
                setFollowingCount(data.followingCount)

                const formattedPosts: PostType[] = data.posts.map((p: any) => ({
                    id: p.id,
                    authorId: p.authorId, // Endi to'g'ri keladi — har doim shu profil egasi
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
                }))
                setPosts(formattedPosts)
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        if (userId) fetchProfile()
    }, [userId])

    // Agar bu o'zining profili bo'lsa, shaxsiy profil sahifasiga yo'naltirish
    useEffect(() => {
        if (isOwnProfile) {
            router.replace('/dashboard/profile')
        }
    }, [isOwnProfile, router])

    const handleFollowToggle = async () => {
        if (followLoading || !profile) return

        const nextFollowing = !isFollowing
        const prevFollowing = isFollowing
        const prevCount = followersCount

        // Optimistik UI yangilanishi
        setIsFollowing(nextFollowing)
        setFollowersCount(prev => nextFollowing ? prev + 1 : prev - 1)
        setFollowLoading(true)

        try {
            const res = await fetch('/api/follow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: profile.id }),
            })

            if (!res.ok) {
                const errData = await res.json()
                throw new Error(errData.error || 'Xatolik yuz berdi')
            }
        } catch (err: any) {
            // Xato bo'lsa eski holatga qaytarish
            setIsFollowing(prevFollowing)
            setFollowersCount(prevCount)
            alert(`Xatolik: ${err.message}`)
        } finally {
            setFollowLoading(false)
        }
    }

    const handleDeletePost = async (id: string | number) => {
        const confirmDelete = window.confirm("Ushbu postni butunlay o'chirishni xohlaysizmi?")
        if (!confirmDelete) return

        try {
            const response = await fetch(`/api/posts?id=${id}`, { method: 'DELETE' })
            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || "Postni o'chirish imkonsiz bo'ldi")
            }
            setPosts(prev => prev.filter(post => post.id !== id))
        } catch (err: any) {
            alert(`Xatolik: ${err.message}`)
        }
    }

    const handleUpdatePost = async (id: string | number, newContent: string) => {
        try {
            const response = await fetch('/api/posts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, content: newContent }),
            })
            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || "Postni tahrirlash imkonsiz bo'ldi")
            }
            setPosts(prev => prev.map(post => post.id === id ? { ...post, content: newContent } : post))
        } catch (err: any) {
            alert(`Xatolik: ${err.message}`)
        }
    }

    if (loading) {
        return (
            <div className="w-full py-20 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-semibold text-slate-400">Profil yuklanmoqda...</p>
            </div>
        )
    }

    if (error || !profile) {
        return (
            <div className="w-full p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold text-center mt-4">
                {error || 'Foydalanuvchi topilmadi'}
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4 pb-10">
            <div className="flex items-center gap-3 pt-2">
                <button
                    onClick={() => router.back()}
                    className="p-2 -ml-2 hover:bg-slate-100 rounded-xl active:scale-90 transition-all"
                >
                    <HiArrowLeft className="w-5 h-5 text-slate-700" />
                </button>
                <span className="text-sm font-black text-slate-900">Profil</span>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col items-center text-center gap-3">
                <img
                    src={profile.avatar_url || '/default-avatar.png'}
                    alt={profile.username}
                    className="w-20 h-20 object-cover rounded-full bg-slate-100 ring-4 ring-slate-50"
                />
                <div>
                    <h2 className="text-base font-black text-slate-900">{profile.nickname || profile.username}</h2>
                    <p className="text-xs text-slate-400 font-semibold">@{profile.username}</p>
                </div>

                <div className="flex items-center gap-5 text-center">
                    <div>
                        <p className="text-sm font-black text-slate-900">{followersCount}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">Obunachilar</p>
                    </div>
                    <div className="w-px h-6 bg-slate-100" />
                    <div>
                        <p className="text-sm font-black text-slate-900">{followingCount}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">Obunalar</p>
                    </div>
                </div>

                {profile.bio && (
                    <p className="text-xs text-slate-600 leading-relaxed max-w-xs">{profile.bio}</p>
                )}

                <button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    className={`w-full max-w-[220px] py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-60 ${
                        isFollowing
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                    {followLoading ? '...' : isFollowing ? 'Obunani bekor qilish' : 'Obuna bo\'lish'}
                </button>
            </div>

            <div className="flex flex-col gap-4">
                {posts.length === 0 ? (
                    <div className="w-full py-16 bg-slate-50/50 border border-dashed border-slate-100 rounded-2xl text-center">
                        <p className="text-xs text-slate-400 font-bold">Hozircha postlar yo'q 🏜️</p>
                    </div>
                ) : (
                    posts.map((post) => (
                        <PostCard
                            key={post.id}
                            post={post}
                            onDeletePost={handleDeletePost}
                            onUpdatePost={handleUpdatePost}
                        />
                    ))
                )}
            </div>
        </div>
    )
}