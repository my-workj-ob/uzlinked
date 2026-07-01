"use client"

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { HiXMark, HiChevronLeft, HiChevronRight } from 'react-icons/hi2'

interface StoryMedia {
  url: string
  type: 'image' | 'video'
}

interface StoryUser {
  id: string
  name: string
  avatar: string
  stories: StoryMedia[]
}

interface StoryViewerProps {
  user: StoryUser
  onClose: () => void
  onNextUser: () => void
  onPrevUser: () => void
}

const IMAGE_DURATION_MS = 5000 // rasm uchun 5 soniya

export const StoryViewer: React.FC<StoryViewerProps> = ({ user, onClose, onNextUser, onPrevUser }) => {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const currentStory = user.stories[currentIndex]

  // Foydalanuvchi o'zgarganda har doim birinchi story'dan boshlash
  useEffect(() => {
    setCurrentIndex(0)
  }, [user])

  const handleNext = () => {
    if (currentIndex < user.stories.length - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      onNextUser() // Agar foydalanuvchining story'lari tugasa, keyingi odamga o'tish
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
    } else {
      onPrevUser() // Agar birinchi story bo'lsa, oldingi odamga qaytish
    }
  }

  // Rasm uchun taymer logikasi (video o'zining timeupdate eventidan foydalanadi)
  useEffect(() => {
    if (!currentStory || currentStory.type === 'video') return
    if (isPaused) return

    setProgress(0)
    const intervalTime = 50
    const step = (intervalTime / IMAGE_DURATION_MS) * 100

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev + step >= 100) {
          handleNext()
          return 100
        }
        return prev + step
      })
    }, intervalTime)

    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentIndex, isPaused, currentStory?.type])

  // Video uchun progress
  useEffect(() => {
    if (!currentStory || currentStory.type !== 'video') return
    setProgress(0)

    const video = videoRef.current
    if (!video) return

    const onTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100)
      }
    }
    const onEnded = () => handleNext()

    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('ended', onEnded)

    if (!isPaused) {
      video.play().catch(() => { })
    }

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('ended', onEnded)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentIndex, currentStory?.type])

  useEffect(() => {
    const video = videoRef.current
    if (!video || currentStory?.type !== 'video') return
    if (isPaused) {
      video.pause()
    } else {
      video.play().catch(() => { })
    }
  }, [isPaused, currentStory?.type])

  if (!currentStory || !mounted) return null

  return createPortal(
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[999999] bg-black/95 md:bg-neutral-950 flex items-center justify-center select-none"
    >
      <button onClick={handlePrev} className="hidden md:flex absolute left-8 z-30 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all">
        <HiChevronLeft className="w-6 h-6" />
      </button>
      <button onClick={handleNext} className="hidden md:flex absolute right-8 z-30 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all">
        <HiChevronRight className="w-6 h-6" />
      </button>

      <div className="relative w-full h-full md:h-[92vh] md:max-w-[420px] md:rounded-2xl overflow-hidden bg-neutral-900 flex flex-col justify-center">

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
            <span className="font-semibold text-sm text-white">{user.name}</span>
            <span className="text-xs text-white/60">bugun</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/80 hover:text-white transition-colors">
            <HiXMark className="w-6 h-6" />
          </button>
        </div>

        <div
          className="absolute inset-y-0 left-0 w-[30%] z-20 cursor-pointer"
          onClick={handlePrev}
        />
        <div
          className="absolute inset-y-0 right-0 w-[70%] z-20 cursor-pointer"
          onClick={handleNext}
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        />

        {currentStory.type === 'video' ? (
          <video
            key={currentStory.url}
            ref={videoRef}
            src={currentStory.url}
            className="w-full h-full object-cover pointer-events-none"
            playsInline
            muted={false}
          />
        ) : (
          <img src={currentStory.url} alt="Story" className="w-full h-full object-cover pointer-events-none" />
        )}

        <div className="absolute bottom-5 left-4 right-4 z-30 flex gap-3 items-center">
          <input
            type="text"
            placeholder={`${user.name}ga javob yozish...`}
            className="flex-1 bg-black/20 hover:bg-black/40 focus:bg-black/60 text-white placeholder-white/60 border border-white/20 rounded-full py-3 px-5 text-sm backdrop-blur-md outline-none focus:border-white/40 transition-all"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    </div>,
    document.body
  )
}