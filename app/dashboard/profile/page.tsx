"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { get } from 'lodash'
import { createClient } from '@/utils/supabase/client'
import { HiMiniSquares2X2, HiOutlineShare, HiOutlineChatBubbleLeftRight, HiOutlineShoppingBag } from 'react-icons/hi2'
import { BsFilm, BsStar, BsCameraFill } from 'react-icons/bs'
import { FiUserPlus, FiUserCheck } from 'react-icons/fi'
import { FaHeart } from 'react-icons/fa'
import { useRouter } from 'next/navigation'
import { useUploadThing } from '@/utils/uploadthing/uploadthing';

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

  const [avatarPreview, setAvatarPreview] = useState<string>(
    profile?.avatar_url || ""
  );

  const [formData, setFormData] = useState({
    nickname: profile?.nickname || "",
    username: profile?.username || "",
    bio: profile?.bio || "",
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
      const updatedFields = {
        nickname: formData.nickname,
        username: formData.username,
        bio: formData.bio,
        avatar_url: avatarUrl,
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
    <div className="fixed inset-0 z-55 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <form 
        onSubmit={handleSubmit} 
        className="relative w-full max-w-sm rounded-[2rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 p-6 sm:p-8"
      >
        <h3 className="mb-4 text-center text-xl font-black text-slate-900 dark:text-slate-100">
          Profilni tahrirlash
        </h3>

        <div className="mb-6 flex flex-col items-center">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="group relative h-24 w-24 cursor-pointer overflow-hidden rounded-full border-2 border-blue-600"
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
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <span className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Rasmni almashtirish
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 ml-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Nickname
            </label>
            <input
              type="text"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              placeholder="Nickname"
              className="w-full rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950 p-3.5 text-sm font-semibold text-slate-900 dark:text-slate-100 transition-all focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 ml-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Username"
              className="w-full rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950 p-3.5 text-sm font-semibold text-slate-900 dark:text-slate-100 transition-all focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 ml-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="O'zingiz haqingizda qisqacha..."
              className="min-h-[90px] w-full resize-none rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950 p-3.5 text-sm font-medium text-slate-700 dark:text-slate-300 transition-all focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 py-3.5 text-sm font-bold transition-all active:scale-95 cursor-pointer"
          >
            Bekor qilish
          </button>

          <button
            type="submit"
            disabled={loading || isUploading}
            className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-3.5 text-sm font-bold transition-all active:scale-95 disabled:opacity-70 cursor-pointer"
          >
            {loading || isUploading ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </form>
    </div>
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
            setFollowersList(followersRes?.map(f => f.follower).filter(Boolean) || [])
            setFollowingList(followingRes?.map(f => f.following).filter(Boolean) || [])

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

    if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 font-medium text-xs">Yuklanmoqda...</div>

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

            {/* Mesh Gradient Cover (Shadowless!) */}
            <div className="relative h-32 sm:h-44 w-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 animate-mesh-gradient overflow-hidden sm:rounded-b-2xl border-b border-slate-100 dark:border-white/5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(0,0,0,0.15),transparent_50%)] mix-blend-overlay" />
            </div>

            <div className="px-4 -mt-12 relative z-10 text-center sm:text-left sm:flex sm:items-end sm:gap-6 sm:px-6">
                <div className="relative inline-block">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 p-[3px] mx-auto">
                        <div className="w-full h-full bg-white dark:bg-slate-950 rounded-full p-[3px]">
                            <img
                                src={get(profile, 'avatar_url') || 'https://ui-avatars.com/api/?name=' + get(profile, 'nickname', 'U') + '&background=e2e8f0&color=1e293b'}
                                alt={get(profile, 'nickname')}
                                className="w-full h-full object-cover rounded-full"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-3 sm:mt-0 sm:mb-2 flex-1">
                    <h2 className="font-black text-xl text-slate-900 dark:text-slate-100 leading-tight">
                        {get(profile, 'nickname', 'Foydalanuvchi')}
                    </h2>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                        @{get(profile, 'username', 'username_kiritilmagan')}
                    </p>
                </div>
            </div>

            <div className="px-4 mt-3 text-center sm:text-left sm:px-6">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed font-medium">
                    {get(profile, 'bio', 'Bu yerda bio ma\'lumoti chiqadi. Edit tugmasi orqali o\'zgartiring.')}
                </p>
            </div>

            {/* Stats Block (Premium Borderless) */}
            <div className="mx-4 mt-6 py-4 flex items-center justify-around text-center select-none bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-white/5 rounded-2xl">
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
                            {idx > 0 && <div className="w-px h-6 bg-slate-200/60 dark:bg-white/10 shrink-0" />}
                            <div 
                                onClick={() => tabId && selectTab(tabId)}
                                className="flex flex-col items-center justify-center flex-1 cursor-pointer hover:opacity-80 active:scale-95 transition-all"
                            >
                                <span className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                                    {stat.count}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider mt-1.5">
                                    {stat.label}
                                </span>
                            </div>
                        </React.Fragment>
                    )
                })}
            </div>

            {/* Profile Action Buttons */}
            <div className="mx-4 mt-4 flex gap-2">
                {isOwnProfile ? (
                    <>
                        <button onClick={() => setIsEditing(true)} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl active:scale-[0.99] transition-all cursor-pointer">
                            Edit Profile
                        </button>
                        <button onClick={() => router.push('/dashboard/settings')} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 font-bold text-xs rounded-xl active:scale-[0.99] transition-all cursor-pointer border border-transparent dark:border-white/5">
                            Hisob sozlamalari
                        </button>
                        <button className="px-4 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-700/85 rounded-xl active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer border border-transparent dark:border-white/5">
                            <HiOutlineShare className="w-4 h-4" />
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
                            className="flex-1 py-3 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-750 font-bold text-xs rounded-xl active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer border border-transparent dark:border-white/5"
                        >
                            <HiOutlineChatBubbleLeftRight className="w-4 h-4" /> {messageLoading ? 'Ochilmoqda...' : 'Xabar'}
                        </button>
                        <button className="px-4 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-750 rounded-xl active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer border border-transparent dark:border-white/5">
                            <HiOutlineShare className="w-4 h-4" />
                        </button>
                    </>
                )}
            </div>

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
                                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[9px] sm:text-xs font-bold transition-all border-b-2 ${
                                        tab.disabled
                                            ? 'border-transparent text-slate-350 dark:text-slate-700 cursor-not-allowed opacity-50'
                                            : isSelected 
                                                ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 cursor-pointer' 
                                                : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-350 cursor-pointer'
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
                                    <button className="px-3.5 py-1.5 bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-750 text-blue-600 dark:text-blue-450 text-[10px] font-bold rounded-lg border border-transparent dark:border-white/5">
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
                                    <button className="px-3.5 py-1.5 bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-750 text-blue-600 dark:text-blue-450 text-[10px] font-bold rounded-lg border border-transparent dark:border-white/5">
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