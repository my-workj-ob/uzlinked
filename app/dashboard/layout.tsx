'use client'


import React, { useState } from 'react'
import { 
  HiHome, HiOutlineHome, 
  HiRss, HiOutlineRss, 
  HiBuildingStorefront, HiOutlineBuildingStorefront, 
  HiChatBubbleLeftRight, HiOutlineChatBubbleLeftRight, 
  HiCog6Tooth, HiOutlineCog6Tooth,
  HiPlus, HiOutlineBell, HiOutlineEnvelope
} from 'react-icons/hi2'

interface LayoutProps {
  children: React.ReactNode
}

const DashboardLayout = ({ children }: LayoutProps) => {
  const [activeTab, setActiveTab] = useState<'home' | 'explore' | 'market' | 'messages' | 'settings'>('home')

  return (
    <div className="min-h-screen bg-[#F7F9FB] text-slate-800 font-sans antialiased selection:bg-blue-500 selection:text-white">
      
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-16 px-4 bg-white/90 backdrop-blur-md border-b border-slate-100/80 md:hidden">
        <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          VibeGrid
        </span>
        <div className="flex items-center gap-3">
          <button className="relative p-2 text-slate-700 hover:bg-slate-50 rounded-full active:scale-90 transition-all duration-150">
            <HiOutlineEnvelope className="w-6 h-6" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-white"></span>
          </button>
          
          <button className="relative p-2 text-slate-700 hover:bg-slate-50 rounded-full active:scale-90 transition-all duration-150">
            <HiOutlineBell className="w-6 h-6" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-white"></span>
          </button>
          
          <div className="w-8 h-8 ml-1 overflow-hidden rounded-full ring-2 ring-slate-100 cursor-pointer active:scale-95 transition-transform">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop" alt="Avatar" className="object-cover w-full h-full" />
          </div>
        </div>
      </header>

      <div className="flex max-w-[1440px] mx-auto min-h-screen">
        
        <aside className="fixed bottom-0 top-0 left-[calc((100vw-1440px)/2)] hidden w-64 p-6 bg-white border-r border-slate-100 md:block z-30">
          <div className="mb-10 text-2xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            VibeGrid
          </div>
          
          <nav className="flex flex-col gap-1.5">
            {[
              { id: 'home', label: 'Bosh sahifa', IconActive: HiHome, IconOutline: HiOutlineHome },
              { id: 'explore', label: 'Kashf eting', IconActive: HiRss, IconOutline: HiOutlineRss },
              { id: 'messages', label: 'Xabarlar', IconActive: HiChatBubbleLeftRight, IconOutline: HiOutlineChatBubbleLeftRight },
              { id: 'market', label: 'E\'lonlar', IconActive: HiBuildingStorefront, IconOutline: HiOutlineBuildingStorefront },
              { id: 'settings', label: 'Sozlamalar', IconActive: HiCog6Tooth, IconOutline: HiOutlineCog6Tooth },
            ].map((item) => {
              const isActive = activeTab === item.id
              const Icon = isActive ? item.IconActive : item.IconOutline
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] text-left ${
                    isActive 
                      ? 'text-blue-600 bg-blue-50/70 font-semibold shadow-sm shadow-blue-500/5' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span className="text-sm">{item.label}</span>
                </button>
              )
            })}
          </nav>
          
          <div className="absolute bottom-6 left-6 right-6">
            <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-md shadow-blue-500/10">
              <h4 className="font-bold text-sm mb-0.5">Premiumga o'ting</h4>
              <p className="text-[11px] text-blue-100 mb-3 leading-relaxed">Cheksiz video va darsliklar yuklash imkoniyati.</p>
              <button className="w-full py-2 bg-white text-blue-600 font-bold text-xs rounded-xl shadow-sm hover:bg-blue-50 active:scale-95 transition-all">
                Batafsil
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-h-screen pt-20 pb-24 md:pt-6 md:pb-6 md:ml-64 transition-all duration-300">
          <div className="w-full max-w-xl mx-auto px-4 md:px-0">
            {children}
          </div>
        </main>
      </div>

      <button className="fixed bottom-20 right-5 z-40 flex items-center justify-center w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-lg shadow-blue-500/40 active:scale-90 active:rotate-90 md:hidden transition-all duration-200 ease-out">
        <HiPlus className="w-7 h-7" />
      </button>

      <nav className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-5 h-16 bg-white/90 backdrop-blur-lg border-t border-slate-100/80 md:hidden pb-safe">
        {[
          { id: 'home', label: 'Home', IconActive: HiHome, IconOutline: HiOutlineHome },
          { id: 'explore', label: 'Explore', IconActive: HiRss, IconOutline: HiOutlineRss },
          { id: 'market', label: 'Market', IconActive: HiBuildingStorefront, IconOutline: HiOutlineBuildingStorefront },
          { id: 'messages', label: 'Messages', IconActive: HiChatBubbleLeftRight, IconOutline: HiOutlineChatBubbleLeftRight },
          { id: 'settings', label: 'Settings', IconActive: HiCog6Tooth, IconOutline: HiOutlineCog6Tooth },
        ].map((item) => {
          const isActive = activeTab === item.id
          const Icon = isActive ? item.IconActive : item.IconOutline
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className="flex flex-col items-center justify-center gap-0.5 active:scale-90 transition-transform duration-150 relative"
            >
              <Icon className={`w-5 h-5 transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className={`text-[10px] font-medium transition-colors duration-200 ${isActive ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 bg-blue-600 rounded-full animate-pulse"></span>
              )}
            </button>
          )
        })}
      </nav>

    </div>
  )
}

export default DashboardLayout