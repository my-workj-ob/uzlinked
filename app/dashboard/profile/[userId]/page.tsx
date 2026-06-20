"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { HiArrowLeft, HiOutlineShare, HiOutlineChatBubbleLeftRight, HiMiniCheckBadge } from 'react-icons/hi2'
import { FiUserCheck, FiUserPlus } from 'react-icons/fi'
import { PostCard, PostType } from '@/components/post-card'
import { ProfileSkeleton } from '@/components/skeleton-loader'
import { useProfile, useFollowToggle, useUpdatePost, useDeletePost } from '@/hooks/use-queries'
import { FaBriefcase, FaTelegram, FaGithub, FaGlobe, FaHandshake } from 'react-icons/fa'
import { createClient } from '@/utils/supabase/client'
import { BottomSheet } from '@/components/bottom-sheet'

interface ProfileData {
    id: string
    username: string
    nickname: string | null
    avatar_url: string | null
    bio: string | null
    is_professional_mode?: boolean
    headline?: string | null
    tags?: string[] | null
    experience_info?: string | null
    contact_links?: {
        telegram?: string
        github?: string
        website?: string
    } | null
    open_for_collab?: boolean
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
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [messageLoading, setMessageLoading] = useState(false)
    const [isOptionsOpen, setIsOptionsOpen] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setCurrentUserId(user.id)
            }
        }
        fetchUser()
    }, [])

    const handleSendMessage = async () => {
        if (!profile || !currentUserId || messageLoading) return
        setMessageLoading(true)

        try {
            const { data: existingChats, error: findError } = await supabase
                .from('chats')
                .select('id')
                .or(`and(user_one.eq.${currentUserId},user_two.eq.${profile.id}),and(user_one.eq.${profile.id},user_two.eq.${currentUserId})`)
                .limit(1)

            if (findError) throw findError

            let chatId = existingChats?.[0]?.id

            if (!chatId) {
                const [u1, u2] = currentUserId < profile.id ? [currentUserId, profile.id] : [profile.id, currentUserId]
                const { data: newChat, error: insertError } = await supabase
                    .from('chats')
                    .insert([{ user_one: u1, user_two: u2 }])
                    .select('id')
                    .single()
                if (insertError) throw insertError
                chatId = newChat.id
            }

            router.push(`/dashboard/messages?chat=${chatId}`)
        } catch (err) {
            console.error('[Profil] Chat ochishda xato:', err)
            alert("Xabar yuborishda xatolik yuz berdi")
        } finally {
            setMessageLoading(false)
        }
    }

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

            {/* Mesh Gradient Cover (Seamless Blend) */}
            <div className="relative h-32 sm:h-44 w-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 animate-mesh-gradient overflow-hidden sm:rounded-b-2xl mt-3">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(0,0,0,0.15),transparent_50%)] mix-blend-overlay" />
                {/* Seamless Fade Mask */}
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-slate-950 to-transparent pointer-events-none" />
            </div>

            {/* Left aligned avatar and side-by-side name/username block */}
            <div className="px-4 -mt-10 relative z-10 flex items-end gap-4 sm:gap-6 sm:px-6 select-none">
                {/* Avatar */}
                <div className="relative shrink-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 p-[2.5px] shadow-lg">
                        <div className="w-full h-full bg-white dark:bg-slate-950 rounded-full p-[2px]">
                            <img
                                src={profile.avatar_url || 'https://ui-avatars.com/api/?name=' + (profile.nickname || profile.username) + '&background=e2e8f0&color=1e293b'}
                                alt={profile.nickname || profile.username}
                                className="w-full h-full object-cover rounded-full"
                            />
                        </div>
                    </div>
                </div>

                {/* Nickname, Username and Verify Badge */}
                <div className="mb-2 flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <h2 className="font-black text-sm sm:text-sm text-slate-900 dark:text-slate-100 leading-tight truncate">
                            {profile.nickname || profile.username}
                        </h2>
                        {profile.is_premium && (
                            <HiMiniCheckBadge className="w-5 h-5 text-blue-500 dark:text-blue-400 shrink-0" title="Tasdiqlangan PRO hisob" />
                        )}
                    </div>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5 truncate">
                        @{profile.username}
                    </p>
                </div>
            </div>

            {/* Profile Fields (Headline, Bio, and Social links below) */}
            <div className="px-4 mt-3 sm:px-6 flex flex-col gap-2 select-none text-left">
                {profile.is_professional_mode && profile.headline && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-full text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-350 w-fit mt-1 shadow-xs">
                        <FaBriefcase className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="uppercase tracking-wider">{profile.headline}</span>
                    </div>
                )}

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-450 max-w-lg leading-relaxed font-medium mt-1">
                    {profile.bio || 'Bu yerda bio ma\'lumoti chiqadi.'}
                </p>

                {/* Links & Collaboration Status (Outline Circles!) */}
                {((profile.contact_links && Object.values(profile.contact_links).some(Boolean)) || profile.open_for_collab) && (
                    <div className="flex flex-wrap gap-3 mt-2 items-center">
                        {profile.contact_links?.telegram && (
                            <a href={`https://t.me/${profile.contact_links.telegram}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center text-sky-600 dark:text-sky-400 hover:bg-sky-50/50 dark:hover:bg-sky-950/20 transition-all active:scale-90" title="Telegram">
                                <FaTelegram className="w-4 h-4" />
                            </a>
                        )}
                        {profile.contact_links?.github && (
                            <a href={`https://github.com/${profile.contact_links.github}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all active:scale-90" title="GitHub">
                                <FaGithub className="w-4 h-4" />
                            </a>
                        )}
                        {profile.contact_links?.website && (
                            <a href={profile.contact_links.website.startsWith('http') ? profile.contact_links.website : `https://${profile.contact_links.website}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center text-blue-600 dark:text-blue-450 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all active:scale-90" title="Website">
                                <FaGlobe className="w-4 h-4" />
                            </a>
                        )}
                        {profile.open_for_collab && (
                            <span className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-3.5 py-1.5 rounded-xl text-xs font-bold border border-emerald-100/30 dark:border-emerald-900/10 select-none animate-pulse">
                                <FaHandshake className="w-4 h-4" />
                                <span>Hamkorlikka ochiq</span>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Stats Block (Centered with vertical lines) */}
            <div className="mx-4 mt-6 py-3 flex items-center justify-around text-center select-none bg-slate-50/30 dark:bg-slate-950/20 border border-slate-100 dark:border-white/5 rounded-xl">
                <div className="flex flex-col items-center justify-center flex-1">
                    <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                        {followersCount}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider mt-1.5">
                        Obunachilar
                    </span>
                </div>
                <div className="w-px h-5 bg-slate-200 dark:bg-white/10 shrink-0" />
                <div className="flex flex-col items-center justify-center flex-1">
                    <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                        {followingCount}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider mt-1.5">
                        Obunalar
                    </span>
                </div>
                <div className="w-px h-5 bg-slate-200 dark:bg-white/10 shrink-0" />
                <div className="flex flex-col items-center justify-center flex-1">
                    <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                        {hideContent ? '—' : posts.length}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider mt-1.5">
                        Postlar
                    </span>
                </div>
            </div>

            {/* Profile Action Buttons */}
            <div className="mx-4 mt-4 flex gap-2 select-none">
                <button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    className={`flex-1 py-3 font-bold text-xs rounded-xl active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer ${isFollowing
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700'
                        : 'bg-blue-600 hover:bg-blue-700 text-white px-2'
                        }`}
                >
                    {isFollowing ? (
                        <><FiUserCheck className="w-3.5 h-3.5" /> Obuna</>
                    ) : (
                        <><FiUserPlus className="w-3.5 h-3.5 " /> Obuna bo'lish</>
                    )}
                </button>
                <button
                    onClick={handleSendMessage}
                    disabled={messageLoading}
                    className="flex-1 py-3 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-700 font-bold text-xs rounded-xl active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer border border-transparent dark:border-white/5"
                >
                    <HiOutlineChatBubbleLeftRight className="w-4 h-4" /> {messageLoading ? 'Ochilmoqda...' : 'Xabar'}
                </button>
                <button
                    onClick={() => setIsOptionsOpen(true)}
                    className="px-4 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer border border-transparent dark:border-white/5 font-bold text-sm tracking-widest"
                >
                    •••
                </button>
            </div>

            {/* Options Bottom Sheet */}
            {isOptionsOpen && (
                <BottomSheet isOpen={true} onClose={() => setIsOptionsOpen(false)} title="Portfolio & Ma'lumotlar">
                    <div className="flex flex-col gap-4 select-none text-left">
                        {profile.is_professional_mode && (
                            <>
                                {/* Resume Info */}
                                {profile.experience_info && (
                                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-white/5">
                                        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                                            <FaBriefcase className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                            Tajriba va Loyihalar
                                        </h4>
                                        <p className="text-xs text-slate-700 dark:text-slate-350 whitespace-pre-line leading-relaxed font-semibold">
                                            {profile.experience_info}
                                        </p>
                                    </div>
                                )}

                                {/* Skills / Tags */}
                                {Array.isArray(profile.tags) && profile.tags.length > 0 && (
                                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-white/5">
                                        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500 mb-2">
                                            Ko'nikmalar & Qiziqishlar
                                        </h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {profile.tags.map((tag: string, idx: number) => (
                                                <span key={idx} className="px-2.5 py-1 bg-blue-50/70 dark:bg-blue-950/20 text-blue-600 dark:text-blue-450 rounded-lg text-[10px] font-bold border border-blue-100/20 dark:border-blue-900/10">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Navigation Options */}
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={async () => {
                                    try {
                                        await navigator.clipboard.writeText(window.location.origin + `/dashboard/profile/${profile.id}`)
                                        alert('Profil havolasi buferga nusxalandi!')
                                    } catch (err) {
                                        alert('Nusxalashda xatolik yuz berdi')
                                    }
                                    setIsOptionsOpen(false)
                                }}
                                className="w-full py-3.5 px-4 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-850 dark:text-slate-250 font-bold text-xs rounded-xl text-left border border-slate-100 dark:border-white/5"
                            >
                                Profil havolasini ulashish
                            </button>
                        </div>
                    </div>
                </BottomSheet>
            )}

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