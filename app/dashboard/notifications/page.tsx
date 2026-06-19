"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { HiArrowLeft, HiOutlineBell, HiCheck } from 'react-icons/hi2'

interface NotificationActor {
  id: string
  nickname: string
  username: string
  avatar: string
}

interface NotificationType {
  id: string
  type: 'like' | 'comment' | 'follow' | 'share' | 'save'
  reelId: string | null
  commentId: string | null
  isRead: boolean
  createdAt: string
  actor: NotificationActor
}

function formatTime(timeStr: string) {
  if (!timeStr) return ''
  try {
    const date = new Date(timeStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Hozirgina'
    if (diffMins < 60) return `${diffMins} daqiqa oldin`
    if (diffHours < 24) return `${diffHours} soat oldin`
    if (diffDays === 1) return 'Kecha'
    if (diffDays < 7) return `${diffDays} kun oldin`

    return date.toLocaleDateString('uz-UZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  } catch {
    return timeStr
  }
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationType[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
      }
    } catch (err) {
      console.error('Bildirishnomalarni yuklashda xatolik:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Hammasini o'qilgan deb belgilash
  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      })
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      }
    } catch (err) {
      console.error('O\'qilgan deb belgilashda xatolik:', err)
    }
  }

  // Sahifaga kirganda o'qilmaganlarni o'qilgan deb belgilash
  useEffect(() => {
    if (notifications.length > 0 && notifications.some(n => !n.isRead)) {
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id)
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: unreadIds })
      }).catch(() => {})
    }
  }, [notifications])

  const getNotificationText = (type: string) => {
    switch (type) {
      case 'like':
        return 'sizning videongizga layk bosdi'
      case 'comment':
        return 'videongizga izoh qoldirdi'
      case 'follow':
        return 'sizga obuna bo\'la boshladi'
      case 'share':
        return 'videongizni ulashdi'
      case 'save':
        return 'videongizni saqladi'
      default:
        return 'siz bilan bog\'liq harakat bajardi'
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-10 text-slate-800 dark:text-slate-200">
      
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800/40 rounded-xl active:scale-90 transition-all text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <HiArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-black text-slate-900 dark:text-slate-100">Bildirishnomalar</span>
        </div>

        {notifications.some(n => !n.isRead) && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg border border-transparent dark:border-white/5 active:scale-95 transition-all cursor-pointer"
          >
            <HiCheck className="w-3.5 h-3.5" />
            <span>Hammasini o'qish</span>
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-2 mt-2">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 bg-white dark:bg-slate-900 border border-slate-150 dark:border-white/5 rounded-2xl flex flex-col items-center justify-center text-center p-6 transition-colors">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <HiOutlineBell className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-xs font-bold text-slate-450 dark:text-slate-500">
              Hozircha hech qanday bildirishnoma yo'q
            </p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-3.5 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-850/50 ${
                !notif.isRead ? 'ring-1 ring-blue-500/20 bg-blue-50/5 dark:bg-blue-950/5' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={notif.actor.avatar}
                  className="w-9 h-9 object-cover rounded-full bg-slate-100 dark:bg-slate-800"
                  alt=""
                />
                <div className="text-left min-w-0">
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 mr-1.5 hover:text-blue-500 cursor-pointer" onClick={() => router.push(`/dashboard/profile/${notif.actor.id}`)}>
                      {notif.actor.nickname}
                    </span>
                    {getNotificationText(notif.type)}
                  </p>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1 inline-block">
                    {formatTime(notif.createdAt)}
                  </span>
                </div>
              </div>

              {!notif.isRead && (
                <span className="w-2.5 h-2.5 bg-blue-600 rounded-full shrink-0 ml-3" />
              )}
            </div>
          ))
        )}
      </div>

    </div>
  )
}
