"use client"

import React, { useState } from 'react'
import { HiPlus, HiOutlineSparkles, HiOutlineDocumentText, HiOutlineShoppingBag, HiXMark } from 'react-icons/hi2'
import { StoryViewer } from './story-viewer'

const mockStories = [
  {
    id: 1,
    name: 'sarah_v',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop',
    stories: [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=500&auto=format&fit=crop"
    ]
  },
  {
    id: 2,
    name: 'm_digital',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop',
    stories: ["https://images.unsplash.com/photo-1515462277126-270d878326e5?w=500&auto=format&fit=crop"]
  },
  {
    id: 3,
    name: 'elena.art',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop',
    stories: ["https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&auto=format&fit=crop"]
  },
  {
    id: 4,
    name: 'jord_t',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop',
    stories: ["https://images.unsplash.com/photo-1554080353-a576cf803bda?w=500&auto=format&fit=crop"]
  },
]

export const Stories = () => {
  const [isOpen, setIsOpen] = useState(false) 
  const [activeUserIndex, setActiveUserIndex] = useState<number | null>(null) 

  const handleNextUser = () => {
    if (activeUserIndex !== null && activeUserIndex < mockStories.length - 1) {
      setActiveUserIndex(activeUserIndex + 1)
    } else {
      setActiveUserIndex(null) 
    }
  }

  const handlePrevUser = () => {
    if (activeUserIndex !== null && activeUserIndex > 0) {
      setActiveUserIndex(activeUserIndex - 1)
    } else {
      setActiveUserIndex(null) 
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-4 py-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

        <div onClick={() => setIsOpen(true)} className="flex flex-col items-center shrink-0 cursor-pointer group">
          <div className="relative w-16 h-16 rounded-full p-0.5 border border-dashed border-slate-300 group-hover:border-blue-500 transition-colors">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop" className="w-full h-full object-cover rounded-full" alt="Siz" />
            <span className="absolute bottom-0 right-0 bg-blue-600 text-white p-0.5 rounded-full ring-2 ring-white group-hover:bg-blue-700 transition-colors">
              <HiPlus className="w-3 h-3" />
            </span>
          </div>
          <span className="text-xs text-slate-500 mt-1.5 font-medium">Siz</span>
        </div>

        {mockStories.map((story, index) => (
          <div
            key={story.id}
            onClick={() => setActiveUserIndex(index)}
            className="flex flex-col items-center shrink-0 cursor-pointer active:scale-95 transition-transform"
          >
            <div className="w-16 h-16 rounded-full bg-linear-to-tr from-amber-500 via-rose-500 to-indigo-600 p-[2.5px]">
              <div className="w-full h-full bg-white rounded-full p-0.5">
                <img src={story.avatar} className="w-full h-full object-cover rounded-full" alt={story.name} />
              </div>
            </div>
            <span className="text-xs text-slate-600 mt-1.5 font-medium truncate max-w-17.5">
              {story.name}
            </span>
          </div>
        ))}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="bg-white border border-slate-100 w-full md:max-w-sm rounded-2xl p-5 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-sm text-slate-900 tracking-tight">Yaratish</h3>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600">
                <HiXMark className="w-5 h-5" />
              </button>
            </div>
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
            </div>
          </div>
        </div>
      )}

      {activeUserIndex !== null && (
        <StoryViewer
          user={mockStories[activeUserIndex]}
          onClose={() => setActiveUserIndex(null)}
          onNextUser={handleNextUser}
          onPrevUser={handlePrevUser}
        />
      )}
    </div>
  )
}