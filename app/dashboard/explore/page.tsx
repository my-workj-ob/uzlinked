"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { HiMagnifyingGlass, HiArrowTrendingUp, HiSparkles, HiFire } from 'react-icons/hi2'
import { FiHeart, FiEye, FiUserPlus, FiUserCheck } from 'react-icons/fi'

interface ExplorePost {
    id: string
    image: string | null
    content: string
    author: string
    avatar: string
    likes: number
}

interface ExploreProfile {
    id: string
    nickname: string
    username: string
    avatar: string
    bio: string
    followers: number
    posts: number
    isFollowing: boolean
    isMe: boolean
    is_professional_mode?: boolean
    headline?: string
    tags?: string[]
    open_for_collab?: boolean
}

// Bento Grid uchun o'lcham patternlari
const sizePatterns = [
    'col-span-2 row-span-2',
    'col-span-1 row-span-1',
    'col-span-1 row-span-1',
    'col-span-1 row-span-2',
    'col-span-2 row-span-1',
    'col-span-1 row-span-1',
]

export default function ExplorePage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState('trendlar')
    const [searchQuery, setSearchQuery] = useState('')
    const [posts, setPosts] = useState<ExplorePost[]>([])
    const [profiles, setProfiles] = useState<ExploreProfile[]>([])
    const [loading, setLoading] = useState(true)
    const [followLoading, setFollowLoading] = useState<string | null>(null)

    const fetchExploreData = useCallback(async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (searchQuery) params.set('q', searchQuery)
            params.set('tab', activeTab)

            const res = await fetch(`/api/explore?${params.toString()}`)
            if (!res.ok) throw new Error()

            const result = await res.json()
            if (result.type === 'profiles') {
                setProfiles(result.data)
                setPosts([])
            } else {
                setPosts(result.data)
                setProfiles([])
            }
        } catch {
            console.error('Explore ma\'lumotlarni yuklashda xato')
        } finally {
            setLoading(false)
        }
    }, [searchQuery, activeTab])

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchExploreData()
        }, searchQuery ? 400 : 0)
        return () => clearTimeout(debounce)
    }, [fetchExploreData, searchQuery])

    const handleFollow = async (userId: string) => {
        setFollowLoading(userId)
        try {
            const res = await fetch('/api/follow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: userId }),
            })
            if (res.ok) {
                const { following } = await res.json()
                setProfiles(prev =>
                    prev.map(p =>
                        p.id === userId
                            ? { ...p, isFollowing: following, followers: following ? p.followers + 1 : p.followers - 1 }
                            : p
                    )
                )
            }
        } catch {}
        setFollowLoading(null)
    }

    return (
        <div>
            <div className="space-y-6">
                {/* Qidiruv */}
                <div className="relative w-full group">
                    <HiMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors duration-200" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Foydalanuvchilar va postlarni qidirish..."
                        className="w-full h-12 pl-12 pr-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 rounded-2xl text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/5 dark:focus:ring-blue-500/10 transition-all duration-200"
                    />
                </div>

                {/* Tablar */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    {[
                        { id: 'trendlar', label: 'Trendlar', Icon: HiFire },
                        { id: 'rasmlar', label: 'Rasmlar', Icon: HiSparkles },
                        { id: 'ijodkorlar', label: 'Ijodkorlar', Icon: HiArrowTrendingUp },
                        { id: 'hamjamiyat', label: 'Hamjamiyat', Icon: HiSparkles },
                    ].map((tab) => {
                        const isSelected = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap active:scale-95 transition-all duration-150 ${
                                    isSelected
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                }`}
                            >
                                <tab.Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>

                {/* Yuklanish */}
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {/* Ijodkorlar va Hamjamiyat ro'yxati */}
                {!loading && profiles.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 tracking-tight pl-1">
                            {activeTab === 'hamjamiyat' 
                                ? (searchQuery ? `"${searchQuery}" bo'yicha hamjamiyat` : 'Faol hamjamiyat a\'zolari')
                                : (searchQuery ? `"${searchQuery}" natijalar` : 'Tavsiya etilgan ijodkorlar')}
                        </h3>
                        <div className="space-y-2.5">
                            {profiles.map((profile) => (
                                <div
                                    key={profile.id}
                                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3.5 group hover:border-slate-200 dark:hover:border-white/10 transition-all cursor-pointer"
                                    onClick={() => router.push(`/dashboard/profile/${profile.id}`)}
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <img
                                            src={profile.avatar}
                                            alt={profile.nickname}
                                            className="w-12 h-12 rounded-full object-cover bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-50 dark:ring-slate-950 shrink-0"
                                        />
                                        <div className="flex-1 min-w-0 text-left">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{profile.nickname}</h4>
                                                {profile.open_for_collab && activeTab === 'hamjamiyat' && (
                                                    <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider">Hamkorlik</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-blue-600 font-semibold">@{profile.username || 'user'}</p>
                                            
                                            {/* Headline */}
                                            {activeTab === 'hamjamiyat' && profile.headline && (
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{profile.headline}</p>
                                            )}

                                            {/* Tags */}
                                            {activeTab === 'hamjamiyat' && Array.isArray(profile.tags) && profile.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {profile.tags.map((tag, tIdx) => (
                                                        <span 
                                                            key={tIdx} 
                                                            onClick={(e) => { e.stopPropagation(); setSearchQuery(tag); }}
                                                            className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 px-2 py-0.5 rounded hover:underline cursor-pointer"
                                                        >
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {activeTab !== 'hamjamiyat' && (
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] text-slate-400 font-bold">{profile.followers} followers</span>
                                                    <span className="text-[10px] text-slate-400 font-bold">{profile.posts} posts</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 self-end sm:self-center shrink-0">
                                        {activeTab === 'hamjamiyat' && !profile.isMe && (
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    router.push(`/dashboard/messages?partner=${profile.id}`);
                                                }}
                                                className="px-3.5 py-2 rounded-xl text-[11px] font-bold bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-450 hover:bg-blue-100 dark:hover:bg-slate-700 transition-all active:scale-95 border border-transparent dark:border-white/5"
                                            >
                                                Xabar yozish
                                            </button>
                                        )}
                                        {!profile.isMe && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleFollow(profile.id); }}
                                                disabled={followLoading === profile.id}
                                                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-95 disabled:opacity-60 ${
                                                    profile.isFollowing
                                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                                }`}
                                            >
                                                {profile.isFollowing ? (
                                                    <><FiUserCheck className="w-3.5 h-3.5" /> Obuna</>
                                                ) : (
                                                    <><FiUserPlus className="w-3.5 h-3.5" /> Obuna bo'lish</>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Post rasmlar gridi */}
                {!loading && posts.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 tracking-tight pl-1">
                            {searchQuery ? `"${searchQuery}" natijalar` : 'Siz uchun tavsiyalar'}
                        </h3>

                        <div className="grid grid-cols-3 gap-2 auto-rows-[120px]">
                            {posts.map((item, index) => (
                                <div
                                    key={item.id}
                                    className={`relative rounded-2xl overflow-hidden group bg-slate-100 dark:bg-slate-900 cursor-pointer border border-slate-200/10 dark:border-white/5 ${sizePatterns[index % sizePatterns.length]}`}
                                >
                                    {item.image ? (
                                        <img
                                            src={item.image}
                                            alt={item.content}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-indigo-950/20">
                                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium line-clamp-3 text-center">{item.content}</p>
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                                        <div className="flex items-center gap-3 text-white font-bold text-[11px] w-full">
                                            <div className="flex items-center gap-1">
                                                <FiHeart className="w-3.5 h-3.5 fill-white text-white" />
                                                <span>{item.likes}</span>
                                            </div>
                                            <span className="text-white/70 truncate text-[10px]">{item.author}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Bo'sh holat */}
                {!loading && posts.length === 0 && profiles.length === 0 && (
                    <div className="py-16 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl flex flex-col items-center justify-center text-center p-6">
                        <FiEye className="w-8 h-8 text-slate-200 dark:text-slate-700 mb-3" />
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500">
                            {searchQuery ? `"${searchQuery}" bo'yicha hech narsa topilmadi` : 'Hozircha kontentlar yo\'q'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}