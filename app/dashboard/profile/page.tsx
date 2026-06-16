"use client"

import React, { useState } from 'react'
import DashboardLayout from '../layout'
import { HiOutlineCog6Tooth, HiOutlineBell, HiMiniSquares2X2, HiOutlineShare } from 'react-icons/hi2'
import { BsFilm, BsStar } from 'react-icons/bs'

const userProfile = {
    name: "Alex Rivera",
    username: "@arivera_vibes",
    bio: "Digital Creator & Strategy Consultant. Building the future of the VibeGrid community. 🚀",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop",
    banner: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop", // Desktopdagi chiroyli to'lqinli banner
    stats: [
        { label: "Followers", count: "12.5k" },
        { label: "Following", count: "842" },
        { label: "Posts", count: "156" },
        { label: "Earnings", count: "$4.2k", isEarnings: true }
    ]
}

const profilePosts = [
    { id: 1, type: "image", src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500&auto=format&fit=crop", gridClass: "col-span-2 row-span-2" },
    { id: 2, type: "image", src: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&auto=format&fit=crop", gridClass: "col-span-1 row-span-1" },
    { id: 3, type: "image", src: "https://images.unsplash.com/photo-1504198453319-5ce911bafcde?w=400&auto=format&fit=crop", gridClass: "col-span-1 row-span-1" },
    { id: 4, type: "promoted", gridClass: "col-span-3" },
    { id: 5, type: "image", src: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop", gridClass: "col-span-1 row-span-1" },
    { id: 6, type: "image", src: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&auto=format&fit=crop", gridClass: "col-span-1 row-span-1" },
    { id: 7, type: "image", src: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop", gridClass: "col-span-1 row-span-1" },
]

export default function ProfilePage() {
    const [activeTab, setActiveTab] = useState('posts')

    return (
        <>
            <div className="relative h-32 sm:h-44 w-full bg-linear-to-r from-blue-600 to-indigo-700 overflow-hidden sm:rounded-b-2xl">
                <img src={userProfile.banner} alt="banner" className="w-full h-full object-cover opacity-60 blend-multiply" />
            </div>

            <div className="px-4 -mt-12 relative z-10 text-center sm:text-left sm:flex sm:items-end sm:gap-6 sm:px-6">
                <div className="relative inline-block">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 p-[3px]  mx-auto">
                        <div className="w-full h-full bg-white rounded-full p-[3px]">
                            <img src={userProfile.avatar} alt={userProfile.name} className="w-full h-full object-cover rounded-full" />
                        </div>
                    </div>
                    <span className="absolute bottom-1 right-1 bg-blue-600 text-white p-1.5 rounded-full ring-4 ring-white  cursor-pointer">
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 4c-.46 3.8-3.14 6.94-6.94 7.74V22h-2v-2.26c-3.8-.46-6.94-3.14-7.74-6.94H1V10h2.26c.46-3.8 3.14-6.94 6.94-7.74V0h2v2.26c3.8.46 6.94 3.14 7.74 6.94H23v2h-2.06z" /></svg>
                    </span>
                </div>

                <div className="mt-3 sm:mt-0 sm:mb-2 flex-1">
                    <h2 className="font-black text-xl text-slate-900 leading-tight flex items-center justify-center sm:justify-start gap-1.5">
                        {userProfile.name}
                    </h2>
                    <p className="text-xs font-semibold text-blue-600 mt-0.5">{userProfile.username}</p>
                </div>
            </div>

            <div className="px-4 mt-3 text-center sm:text-left sm:px-6">
                <p className="text-xs sm:text-sm text-slate-600 max-w-lg leading-relaxed font-medium">
                    {userProfile.bio}
                </p>
            </div>

            <div className="mx-4 mt-5 bg-white border border-slate-100 rounded-2xl p-4  grid grid-cols-4 gap-2 text-center">
                {userProfile.stats.map((stat, idx) => (
                    <div key={idx} className="flex flex-col items-center justify-center">
                        <span className={`text-base font-black tracking-tight ${stat.isEarnings ? 'text-[#A33B00]' : 'text-slate-900'}`}>
                            {stat.count}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            {stat.label}
                        </span>
                    </div>
                ))}
            </div>

            <div className="mx-4 mt-4 flex gap-2">
                <button className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/10 active:scale-[0.99] transition-all">
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
                        { id: 'subscriptions', label: 'Subscriptions', Icon: BsStar },
                    ].map((tab) => {
                        const isSelected = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-3 text-xs font-bold transition-all border-b-2 ${isSelected
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'
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
                    <div className="grid grid-cols-3 gap-2 auto-rows-[110px] sm:auto-rows-[160px]">
                        {profilePosts.map((post) => {
                            if (post.type === "image") {
                                return (
                                    <div key={post.id} className={`relative rounded-xl overflow-hidden bg-slate-100 group cursor-pointer border border-slate-200/20  ${post.gridClass}`}>
                                        <img src={post.src} alt="Grid post" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    </div>
                                )
                            }

                            if (post.type === "promoted") {
                                return (
                                    <div key={post.id} className={`bg-[#FDF2EC] border border-orange-100 rounded-xl p-3 flex items-center justify-between  overflow-hidden border-l-4 border-l-[#A33B00] ${post.gridClass}`}>
                                        <div className="flex-1 pr-2">
                                            <span className="bg-[#A33B00]/10 text-[#A33B00] font-black text-[8px] tracking-wider px-1.5 py-0.5 rounded uppercase">
                                                PROMOTED
                                            </span>
                                            <h4 className="font-black text-xs text-slate-900 mt-1 leading-tight">Creative Masterclass</h4>
                                            <p className="text-[10px] text-slate-500 font-medium mt-0.5 line-clamp-2">Unlock your full potential in digital design.</p>
                                            <button className="mt-2 px-3 py-1 bg-[#A33B00] text-white text-[10px] font-black rounded-lg hover:bg-[#8F3300] transition-colors">
                                                Enroll Now
                                            </button>
                                        </div>
                                        <div className="w-24 h-20 sm:w-32 sm:h-24 bg-white rounded-lg overflow-hidden border border-orange-50 flex-shrink-0">
                                            <img src="https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=200&auto=format&fit=crop" alt="Masterclass" className="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                )
                            }
                            return null
                        })}
                    </div>
                )}

                {activeTab === 'reels' && (
                    <div className="text-center py-12 text-slate-400 text-xs font-medium bg-white rounded-2xl border border-dashed border-slate-200">
                        Hozircha Reels yuklanmagan
                    </div>
                )}

                {activeTab === 'subscriptions' && (
                    <div className="text-center py-12 text-slate-400 text-xs font-medium bg-white rounded-2xl border border-dashed border-slate-200">
                        Eksklyuziv obunalar mavjud emas
                    </div>
                )}
            </div>
        </>
    )
}