"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { get } from 'lodash'
import { createClient } from '@/utils/supabase/client'
import { HiMiniSquares2X2, HiOutlineShare, HiOutlineChatBubbleLeftRight, HiOutlineShoppingBag, HiMiniCheckBadge } from 'react-icons/hi2'
import { BsFilm, BsStar, BsCameraFill } from 'react-icons/bs'
import { FiUserPlus, FiUserCheck } from 'react-icons/fi'
import { FaHeart, FaBriefcase, FaTelegram, FaGithub, FaGlobe, FaHandshake } from 'react-icons/fa'
import { useRouter } from 'next/navigation'
import { useUploadThing } from '@/utils/uploadthing/uploadthing';
import { BottomSheet } from '@/components/bottom-sheet'
import { ProfileSkeleton } from '@/components/skeleton-loader'

interface EditProfileModalProps {
    profile: any
    onClose: () => void
    onUpdateSuccess: (updatedData: any) => void
}



const EditProfileModal = ({
    profile,
    onClose,
    onUpdateSuccess,
}: EditProfileModalProps) => {
    const [loading, setLoading] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<'basic' | 'professional'>('basic')

    const [avatarPreview, setAvatarPreview] = useState<string>(
        profile?.avatar_url || ""
    );

    const [formData, setFormData] = useState({
        nickname: profile?.nickname || "",
        username: profile?.username || "",
        bio: profile?.bio || "",
        is_professional_mode: profile?.is_professional_mode || false,
        headline: profile?.headline || "",
        tags: Array.isArray(profile?.tags) ? profile.tags.join(', ') : "",
        experience_info: profile?.experience_info || "",
        open_for_collab: profile?.open_for_collab || false,
        telegram: profile?.contact_links?.telegram || "",
        github: profile?.contact_links?.github || "",
        website: profile?.contact_links?.website || "",
    });

    const supabase = createClient();

    useEffect(() => {
        return () => {
            if (avatarPreview.startsWith("blob:")) {
                URL.revokeObjectURL(avatarPreview);
            }
        };
    }, [avatarPreview]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const { startUpload, isUploading } = useUploadThing("mediaUploader", {
        onClientUploadComplete: (res) => {
            const uploadedUrl = res?.[0]?.url;
            if (uploadedUrl) {
                handleProfileUpdate(uploadedUrl);
            }
        },
        onUploadError: (error) => {
            console.error("Upload error:", error);
            alert(error.message || "Rasm yuklashda xatolik");
            setLoading(false);
        },
    });

    const handleProfileUpdate = async (avatarUrl: string) => {
        try {
            const parsedTags = formData.tags
                ? formData.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0)
                : [];

            const updatedFields = {
                nickname: formData.nickname,
                username: formData.username,
                bio: formData.bio,
                avatar_url: avatarUrl,
                is_professional_mode: formData.is_professional_mode,
                headline: formData.headline,
                tags: parsedTags,
                experience_info: formData.experience_info,
                open_for_collab: formData.open_for_collab,
                contact_links: {
                    telegram: formData.telegram,
                    github: formData.github,
                    website: formData.website,
                },
                updated_at: new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from("profiles")
                .update(updatedFields)
                .eq("id", profile.id)
                .select()
                .single();

            if (error) throw error;

            onUpdateSuccess(data);
            onClose();
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Profil yangilashda xatolik");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (avatarFile) {
                await startUpload([avatarFile]);
            } else {
                await handleProfileUpdate(profile?.avatar_url || "");
            }
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    return (
        <BottomSheet isOpen={true} onClose={onClose} title="Profilni tahrirlash">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 select-none">

                {/* Tabs header */}
                <div className="flex border-b border-slate-100 dark:border-white/5 pb-2 gap-4 shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab('basic')}
                        className={`text-xs font-bold pb-1 cursor-pointer transition-colors ${activeTab === 'basic' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Asosiy ma'lumotlar
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('professional')}
                        className={`text-xs font-bold pb-1 cursor-pointer transition-colors ${activeTab === 'professional' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Portfolio & Teglar
                    </button>
                </div>

                {activeTab === 'basic' ? (
                    <div key="tab-panel-basic" className="space-y-4">
                        <div className="flex flex-col items-center py-2">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="group relative h-20 w-20 cursor-pointer overflow-hidden rounded-full border-2 border-blue-600"
                            >
                                <img
                                    src={
                                        avatarPreview ||
                                        `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.nickname)}`
                                    }
                                    alt="avatar"
                                    className="h-full w-full object-cover transition group-hover:scale-105"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                                    <BsCameraFill className="h-5 w-5 text-white" />
                                </div>
                            </div>
                            <input
                                key="avatar-file-input"
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <span className="mt-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Rasmni almashtirish
                            </span>
                        </div>

                        <div>
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Nickname
                            </label>
                            <input
                                key="input-nickname"
                                type="text"
                                value={formData.nickname}
                                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                                placeholder="Nickname"
                                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 p-3 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Username
                            </label>
                            <input
                                key="input-username"
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                placeholder="Username"
                                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 p-3 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Bio
                            </label>
                            <textarea
                                key="textarea-bio"
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                placeholder="O'zingiz haqingizda qisqacha..."
                                rows={3}
                                className="w-full resize-none rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 p-3 text-xs font-semibold text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 transition-all focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none"
                            />
                        </div>
                    </div>
                ) : (
                    <div key="tab-panel-professional" className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10">
                            <div>
                                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-none">Portfolio rejimini yoqish</h4>
                                <p className="text-[10px] text-slate-400 mt-1 font-semibold">Profilingiz professional/hobbiy ko'rinishga ega bo'ladi</p>
                            </div>
                            <input
                                key="checkbox-professional-mode"
                                type="checkbox"
                                checked={formData.is_professional_mode}
                                onChange={(e) => setFormData({ ...formData, is_professional_mode: e.target.checked })}
                                className="w-4 h-4 text-blue-600 bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-white/15 rounded-md focus:ring-blue-500 cursor-pointer"
                            />
                        </div>

                        {formData.is_professional_mode && (
                            <>
                                <div>
                                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Sohangiz / Sarlavha (Headline)
                                    </label>
                                    <input
                                        key="input-headline"
                                        type="text"
                                        value={formData.headline}
                                        onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                                        placeholder="Masalan: Dizayner / Dasturchi / Futbol ishqibozi"
                                        className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 p-3 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Teglar / Qiziqishlar (Vergul bilan ajrating)
                                    </label>
                                    <input
                                        key="input-tags"
                                        type="text"
                                        value={formData.tags}
                                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                        placeholder="React, Dizayn, Futbol, Sayohat"
                                        className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 p-3 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Tajriba va Loyihalar haqida ma'lumot
                                    </label>
                                    <textarea
                                        key="textarea-experience"
                                        value={formData.experience_info}
                                        onChange={(e) => setFormData({ ...formData, experience_info: e.target.value })}
                                        placeholder="Loyihalaringiz, yutuqlaringiz va tajribangiz haqida batafsil..."
                                        rows={3}
                                        className="w-full resize-none rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 p-3 text-xs font-semibold text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 transition-all focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none"
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-none">Hamkorlikka ochiqlik</h4>
                                        <p className="text-[10px] text-slate-400 mt-1 font-semibold">Explore qidiruvida 'Hamkorlar' ro'yxatida chiqasiz</p>
                                    </div>
                                    <input
                                        key="checkbox-collab"
                                        type="checkbox"
                                        checked={formData.open_for_collab}
                                        onChange={(e) => setFormData({ ...formData, open_for_collab: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-white/15 rounded-md focus:ring-blue-500 cursor-pointer"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Aloqa havolalari (Ixtiyoriy)</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            key="input-telegram"
                                            type="text"
                                            value={formData.telegram}
                                            onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                                            placeholder="Telegram Username"
                                            className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 p-3 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none"
                                        />
                                        <input
                                            key="input-github"
                                            type="text"
                                            value={formData.github}
                                            onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                                            placeholder="GitHub Username"
                                            className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 p-3 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none"
                                        />
                                    </div>
                                    <input
                                        key="input-website"
                                        type="text"
                                        value={formData.website}
                                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                        placeholder="Shaxsiy sayt (https://website.uz)"
                                        className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 p-3 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )}

                <div className="mt-2 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 py-3.5 text-xs font-bold transition-all active:scale-95 cursor-pointer border border-transparent dark:border-white/5"
                    >
                        Bekor qilish
                    </button>
                    <button
                        type="submit"
                        disabled={loading || isUploading}
                        className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-3.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-70 cursor-pointer"
                    >
                        {loading || isUploading ? "Saqlanmoqda..." : "Saqlash"}
                    </button>
                </div>
            </form>
        </BottomSheet>
    );
};


interface ProfilePageProps {
    userId?: string
}

export default function ProfilePage({ userId: viewedUserId }: ProfilePageProps) {
    const [profile, setProfile] = useState<any>(null)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState('posts')
    const [isEditing, setIsEditing] = useState(false)
    const [isOptionsOpen, setIsOptionsOpen] = useState(false)
    const [loading, setLoading] = useState(true)

    const [isFollowing, setIsFollowing] = useState(false)
    const [followLoading, setFollowLoading] = useState(false)
    const [messageLoading, setMessageLoading] = useState(false)

    const [stats, setStats] = useState([
        { label: "Followers", count: 0 },
        { label: "Following", count: 0 },
        { label: "Posts", count: 0 },
        { label: "Reels", count: 0 }
    ])
    const [posts, setPosts] = useState<any[]>([])
    const [reels, setReels] = useState<any[]>([])
    const [listings, setListings] = useState<any[]>([])
    const [followersList, setFollowersList] = useState<any[]>([])
    const [followingList, setFollowingList] = useState<any[]>([])

    const paneContainerRef = useRef<HTMLDivElement>(null)
    const isProgrammaticScroll = useRef(false)

    const supabase = createClient()
    const router = useRouter()

    const isOwnProfile = !viewedUserId || viewedUserId === currentUserId

    const fetchProfileData = useCallback(async () => {
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            setCurrentUserId(user.id)

            const targetUserId = viewedUserId || user.id

            // 1. Profil ma'lumotlarini olish
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', targetUserId)
                .single()

            setProfile(profileData)

            // 2. Obunachilar soni
            const { count: followersCount } = await supabase
                .from('follows')
                .select('*', { count: 'exact', head: true })
                .eq('following_id', targetUserId)

            // 3. Obunalar soni
            const { count: followingCount } = await supabase
                .from('follows')
                .select('*', { count: 'exact', head: true })
                .eq('follower_id', targetUserId)

            // 4. Postlarni olish
            const { data: postsData } = await supabase
                .from('posts')
                .select('*')
                .eq('user_id', targetUserId)
                .order('created_at', { ascending: false })

            // 5. Reellarni olish
            const { data: reelsData } = await supabase
                .from('reels')
                .select('*')
                .eq('user_id', targetUserId)
                .order('created_at', { ascending: false })

            // 6. E'lonlarni olish
            const { data: listingsData } = await supabase
                .from('listings')
                .select('*')
                .eq('user_id', targetUserId)
                .order('created_at', { ascending: false })

            // 7. Obunachilar ro'yxati
            const { data: followersRes } = await supabase
                .from('follows')
                .select('follower:profiles!follower_id(id, username, nickname, avatar_url)')
                .eq('following_id', targetUserId)

            // 8. Obunalar ro'yxati
            const { data: followingRes } = await supabase
                .from('follows')
                .select('following:profiles!following_id(id, username, nickname, avatar_url)')
                .eq('follower_id', targetUserId)

            setPosts(postsData || [])
            setReels(reelsData || [])
            setListings(listingsData || [])
            setFollowersList(followersRes?.map((f: any) => f.follower).filter(Boolean) || [])
            setFollowingList(followingRes?.map((f: any) => f.following).filter(Boolean) || [])

            setStats([
                { label: "Followers", count: followersCount || 0 },
                { label: "Following", count: followingCount || 0 },
                { label: "Posts", count: (postsData || []).length },
                { label: "Reels", count: (reelsData || []).length }
            ])

            if (targetUserId !== user.id) {
                const { data: followRow } = await supabase
                    .from('follows')
                    .select('id')
                    .eq('follower_id', user.id)
                    .eq('following_id', targetUserId)
                    .maybeSingle()
                setIsFollowing(!!followRow)
            } else {
                setIsFollowing(false)
            }
        } catch (error) {
            console.error('[Profil] Ma\'lumotlarni yuklashda xato:', error)
        } finally {
            setLoading(false)
        }
    }, [viewedUserId, supabase])

    useEffect(() => {
        fetchProfileData()
    }, [fetchProfileData])

    const isDraggingMouse = useRef(false)
    const dragStart = useRef({ x: 0, time: 0 })
    const scrollLeftStart = useRef(0)
    const hasDragged = useRef(false)

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        const container = paneContainerRef.current
        if (!container) return
        isDraggingMouse.current = true
        dragStart.current = { x: e.clientX, time: Date.now() }
        scrollLeftStart.current = container.scrollLeft
        hasDragged.current = false
        container.style.userSelect = 'none'
        container.style.scrollSnapType = 'none'
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDraggingMouse.current) return
        const container = paneContainerRef.current
        if (!container) return
        const deltaX = e.clientX - dragStart.current.x
        if (Math.abs(deltaX) > 5) {
            hasDragged.current = true
        }
        container.scrollLeft = scrollLeftStart.current - deltaX
    }

    const handleMouseUpOrLeave = () => {
        if (!isDraggingMouse.current) return
        isDraggingMouse.current = false
        const container = paneContainerRef.current
        if (!container) return
        container.style.userSelect = ''
        container.style.scrollSnapType = 'x mandatory'

        const width = container.clientWidth
        if (width > 0) {
            const index = Math.round(container.scrollLeft / width)
            container.scrollTo({
                left: index * width,
                behavior: 'smooth'
            })
            const tabIds = ['posts', 'reels', 'followers', 'following']
            if (tabIds[index]) {
                setActiveTab(tabIds[index])
            }
        }
    }

    const handleClickCapture = (e: React.MouseEvent) => {
        if (hasDragged.current) {
            e.stopPropagation()
            e.preventDefault()
        }
    }

    const handlePaneScroll = useCallback(() => {
        if (isProgrammaticScroll.current) return
        const container = paneContainerRef.current
        if (!container) return
        const scrollLeft = container.scrollLeft
        const width = container.clientWidth
        if (width === 0) return
        const index = Math.round(scrollLeft / width)
        const tabIds = ['posts', 'reels', 'followers', 'following']
        if (tabIds[index] && tabIds[index] !== activeTab) {
            setActiveTab(tabIds[index])
        }
    }, [activeTab])

    const selectTab = useCallback((tabId: string) => {
        if (tabId === 'listings') return
        setActiveTab(tabId)
        const container = paneContainerRef.current
        if (!container) return
        const tabIds = ['posts', 'reels', 'followers', 'following']
        const index = tabIds.indexOf(tabId)
        if (index !== -1) {
            isProgrammaticScroll.current = true
            container.scrollTo({
                left: index * container.clientWidth,
                behavior: 'smooth'
            })
            setTimeout(() => {
                isProgrammaticScroll.current = false
            }, 350)
        }
    }, [])

    useEffect(() => {
        const container = paneContainerRef.current
        if (!container) return
        container.addEventListener('scroll', handlePaneScroll)
        return () => container.removeEventListener('scroll', handlePaneScroll)
    }, [handlePaneScroll, loading])

    const handleFollowToggle = async () => {
        if (!profile || !currentUserId || followLoading) return

        const nextFollowing = !isFollowing
        setFollowLoading(true)
        setIsFollowing(nextFollowing)
        setStats(prev => prev.map(s => s.label === 'Followers'
            ? { ...s, count: nextFollowing ? Number(s.count) + 1 : Number(s.count) - 1 }
            : s
        ))

        try {
            if (nextFollowing) {
                const { error } = await supabase
                    .from('follows')
                    .insert([{ follower_id: currentUserId, following_id: profile.id }])
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('follows')
                    .delete()
                    .eq('follower_id', currentUserId)
                    .eq('following_id', profile.id)
                if (error) throw error
            }
        } catch (err) {
            console.error('[Profil] Obuna xatoligi:', err)
            setIsFollowing(!nextFollowing)
            setStats(prev => prev.map(s => s.label === 'Followers'
                ? { ...s, count: nextFollowing ? Number(s.count) - 1 : Number(s.count) + 1 }
                : s
            ))
        } finally {
            setFollowLoading(false)
        }
    }

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

    if (loading) return <ProfileSkeleton />

    if (!profile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
                <p className="text-sm font-bold text-slate-500">Bu foydalanuvchi topilmadi</p>
            </div>
        )
    }

    return (
        <div className="pb-20 text-slate-800 dark:text-slate-200">
            {isEditing && isOwnProfile && (
                <EditProfileModal
                    profile={profile}
                    onClose={() => setIsEditing(false)}
                    onUpdateSuccess={(newData) => {
                        setProfile(newData)
                        router.refresh()
                        fetchProfileData()
                    }}
                />
            )}

            {/* Mesh Gradient Cover (Seamless Blend) */}
            <div className="relative h-32 sm:h-44 w-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 animate-mesh-gradient overflow-hidden sm:rounded-b-2xl">
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
                                src={get(profile, 'avatar_url') || 'https://ui-avatars.com/api/?name=' + get(profile, 'nickname', 'U') + '&background=e2e8f0&color=1e293b'}
                                alt={get(profile, 'nickname')}
                                className="w-full h-full object-cover rounded-full"
                            />
                        </div>
                    </div>
                </div>

                {/* Nickname, Username and Verify Badge */}
                <div className="mb-2 flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <h2 className="font-black text-sm sm:text-xl text-slate-900 dark:text-slate-100 leading-tight truncate">
                            {get(profile, 'nickname', 'Foydalanuvchi')}
                        </h2>
                        {profile?.is_premium && (
                            <HiMiniCheckBadge className="w-5 h-5 text-blue-500 dark:text-blue-400 shrink-0" title="Tasdiqlangan PRO hisob" />
                        )}
                    </div>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5 truncate">
                        @{get(profile, 'username', 'username_kiritilmagan')}
                    </p>
                </div>
            </div>

            {/* Profile Fields (Headline, Bio, and Social links below) */}
            <div className="px-4 mt-3 sm:px-6 flex flex-col gap-2 select-none text-left">
                {profile?.is_professional_mode && profile?.headline && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-full text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-350 w-fit mt-1 shadow-xs">
                        <FaBriefcase className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="uppercase tracking-wider">{profile.headline}</span>
                    </div>
                )}

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed font-medium mt-1">
                    {get(profile, 'bio', 'Bu yerda bio ma\'lumoti chiqadi. Edit tugmasi orqali o\'zgartiring.')}
                </p>

                {/* Links & Collaboration Status (Outline Circles!) */}
                {((profile?.contact_links && Object.values(profile.contact_links).some(Boolean)) || profile?.open_for_collab) && (
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
                {stats.map((stat, idx) => {
                    const tabMap: Record<string, string> = {
                        'Followers': 'followers',
                        'Following': 'following',
                        'Posts': 'posts',
                        'Reels': 'reels'
                    }
                    const tabId = tabMap[stat.label]
                    return (
                        <React.Fragment key={idx}>
                            {idx > 0 && <div className="w-px h-5 bg-slate-200 dark:bg-white/10 shrink-0" />}
                            <div
                                onClick={() => tabId && selectTab(tabId)}
                                className="flex flex-col items-center justify-center flex-1 cursor-pointer hover:opacity-80 active:scale-95 transition-all"
                            >
                                <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                                    {stat.count}
                                </span>
                                <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider mt-1.5">
                                    {stat.label}
                                </span>
                            </div>
                        </React.Fragment>
                    )
                })}
            </div>

            {/* Profile Action Buttons */}
            <div className="mx-4 mt-4 flex gap-2 select-none">
                {isOwnProfile ? (
                    <>
                        <button onClick={() => setIsEditing(true)} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl active:scale-[0.99] transition-all cursor-pointer">
                            Edit Profile
                        </button>

                        {profile?.is_premium ? (
                            <button
                                disabled
                                className="flex-1 py-3 bg-slate-50 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-white/5 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                            >
                                <HiMiniCheckBadge className="w-4 h-4 text-blue-500" /> PRO Faol
                            </button>
                        ) : (
                            <button
                                onClick={() => router.push('/dashboard/pricing')}
                                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs rounded-xl active:scale-[0.99] transition-all cursor-pointer shadow-sm shadow-blue-500/10"
                            >
                                Upgrade to PRO
                            </button>
                        )}

                        <button
                            onClick={() => setIsOptionsOpen(true)}
                            className="px-4 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer border border-transparent dark:border-white/5 font-bold text-sm tracking-widest"
                        >
                            •••
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={handleFollowToggle}
                            disabled={followLoading}
                            className={`flex-1 py-3 font-bold text-xs rounded-xl active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer ${isFollowing ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700' : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                        >
                            {isFollowing ? (
                                <><FiUserCheck className="w-3.5 h-3.5" /> Obuna</>
                            ) : (
                                <><FiUserPlus className="w-3.5 h-3.5" /> Obuna bo'lish</>
                            )}
                        </button>
                        <button
                            onClick={handleSendMessage}
                            disabled={messageLoading}
                            className="flex-1 py-3 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-700 font-bold text-xs rounded-xl active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer border border-transparent dark:border-white/5"
                        >
                            <HiOutlineChatBubbleLeftRight className="w-4 h-4" /> {messageLoading ? 'Ochilmoqda...' : 'Xabar'}
                        </button>
                        <button className="px-4 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-700 rounded-xl active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer border border-transparent dark:border-white/5">
                            <HiOutlineShare className="w-4 h-4" />
                        </button>
                    </>
                )}
            </div>

            {/* Options Bottom Sheet */}
            {isOptionsOpen && (
                <BottomSheet isOpen={true} onClose={() => setIsOptionsOpen(false)} title="Qo'shimcha sozlamalar & Portfolio">
                    <div className="flex flex-col gap-4 select-none text-left">
                        {profile?.is_professional_mode && (
                            <>
                                {/* Resume Info */}
                                {profile?.experience_info && (
                                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-white/5">
                                        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                                            <FaBriefcase className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                            Tajriba va Loyihalar
                                        </h4>
                                        <p className="text-xs text-slate-700 dark:text-slate-350 whitespace-pre-line leading-relaxed font-semibold">
                                            {profile.experience_info}
                                        </p>
                                    </div>
                                )}

                                {/* Skills / Tags */}
                                {Array.isArray(profile?.tags) && profile.tags.length > 0 && (
                                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-white/5">
                                        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                                            Ko'nikmalar & Qiziqishlar
                                        </h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {profile.tags.map((tag: string, idx: number) => (
                                                <span key={idx} className="px-2.5 py-1 bg-blue-50/70 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold border border-blue-100/20 dark:border-blue-900/10">
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
                                onClick={() => {
                                    setIsOptionsOpen(false)
                                    router.push('/dashboard/settings')
                                }}
                                className="w-full py-3.5 px-4 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl text-left border border-slate-100 dark:border-white/5 flex items-center justify-between"
                            >
                                <span>Hisob sozlamalari</span>
                                <span className="text-slate-400">›</span>
                            </button>
                            <button
                                onClick={() => {
                                    setIsOptionsOpen(false)
                                    router.push('/dashboard/pricing')
                                }}
                                className="w-full py-3.5 px-4 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl text-left border border-slate-100 dark:border-white/5 flex items-center justify-between"
                            >
                                <span>Tariflar va PRO xususiyatlari</span>
                                <span className="text-slate-400">›</span>
                            </button>
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

            {/* Profile Tab Header */}
            <div className="mt-6 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-slate-950 sticky top-0 z-20 transition-colors">
                <div className="grid grid-cols-5 max-w-lg mx-auto">
                    {[
                        { id: 'posts', label: `Postlar (${posts.length})`, Icon: HiMiniSquares2X2 },
                        { id: 'reels', label: `Reellar (${reels.length})`, Icon: BsFilm },
                        { id: 'listings', label: "E'lonlar (Soon)", Icon: HiOutlineShoppingBag, disabled: true },
                        { id: 'followers', label: `Obunachilar (${followersList.length})`, Icon: FiUserPlus },
                        { id: 'following', label: `Obunalar (${followingList.length})`, Icon: FiUserCheck },
                    ].map((tab) => {
                        const isSelected = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => !tab.disabled && selectTab(tab.id)}
                                disabled={tab.disabled}
                                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[9px] sm:text-xs font-bold transition-all border-b-2 ${tab.disabled
                                    ? 'border-transparent text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'
                                    : isSelected
                                        ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 cursor-pointer'
                                        : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer'
                                    }`}
                            >
                                <tab.Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="truncate max-w-[50px] sm:max-w-none">{tab.label}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Slidable Tab Contents */}
            <div
                ref={paneContainerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                onClickCapture={handleClickCapture}
                className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none w-full cursor-grab active:cursor-grabbing"
                style={{ scrollbarWidth: 'none' }}
            >
                {/* Posts Pane */}
                <div className="w-full shrink-0 snap-start p-4 max-w-2xl mx-auto">
                    {posts.length > 0 ? (
                        <div className="space-y-6 text-left">
                            {posts.map((post) => {
                                const postTitle = post.content.trim().slice(0, 45) + (post.content.trim().length > 45 ? '...' : '')
                                const postDate = new Date(post.created_at).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })

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

                {/* Reels Pane */}
                <div className="w-full shrink-0 snap-start p-4 max-w-md mx-auto sm:max-w-none">
                    {reels.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 auto-rows-[160px] sm:auto-rows-[240px]">
                            {reels.map((reel) => (
                                <div key={reel.id} className="relative rounded-xl overflow-hidden bg-black group cursor-pointer col-span-1 row-span-1 border border-white/5">
                                    <video
                                        src={reel.video_key && reel.video_key.startsWith('http') ? reel.video_key : `/api/videos?key=${reel.video_key}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        muted
                                        playsInline
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4 text-white text-xs font-bold">
                                        <span className="flex items-center gap-1"><BsFilm className="w-3.5 h-3.5" /> {reel.views_count || 0}</span>
                                    </div>
                                    <div className="absolute bottom-2 left-2 right-2 bg-black/30 backdrop-blur-xs px-1.5 py-0.5 rounded text-[8px] text-white font-bold truncate pointer-events-none border border-white/5">
                                        {reel.title || 'Reel'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs font-medium bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-white/5 transition-colors">
                            Hozircha Reels yuklanmagan
                        </div>
                    )}
                </div>

                {/* Followers Pane */}
                <div className="w-full shrink-0 snap-start p-4 max-w-md mx-auto sm:max-w-none">
                    {followersList.length > 0 ? (
                        <div className="space-y-2.5">
                            {followersList.map((usr) => (
                                <div
                                    key={usr.id}
                                    onClick={() => router.push(`/dashboard/profile/${usr.id}`)}
                                    className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={usr.avatar_url || 'https://ui-avatars.com/api/?name=' + usr.nickname + '&background=e2e8f0&color=1e293b'}
                                            className="w-9 h-9 object-cover rounded-full"
                                            alt=""
                                        />
                                        <div className="text-left">
                                            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-none">{usr.nickname}</h4>
                                            <span className="text-[10px] text-slate-400 font-medium mt-1 inline-block">@{usr.username}</span>
                                        </div>
                                    </div>
                                    <button className="px-3.5 py-1.5 bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-lg border border-transparent dark:border-white/5">
                                        Ko'rish
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs font-medium bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-white/5 transition-colors">
                            Obunachilar mavjud emas
                        </div>
                    )}
                </div>

                {/* Following Pane */}
                <div className="w-full shrink-0 snap-start p-4 max-w-md mx-auto sm:max-w-none">
                    {followingList.length > 0 ? (
                        <div className="space-y-2.5">
                            {followingList.map((usr) => (
                                <div
                                    key={usr.id}
                                    onClick={() => router.push(`/dashboard/profile/${usr.id}`)}
                                    className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={usr.avatar_url || 'https://ui-avatars.com/api/?name=' + usr.nickname + '&background=e2e8f0&color=1e293b'}
                                            className="w-9 h-9 object-cover rounded-full"
                                            alt=""
                                        />
                                        <div className="text-left">
                                            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-none">{usr.nickname}</h4>
                                            <span className="text-[10px] text-slate-400 font-medium mt-1 inline-block">@{usr.username}</span>
                                        </div>
                                    </div>
                                    <button className="px-3.5 py-1.5 bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-lg border border-transparent dark:border-white/5">
                                        Ko'rish
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs font-medium bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-white/5 transition-colors">
                            Hozircha hech kimga obuna bo'linmagan
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}