"use client"

import React, { useState, useEffect } from 'react'
import { HiXMark, HiChevronLeft, HiChevronRight } from 'react-icons/hi2'

interface StoryUser {
  id: number
  name: string
  avatar: string
  stories: string[]
}

interface StoryViewerProps {
  user: StoryUser
  onClose: () => void
  onNextUser: () => void
  onPrevUser: () => void
}

export const StoryViewer: React.FC<StoryViewerProps> = ({ user, onClose, onNextUser, onPrevUser }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  // Foydalanuvchi o'zgarganda har doim birinchi story'dan boshlash
  useEffect(() => {
    setCurrentIndex(0)
  }, [user])

  // 5 soniyalik avtomatik taymer logikasi
  useEffect(() => {
    setProgress(0)
    const intervalTime = 50 // Har 50ms da progress yangilanadi

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext()
          return 100
        }
        return prev + 1
      })
    }, intervalTime)

    return () => clearInterval(timer)
  }, [user, currentIndex])

  const handleNext = () => {
    if (currentIndex < user.stories.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      onNextUser() // Agar foydalanuvchining story'lari tugasa, keyingi odamga o'tish
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    } else {
      onPrevUser() // Agar birinchi story bo'lsa, oldingi odamga qaytish
    }
  }

  return (
    <div className="fixed inset-0 z-70 bg-black/95 md:bg-neutral-950 flex items-center justify-center select-none">
      <button onClick={handlePrev} className="hidden md:flex absolute left-8 z-30 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all">
        <HiChevronLeft className="w-6 h-6" />
      </button>
      <button onClick={handleNext} className="hidden md:flex absolute right-8 z-30 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all">
        <HiChevronRight className="w-6 h-6" />
      </button>

      <div className="relative w-full h-full md:h-[92vh] md:max-w-[420px] md:rounded-2xl overflow-hidden bg-neutral-900 shadow-2xl flex flex-col justify-center">
        
        <div className="absolute top-3 left-3 right-3 z-30 flex gap-1.5 px-1">
          {user.stories.map((_, idx) => (
            <div key={idx} className="h-[3px] flex-1 bg-white/30 rounded-full overflow-hidden">
              <div 
                style={{ 
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%',
                  transition: idx === currentIndex ? 'none' : 'width 0.1s linear'
                }} 
                className="h-full bg-white rounded-full"
              />
            </div>
          ))}
        </div>

        <div className="absolute top-6 left-4 right-4 z-30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={user.avatar} alt={user.name} className="w-9 h-9 object-cover rounded-full ring-2 ring-white/50" />
            <span className="font-semibold text-sm text-white drop-shadow-md">{user.name}</span>
            <span className="text-xs text-white/60 drop-shadow-md">bugun</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/80 hover:text-white transition-colors">
            <HiXMark className="w-6 h-6" />
          </button>
        </div>

        <div className="absolute inset-y-0 left-0 w-[30%] z-20 cursor-pointer" onClick={handlePrev} />
        <div className="absolute inset-y-0 right-0 w-[70%] z-20 cursor-pointer" onClick={handleNext} />

        <img src={user.stories[currentIndex]} alt="Story" className="w-full h-full object-cover pointer-events-none" />

        <div className="absolute bottom-5 left-4 right-4 z-30 flex gap-3 items-center">
          <input 
            type="text" 
            placeholder={`${user.name}ga javob yozish...`} 
            className="flex-1 bg-black/20 hover:bg-black/40 focus:bg-black/60 text-white placeholder-white/60 border border-white/20 rounded-full py-3 px-5 text-sm backdrop-blur-md outline-none focus:border-white/40 transition-all"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      </div>
    </div>
  )
}