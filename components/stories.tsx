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
      <div className="flex items-center gap-3 py-3 overflow-x-auto -mx-2 px-2 md:mx-0 md:px-0">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-[60px] h-[60px] md:w-[66px] md:h-[66px] rounded-full bg-slate-100 animate-pulse shrink-0" />
        ))}
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-3 py-3 overflow-x-auto -mx-2 px-2 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

        {/* Mening storym */}
        {myProfile && (
          <div
            onClick={handleMyAvatarClick}
            className="flex flex-col items-center shrink-0 cursor-pointer group active:scale-95 transition-transform duration-150"
          >
            <div
              className={`relative w-[60px] h-[60px] md:w-[66px] md:h-[66px] rounded-full p-0.5 transition-colors duration-200 ${myStoryGroup && myStoryGroup.stories.length > 0
                  ? 'bg-gradient-to-tr from-amber-400 via-rose-500 to-violet-600'
                  : 'border-2 border-dashed border-slate-200 group-hover:border-blue-400'
                }`}
            >
              <div className="w-full h-full bg-white rounded-full p-[2px]">
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
                className="absolute -bottom-0.5 -right-0.5 bg-blue-600 text-white p-[3px] rounded-full ring-[2.5px] ring-white hover:bg-blue-700 transition-colors"
              >
                <HiPlus className="w-2.5 h-2.5" />
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1.5 font-semibold">Siz</span>
          </div>
        )}

        {/* Boshqa foydalanuvchilar story'lari */}
        {otherStoryGroups.map((group, index) => (
          <div
            key={group.user_id}
            onClick={() => setActiveUserIndex(index)}
            className="flex flex-col items-center shrink-0 cursor-pointer active:scale-95 transition-transform duration-150 group"
          >
            <div className="w-[60px] h-[60px] md:w-[66px] md:h-[66px] rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-violet-600 p-[2.5px]">
              <div className="w-full h-full bg-white rounded-full p-[2px]">
                <img
                  src={group.avatar_url || '/default-avatar.png'}
                  className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-200"
                  alt={group.username}
                />
              </div>
            </div>
            <span className="text-[10px] text-slate-600 mt-1.5 font-semibold truncate max-w-[64px] text-center">
              {group.username}
            </span>
          </div>
        ))}
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