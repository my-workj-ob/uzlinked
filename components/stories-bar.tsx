'use client'

import { STORIES_DATA } from '@/data/stories'
import React from 'react'
import { HiPlus } from 'react-icons/hi2'

interface StoriesBarProps {
    onOpenStory: (index: number) => void
}

export const StoriesBar = ({ onOpenStory }: StoriesBarProps) => {
    return (
        <div className="w-full bg-white border border-slate-100 rounded-2xl p-4 flex gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] select-none mb-6">
            {STORIES_DATA.map((user, index) => (
                <div
                    key={user.id}
                    onClick={() => !user.isMe && user.stories.length > 0 && onOpenStory(index)}
                    className="flex flex-col items-center shrink-0 cursor-pointer group"
                >
                    <div className="relative">
                        {user.isMe ? (
                            <div className="w-16 h-16 rounded-full ring-2 ring-slate-100 p-0.5 overflow-hidden relative">
                                <img src={user.avatar} alt={user.username} className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-200" />
                                <div className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-0.5 ring-2 ring-white">
                                    <HiPlus className="w-3 h-3" />
                                </div>
                            </div>
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-linear-to-tr from-amber-500 via-rose-500 to-purple-600 p-[2.5px] overflow-hidden transition-transform active:scale-95 duration-150">
                                <div className="w-full h-full bg-white rounded-full p-0.5 overflow-hidden">
                                    <img src={user.avatar} alt={user.username} className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-200" />
                                </div>
                            </div>
                        )}
                    </div>

                    <span className="text-[11px] font-medium text-slate-600 mt-1.5 max-w-17 truncate">
                        {user.isMe ? "Mening storym" : user.username}
                    </span>
                </div>
            ))}
        </div>
    )
}