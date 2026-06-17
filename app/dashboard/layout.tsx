'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  HiHome, HiOutlineHome,
  HiRss, HiOutlineRss,
  HiChatBubbleLeftRight, HiOutlineChatBubbleLeftRight,
  HiCog6Tooth, HiOutlineCog6Tooth,
  HiPlus, HiOutlineBell, HiOutlineEnvelope,
  HiVideoCamera, HiOutlineVideoCamera
} from 'react-icons/hi2'
import { CreateWizard } from '@/components/create-wizard'
import { createClient } from '@/utils/supabase/client'

interface LayoutProps {
  children: React.ReactNode
}

const DashboardLayout = ({ children }: LayoutProps) => {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  
  const [user, setUser] = useState<any>(null)
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [isMsgOpen, setIsMsgOpen] = useState(false)

  // Supabase'dan foydalanuvchi ma'lumotlarini yuklash
  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        
        // 1. Agar foydalanuvchi rasmi 'profiles' jadvalida bo'lsa yoki metadata ichida bo'lsa:
        const userAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture
        
        if (userAvatar) {
          setAvatarUrl(userAvatar)
        } else {
          // Fallback UI-Avatars (ism-familiya bo'yicha dinamik avatar)
          const name = user.user_metadata?.full_name || user.email || 'U'
          setAvatarUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff&bold=true`)
        }
      }
    }

    getProfile()

    // Foydalanuvchi seansini real-time kuzatish (Eski seans o'zgarganda avatarni yangilash uchun)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        setAvatarUrl(session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.email || 'U')}`)
      } else {
        setUser(null)
        setAvatarUrl('')
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  // Soxta bildirishnomalar va xabarlar ro'yxati
  const notifications = [
    { id: 1, user: "Sardor Kamilov", action: "rasmingizga layk bosdi", time: "2 daqiqa oldin", unread: true },
    { id: 2, user: "Madina Axmedova", action: "sizni guruhga qo'shdi", time: "1 soat oldin", unread: true },
    { id: 3, user: "Jasur Shukurov", action: "izohingizga javob berdi", time: "Iyul 15", unread: false },
  ]

  const messages = [
    { id: 1, user: "Anvar Sanaev", text: "Ertaga ko'rishamizmi? Loyihani...", time: "12:40", unread: true },
    { id: 2, user: "Zilola Ergasheva", text: "Yuborgan faylingiz ochilmadi.", time: "Kecha", unread: false },
  ]

  const navItems = [
    { id: 'home', path: '/dashboard', label: 'Bosh sahifa', IconActive: HiHome, IconOutline: HiOutlineHome },
    { id: 'explore', path: '/dashboard/explore', label: 'Kashf eting', IconActive: HiRss, IconOutline: HiOutlineRss },
    { id: 'reels', path: '/dashboard/reels', label: 'Reels', IconActive: HiVideoCamera, IconOutline: HiOutlineVideoCamera },
    { id: 'messages', path: '/dashboard/messages', label: 'Xabarlar', IconActive: HiChatBubbleLeftRight, IconOutline: HiOutlineChatBubbleLeftRight },
    { id: 'profile', path: '/dashboard/profile', label: 'Profil', IconActive: HiCog6Tooth, IconOutline: HiOutlineCog6Tooth },
  ]

  const handleCreateClick = () => {
    if (!user) {
      router.push('/login')
    } else {
      setIsCreateOpen(true)
    }
  }

  return (
    <div className="h-svh w-full bg-[#F8FAFC] text-slate-800 font-sans antialiased overflow-hidden relative selection:bg-blue-500 selection:text-white">

      {/* MOBILE HEADER: Glassmorphism effekti kuchaytirildi */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-16 px-4 bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-xs md:hidden select-none transition-all duration-300">
        <Link href="/dashboard" className="text-2xl font-black tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent active:scale-95 transition-transform">
          VibeGrid
        </Link>

        <div className="flex items-center gap-2 relative">
          {user && (
            <>
              {/* Xabarlar Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsMsgOpen(!isMsgOpen);
                    setIsNotifOpen(false); 
                  }}
                  className={`p-2 rounded-full active:scale-90 transition-all duration-150 ${isMsgOpen ? 'bg-blue-600/10 text-blue-600' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  <HiOutlineEnvelope className="w-6 h-6" />
                  {messages.some(m => m.unread) && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse"></span>
                  )}
                </button>

                {isMsgOpen && (
                  <>
                    <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsMsgOpen(false)} />
                    <div className="absolute right-[-80px] top-12 w-80 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl z-50 overflow-hidden shadow-xl p-2 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-3 py-2 font-bold text-sm text-slate-800 border-b border-slate-50 flex justify-between items-center">
                        <span>Xabarlar</span>
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Yangi</span>
                      </div>
                      <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto scrollbar-none">
                        {messages.map(msg => (
                          <div key={msg.id} className={`p-3 flex flex-col gap-0.5 rounded-xl transition-colors ${msg.unread ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-xs text-slate-900">{msg.user}</span>
                              <span className="text-[10px] text-slate-400">{msg.time}</span>
                            </div>
                            <p className="text-xs text-slate-500 truncate w-full">{msg.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Bildirishnomalar Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsNotifOpen(!isNotifOpen);
                    setIsMsgOpen(false);
                  }}
                  className={`p-2 rounded-full active:scale-90 transition-all duration-150 ${isNotifOpen ? 'bg-blue-600/10 text-blue-600' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  <HiOutlineBell className="w-6 h-6" />
                  {notifications.filter(n => n.unread).length > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-rose-500 text-white text-[9px] font-bold rounded-full ring-2 ring-white">
                      {notifications.filter(n => n.unread).length}
                    </span>
                  )}
                </button>

                {isNotifOpen && (
                  <>
                    <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsNotifOpen(false)} />
                    <div className="absolute right-[-40px] top-12 w-80 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl z-50 overflow-hidden shadow-xl p-2 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-3 py-2 font-bold text-sm text-slate-800 border-b border-slate-50">
                        Bildirishnomalar
                      </div>
                      <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto scrollbar-none">
                        {notifications.map(notif => (
                          <div key={notif.id} className={`p-3 flex flex-col gap-0.5 rounded-xl transition-colors ${notif.unread ? 'bg-rose-50/40' : 'hover:bg-slate-50'}`}>
                            <div className="text-xs text-slate-700">
                              <span className="font-semibold text-slate-900 mr-1">{notif.user}</span>
                              {notif.action}
                            </div>
                            <span className="text-[10px] text-slate-400">{notif.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* Dinamizatsiyalangan Avatar qismi */}
          {user ? (
            <Link href="/dashboard/profile" className="w-9 h-9 ml-1 overflow-hidden rounded-full ring-2 ring-blue-500/20 hover:ring-blue-500/50 cursor-pointer active:scale-95 transition-all block relative">
              {avatarUrl && <img src={avatarUrl} alt="Avatar" className="object-cover w-full h-full" />}
            </Link>
          ) : (
            <Link href="/login" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl active:scale-95 transition-all shadow-xs">
              Kirish
            </Link>
          )}
        </div>
      </header>

      {/* DESKTOP SIDEBAR */}
      <div className="flex w-full max-w-[1440px] mx-auto h-full relative">
        <aside className="sticky top-0 h-screen hidden w-64 p-6 bg-white border-r border-slate-100 md:flex flex-col z-30 flex-shrink-0">
          <Link href="/dashboard" className="mb-10 text-2xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent block">
            VibeGrid
          </Link>

          <nav className="flex flex-col gap-1.5 flex-1">
            {navItems.map((item) => {
              const isActive = pathname === item.path
              const Icon = isActive ? item.IconActive : item.IconOutline

              return (
                <Link
                  key={item.id}
                  href={item.path}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] text-left ${isActive
                    ? 'text-blue-600 bg-blue-50/80 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                  <Icon className={`w-6 h-6 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span className="text-sm">{item.label}</span>
                </Link>
              )
            })}

            {user ? (
              <button
                onClick={handleCreateClick}
                className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl transition-all active:scale-[0.98] shadow-md shadow-blue-500/10"
              >
                <HiPlus className="w-5 h-5" />
                <span>Yangi qo'shish</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all active:scale-[0.98]"
              >
                <span>Tizimga kirish</span>
              </Link>
            )}
          </nav>

          {/* DESKTOP USER SECTION & PREMIUM CARD */}
          {user && (
            <div className="mt-auto flex flex-col gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-lg shadow-blue-500/10 relative overflow-hidden group">
                <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
                <h4 className="font-bold text-sm mb-0.5">Premiumga o'ting</h4>
                <p className="text-[11px] text-blue-100 mb-3 leading-relaxed">Cheksiz video va darsliklar yuklash imkoniyati.</p>
                <button className="w-full py-2 bg-white text-blue-600 font-bold text-xs rounded-xl hover:bg-blue-50 active:scale-95 transition-all shadow-xs relative z-10">
                  Batafsil
                </button>
              </div>

              {/* Sidebar pastidagi ixcham user card (Idea!) */}
              <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/50 border border-slate-100">
                <div className="w-9 h-9 overflow-hidden rounded-full ring-2 ring-slate-150 flex-shrink-0">
                  {avatarUrl && <img src={avatarUrl} alt="Avatar" className="object-cover w-full h-full" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{user.user_metadata?.full_name || 'Foydalanuvchi'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
                <button 
                  onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
                  className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors text-xs font-semibold"
                  title="Chiqish"
                >
                  Chiqish
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0 h-full pt-20 pb-24 md:py-8 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none">
          <div className="w-full max-w-2xl mx-auto px-4 md:px-6">
            {children}
          </div>
        </main>
      </div>

      {/* MOBILE FLOATING ACTION BUTTON */}
      {user && (
        <button
          onClick={handleCreateClick}
          className="fixed bottom-20 right-5 z-40 flex items-center justify-center w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-lg shadow-blue-500/30 active:scale-90 md:hidden transition-all duration-200"
        >
          <HiPlus className="w-7 h-7" />
        </button>
      )}

      {/* MOBILE BOTTOM NAVIGATION: Haqiqiy Premium Glassmorphism */}
     {/* VibeGrid Pill-Style Bottom Navigation */}
<nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-white/90 backdrop-blur-xl border-t border-slate-100 md:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.04)] px-3 flex justify-around items-center pb-[env(safe-area-inset-bottom)]">
  {navItems.map((item) => {
    const isActive = pathname === item.path
    const Icon = isActive ? item.IconActive : item.IconOutline

    return (
      <Link
        key={item.id}
        href={item.path}
        className={`flex items-center justify-center transition-all duration-300 ease-in-out select-none active:scale-95 ${
          isActive 
            ? 'bg-blue-600 text-white rounded-full px-4 py-2.5 shadow-lg shadow-blue-600/20' 
            : 'bg-slate-100/70 text-slate-600 p-2.5 rounded-full hover:bg-slate-100'
        }`}
      >
        {/* Ikonka */}
        <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-105' : 'scale-100'}`} />
        
        {/* Silliq chiquvchi matn animatsiyasi (Max-width + Opacity orqali) */}
        <span className={`overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap text-xs font-semibold ${
          isActive 
            ? 'max-w-24 opacity-100 ml-2' 
            : 'max-w-0 opacity-0 ml-0'
        }`}>
          {item.id === 'profile' ? 'Profil' : item.label}
        </span>
      </Link>
    )
  })}
</nav>

      {/* CREATE MODAL / DRAWER */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-60 flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsCreateOpen(false)}
          />

          <div
            style={{
              animation: 'androidSlideUp 0.35s cubic-bezier(0.1, 0.76, 0.55, 0.94) forwards'
            }}
            className="bg-white w-full md:max-w-md rounded-t-[28px] md:rounded-2xl p-6 pb-8 relative z-10 border border-neutral-100 max-h-[85vh] overflow-y-auto shadow-2xl select-none"
          >
            <div
              className="absolute top-3 left-0 right-0 flex justify-center md:hidden cursor-grab active:cursor-grabbing py-2"
              onClick={() => setIsCreateOpen(false)}
            >
              <div className="w-10 h-1.5 bg-neutral-200 rounded-full" />
            </div>

            <div className="pt-3 md:pt-0">
              <CreateWizard onClose={() => setIsCreateOpen(false)} />
            </div>
          </div>

          <style jsx global>{`
            @keyframes androidSlideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  )
}

export default DashboardLayout