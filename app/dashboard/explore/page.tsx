"use client"

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    HiMagnifyingGlass, HiArrowTrendingUp, HiSparkles, HiFire,
    HiUserGroup, HiMegaphone, HiCheck, HiXMark,
    HiArrowRightOnRectangle, HiHashtag
} from 'react-icons/hi2'
import { FiHeart, FiEye, FiUserPlus, FiUserCheck, FiArrowRight } from 'react-icons/fi'
import { createClient } from '@/utils/supabase/client'

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

// Bento Grid sizes
const sizePatterns = [
    'col-span-2 row-span-2',
    'col-span-1 row-span-1',
    'col-span-1 row-span-1',
    'col-span-1 row-span-2',
    'col-span-2 row-span-1',
    'col-span-1 row-span-1',
]

function ExploreContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()

    const [activeTab, setActiveTab] = useState('guruhlar') // Default to guruhlar for public groups/channels search
    const [searchQuery, setSearchQuery] = useState('')
    const [posts, setPosts] = useState<ExplorePost[]>([])
    const [profiles, setProfiles] = useState<ExploreProfile[]>([])
    const [groups, setGroups] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [followLoading, setFollowLoading] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [searchHistory, setSearchHistory] = useState<string[]>([])
    const [isFocused, setIsFocused] = useState(false)

    const inputRef = useRef<HTMLInputElement>(null)

    // Load search history & current user
    useEffect(() => {
        const history = localStorage.getItem('explore_search_history')
        if (history) {
            try {
                setSearchHistory(JSON.parse(history))
            } catch { }
        }

        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setCurrentUserId(user.id)
            }
        }
        getUser()

        // Handle auto-focus from URL
        if (searchParams.get('focus') === 'true') {
            setTimeout(() => {
                inputRef.current?.focus()
            }, 100)
        }
    }, [searchParams, supabase])

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
                setGroups([])
            } else if (result.type === 'groups_channels') {
                setGroups(result.data)
                setPosts([])
                setProfiles([])
            } else {
                setPosts(result.data)
                setProfiles([])
                setGroups([])
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
        }, searchQuery ? 350 : 0)
        return () => clearTimeout(debounce)
    }, [fetchExploreData, searchQuery])

    const handleSearchSubmit = (queryText: string) => {
        const trimmed = queryText.trim()
        if (!trimmed) return
        setSearchQuery(trimmed)

        // Add to history
        setSearchHistory(prev => {
            const filtered = prev.filter(item => item !== trimmed)
            const updated = [trimmed, ...filtered].slice(0, 8)
            localStorage.setItem('explore_search_history', JSON.stringify(updated))
            return updated
        })
        inputRef.current?.blur()
    }

    const clearHistoryItem = (e: React.MouseEvent, item: string) => {
        e.stopPropagation()
        setSearchHistory(prev => {
            const updated = prev.filter(i => i !== item)
            localStorage.setItem('explore_search_history', JSON.stringify(updated))
            return updated
        })
    }

    const clearAllHistory = () => {
        setSearchHistory([])
        localStorage.removeItem('explore_search_history')
    }

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
        } catch { }
        setFollowLoading(null)
    }

    const handleJoinGroup = async (e: React.MouseEvent, groupId: string, type: 'group' | 'channel') => {
        e.stopPropagation()
        if (!currentUserId) {
            router.push('/login')
            return
        }
        setActionLoading(groupId)
        try {
            const { error } = await supabase
                .from('group_members')
                .insert([{ group_id: groupId, user_id: currentUserId, role: 'member' }])

            if (!error) {
                setGroups(prev => prev.map(g => {
                    if (g.id === groupId) {
                        return { ...g, isMember: true, memberCount: g.memberCount + 1 }
                    }
                    return g
                }))
            }
        } catch (err) {
            console.error(err)
        } finally {
            setActionLoading(null)
        }
    }

    const handleLeaveGroup = async (e: React.MouseEvent, groupId: string) => {
        e.stopPropagation()
        if (!currentUserId) return
        setActionLoading(groupId)
        try {
            const { error } = await supabase
                .from('group_members')
                .delete()
                .eq('group_id', groupId)
                .eq('user_id', currentUserId)

            if (!error) {
                setGroups(prev => prev.map(g => {
                    if (g.id === groupId) {
                        return { ...g, isMember: false, memberCount: Math.max(0, g.memberCount - 1) }
                    }
                    return g
                }))
            }
        } catch (err) {
            console.error(err)
        } finally {
            setActionLoading(null)
        }
    }

    const handleEnterChat = (groupId: string, type: 'group' | 'channel') => {
        if (type === 'group') {
            router.push(`/dashboard/groups/${groupId}`)
        } else {
            router.push(`/dashboard/channels/${groupId}`)
        }
    }

    const popularTags = ['IT', 'Dizayn', 'Marketing', 'Musiqa', 'Kino', 'Sport', 'Ta\'lim']

    return (
        <div className="space-y-6 pb-12 animate-fade-in">
            {/* Search Input Box */}
            <div className="relative w-full group">
                <div className="relative flex items-center mt-5">
                    <HiMagnifyingGlass className="absolute left-4 text-slate-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors duration-200" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setTimeout(() => setIsFocused(false), 250)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleSearchSubmit(searchQuery)
                            }
                        }}
                        placeholder="Guruhlar, kanallar va ijodkorlarni qidirish..."
                        className="w-full h-12 pl-12 pr-10 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 rounded-2xl text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/5 dark:focus:ring-blue-500/10 transition-all duration-200 shadow-xs"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                            <HiXMark className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Dropdown for Search History & Suggestions */}
                {isFocused && (searchHistory.length > 0 || searchQuery === '') && (
                    <div className="absolute top-14 left-0 right-0 z-50 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-4 shadow-xl animate-scale-in">
                        {searchHistory.length > 0 && (
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">So'nggi qidiruvlar</span>
                                    <button
                                        onClick={clearAllHistory}
                                        className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                                    >
                                        Tozalash
                                    </button>
                                </div>
                                <div className="space-y-1.5">
                                    {searchHistory.map((item, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => { setSearchQuery(item); setIsFocused(false); }}
                                            className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300"
                                        >
                                            <div className="flex items-center gap-2">
                                                <HiMagnifyingGlass className="w-4 h-4 text-slate-400" />
                                                <span>{item}</span>
                                            </div>
                                            <button
                                                onClick={(e) => clearHistoryItem(e, item)}
                                                className="p-1 rounded-full text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <HiXMark className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div>
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">Ommabop mavzular</span>
                            <div className="flex flex-wrap gap-1.5">
                                {popularTags.map((tag) => (
                                    <button
                                        key={tag}
                                        onClick={() => { setSearchQuery(tag); handleSearchSubmit(tag); }}
                                        className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                                    >
                                        <HiHashtag className="w-3 h-3" />
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Filter Tag Chips (Visible underneath search bar) */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {popularTags.slice(0, 5).map((tag) => (
                    <button
                        key={tag}
                        onClick={() => { setSearchQuery(tag); }}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all duration-150 active:scale-95 whitespace-nowrap cursor-pointer ${searchQuery === tag
                            ? 'bg-blue-600 text-white border-transparent'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                    >
                        #{tag}
                    </button>
                ))}
            </div>

            {/* Premium Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-slate-100 dark:border-white/5 pb-2">
                {[
                    { id: 'guruhlar', label: 'Guruhlar', Icon: HiUserGroup },
                    { id: 'kanallar', label: 'Kanallar', Icon: HiMegaphone },
                    { id: 'ijodkorlar', label: 'Ijodkorlar', Icon: HiArrowTrendingUp },
                    { id: 'hamjamiyat', label: 'Mutaxassislar', Icon: HiSparkles },
                    { id: 'trendlar', label: 'Trendlar', Icon: HiFire },
                ].map((tab) => {
                    const isSelected = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); }}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap active:scale-95 transition-all duration-200 relative ${isSelected
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                }`}
                        >
                            <tab.Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* Loading Spinner */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Natijalar yuklanmoqda...</span>
                </div>
            )}

            {/* Groups & Channels Rendering */}
            {!loading && groups.length > 0 && (
                <div className="space-y-3 animate-slide-up">
                    <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 tracking-tight pl-1">
                        {searchQuery ? `"${searchQuery}" bo'yicha topilganlar` : `Ommaviy ${activeTab === 'guruhlar' ? 'guruhlar' : 'kanallar'}`}
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                        {groups.map((group) => {
                            const isMember = group.isMember
                            const isGroup = group.type === 'group'
                            const avatarLetters = group.name ? group.name.substring(0, 2).toUpperCase() : 'GC'

                            return (
                                <div
                                    key={group.id}
                                    onClick={() => handleEnterChat(group.id, group.type)}
                                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4 group hover:border-slate-200 dark:hover:border-white/10 hover:shadow-xs active:scale-[0.99] transition-all cursor-pointer"
                                >
                                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                                        {group.avatar_url ? (
                                            <img
                                                src={group.avatar_url}
                                                alt={group.name}
                                                className="w-12 h-12 rounded-xl object-cover bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-50 dark:ring-slate-950 shrink-0"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                                                {avatarLetters}
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0 text-left">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {group.name}
                                                </h4>
                                                <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${isGroup
                                                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                                                    : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                                                    }`}>
                                                    {isGroup ? 'Guruh' : 'Kanal'}
                                                </span>
                                            </div>
                                            {group.username && (
                                                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                                                    @{group.username}
                                                </p>
                                            )}
                                            {group.description && (
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 line-clamp-2">
                                                    {group.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-1.5 mt-1.5 text-slate-400 dark:text-slate-500 text-[10px] font-bold">
                                                <HiUserGroup className="w-3.5 h-3.5 text-slate-400" />
                                                <span>{group.memberCount} {isGroup ? "a'zo" : "obunachi"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        {isMember ? (
                                            <>
                                                <button
                                                    onClick={() => handleEnterChat(group.id, group.type)}
                                                    className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-95 shadow-md shadow-blue-500/10"
                                                >
                                                    Kirish <FiArrowRight className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleLeaveGroup(e, group.id)}
                                                    disabled={actionLoading === group.id}
                                                    className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-95 transition-all"
                                                    title={isGroup ? "Guruhdan chiqish" : "Obunani bekor qilish"}
                                                >
                                                    <HiArrowRightOnRectangle className="w-4 h-4" />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={(e) => handleJoinGroup(e, group.id, group.type)}
                                                disabled={actionLoading === group.id}
                                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-700 border border-transparent dark:border-white/5 active:scale-95 transition-all disabled:opacity-60"
                                            >
                                                {actionLoading === group.id ? (
                                                    <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <>
                                                        <FiUserPlus className="w-3.5 h-3.5" />
                                                        {isGroup ? "Qo'shilish" : "Obuna"}
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Profiles (Creators) and Mutaxassislar (Professionals) Rendering */}
            {!loading && profiles.length > 0 && (
                <div className="space-y-3 animate-slide-up">
                    <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 tracking-tight pl-1">
                        {activeTab === 'hamjamiyat'
                            ? (searchQuery ? `"${searchQuery}" bo'yicha mutaxassislar` : 'Faol hamjamiyat a\'zolari')
                            : (searchQuery ? `"${searchQuery}" bo'yicha ijodkorlar` : 'Tavsiya etilgan ijodkorlar')}
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
                                        className="w-12 h-12 rounded-xl object-cover bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-50 dark:ring-slate-950 shrink-0"
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
                                        {profile.headline && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{profile.headline}</p>
                                        )}

                                        {/* Tags */}
                                        {Array.isArray(profile.tags) && profile.tags.length > 0 && (
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
                                <div className="flex gap-2 self-end sm:self-center shrink-0" onClick={(e) => e.stopPropagation()}>
                                    {!profile.isMe && (
                                        <button
                                            onClick={async () => {
                                                router.push(`/dashboard/messages?partner=${profile.id}`);
                                            }}
                                            className="px-3.5 py-2 rounded-xl text-[11px] font-bold bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-700 transition-all active:scale-95 border border-transparent dark:border-white/5"
                                        >
                                            Xabar yozish
                                        </button>
                                    )}
                                    {!profile.isMe && (
                                        <button
                                            onClick={() => handleFollow(profile.id)}
                                            disabled={followLoading === profile.id}
                                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-95 disabled:opacity-60 ${profile.isFollowing
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

            {/* Bento Grid Posts Rendering */}
            {!loading && posts.length > 0 && (
                <div className="space-y-3 animate-slide-up">
                    <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 tracking-tight pl-1">
                        {searchQuery ? `"${searchQuery}" bo'yicha postlar` : 'Siz uchun tavsiyalar'}
                    </h3>

                    <div className="grid grid-cols-3 gap-2 auto-rows-[120px]">
                        {posts.map((item, index) => (
                            <div
                                key={item.id}
                                onClick={() => router.push(`/dashboard/post/${item.id}`)}
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

            {/* Empty State */}
            {!loading && posts.length === 0 && profiles.length === 0 && groups.length === 0 && (
                <div className="py-20 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl flex flex-col items-center justify-center text-center p-6 animate-scale-in">
                    <FiEye className="w-10 h-10 text-slate-200 dark:text-slate-700 mb-3" />
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500">
                        {searchQuery ? `"${searchQuery}" bo'yicha hech narsa topilmadi` : 'Hozircha kontentlar yo\'q'}
                    </p>
                    <button
                        onClick={() => setSearchQuery('')}
                        className="mt-3 px-4 py-2 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-xl"
                    >
                        Filtrlarni bekor qilish
                    </button>
                </div>
            )}
        </div>
    )
}

export default function ExplorePage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Sahifa yuklanmoqda...</span>
            </div>
        }>
            <ExploreContent />
        </Suspense>
    )
}