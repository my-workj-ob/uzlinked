"use client"

import React, { useState } from 'react'
import { HiMagnifyingGlass, HiArrowTrendingUp, HiSparkles, HiFire } from 'react-icons/hi2'
import { FiHeart, FiEye } from 'react-icons/fi'

// Trend xeshteglar uchun mock ma'lumotlar (image_820d28.jpg dizayni asosida)
const trendingHashtags = [
  { id: 1, tag: '#Glassmorphism2026', category: 'Trenddagi dizayn', posts: '15.4k post' },
  { id: 2, tag: '#BentoGridsInUI', category: 'UI/UX Texnologiya', posts: '12.8k post' },
  { id: 3, tag: '#CyberpunkAssets', category: 'Marketplace', posts: '8.2k post' },
  { id: 4, tag: '#CreatorEconomy', category: 'Jamiyat', posts: '22.1k post' },
]

// Explore galereyasi uchun turli o'lchamdagi premium rasmlar (Bento Grid effekti uchun)
const exploreItems = [
  { id: 1, image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop', views: '4.2k', likes: '840', size: 'col-span-2 row-span-2' },
  { id: 2, image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&auto=format&fit=crop', views: '2.1k', likes: '310', size: 'col-span-1 row-span-1' },
  { id: 3, image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop', views: '1.9k', likes: '520', size: 'col-span-1 row-span-1' },
  { id: 4, image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop', views: '8.4k', likes: '2.3k', size: 'col-span-1 row-span-2' },
  { id: 5, image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop', views: '3.5k', likes: '910', size: 'col-span-2 row-span-1' },
]

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState('trendlar')
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div>
      <div className="space-y-6">
        
        <div className="relative w-full group">
          <HiMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors duration-200" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="VibeGrid tarmog'idan qidirish..."
            className="w-full h-12 pl-12 pr-4 bg-white border border-slate-200/80 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5  transition-all duration-200"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'trendlar', label: 'Trendlar', Icon: HiFire },
            { id: 'rasmlar', label: 'Rasmlar', Icon: HiSparkles },
            { id: 'ijodkorlar', label: 'Ijodkorlar', Icon: HiArrowTrendingUp },
          ].map((tab) => {
            const isSelected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap active:scale-95 transition-all duration-150 ${
                  isSelected 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                    : 'bg-white text-slate-600 border border-slate-200/60 hover:bg-slate-50'
                }`}
              >
                <tab.Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'trendlar' && (
          <div className="bg-white border border-slate-100 rounded-2xl p-4  space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
              <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600">
                <HiArrowTrendingUp className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Hozirgi trendlar</h3>
            </div>

            <div className="grid grid-cols-1 divide-y divide-slate-50">
              {trendingHashtags.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0 cursor-pointer group active:bg-slate-50/50 rounded-xl px-1 transition-all"
                >
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{item.category}</span>
                    <h4 className="font-bold text-sm text-slate-800 group-hover:text-blue-600 transition-colors mt-0.5">{item.tag}</h4>
                  </div>
                  <span className="bg-slate-50 text-slate-500 font-medium text-[11px] px-2.5 py-1 rounded-lg border border-slate-100">
                    {item.posts}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="font-black text-sm text-slate-900 tracking-tight pl-1">Siz uchun tavsiyalar</h3>
          
          <div className="grid grid-cols-3 gap-2 auto-rows-[120px]">
            {exploreItems.map((item) => (
              <div 
                key={item.id} 
                className={`relative rounded-2xl overflow-hidden group bg-slate-100 cursor-pointer border border-slate-200/10  ${item.size}`}
              >
                <img 
                  src={item.image} 
                  alt="Explore media" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                  <div className="flex items-center gap-3 text-white font-bold text-[11px] w-full">
                    <div className="flex items-center gap-1">
                      <FiEye className="w-3.5 h-3.5" />
                      <span>{item.views}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FiHeart className="w-3.5 h-3.5 fill-white text-white" />
                      <span>{item.likes}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}