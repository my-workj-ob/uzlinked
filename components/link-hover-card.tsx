"use client"

import React, { useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

const supabase = createClient()

// Global cache for profiles to prevent redundant network requests
const profileCache: Record<string, { id: string; nickname: string; username: string; avatar_url: string | null; bio: string | null }> = {}

export function HoverCardUsername({ username, token }: { username: string; token: string }) {
  const [hovered, setHovered] = useState(false)
  const [profile, setProfile] = useState<any>(profileCache[username] || null)
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const timeoutRef = useRef<any>(null)

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setHovered(true)

    if (!profile && !loading && !notFound) {
      setLoading(true)
      supabase
        .from('profiles')
        .select('id, nickname, username, avatar_url, bio')
        .eq('username', username.toLowerCase())
        .maybeSingle()
        .then(({ data, error }: any) => {
          setLoading(false)
          if (error || !data) {
            setNotFound(true)
          } else {
            profileCache[username] = data
            setProfile(data)
          }
        })
    }
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setHovered(false)
    }, 250) // Small delay to let user move mouse into the card
  }

  const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'

  return (
    <span
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href={profile ? `/dashboard/profile/${profile.id}` : '#'}
        onClick={(e) => {
          if (!profile) e.preventDefault()
        }}
        className="text-blue-500 dark:text-blue-400 font-bold hover:underline cursor-pointer"
      >
        {token}
      </Link>

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 4 }}
            transition={{ duration: 0.15 }}
            onMouseEnter={() => {
              if (timeoutRef.current) clearTimeout(timeoutRef.current)
            }}
            onMouseLeave={handleMouseLeave}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-100 dark:border-white/10 rounded-2xl shadow-2xl z-[999] text-left"
          >
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notFound ? (
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 py-1 text-center">
                Profil topilmadi
              </div>
            ) : profile ? (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-3">
                  <img
                    src={profile.avatar_url || FALLBACK_AVATAR}
                    alt=""
                    className="w-12 h-12 object-cover rounded-2xl shadow-sm shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {profile.nickname}
                    </h4>
                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate">
                      @{profile.username}
                    </p>
                  </div>
                </div>
                {profile.bio && (
                  <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed line-clamp-2">
                    {profile.bio}
                  </p>
                )}
                <Link
                  href={`/dashboard/profile/${profile.id}`}
                  className="w-full mt-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-center text-xs font-bold rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/20"
                >
                  Profilni ko'rish
                </Link>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}

export function renderMessageText(text: string | null, isDeleted?: boolean) {
  if (!text) return null
  if (isDeleted) return text

  const regex = /(https?:\/\/[^\s]+|@[a-zA-Z0-9_]+)/g
  const parts = text.split(regex)
  const matches = text.match(regex) || []

  let matchIndex = 0
  return parts.map((part, index) => {
    if (matches[matchIndex] && part === matches[matchIndex]) {
      const token = matches[matchIndex]
      matchIndex++

      if (token.startsWith('http://') || token.startsWith('https://')) {
        return (
          <a
            key={index}
            href={token}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline break-all font-semibold"
          >
            {token}
          </a>
        )
      } else if (token.startsWith('@')) {
        const username = token.slice(1)
        return (
          <HoverCardUsername key={index} username={username} token={token} />
        )
      }
    }
    return part
  })
}
