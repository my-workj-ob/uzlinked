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

  const navItems = [
    { id: 'home', path: '/dashboard', label: 'Bosh sahifa', IconActive: HiHome, IconOutline: HiOutlineHome },
    { id: 'explore', path: '/dashboard/explore', label: 'Kashf eting', IconActive: HiRss, IconOutline: HiOutlineRss },
    { id: 'messages', path: '/dashboard/messages', label: 'Xabarlar', IconActive: HiChatBubbleLeftRight, IconOutline: HiOutlineChatBubbleLeftRight },
    { id: 'market', path: '/dashboard/market', label: 'E\'lonlar', IconActive: HiBuildingStorefront, IconOutline: HiOutlineBuildingStorefront },
    { id: 'profile', path: '/dashboard/profile', label: 'Profil', IconActive: HiCog6Tooth, IconOutline: HiOutlineCog6Tooth },
  ]

  return (
    <div className="h-svh w-full bg-[#F7F9FB] text-slate-800 font-sans antialiased overflow-hidden relative selection:bg-blue-500 selection:text-white">

      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-16 px-4 bg-white/90 backdrop-blur-md border-b border-slate-100/80 md:hidden">
        <Link href="/dashboard" className="text-2xl font-bold tracking-tight bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          VibeGrid
        </Link>
        <div className="flex items-center gap-3">
          <button className="relative p-2 text-slate-700 hover:bg-slate-50 rounded-full active:scale-90 transition-all duration-150">
            <HiOutlineEnvelope className="w-6 h-6" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-white"></span>
          </button>
          <button className="relative p-2 text-slate-700 hover:bg-slate-50 rounded-full active:scale-90 transition-all duration-150">
            <HiOutlineBell className="w-6 h-6" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-white"></span>
          </button>
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
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={() => setIsCreateOpen(false)} />

          <div className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-6 relative z-10 border border-slate-100 max-h-[85vh] overflow-y-auto transform transition-transform animate-in slide-in-from-bottom md:slide-in-from-bottom-4 duration-200">
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4 md:hidden" onClick={() => setIsCreateOpen(false)} />

            <CreateWizard onClose={() => setIsCreateOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardLayout