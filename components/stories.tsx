"use client"

import React, { useState } from 'react'
import { HiPlus, HiOutlineSparkles, HiOutlineDocumentText, HiOutlineShoppingBag, HiXMark } from 'react-icons/hi2'

const mockStories = [
  { id: 1, name: 'sarah_v', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop' },
  { id: 2, name: 'm_digital', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop' },
  { id: 3, name: 'elena.art', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop' },
  { id: 4, name: 'jord_t', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop' },
]

export const Stories = () => {
  const [isOpen, setIsOpen] = useState(false) // Plyus menyusi holati

  return (
    <div className="relative">
      {/* STORIES TASMASI */}
      <div className="flex items-center gap-4 py-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* PLUS TUGMASI BOR AVATAR (Siz) */}
        <div 
          onClick={() => setIsOpen(true)} // Bosganda menyu ochiladi
          className="flex flex-col items-center shrink-0 cursor-pointer group"
        >
          <div className="relative w-16 h-16 rounded-full p-0.5 border border-dashed border-slate-300 group-hover:border-blue-500 transition-colors">
            <img 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop" 
              className="w-full h-full object-cover rounded-full" 
              alt="Siz" 
            />
            <span className="absolute bottom-0 right-0 bg-blue-600 text-white p-0.5 rounded-full ring-2 ring-white group-hover:bg-blue-700 transition-colors">
              <HiPlus className="w-3 h-3" />
            </span>
          </div>
          <span className="text-xs text-slate-500 mt-1.5 font-medium">Siz</span>
        </div>

        {/* BOShQALAR */}
        {mockStories.map((story) => (
          <div key={story.id} className="flex flex-col items-center shrink-0 cursor-pointer active:scale-95 transition-transform">
            <div className="w-16 h-16 rounded-full bg-linear-to-tr from-amber-500 via-rose-500 to-indigo-600 p-[2.5px]">
              <div className="w-full h-full bg-white rounded-full p-0.5">
                <img src={story.avatar} className="w-full h-full object-cover rounded-full" alt={story.name} />
              </div>
            </div>
            <span className="text-xs text-slate-600 mt-1.5 font-medium truncate max-w-[70px]">
              {story.name}
            </span>
          </div>
        ))}
      </div>

      {/* 🌟 VIBEGERID CREATE DIALOG (MODAL MENYU) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
          {/* Orqa fon shaffofligi */}
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          
          {/* Menyu oynasi */}
          <div className="bg-white border border-slate-100 w-full md:max-w-sm rounded-2xl md:rounded-2xl p-5 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-sm text-slate-900 tracking-tight">Yaratish</h3>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600">
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Amallar ro'yxati */}
            <div className="space-y-2">
              <button className="w-full p-3 flex items-center gap-3 bg-slate-50/50 hover:bg-blue-50/50 border border-slate-100 rounded-xl text-left transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <HiOutlineSparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Tarix qo'shish</h4>
                  <p className="text-[10px] text-slate-400 font-medium">24 soatlik lahza ulashing</p>
                </div>
              </button>

              <button className="w-full p-3 flex items-center gap-3 bg-slate-50/50 hover:bg-blue-50/50 border border-slate-100 rounded-xl text-left transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <HiOutlineDocumentText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Post yaratish</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Tasmaga rasm va matn joylang</p>
                </div>
              </button>

              <button className="w-full p-3 flex items-center gap-3 bg-slate-50/50 hover:bg-blue-50/50 border border-slate-100 rounded-xl text-left transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <HiOutlineShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">E'lon joylash</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Marketga mahsulot qo'shing</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}