'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HiHome, HiOutlineHome,
  HiRss, HiOutlineRss,
  HiBuildingStorefront, HiOutlineBuildingStorefront,
  HiChatBubbleLeftRight, HiOutlineChatBubbleLeftRight,
  HiCog6Tooth, HiOutlineCog6Tooth,
  HiPlus, HiOutlineBell, HiOutlineEnvelope
} from 'react-icons/hi2'
import { CreateWizard } from '@/components/create-wizard'

interface LayoutProps {
  children: React.ReactNode
}

const DashboardLayout = ({ children }: LayoutProps) => {
  const pathname = usePathname()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [isMsgOpen, setIsMsgOpen] = useState(false)

  // Soxta bildirishnomalar ro'yxati
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
    { id: 'messages', path: '/dashboard/messages', label: 'Xabarlar', IconActive: HiChatBubbleLeftRight, IconOutline: HiOutlineChatBubbleLeftRight },
    { id: 'market', path: '/dashboard/market', label: 'E\'lonlar', IconActive: HiBuildingStorefront, IconOutline: HiOutlineBuildingStorefront },
    { id: 'profile', path: '/dashboard/profile', label: 'Profil', IconActive: HiCog6Tooth, IconOutline: HiOutlineCog6Tooth },
  ]

  return (
    <div className="h-svh w-full bg-[#F7F9FB] text-slate-800 font-sans antialiased overflow-hidden relative selection:bg-blue-500 selection:text-white">

      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-16 px-4 bg-white/95 backdrop-blur-md border-b border-slate-100/80 md:hidden select-none">
        <Link href="/dashboard" className="text-2xl font-bold tracking-tight bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          VibeGrid
        </Link>

        <div className="flex items-center gap-1.5 relative">

          <div className="relative">
            <button
              onClick={() => {
                setIsMsgOpen(!isMsgOpen);
                setIsNotifOpen(false); 
              }}
              className={`p-2 rounded-full active:scale-90 transition-all duration-150 ${isMsgOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              <HiOutlineEnvelope className="w-6 h-6" />
              {messages.some(m => m.unread) && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse"></span>
              )}
            </button>

            {isMsgOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsMsgOpen(false)} />
                <div className="absolute -right-22 top-13 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden transform origin-top-right transition-all p-2 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 font-bold text-sm text-slate-800 border-b border-slate-50 flex justify-between items-center">
                    <span>Xabarlar</span>
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Yangi</span>
                  </div>
                  <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                    {messages.map(msg => (
                      <div key={msg.id} className={`p-3 flex flex-col gap-0.5 rounded-xl transition-colors ${msg.unread ? 'bg-blue-50/40' : 'hover:bg-slate-50'}`}>
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

          <div className="relative">
            <button
              onClick={() => {
                setIsNotifOpen(!isNotifOpen);
                setIsMsgOpen(false); // Xabarlar ochiq bo'lsa yopadi
              }}
              className={`p-2 rounded-full active:scale-90 transition-all duration-150 ${isNotifOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              <HiOutlineBell className="w-6 h-6" />
              {notifications.filter(n => n.unread).length > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-rose-500 text-white text-[9px] font-bold rounded-full ring-2 ring-white">
                  {notifications.filter(n => n.unread).length}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsNotifOpen(false)} />
                <div className="absolute -right-11 top-13 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden transform origin-top-right transition-all p-2 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 font-bold text-sm text-slate-800 border-b border-slate-50">
                    Bildirishnomalar
                  </div>
                  <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                    {notifications.map(notif => (
                      <div key={notif.id} className={`p-3 flex flex-col gap-0.5 rounded-xl transition-colors ${notif.unread ? 'bg-rose-50/30' : 'hover:bg-slate-50'}`}>
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

          <Link href="/dashboard/profile" className="w-8 h-8 ml-1 overflow-hidden rounded-full ring-2 ring-slate-100 cursor-pointer active:scale-95 transition-transform block">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop" alt="Avatar" className="object-cover w-full h-full" />
          </Link>
        </div>
      </header>

      <div className="flex w-full max-w-[1440px] mx-auto h-full relative">

        <aside className="sticky top-0 h-screen hidden w-64 p-6 bg-white border-r border-slate-100 md:flex flex-col z-30 flex-shrink-0">
          <Link href="/dashboard" className="mb-10 text-2xl font-black tracking-tight bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent block">
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
                    ? 'text-blue-600 bg-blue-50/70 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                  <Icon className={`w-6 h-6 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span className="text-sm">{item.label}</span>
                </Link>
              )
            })}

            <button
              onClick={() => {
                setIsCreateOpen(true);
              }}
              className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all active:scale-[0.98]"
            >
              <HiPlus className="w-5 h-5" />
              <span>Yangi qo'shish</span>
            </button>
          </nav>

          <div className="mt-auto">
            <div className="p-4 bg-linear-to-br from-blue-600 to-indigo-700 rounded-2xl text-white">
              <h4 className="font-bold text-sm mb-0.5">Premiumga o'ting</h4>
              <p className="text-[11px] text-blue-100 mb-3 leading-relaxed">Cheksiz video va darsliklar yuklash imkoniyati.</p>
              <button className="w-full py-2 bg-white text-blue-600 font-bold text-xs rounded-xl hover:bg-blue-50 active:scale-95 transition-all">
                Batafsil
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 h-full pt-16 pb-16 md:py-8 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="w-full max-w-2xl mx-auto px-4 md:px-6">
            {children}
          </div>
        </main>
      </div>

      <button
        onClick={() => setIsCreateOpen(true)}
        className="fixed bottom-24 right-5 z-50 flex items-center justify-center w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full active:scale-90 md:hidden shadow-lg shadow-blue-500/20 transition-all duration-200"
      >
        <HiPlus className="w-7 h-7" />
      </button>

      <nav className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-5 h-16 bg-white/90 backdrop-blur-lg border-t border-slate-100/80 md:hidden pb-safe">
        {navItems.map((item) => {
          const isActive = pathname === item.path
          const Icon = isActive ? item.IconActive : item.IconOutline

          return (
            <Link
              key={item.id}
              href={item.path}
              className="flex flex-col items-center justify-center gap-0.5 active:scale-90 transition-transform duration-150 relative"
            >
              <Icon className={`w-5 h-5 transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className={`text-[10px] font-medium transition-colors duration-200 ${isActive ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>
                {item.id === 'profile' ? 'Profile' : item.id.charAt(0).toUpperCase() + item.id.slice(1)}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 bg-blue-600 rounded-full"></span>
              )}
            </Link>
          )
        })}
      </nav>

      {isCreateOpen && (
        <div className="fixed inset-0 z-60 flex items-end md:items-center justify-center p-0 md:p-4">

          <div
            className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsCreateOpen(false)}
          />

          <div
            style={{
              animation: 'androidSlideUp 0.4s cubic-bezier(0.2, 0, 0, 1) forwards'
            }}
            className="bg-white w-full md:max-w-md rounded-t-[28px] md:rounded-2xl p-6 pb-8 relative z-10 border border-neutral-100 max-h-[85vh] overflow-y-auto shadow-2xl select-none"
          >

            <div
              className="absolute top-3 left-0 right-0 flex justify-center md:hidden cursor-grab active:cursor-grabbing py-2"
              onClick={() => setIsCreateOpen(false)}
            >
              <div className="w-8 h-1 bg-neutral-300 rounded-full" />
            </div>

            <div className="pt-3 md:pt-0">
              <CreateWizard onClose={() => setIsCreateOpen(false)} />
            </div>
          </div>

          <style jsx global>{`
      @keyframes androidSlideUp {
        from {
          transform: translateY(100%);
        }
        to {
          transform: translateY(0);
        }
      }
    `}</style>

        </div>
      )}
    </div>
  )
}

export default DashboardLayout