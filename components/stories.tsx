import React from 'react'
import { HiPlus } from 'react-icons/hi2'

const mockStories = [
  { id: 1, name: 'sarah_v', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop' },
  { id: 2, name: 'm_digital', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop' },
  { id: 3, name: 'elena.art', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop' },
  { id: 4, name: 'jord_t', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop' },
]

export const Stories = () => {
  return (
    <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl overflow-x-auto no-scrollbar shadow-sm">
      
      <div className="flex flex-col items-center flex-shrink-0 cursor-pointer group">
        <div className="relative w-16 h-16 rounded-full p-[2px] border border-dashed border-slate-300 group-hover:border-blue-500 transition-colors">
          <img 
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop" 
            className="w-full h-full object-cover rounded-full" 
            alt="Siz" 
          />
          <span className="absolute bottom-0 right-0 bg-blue-600 text-white p-0.5 rounded-full ring-2 ring-white">
            <HiPlus className="w-3 h-3" />
          </span>
        </div>
        <span className="text-xs text-slate-500 mt-1.5 font-medium">Siz</span>
      </div>

      {mockStories.map((story) => (
        <div key={story.id} className="flex flex-col items-center flex-shrink-0 cursor-pointer active:scale-95 transition-transform">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 p-[2.5px]">
            <div className="w-full h-full bg-white rounded-full p-[2px]">
              <img 
                src={story.avatar} 
                className="w-full h-full object-cover rounded-full" 
                alt={story.name} 
              />
            </div>
          </div>
          <span className="text-xs text-slate-600 mt-1.5 font-medium truncate max-w-[70px]">
            {story.name}
          </span>
        </div>
      ))}

    </div>
  )
}