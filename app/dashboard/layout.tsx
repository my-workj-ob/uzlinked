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
  HiVideoCamera, HiOutlineVideoCamera,
  HiSun, HiMoon
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
  const [isDark, setIsDark] = useState(false)

  // Mavzuni boshlang'ich yuklash
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  // Supabase'dan foydalanuvchi ma'lumotlarini yuklash
  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        
        const userAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture
        
        if (userAvatar) {
          setAvatarUrl(userAvatar)
        } else {
          const name = user.user_metadata?.full_name || user.email || 'U'
          setAvatarUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff&bold=true`)
        }
      }
    }

    getProfile()

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

  // Circular reveal animatsiyasi bilan dark mode toggle
  const toggleTheme = (e: React.MouseEvent) => {
    const nextDark = !isDark
    
    if (!(document as any).startViewTransition) {
      setIsDark(nextDark)
      if (nextDark) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      }
      return
    }

    const x = e.clientX
    const y = e.clientY
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    const transition = (document as any).startViewTransition(() => {
      setIsDark(nextDark)
      if (nextDark) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      }
    })

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`
      ]
      document.documentElement.animate(
        {
          clipPath: nextDark ? clipPath : [...clipPath].reverse()
        },
        {
          duration: 400,
          easing: 'ease-in-out',
          pseudoElement: nextDark
            ? '::view-transition-new(root)'
            : '::view-transition-old(root)'
        }
      )
    })
  }

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

  const isReelsPage = pathname === '/dashboard/reels'

  return (
    <div className="h-svh w-full bg-[#F8FAFC] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans antialiased overflow-hidden relative selection:bg-blue-500 selection:text-white transition-colors duration-300">

      {/* MOBILE HEADER: Glassmorphism, hidden on Reels page */}
      {!isReelsPage && (
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-16 px-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-100 dark:border-white/5 select-none transition-all duration-300">
          <Link href="/dashboard" className="text-2xl font-black tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent active:scale-95 transition-transform">
            VibeGrid
          </Link>

          <div className="flex items-center gap-2 relative">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40 active:scale-90 transition-all"
            >
              {isDark ? <HiSun className="w-5 h-5 text-amber-500" /> : <HiMoon className="w-5 h-5" />}
            </button>

            {user && (
              <>
                {/* Xabarlar link */}
                <div className="relative">
                  <button
                    onClick={() => router.push('/dashboard/messages')}
                    className="p-2 rounded-full active:scale-90 transition-all duration-150 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40 cursor-pointer"
                  >
                    <HiOutlineEnvelope className="w-6 h-6" />
                    {messages.some(m => m.unread) && (
                      <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse"></span>
                    )}
                  </button>
                </div>

                {/* Bildirishnomalar link */}
                <div className="relative">
                  <button
                    onClick={() => router.push('/dashboard/notifications')}
                    className="p-2 rounded-full active:scale-90 transition-all duration-150 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40 cursor-pointer"
                  >
                    <HiOutlineBell className="w-6 h-6" />
                    {notifications.filter(n => n.unread).length > 0 && (
                      <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-rose-500 text-white text-[9px] font-bold rounded-full ring-2 ring-white dark:ring-slate-900">
                        {notifications.filter(n => n.unread).length}
                      </span>
                    )}
                  </button>
                </div>
              </>
            )}

            {user ? (
              <Link href="/dashboard/profile" className="w-9 h-9 ml-1 overflow-hidden rounded-full ring-2 ring-blue-500/20 hover:ring-blue-500/50 cursor-pointer active:scale-95 transition-all block relative">
                {avatarUrl && <img src={avatarUrl} alt="Avatar" className="object-cover w-full h-full" />}
              </Link>
            ) : (
              <Link href="/login" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl active:scale-95 transition-all">
                Kirish
              </Link>
            )}
          </div>
        </header>
      )}

      {/* DESKTOP SIDEBAR */}
      <div className="flex w-full max-w-[1440px] mx-auto h-full relative">
        <aside className="sticky top-0 h-screen hidden w-64 p-6 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-white/5 md:flex flex-col z-30 flex-shrink-0 transition-colors duration-300">
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
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                >
                  <Icon className={`w-6 h-6 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="text-sm">{item.label}</span>
                </Link>
              )
            })}

            {/* Desktop Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all duration-200 active:scale-[0.98] text-left w-full cursor-pointer"
            >
              {isDark ? (
                <>
                  <HiSun className="w-6 h-6 text-amber-500" />
                  <span className="text-sm">Yorug' rejim</span>
                </>
              ) : (
                <>
                  <HiMoon className="w-6 h-6 text-indigo-600" />
                  <span className="text-sm">Tungi rejim</span>
                </>
              )}
            </button>

            {user ? (
              <button
                onClick={handleCreateClick}
                className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl transition-all active:scale-[0.98]"
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
              <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white relative overflow-hidden group">
                <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
                <h4 className="font-bold text-sm mb-0.5">Premiumga o'ting</h4>
                <p className="text-[11px] text-blue-100 mb-3 leading-relaxed">Cheksiz video va darsliklar yuklash imkoniyati.</p>
                <button className="w-full py-2 bg-white text-blue-600 font-bold text-xs rounded-xl hover:bg-blue-50 active:scale-95 transition-all relative z-10">
                  Batafsil
                </button>
              </div>

              <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
                <div className="w-9 h-9 overflow-hidden rounded-full ring-2 ring-slate-150 dark:ring-slate-800 flex-shrink-0">
                  {avatarUrl && <img src={avatarUrl} alt="Avatar" className="object-cover w-full h-full" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{user.user_metadata?.full_name || 'Foydalanuvchi'}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{user.email}</p>
                </div>
                <button 
                  onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-lg transition-colors text-xs font-semibold"
                  title="Chiqish"
                >
                  Chiqish
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className={`flex-1 min-w-0 h-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none ${
          isReelsPage
            ? 'pt-0 pb-0 md:py-0 bg-black overflow-hidden'
            : 'pt-16 pb-24 md:py-8 overflow-y-auto'
        }`}>
          <div className={`mx-auto ${
            isReelsPage
              ? 'w-full h-full max-w-none px-0'
              : 'w-full max-w-2xl px-4 md:px-6'
          }`}>
            {children}
          </div>
        </main>
      </div>

      {/* MOBILE FLOATING ACTION BUTTON: Hidden on Reels page */}
      {user && !isReelsPage && (
        <button
          onClick={handleCreateClick}
          className="fixed bottom-20 right-5 z-40 flex items-center justify-center w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full active:scale-90 md:hidden transition-all duration-200"
        >
          <HiPlus className="w-7 h-7" />
        </button>
      )}

      {/* MOBILE BOTTOM NAVIGATION: Dynamic adaptations for Reels page */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 h-16 md:hidden px-3 flex justify-around items-center pb-[env(safe-area-inset-bottom)] transition-all duration-300 border-t ${
        isReelsPage
          ? 'bg-black/60 backdrop-blur-xl border-white/10'
          : 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-100 dark:border-white/5'
      }`}>
        {navItems.map((item) => {
          const isActive = pathname === item.path
          const Icon = isActive ? item.IconActive : item.IconOutline

          return (
            <Link
              key={item.id}
              href={item.path}
              className={`flex items-center justify-center transition-all duration-300 ease-in-out select-none active:scale-95 ${
                isActive 
                  ? isReelsPage
                    ? 'bg-white text-black rounded-full px-4 py-2.5' 
                    : 'bg-blue-600 text-white rounded-full px-4 py-2.5' 
                  : isReelsPage
                    ? 'bg-white/10 text-white/70 p-2.5 rounded-full hover:bg-white/20'
                    : 'bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-105' : 'scale-100'}`} />
              
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
        <div className="fixed inset-0 z-65 flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsCreateOpen(false)}
          />

          <div
            style={{
              animation: 'androidSlideUp 0.35s cubic-bezier(0.1, 0.76, 0.55, 0.94) forwards'
            }}
            className="bg-white dark:bg-slate-900 w-full md:max-w-md rounded-t-[28px] md:rounded-2xl p-6 pb-8 relative z-10 border border-neutral-100 dark:border-white/5 max-h-[85vh] overflow-y-auto select-none"
          >
            <div
              className="absolute top-3 left-0 right-0 flex justify-center md:hidden cursor-grab active:cursor-grabbing py-2"
              onClick={() => setIsCreateOpen(false)}
            >
              <div className="w-10 h-1.5 bg-neutral-200 dark:bg-slate-800 rounded-full" />
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