"use client"

import React, { useState } from 'react'
import { HiPlus } from 'react-icons/hi2'
import { StoryViewer } from './story-viewer'
import { useStories } from '@/hooks/use-stories'
import { StoryUploadModal } from './stories-upload-modal'

export const Stories = () => {
  const { otherStoryGroups, myStoryGroup, myProfile, isLoading, refetch } = useStories()
  const [activeUserIndex, setActiveUserIndex] = useState<number | null>(null)
  const [viewingMine, setViewingMine] = useState(false)
  const [showUpload, setShowUpload] = useState(false)

  const handleNextUser = () => {
    if (viewingMine) {
      setViewingMine(false)
      if (otherStoryGroups.length > 0) {
        setActiveUserIndex(0)
      } else {
        setActiveUserIndex(null)
      }
      return
    }
    if (activeUserIndex !== null && activeUserIndex < otherStoryGroups.length - 1) {
      setActiveUserIndex(activeUserIndex + 1)
    } else {
      setActiveUserIndex(null)
    }
  }

  const handlePrevUser = () => {
    if (viewingMine) {
      setViewingMine(false)
      setActiveUserIndex(null)
      return
    }
    if (activeUserIndex !== null && activeUserIndex > 0) {
      setActiveUserIndex(activeUserIndex - 1)
    } else {
      setActiveUserIndex(null)
    }
  }

  const handleMyAvatarClick = () => {
    if (myStoryGroup && myStoryGroup.stories.length > 0) {
      setViewingMine(true)
    } else {
      setShowUpload(true)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-3 overflow-x-auto -mx-2 px-2 md:mx-0 md:px-0 scrollbar-none">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-[60px] h-[60px] md:w-[66px] md:h-[66px] rounded-full bg-slate-100 dark:bg-slate-900 animate-pulse shrink-0" />
        ))}
      </div>
    )
  }

  // Deterministic Vibe Match calculation based on user ID hash
  const getVibeMatch = (userId: string): number => {
    if (!userId) return 85
    let sum = 0
    for (let i = 0; i < userId.length; i++) {
      sum += userId.charCodeAt(i)
    }
    return 75 + (sum % 25)
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-3.5 py-2.5 overflow-x-auto -mx-2 px-2 md:mx-0 md:px-0 scrollbar-none">

        {/* Mening storym */}
        {myProfile && (
          <div
            onClick={handleMyAvatarClick}
            className="flex flex-col items-center shrink-0 cursor-pointer group active:scale-95 transition-transform duration-150"
          >
            <div
              className={`relative w-[60px] h-[60px] md:w-[66px] md:h-[66px] rounded-full p-0.5 transition-colors duration-200 ${myStoryGroup && myStoryGroup.stories.length > 0
                  ? 'bg-gradient-to-tr from-amber-400 via-rose-500 to-violet-600'
                  : 'border-2 border-dashed border-slate-200 dark:border-slate-800 group-hover:border-blue-400'
                }`}
            >
              <div className="w-full h-full bg-white dark:bg-slate-950 rounded-full p-[2px]">
                <img
                  src={myProfile.avatar_url || '/default-avatar.png'}
                  className="w-full h-full object-cover rounded-full"
                  alt="Siz"
                />
              </div>
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  setShowUpload(true)
                }}
                className="absolute -bottom-0.5 -right-0.5 bg-blue-600 text-white p-[3px] rounded-full ring-[2.5px] ring-white dark:ring-slate-950 hover:bg-blue-700 transition-colors"
              >
                <HiPlus className="w-2.5 h-2.5" />
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 font-semibold">Siz</span>
          </div>
        )}

        {/* Boshqa foydalanuvchilar story'lari */}
        {otherStoryGroups.map((group, index) => {
          const vibeScore = getVibeMatch(group.user_id)
          let ringClass = "bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800"
          let badgeBg = "bg-slate-600"
          if (vibeScore >= 93) {
            ringClass = "bg-gradient-to-tr from-amber-400 via-rose-500 to-red-600"
            badgeBg = "bg-gradient-to-r from-rose-500 to-red-600"
          } else if (vibeScore >= 85) {
            ringClass = "bg-gradient-to-tr from-blue-400 via-indigo-500 to-purple-600"
            badgeBg = "bg-gradient-to-r from-blue-500 to-indigo-600"
          } else {
            ringClass = "bg-gradient-to-tr from-teal-400 via-emerald-500 to-green-600"
            badgeBg = "bg-gradient-to-r from-teal-500 to-emerald-600"
          }

          return (
            <div
              key={group.user_id}
              onClick={() => setActiveUserIndex(index)}
              className="flex flex-col items-center shrink-0 cursor-pointer active:scale-95 transition-transform duration-150 group animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="relative">
                <div className={`w-[60px] h-[60px] md:w-[66px] md:h-[66px] rounded-full ${ringClass} p-[2.5px] relative`}>
                  <div className="w-full h-full bg-white dark:bg-slate-950 rounded-full p-[2px]">
                    <img
                      src={group.avatar_url || '/default-avatar.png'}
                      className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-200"
                      alt={group.username}
                    />
                  </div>
                </div>
                {/* Vibe Match Badge (No shadows!) */}
                <span className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 ${badgeBg} text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-white dark:border-slate-950 transition-colors z-10 whitespace-nowrap`}>
                  {vibeScore}% vibe
                </span>
              </div>
              <span className="text-[10px] text-slate-600 dark:text-slate-400 mt-2.5 font-semibold truncate max-w-[64px] text-center">
                {group.username}
              </span>
            </div>
          )
        })}
      </div>

      {/* Mening story'larimni ko'rish */}
      {viewingMine && myStoryGroup && (
        <StoryViewer
          user={{
            id: myStoryGroup.user_id,
            name: 'Siz',
            avatar: myStoryGroup.avatar_url || '/default-avatar.png',
            stories: myStoryGroup.stories.map(s => ({ url: s.media_url, type: s.media_type })),
          }}
          onClose={() => setViewingMine(false)}
          onNextUser={handleNextUser}
          onPrevUser={handlePrevUser}
        />
      )}

      {/* Boshqalarning story'larini ko'rish */}
      {!viewingMine && activeUserIndex !== null && otherStoryGroups[activeUserIndex] && (
        <StoryViewer
          user={{
            id: otherStoryGroups[activeUserIndex].user_id,
            name: otherStoryGroups[activeUserIndex].nickname || otherStoryGroups[activeUserIndex].username,
            avatar: otherStoryGroups[activeUserIndex].avatar_url || '/default-avatar.png',
            stories: otherStoryGroups[activeUserIndex].stories.map(s => ({ url: s.media_url, type: s.media_type })),
          }}
          onClose={() => setActiveUserIndex(null)}
          onNextUser={handleNextUser}
          onPrevUser={handlePrevUser}
        />
      )}

      {/* Story yuklash modali */}
      {showUpload && (
        <StoryUploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            setShowUpload(false)
            refetch()
          }}
        />
      )}
    </div>
  )
}