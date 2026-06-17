"use client"

import React, { useState } from 'react'
import { HiPlus } from 'react-icons/hi2'
import { StoryViewer } from './story-viewer'
import { STORIES_DATA } from '@/data/stories'

export const Stories = () => {
  const [activeUserIndex, setActiveUserIndex] = useState<number | null>(null)

  // "isMe" bo'lmagan story'larni ajratish
  const storyUsers = STORIES_DATA.filter(u => !u.isMe && u.stories.length > 0)
  const myStory = STORIES_DATA.find(u => u.isMe)

  const handleNextUser = () => {
    if (activeUserIndex !== null && activeUserIndex < storyUsers.length - 1) {
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
      <div className="flex items-center gap-3 py-3 overflow-x-auto -mx-2 px-2 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

        {/* Mening storym */}
        {myStory && (
          <div className="flex flex-col items-center shrink-0 cursor-pointer group">
            <div className="relative w-[60px] h-[60px] md:w-[66px] md:h-[66px] rounded-full p-0.5 border-2 border-dashed border-slate-200 group-hover:border-blue-400 transition-colors duration-200">
              <img
                src={myStory.avatar}
                className="w-full h-full object-cover rounded-full"
                alt="Siz"
              />
              <span className="absolute -bottom-0.5 -right-0.5 bg-blue-600 text-white p-[3px] rounded-full ring-[2.5px] ring-white group-hover:bg-blue-700 transition-colors">
                <HiPlus className="w-2.5 h-2.5" />
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1.5 font-semibold">Siz</span>
          </div>
        )}

        {/* Boshqa foydalanuvchilar story'lari */}
        {storyUsers.map((story, index) => (
          <div
            key={story.id}
            onClick={() => setActiveUserIndex(index)}
            className="flex flex-col items-center shrink-0 cursor-pointer active:scale-95 transition-transform duration-150 group"
          >
            <div className="w-[60px] h-[60px] md:w-[66px] md:h-[66px] rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-violet-600 p-[2.5px]">
              <div className="w-full h-full bg-white rounded-full p-[2px]">
                <img
                  src={story.avatar}
                  className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-200"
                  alt={story.username}
                />
              </div>
            </div>
            <span className="text-[10px] text-slate-600 mt-1.5 font-semibold truncate max-w-[64px] text-center">
              {story.username}
            </span>
          </div>
        ))}
      </div>

      {/* Story Viewer */}
      {activeUserIndex !== null && storyUsers[activeUserIndex] && (
        <StoryViewer
          user={{
            id: storyUsers[activeUserIndex].id,
            name: storyUsers[activeUserIndex].username,
            avatar: storyUsers[activeUserIndex].avatar,
            stories: storyUsers[activeUserIndex].stories,
          }}
          onClose={() => setActiveUserIndex(null)}
          onNextUser={handleNextUser}
          onPrevUser={handlePrevUser}
        />
      )}
    </div>
  )
}