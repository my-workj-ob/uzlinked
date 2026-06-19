"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { get } from 'lodash'
import { createClient } from '@/utils/supabase/client'
import { HiMiniSquares2X2, HiOutlineShare, HiOutlineChatBubbleLeftRight } from 'react-icons/hi2'
import { BsFilm, BsStar, BsCameraFill } from 'react-icons/bs'
import { FiUserPlus, FiUserCheck } from 'react-icons/fi'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <form 
        onSubmit={handleSubmit} 
        className="relative w-full max-w-sm rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-8"
      >
        <h3 className="mb-4 text-center text-xl font-black text-slate-900">
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
          <span className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Rasmni almashtirish
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 ml-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Nickname
            </label>
            <input
              type="text"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              placeholder="Nickname"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-semibold text-slate-900 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 ml-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Username"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-semibold text-slate-900 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 ml-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="O'zingiz haqingizda qisqacha..."
              className="min-h-[90px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-medium text-slate-700 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-100 py-3.5 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200 active:scale-95"
          >
            Bekor qilish
          </button>

          <button
            type="submit"
            disabled={loading || isUploading}
            className="flex-1 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-70"
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

            setPosts(postsData || [])
            setReels(reelsData || [])
            setListings(listingsData || [])

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
        <div className="pb-20">
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

            <div className="relative h-32 sm:h-44 w-full bg-gradient-to-r from-blue-600 to-indigo-700 overflow-hidden sm:rounded-b-2xl">
                <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop" alt="banner" className="w-full h-full object-cover opacity-60 blend-multiply" />
            </div>

            <div className="px-4 -mt-12 relative z-10 text-center sm:text-left sm:flex sm:items-end sm:gap-6 sm:px-6">
                <div className="relative inline-block">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 p-[3px] mx-auto">
                        <div className="w-full h-full bg-white rounded-full p-[3px]">
                            <img
                                src={get(profile, 'avatar_url') || 'https://ui-avatars.com/api/?name=' + get(profile, 'nickname', 'U') + '&background=e2e8f0&color=1e293b'}
                                alt={get(profile, 'nickname')}
                                className="w-full h-full object-cover rounded-full"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-3 sm:mt-0 sm:mb-2 flex-1">
                    <h2 className="font-black text-xl text-slate-900 leading-tight">
                        {get(profile, 'nickname', 'Foydalanuvchi')}
                    </h2>
                    <p className="text-xs font-semibold text-blue-600 mt-0.5">
                        @{get(profile, 'username', 'username_kiritilmagan')}
                    </p>
                </div>
            </div>

            <div className="px-4 mt-3 text-center sm:text-left sm:px-6">
                <p className="text-xs sm:text-sm text-slate-600 max-w-lg leading-relaxed font-medium">
                    {get(profile, 'bio', 'Bu yerda bio ma\'lumoti chiqadi. Edit tugmasi orqali o\'zgartiring.')}
                </p>
            </div>

            <div className="mx-4 mt-5 bg-white border border-slate-100 rounded-2xl p-4 grid grid-cols-4 gap-2 text-center">
                {stats.map((stat, idx) => (
                    <div key={idx} className="flex flex-col items-center justify-center">
                        <span className="text-base font-black tracking-tight text-slate-900">
                            {stat.count}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            {stat.label}
                        </span>
                    </div>
                ))}
            </div>

            <div className="mx-4 mt-4 flex gap-2">
                {isOwnProfile ? (
                    <>
                        <button onClick={() => setIsEditing(true)} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl active:scale-[0.99] transition-all">
                            Edit Profile
                        </button>
                        <button className="px-4 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl active:scale-[0.99] transition-all flex items-center justify-center">
                            <HiOutlineShare className="w-4 h-4" />
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={handleFollowToggle}
                            disabled={followLoading}
                            className={`flex-1 py-3 font-bold text-xs rounded-xl active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 ${isFollowing ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-blue-600 hover:bg-blue-700 text-white'
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
                            className="flex-1 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs rounded-xl active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
                        >
                            <HiOutlineChatBubbleLeftRight className="w-4 h-4" /> {messageLoading ? 'Ochilmoqda...' : 'Xabar'}
                        </button>
                        <button className="px-4 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl active:scale-[0.99] transition-all flex items-center justify-center">
                            <HiOutlineShare className="w-4 h-4" />
                        </button>
                    </>
                )}
            </div>

            <div className="mt-6 border-b border-slate-200 bg-white sticky top-0 z-20">
                <div className="grid grid-cols-3 max-w-md mx-auto">
                    {[
                        { id: 'posts', label: 'Posts', Icon: HiMiniSquares2X2 },
                        { id: 'reels', label: 'Reels', Icon: BsFilm },
                        { id: 'market', label: 'E\'lonlar (Soon)', Icon: BsStar, disabled: true },
                    ].map((tab) => {
                        const isSelected = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                disabled={tab.disabled}
                                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                                className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-3 text-xs font-bold transition-all border-b-2 ${tab.disabled ? 'opacity-50 cursor-not-allowed text-slate-300 border-transparent' :
                                        isSelected ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                <tab.Icon className="w-4 h-4" />
                                <span>{tab.label}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="p-4 max-w-md mx-auto sm:max-w-none">
                {activeTab === 'posts' && (
                    posts.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 auto-rows-[110px] sm:auto-rows-[160px]">
                            {posts.map((post) => (
                                <div key={post.id} className="relative rounded-xl overflow-hidden bg-slate-100 group cursor-pointer border border-slate-200/20 col-span-1 row-span-1">
                                    {post.image_key ? (
                                        <img
                                            src={`/api/images?key=${post.image_key}`}
                                            alt="Grid post"
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center p-3 bg-gradient-to-br from-slate-50 to-blue-50">
                                            <p className="text-[10px] text-slate-600 font-bold text-center line-clamp-3 leading-snug">{post.content}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-400 text-xs font-medium bg-white rounded-2xl border border-dashed border-slate-200">
                            Hozircha postlar yo'q
                        </div>
                    )
                )}

                {activeTab === 'reels' && (
                    reels.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 auto-rows-[160px] sm:auto-rows-[240px]">
                            {reels.map((reel) => (
                                <div key={reel.id} className="relative rounded-xl overflow-hidden bg-black group cursor-pointer col-span-1 row-span-1">
                                    <video
                                        src={`/api/videos?key=${reel.video_key}`}
                                        className="w-full h-full object-cover"
                                        muted
                                        playsInline
                                    />
                                    <div className="absolute inset-0 bg-black/20 flex flex-col justify-end p-2">
                                        <p className="text-white text-[10px] font-bold truncate">{reel.title || 'Reel'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-400 text-xs font-medium bg-white rounded-2xl border border-dashed border-slate-200">
                            Hozircha Reels yuklanmagan
                        </div>
                    )
                )}

                {activeTab === 'market' && (
                    listings.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {listings.map((item) => (
                                <div key={item.id} className="bg-white border border-slate-100 rounded-xl overflow-hidden flex flex-col">
                                    <div className="aspect-4/3 w-full bg-slate-50 relative">
                                        {item.image_key ? (
                                            <img
                                                src={`/api/images?key=${item.image_key}`}
                                                alt={item.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-100">
                                                <span className="text-[10px] text-slate-400 font-bold">Rasm yo'q</span>
                                            </div>
                                        )}
                                        <span className="absolute top-2 left-2 bg-white/95 backdrop-blur-md text-slate-800 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-100/10">
                                            {item.price}
                                        </span>
                                    </div>
                                    <div className="p-2.5 flex-1 flex flex-col justify-between">
                                        <h4 className="font-bold text-[10px] text-slate-800 leading-tight line-clamp-2">{item.title}</h4>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-400 text-xs font-medium bg-white rounded-2xl border border-dashed border-slate-200">
                            Eksklyuziv e'lonlar mavjud emas
                        </div>
                    )
                )}
            </div>
        </div>
    )
}