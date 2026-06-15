import React, { useState } from 'react'
import { FiHeart, FiMessageSquare, FiSend } from 'react-icons/fi'
import { FaHeart } from 'react-icons/fa'
import { HiEllipsisHorizontal, HiMiniCircleStack } from 'react-icons/hi2'

export const PostCard = () => {
  const [liked, setLiked] = useState(false)

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden mt-4">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <img 
            src="https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop" 
            alt="Marcus Rivera" 
            className="w-10 h-10 object-cover rounded-full"
          />
          <div>
            <h4 className="font-bold text-sm text-slate-900 leading-none">Marcus Rivera</h4>
            <span className="text-[11px] text-slate-400 font-medium">2 soat avval • Toshkent</span>
          </div>
        </div>
        <button className="text-slate-400 hover:text-slate-700 p-1 rounded-full">
          <HiEllipsisHorizontal className="w-6 h-6" />
        </button>
      </div>

      <div className="px-4">
        <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-100">
          <img 
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop" 
            alt="Office" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setLiked(!liked)} 
            className="flex items-center gap-1.5 text-slate-700 hover:text-rose-500 transition active:scale-90"
          >
            {liked ? <FaHeart className="w-5 h-5 text-rose-500" /> : <FiHeart className="w-5 h-5" />}
            <span className="text-xs font-semibold text-slate-600">1.2k</span>
          </button>
          
          <button className="flex items-center gap-1.5 text-slate-700 hover:text-blue-500 transition">
            <FiMessageSquare className="w-5 h-5" />
            <span className="text-xs font-semibold text-slate-600">48</span>
          </button>
          
          <button className="text-slate-700 hover:text-indigo-500 transition">
            <FiSend className="w-5 h-5" />
          </button>
        </div>

        <button className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-xs font-bold transition active:scale-95">
          <div className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-white font-extrabold text-[9px]">
            $
          </div>
          Tip
        </button>
      </div>

      <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed">
        <span className="font-bold text-slate-900 mr-1">Marcus Rivera</span> 
        Yangi ofisimizda birinchi kun! VibeGrid jamoasi uchun ajoyib va qulay sharoitlar tayyorlabdi...
      </div>
    </div>
  )
}