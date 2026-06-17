import React from 'react'
import { HiBuildingStorefront } from 'react-icons/hi2'

export const PromotedCard = () => {
  return (
    <div className="relative bg-white border border-slate-100 rounded-2xl overflow-hidden mt-4 border-l-4 border-l-[#A33B00]">
      
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-600 border border-orange-100">
            <HiBuildingStorefront className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 leading-none">VibeMarket</h4>
            <span className="text-[11px] text-slate-400 font-medium">Homiylik qilingan</span>
          </div>
        </div>
        
        <span className="bg-slate-100 text-slate-500 font-bold text-[9px] tracking-wider px-2 py-0.5 rounded">
          PROMOTED
        </span>
      </div>

      <div className="px-4 relative">
        <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
          <img 
            src="https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop" 
            alt="Laptop Kit" 
            className="w-full h-full object-cover"
          />
          <span className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md text-slate-800 font-bold text-xs px-2.5 py-1 rounded-lg border border-slate-200/50">
            $49.00
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-sm text-slate-900 mb-1">
          Ultimate Creator Kit v2.0
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed mb-4">
          Sizning raqamli ijodingiz uchun eng yaxshi uskunalar to'plami. Bugun 20% chegirma bilan xarid qiling!
        </p>

        <button className="w-full py-3 bg-[#A33B00] hover:bg-[#8F3300] text-white font-bold text-xs rounded-xl active:scale-[0.99] transition-all">
          Hozir xarid qilish
        </button>
      </div>

    </div>
  )
}