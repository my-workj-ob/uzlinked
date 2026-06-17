"use client"

import React, { useState, useEffect, useRef } from 'react'
import { get } from 'lodash'
import { createClient } from '@/utils/supabase/client'
import { HiMiniSquares2X2, HiOutlineShare } from 'react-icons/hi2'
import { BsFilm, BsStar, BsCameraFill } from 'react-icons/bs'
import { useRouter } from 'next/navigation'

const MOCK_STATS = [
    { label: "Followers", count: "12.5k" },
    { label: "Following", count: "842" },
    { label: "Posts", count: "156" },
    { label: "Earnings", count: "$4.2k", isEarnings: true }
]

const profilePosts = [
    { id: 1, type: "image", src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500&auto=format&fit=crop", gridClass: "col-span-2 row-span-2" },
    { id: 2, type: "image", src: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&auto=format&fit=crop", gridClass: "col-span-1 row-span-1" },
    { id: 3, type: "image", src: "https://images.unsplash.com/photo-1504198453319-5ce911bafcde?w=400&auto=format&fit=crop", gridClass: "col-span-1 row-span-1" },
    { id: 4, type: "promoted", gridClass: "col-span-3" },
    { id: 5, type: "image", src: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop", gridClass: "col-span-1 row-span-1" },
]

interface EditProfileModalProps {
    profile: any
    onClose: () => void
    onUpdateSuccess: (updatedData: any) => void
}

function EditProfileModal({ profile, onClose, onUpdateSuccess }: EditProfileModalProps) {
    const [loading, setLoading] = useState(false)
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [avatarPreview, setAvatarPreview] = useState(`${window.location.origin}${get(profile, 'avatar_url', '')}`)
    const fileInputRef = useRef<HTMLInputElement>(null)
    
    const [formData, setFormData] = useState({
        nickname: get(profile, 'nickname', ''),
        username: get(profile, 'username', ''),
        bio: get(profile, 'bio', '')
    })
    
    const supabase = createClient()

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setAvatarFile(file)
            setAvatarPreview(URL.createObjectURL(file))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        
        try {
            let finalAvatarUrl = get(profile, 'avatar_url', '')

            // 1. Agar yangi rasm tanlangan bo'lsa, uni Backblaze API ga yuklaymiz
            if (avatarFile) {
                const uploadFormData = new FormData()
                uploadFormData.append('file', avatarFile)

                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: uploadFormData
                })

                const uploadData = await uploadRes.json()
                
                if (uploadData.url) {
                    // Bu yerga biz yozgan proxy URL keladi: /api/images?key=avatars/...
                    finalAvatarUrl = uploadData.url 
                } else {
                    throw new Error(uploadData.error || 'Rasmni yuklashda xatolik yuz berdi')
                }
            }

            // 2. Supabase bazasidagi ma'lumotlarni yangilash
            const updatedFields = {
                ...formData,
                avatar_url: finalAvatarUrl,
                updated_at: new Date().toISOString()
            }

            const { error } = await supabase
                .from('profiles')
                .update(updatedFields)
                .eq('id', profile.id)

            if (!error) {
                // Ma'lumotlarni darhol interfeysda yangilash uchun callback
                onUpdateSuccess({ ...profile, ...updatedFields })
                onClose()
            } else {
                alert("Supabase Xatolik: " + error.message)
            }
        } catch (err: any) {
            alert(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-[2rem] w-full max-w-sm border border-slate-200 relative">
                <h3 className="text-xl font-black text-slate-900 mb-4 text-center">Profilni tahrirlash</h3>
                
                <div className="flex flex-col items-center mb-6 relative">
                    <div 
                        onClick={() => fileInputRef.current?.click()} 
                        className="w-20 h-20 rounded-full bg-slate-100 relative cursor-pointer group overflow-hidden border-2 border-blue-600"
                    >
                        <img 
                            src={avatarPreview || 'https://ui-avatars.com/api/?name=' + formData.nickname} 
                            alt="Preview" 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <BsCameraFill className="text-white w-5 h-5" />
                        </div>
                    </div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept="image/*" 
                        className="hidden" 
                    />
                    <span className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-wider">Rasmni almashtirish</span>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block ml-1">Nickname</label>
                        <input 
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold text-slate-900 text-sm" 
                            placeholder="Ismingizni kiriting" 
                            value={formData.nickname} 
                            onChange={e => setFormData({...formData, nickname: e.target.value})} 
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block ml-1">Username</label>
                        <input 
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold text-slate-900 text-sm" 
                            placeholder="@username" 
                            value={formData.username} 
                            onChange={e => setFormData({...formData, username: e.target.value})} 
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block ml-1">Bio</label>
                        <textarea 
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700 text-sm min-h-[80px] resize-none" 
                            placeholder="O'zingiz haqingizda qisqacha..." 
                            value={formData.bio} 
                            onChange={e => setFormData({...formData, bio: e.target.value})} 
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button type="button" onClick={onClose} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm rounded-xl transition-all active:scale-95">
                        Bekor qilish
                    </button>
                    <button type="submit" disabled={loading} className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all active:scale-95 disabled:opacity-70">
                        {loading ? "Saqlanmoqda..." : "Saqlash"}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<any>(null)
    const [activeTab, setActiveTab] = useState('posts')
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(true)
    
    // Dynamic content states
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

    const fetchProfileData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // 1. Profil ma'lumotlarini olish
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            setProfile(profileData)

            // 2. Obunachilar (followers) sonini olish
            const { count: followersCount } = await supabase
                .from('follows')
                .select('*', { count: 'exact', head: true })
                .eq('following_id', user.id)

            // 3. Obunalar (following) sonini olish
            const { count: followingCount } = await supabase
                .from('follows')
                .select('*', { count: 'exact', head: true })
                .eq('follower_id', user.id)

            // 4. Postlarni olish
            const { data: postsData } = await supabase
                .from('posts')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            // 5. Reellarni olish
            const { data: reelsData } = await supabase
                .from('reels')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            // 6. E'lonlarni (listings) olish
            const { data: listingsData } = await supabase
                .from('listings')
                .select('*')
                .eq('user_id', user.id)
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
        } catch (error) {
            console.error('Xatolik:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProfileData()
    }, [])

    if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 font-medium text-xs">Yuklanmoqda...</div>

    return (
        <div className="pb-20">
            {isEditing && (
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

            <div className="relative h-32 sm:h-44 w-full bg-linear-to-r from-blue-600 to-indigo-700 overflow-hidden sm:rounded-b-2xl">
                <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop" alt="banner" className="w-full h-full object-cover opacity-60 blend-multiply" />
            </div>

            <div className="px-4 -mt-12 relative z-10 text-center sm:text-left sm:flex sm:items-end sm:gap-6 sm:px-6">
                <div className="relative inline-block">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 p-[3px] mx-auto">
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
                <button onClick={() => setIsEditing(true)} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl active:scale-[0.99] transition-all">
                    Edit Profile
                </button>
                <button className="px-4 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl active:scale-[0.99] transition-all flex items-center justify-center">
                    <HiOutlineShare className="w-4 h-4" />
                </button>
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
                                className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-3 text-xs font-bold transition-all border-b-2 ${
                                    tab.disabled ? 'opacity-50 cursor-not-allowed text-slate-350 border-transparent' :
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