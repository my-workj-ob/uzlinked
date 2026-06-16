"use client"

import React, { useState } from 'react'
import { 
  HiOutlineAdjustmentsHorizontal, 
  HiOutlineChatBubbleLeftRight,
  HiCheckBadge
} from 'react-icons/hi2'
import { IoSearchOutline } from 'react-icons/io5'

const mockProducts = [
  {
    id: 1,
    title: "VibeUI Kit — Figma uchun Premium Silliq Komponentlar",
    price: "120,000 UZS",
    category: "digital",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop",
    badge: "Raqamli",
    seller: {
      name: "Sarah Jenkins",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop",
      isCreator: true
    }
  },
  {
    id: 2,
    title: "Minimalist Oq Mexanik Klaviatura (Custom Keycaps)",
    price: "850,000 UZS",
    category: "physical",
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&auto=format&fit=crop",
    badge: "Ideal holatda",
    seller: {
      name: "Jordan Tech",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop",
      isCreator: false
    }
  },
  {
    id: 3,
    title: "Next.js + Appwrite Full-Stack Sayt Qurish Xizmati",
    price: "2,500,000 UZS",
    category: "service",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop",
    badge: "Xizmat",
    seller: {
      name: "Baxtiyor Q.",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop",
      isCreator: true
    }
  },
  {
    id: 4,
    title: "Cyberpunk Abstrakt 3D Render Illustration Pack",
    price: "75,000 UZS",
    category: "digital",
    image: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=500&auto=format&fit=crop",
    badge: "Raqamli",
    seller: {
      name: "Elena Art",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop",
      isCreator: true
    }
  },
]

export default function MarketPage() {
  const [activeCategory, setActiveCategory] = useState<'all' | 'digital' | 'physical' | 'service'>('all')
  const [searchQuery, setSearchQuery] = useState("")

  const categories = [
    { id: 'all', label: 'Barchasi' },
    { id: 'digital', label: 'Raqamli' },
    { id: 'physical', label: 'Jismoniy mahsulotlar' },
    { id: 'service', label: 'Xizmatlar' },
  ]

  const filteredProducts = mockProducts.filter(product => {
    const matchesCategory = activeCategory === 'all' || product.category === activeCategory
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div>
      <div className="space-y-6 pb-12">
        
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Market</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Kreatorlardan eksklyuziv raqamli va jismoniy mahsulotlar.</p>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1 flex items-center">
              <IoSearchOutline className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Mahsulotlardan izlash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white text-xs font-medium pl-10 pr-4 py-3 rounded-xl border border-slate-100 focus:border-blue-500/30 outline-none transition-all"
              />
            </div>
            <button className="p-3 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 text-slate-600 active:scale-95 transition-all">
              <HiOutlineAdjustmentsHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {categories.map((cat) => {
            const isSelected = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 ${
                  isSelected 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-white text-slate-600 border border-slate-100 hover:border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            )
          })}
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.map((product) => (
              <div 
                key={product.id}
                className="bg-white border border-slate-100 rounded-2xl overflow-hidden flex flex-col group transition-all duration-200 hover:border-slate-200"
              >
                <div className="relative aspect-4/3 w-full bg-slate-50 overflow-hidden">
                  <img 
                    src={product.image} 
                    alt={product.title} 
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                  <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-100/20">
                    {product.badge}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-blue-600 tracking-tight">{product.price}</span>
                    </div>
                    <h3 className="font-bold text-xs text-slate-800 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {product.title}
                    </h3>
                  </div>

                  <div className="pt-3 border-t border-slate-50 flex items-center justify-between gap-2 mt-auto">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={product.seller.avatar} alt={product.seller.name} className="w-6 h-6 object-cover rounded-full" />
                      <div className="flex items-center gap-0.5 min-w-0">
                        <span className="text-[11px] font-bold text-slate-600 truncate">{product.seller.name}</span>
                        {product.seller.isCreator && <HiCheckBadge className="w-3 h-3 text-blue-500 shrink-0" />}
                      </div>
                    </div>

                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/80 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg text-[11px] font-bold transition-all duration-150 active:scale-95 shrink-0">
                      <HiOutlineChatBubbleLeftRight className="w-3.5 h-3.5" />
                      <span>Aloqa</span>
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        ) : (
          /* Bo'sh holat (Empty State) */
          <div className="py-12 bg-white border border-slate-100 rounded-2xl flex flex-col items-center justify-center text-center p-6">
            <p className="text-xs font-bold text-slate-400">Hech qanday mahsulot topilmadi.</p>
          </div>
        )}

      </div>
    </div>
  )
}