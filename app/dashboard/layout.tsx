'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  HiHome, HiOutlineHome,
  HiRss, HiOutlineRss,
  HiChatBubbleLeftRight, HiOutlineChatBubbleLeftRight,
  HiCog6Tooth, HiOutlineCog6Tooth,
  HiPlus, HiBell, HiOutlineBell, HiOutlineEnvelope,
  HiVideoCamera, HiOutlineVideoCamera,
  HiSun, HiMoon,
  HiUser, HiOutlineUser,
  HiMagnifyingGlass, HiOutlineMagnifyingGlass
} from 'react-icons/hi2'
import { CreateWizard } from '@/components/create-wizard'
import { createClient } from '@/utils/supabase/client'
import { Loader2 } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

const DashboardLayout = ({ children }: LayoutProps) => {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const sidebarItems = [
    { id: 'home', path: '/dashboard', label: 'Bosh sahifa', IconActive: HiHome, IconOutline: HiOutlineHome },
    { id: 'explore', path: '/dashboard/explore', label: 'Qidiruv', IconActive: HiMagnifyingGlass, IconOutline: HiOutlineMagnifyingGlass },
    { id: 'reels', path: '/dashboard/reels', label: 'Reels', IconActive: HiVideoCamera, IconOutline: HiOutlineVideoCamera },
    { id: 'messages', path: '/dashboard/messages', label: 'Xabarlar', IconActive: HiChatBubbleLeftRight, IconOutline: HiOutlineChatBubbleLeftRight },
    { id: 'notifications', path: '/dashboard/notifications', label: 'Bildirishnomalar', IconActive: HiBell, IconOutline: HiOutlineBell },
    { id: 'profile', path: '/dashboard/profile', label: 'Profil', IconActive: HiCog6Tooth, IconOutline: HiOutlineCog6Tooth },
  ]

  const bottomNavItems = [
    { id: 'home', path: '/dashboard', label: 'Bosh sahifa', IconActive: HiHome, IconOutline: HiOutlineHome },
    { id: 'explore', path: '/dashboard/explore', label: 'Qidiruv', IconActive: HiMagnifyingGlass, IconOutline: HiOutlineMagnifyingGlass },
    { id: 'reels', path: '/dashboard/reels', label: 'Reels', IconActive: HiVideoCamera, IconOutline: HiOutlineVideoCamera },
    { id: 'messages', path: '/dashboard/messages', label: 'Xabarlar', IconActive: HiChatBubbleLeftRight, IconOutline: HiOutlineChatBubbleLeftRight },
    { id: 'profile', path: '/dashboard/profile', label: 'Profil', IconActive: HiCog6Tooth, IconOutline: HiOutlineCog6Tooth },
  ]

  const isReelsPage = pathname === '/dashboard/reels'
  const isMessagesPage = pathname.startsWith('/dashboard/messages') || pathname.startsWith('/dashboard/groups') || pathname.startsWith('/dashboard/channels')

  const getPageTitle = (path: string) => {
    if (path === '/dashboard') return 'Bosh sahifa'
    if (path.startsWith('/dashboard/explore')) return 'Kashf eting'
    if (path.startsWith('/dashboard/reels')) return 'Reels'
    if (path.startsWith('/dashboard/messages')) return 'Xabarlar'
    if (path.startsWith('/dashboard/notifications')) return 'Bildirishnomalar'
    if (path.startsWith('/dashboard/profile')) return 'Profil'
    if (path.startsWith('/dashboard/settings')) return 'Sozlamalar'
    if (path.startsWith('/dashboard/market')) return "E'lonlar"
    return 'VibeGrid'
  }

  const [user, setUser] = useState<any>(null)
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [isMsgOpen, setIsMsgOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)
  const [unreadMsgCount, setUnreadMsgCount] = useState(0)

  // Version update checker
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [latestCommit, setLatestCommit] = useState<{
    commitSha: string
    message: string
    author: string
    date: string
  } | null>(null)
  const [isUpdateDismissed, setIsUpdateDismissed] = useState(false)

  // Drag state for bottom sheet swipe-down to dismiss
  const [updateDragY, setUpdateDragY] = useState(0)
  const updateTouchStartRef = useRef<number | null>(null)
  const isUpdateDraggingRef = useRef(false)

  const handleUpdateTouchStart = (e: React.TouchEvent) => {
    updateTouchStartRef.current = e.touches[0].clientY
    isUpdateDraggingRef.current = true
  }

  const handleUpdateTouchMove = (e: React.TouchEvent) => {
    if (!isUpdateDraggingRef.current || updateTouchStartRef.current === null) return
    const currentY = e.touches[0].clientY
    const deltaY = currentY - updateTouchStartRef.current
    if (deltaY > 0) {
      setUpdateDragY(deltaY)
    } else {
      setUpdateDragY(0)
    }
  }

  const handleUpdateTouchEnd = () => {
    isUpdateDraggingRef.current = false
    updateTouchStartRef.current = null
    if (updateDragY > 80) {
      setShowUpdateModal(false)
      setIsUpdateDismissed(true)
      if (latestCommit?.commitSha) {
        localStorage.setItem('dismissed_commit_sha', latestCommit.commitSha)
      }
    }
    setUpdateDragY(0)
  }

  useEffect(() => {
    const clientSha = process.env.NEXT_PUBLIC_COMMIT_SHA || 'local-dev'
    const checkUpdate = async () => {
      if (isUpdateDismissed) return
      try {
        const res = await fetch('/api/version')
        if (res.ok) {
          const data = await res.json()
          if (data.commitSha && data.commitSha !== clientSha) {
            const dismissedSha = localStorage.getItem('dismissed_commit_sha')
            if (dismissedSha === data.commitSha) {
              return
            }
            setLatestCommit({
              commitSha: data.commitSha,
              message: data.message,
              author: data.author,
              date: data.date
            })
            setShowUpdateModal(true)
          }
        }
      } catch (err) {
        console.warn('Xatolik yangilanishni tekshirishda:', err)
      }
    }
    checkUpdate()
    const interval = setInterval(checkUpdate, 60000)
    return () => clearInterval(interval)
  }, [isUpdateDismissed])




  // Pull to Refresh states & handlers
  const mainRef = useRef<HTMLDivElement>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const pullTouchStartRef = useRef<number | null>(null)
  const pullTouchStartXRef = useRef<number | null>(null)
  const pullDirectionLockRef = useRef<'none' | 'vertical' | 'horizontal'>('none')
  const isPullingRef = useRef(false)

  const handleMainTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const disablePull = isReelsPage || isMessagesPage || isRefreshing
    if (disablePull) return

    // Horizontal scroll container yoki data-no-pull elementlar ichida bo'lsa pull-to-refresh'ni o'chirish
    const isInsideHorizontalContainer = (el: HTMLElement | null): boolean => {
      let curr = el
      while (curr && curr !== mainRef.current && curr !== document.body) {
        if (
          curr.classList.contains('overflow-x-auto') ||
          curr.classList.contains('overflow-x-scroll') ||
          curr.hasAttribute('data-no-pull') ||
          (curr.className && typeof curr.className === 'string' && (
            curr.className.includes('overflow-x-auto') ||
            curr.className.includes('overflow-x-scroll')
          ))
        ) {
          return true
        }
        const style = window.getComputedStyle(curr)
        if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
          return true
        }
        curr = curr.parentElement
      }
      return false
    }

    const target = e.target as HTMLElement
    if (isInsideHorizontalContainer(target)) {
      isPullingRef.current = false
      return
    }

    // Faqat scroll tepada bo'lsa boshlash
    if (mainRef.current && mainRef.current.scrollTop === 0) {
      pullTouchStartRef.current = e.touches[0].clientY
      pullTouchStartXRef.current = e.touches[0].clientX
      pullDirectionLockRef.current = 'none'
      isPullingRef.current = true
    } else {
      isPullingRef.current = false
    }
  }

  const currentPullDistanceRef = useRef(0)

  const handleMainTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const disablePull = isReelsPage || isMessagesPage || isRefreshing
    if (disablePull || !isPullingRef.current || pullTouchStartRef.current === null || pullTouchStartXRef.current === null) return

    const currentY = e.touches[0].clientY
    const currentX = e.touches[0].clientX
    const deltaY = currentY - pullTouchStartRef.current
    const deltaX = currentX - pullTouchStartXRef.current

    if (pullDirectionLockRef.current === 'none') {
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      // Kichik threshold (6px) — tez va aniq qaror qabul qilish
      if (absX > 12 || absY > 12) {
        if (absX > absY) {
          // Aniq horizontal harakat
          pullDirectionLockRef.current = 'horizontal'
          isPullingRef.current = false
          setPullDistance(0)
          currentPullDistanceRef.current = 0
          return
        } else if (deltaY > 0 && absY > absX * 5) {
          // Aniq vertikal pastga tortish
          pullDirectionLockRef.current = 'vertical'
        } else {
          // Diagonal yoki yuqoriga harakat — pull-to-refresh'ni bekor qilish
          pullDirectionLockRef.current = 'horizontal'
          isPullingRef.current = false
          setPullDistance(0)
          currentPullDistanceRef.current = 0
          return
        }
      } else {
        return
      }
    }

    if (pullDirectionLockRef.current === 'horizontal') return

    if (pullDirectionLockRef.current === 'vertical' && deltaY > 0) {
      const distance = Math.min(100, deltaY / 3.0)
      setPullDistance(distance)
      currentPullDistanceRef.current = distance
    } else {
      setPullDistance(0)
      currentPullDistanceRef.current = 0
      isPullingRef.current = false
    }
  }

  const handleMainTouchEnd = () => {
    isPullingRef.current = false
    pullTouchStartRef.current = null
    pullTouchStartXRef.current = null
    pullDirectionLockRef.current = 'none'

    if (currentPullDistanceRef.current > 90) {
      setIsRefreshing(true)
      setTimeout(() => {
        window.location.reload()
      }, 800)
    } else {
      setPullDistance(0)
    }
    currentPullDistanceRef.current = 0
  }


  // Mavzuni boshlang'ich yuklash
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  // Supabase'dan foydalanuvchi ma'lumotlarini yuklash
  useEffect(() => {
    const getProfile = async () => {
      try {
        const { data } = await supabase.auth.getUser()
        const user = data?.user
        if (user) {
          setUser(user)

          const userAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture

          if (userAvatar) {
            setAvatarUrl(userAvatar)
          } else {
            const name = user.user_metadata?.full_name || user.email || 'U'
            setAvatarUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff&bold=true`)
          }
        }
      } catch (err: any) {
        if (err?.message?.includes('Failed to fetch') || err?.message?.includes('fetch')) {
          console.warn("Profilni yuklashda tarmoq xatoligi:", err)
        } else {
          console.error("Profilni yuklashda xatolik:", err)
        }
      }
    }

    getProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        setUser(session.user)
        setAvatarUrl(session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.email || 'U')}`)
      } else {
        setUser(null)
        setAvatarUrl('')
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  // Track user online status globally using Supabase Presence
  useEffect(() => {
    if (!user?.id) return

    const presenceChannel = supabase.channel('online-status', {
      config: {
        presence: {
          key: user.id,
        },
      },
    })

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const onlineIds = Object.keys(state)
          ; (window as any).supabaseOnlineUserIds = onlineIds
        window.dispatchEvent(new CustomEvent('supabase-online-users', { detail: onlineIds }))
      })
      .subscribe(async (status: any) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      presenceChannel.unsubscribe()
    }
  }, [user?.id, supabase])

  // Fetch real unread notifications count from Supabase
  useEffect(() => {
    if (!user?.id) return

    const fetchUnreadNotifCount = async () => {
      try {
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)

        if (!error && count !== null) {
          setUnreadNotifCount(count)
        }
      } catch (err) {
        console.warn('Error fetching unread notifications count:', err)
      }
    }

    fetchUnreadNotifCount()

    const notifChannel = supabase
      .channel(`notifications-count:${user.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => fetchUnreadNotifCount()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(notifChannel)
    }
  }, [user?.id, supabase])

  // Fetch unread direct messages count from Supabase
  useEffect(() => {
    if (!user?.id) return

    const fetchUnreadMsgCount = async () => {
      try {
        const { data: myChats, error: chatsErr } = await supabase
          .from('chats')
          .select('id')
          .or(`user_one.eq.${user.id},user_two.eq.${user.id}`)

        if (!chatsErr && myChats && myChats.length > 0) {
          const myChatIds = myChats.map((c: any) => c.id)
          const { count, error: msgErr } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .in('chat_id', myChatIds)
            .neq('sender_id', user.id)
            .eq('is_read', false)

          if (!msgErr && count !== null) {
            setUnreadMsgCount(count)
          }
        } else {
          setUnreadMsgCount(0)
        }
      } catch (err) {
        console.warn('Error fetching unread messages count:', err)
      }
    }

    fetchUnreadMsgCount()

    const msgChannel = supabase
      .channel(`messages-count:${user.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => fetchUnreadMsgCount()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(msgChannel)
    }
  }, [user?.id, supabase])

  // Dynamic height handling for mobile keyboard to prevent header shift
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight
      document.documentElement.style.setProperty('--vh', `${vh}px`)
      document.body.style.height = `${vh}px`
      document.body.style.overflow = 'hidden'
      window.scrollTo(0, 0)
    }

    handleResize()

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize)
      window.visualViewport.addEventListener('scroll', handleResize)
    } else {
      window.addEventListener('resize', handleResize)
    }

    return () => {
      document.body.style.height = ''
      document.body.style.overflow = ''
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize)
        window.visualViewport.removeEventListener('scroll', handleResize)
      } else {
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [])

  // Swipe and slide transitions state
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left')
  const [prevPathname, setPrevPathname] = useState(pathname)

  // Automatically compute slide direction on pathname change
  useEffect(() => {
    if (pathname !== prevPathname) {
      const oldIndex = bottomNavItems.findIndex(item => prevPathname === item.path)
      const newIndex = bottomNavItems.findIndex(item => pathname === item.path)

      if (oldIndex !== -1 && newIndex !== -1) {
        if (newIndex > oldIndex) {
          setSlideDirection('left')
        } else if (newIndex < oldIndex) {
          setSlideDirection('right')
        }
      }
      setPrevPathname(pathname)
    }
  }, [pathname, prevPathname, bottomNavItems])

  // Touch Swipe handlers for tab switching
  const handleTouchStart = (e: React.TouchEvent) => {
    const hasActiveChat = typeof window !== 'undefined' && (
      window.location.search.includes('chat=') ||
      window.location.search.includes('partner=')
    )
    const disableSwipe = pathname === '/dashboard/explore' || pathname.startsWith('/dashboard/groups/') || pathname.startsWith('/dashboard/channels/') || (pathname === '/dashboard/messages' && hasActiveChat)

    if (disableSwipe) return
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const hasActiveChat = typeof window !== 'undefined' && (
      window.location.search.includes('chat=') ||
      window.location.search.includes('partner=')
    )
    const disableSwipe = pathname === '/dashboard/explore' || pathname.startsWith('/dashboard/groups/') || pathname.startsWith('/dashboard/channels/') || (pathname === '/dashboard/messages' && hasActiveChat)

    if (disableSwipe || touchStart === null) return
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    const hasActiveChat = typeof window !== 'undefined' && (
      window.location.search.includes('chat=') ||
      window.location.search.includes('partner=')
    )
    const disableSwipe = pathname === '/dashboard/explore' || pathname.startsWith('/dashboard/groups/') || pathname.startsWith('/dashboard/channels/') || (pathname === '/dashboard/messages' && hasActiveChat)

    if (disableSwipe || touchStart === null || touchEnd === null) return
    const distance = touchStart - touchEnd
    const minSwipeDistance = 65 // minimum swipe distance in px

    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = bottomNavItems.findIndex(item => pathname === item.path)
      if (currentIndex !== -1) {
        if (isLeftSwipe && currentIndex < bottomNavItems.length - 1) {
          router.push(bottomNavItems[currentIndex + 1].path)
        } else if (isRightSwipe && currentIndex > 0) {
          router.push(bottomNavItems[currentIndex - 1].path)
        }
      }
    }
  }

  // Circular reveal animatsiyasi bilan dark mode toggle
  const toggleTheme = (e: React.MouseEvent) => {
    const nextDark = !isDark

    if (!(document as any).startViewTransition) {
      setIsDark(nextDark)
      if (nextDark) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      }
      return
    }

    const x = e.clientX
    const y = e.clientY
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    const transition = (document as any).startViewTransition(() => {
      setIsDark(nextDark)
      if (nextDark) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      }
    })

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`
      ]
      document.documentElement.animate(
        {
          clipPath: nextDark ? clipPath : [...clipPath].reverse()
        },
        {
          duration: 400,
          easing: 'ease-in-out',
          pseudoElement: nextDark
            ? '::view-transition-new(root)'
            : '::view-transition-old(root)'
        }
      )
    })
  }

  // Soxta bildirishnomalar va xabarlar ro'yxati
  const notifications = [
    { id: 1, user: "Sardor Kamilov", action: "rasmingizga layk bosdi", time: "2 daqiqa oldin", unread: true },
    { id: 2, user: "Madina Axmedova", action: "sizni guruhga qo'shdi", time: "1 soat oldin", unread: true },
    { id: 3, user: "Jasur Shukurov", action: "izohingizga javob berdi", time: "Iyul 15", unread: false },
  ]

  const messages = [
    { id: 1, user: "Anvar Sanaev", text: "Ertaga ko'rishamizmi? Loyihani...", time: "12:40", unread: true },
    { id: 2, user: "Zilola Ergasheva", text: "Yuborgan faylingiz ochilmadi.", time: "Kecha", unread: false },
  ]



  const handleCreateClick = () => {
    if (!user) {
      router.push('/login')
    } else {
      setIsCreateOpen(true)
    }
  }



  return (
    <div
      style={{ height: 'var(--vh, 100dvh)' }}
      className="w-full max-w-[100dvw] bg-[#F8FAFC] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans antialiased overflow-hidden relative selection:bg-blue-500 selection:text-white transition-colors duration-300"
    >

      {/* MOBILE HEADER: Glassmorphism, hidden on Reels and Messages pages */}
      {!isReelsPage && !isMessagesPage && (
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-16 px-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-100 dark:border-white/5 select-none transition-all duration-300 md:hidden">
          <span className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
            {getPageTitle(pathname)}
          </span>

          <div className="flex items-center gap-2 relative">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40 active:scale-90 transition-all"
            >
              {isDark ? <HiSun className="w-5 h-5 text-amber-500" /> : <HiMoon className="w-5 h-5" />}
            </button>

            {/* Qidiruv (Search) Button */}
            {!pathname.startsWith('/dashboard/explore') && (
              <button
                onClick={() => router.push('/dashboard/explore?focus=true')}
                className="p-2 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40 active:scale-90 transition-all cursor-pointer"
              >
                <HiOutlineMagnifyingGlass className="w-6 h-6" />
              </button>
            )}

            {user && (
              <>
                {/* Bildirishnomalar link */}
                <div className="relative">
                  <button
                    onClick={() => router.push('/dashboard/notifications')}
                    className="p-2 rounded-full active:scale-90 transition-all duration-150 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40 cursor-pointer"
                  >
                    <HiOutlineBell className="w-6 h-6" />
                    {unreadNotifCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-rose-500 text-white text-[9px] font-bold rounded-full ring-2 ring-white dark:ring-slate-900">
                        {unreadNotifCount}
                      </span>
                    )}
                  </button>
                </div>
              </>
            )}

            {user ? (
              <button
                onClick={handleCreateClick}
                className="p-2 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40 active:scale-90 transition-all cursor-pointer"
              >
                <HiPlus className="w-6 h-6" />
              </button>
            ) : (
              <Link href="/login" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl active:scale-95 transition-all shrink-0">
                Kirish
              </Link>
            )}
          </div>
        </header>
      )}

      {/* DESKTOP SIDEBAR */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex w-full max-w-[1440px] mx-auto h-full relative"
      >
        <aside className="sticky top-0 h-screen hidden w-64 p-6 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-white/5 md:flex flex-col z-30 flex-shrink-0 transition-colors duration-300">
          <Link href="/dashboard" className="mb-10 text-2xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent block">
            VibeGrid
          </Link>

          <nav className="flex flex-col gap-1.5 flex-1">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.path
              const Icon = isActive ? item.IconActive : item.IconOutline

              let badgeCount = 0
              if (item.id === 'messages') {
                badgeCount = unreadMsgCount
              } else if (item.id === 'notifications') {
                badgeCount = unreadNotifCount
              }

              return (
                <Link
                  key={item.id}
                  href={item.path}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] text-left ${isActive
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <Icon className={`w-6 h-6 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span className="text-sm">{item.label}</span>
                  </div>
                  {badgeCount > 0 && (
                    <span className={`min-w-[18px] h-4.5 px-1.5 flex items-center justify-center text-[10px] font-black rounded-full text-white ${item.id === 'messages' ? 'bg-blue-600' : 'bg-rose-500'
                      }`}>
                      {badgeCount}
                    </span>
                  )}
                </Link>
              )
            })}

            {/* Desktop Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all duration-200 active:scale-[0.98] text-left w-full cursor-pointer"
            >
              {isDark ? (
                <>
                  <HiSun className="w-6 h-6 text-amber-500" />
                  <span className="text-sm">Yorug' rejim</span>
                </>
              ) : (
                <>
                  <HiMoon className="w-6 h-6 text-indigo-600" />
                  <span className="text-sm">Tungi rejim</span>
                </>
              )}
            </button>

            {user ? (
              <button
                onClick={handleCreateClick}
                className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl transition-all active:scale-[0.98]"
              >
                <HiPlus className="w-5 h-5" />
                <span>Yangi qo'shish</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all active:scale-[0.98]"
              >
                <span>Tizimga kirish</span>
              </Link>
            )}
          </nav>

          {/* DESKTOP USER SECTION & PREMIUM CARD */}
          {user && (
            <div className="mt-auto flex flex-col gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white relative overflow-hidden group">
                <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
                <h4 className="font-bold text-sm mb-0.5">Premiumga o'ting</h4>
                <p className="text-[11px] text-blue-100 mb-3 leading-relaxed">Cheksiz video va darsliklar yuklash imkoniyati.</p>
                <button className="w-full py-2 bg-white text-blue-600 font-bold text-xs rounded-xl hover:bg-blue-50 active:scale-95 transition-all relative z-10">
                  Batafsil
                </button>
              </div>

              <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
                <div className="w-9 h-9 overflow-hidden rounded-full ring-2 ring-slate-200 dark:ring-slate-800 flex-shrink-0">
                  {avatarUrl && <img src={avatarUrl} alt="Avatar" className="object-cover w-full h-full" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{user.user_metadata?.full_name || 'Foydalanuvchi'}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-lg transition-colors text-xs font-semibold"
                  title="Chiqish"
                >
                  Chiqish
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* MAIN CONTENT AREA */}
        <main
          ref={mainRef}
          onTouchStart={handleMainTouchStart}
          onTouchMove={handleMainTouchMove}
          onTouchEnd={handleMainTouchEnd}
          className={`relative flex-1 min-w-0 h-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none ${isReelsPage
            ? 'pt-0 pb-0 bg-black overflow-hidden'
            : isMessagesPage
              ? 'pt-0 pb-0 overflow-hidden'
              : 'pt-16 pb-24 md:py-8 overflow-y-auto'
            }`}
        >
          {/* Pull to Refresh Indicator */}
          {pullDistance > 35 && (
            <div
              style={{
                transform: `translateY(${pullDistance - 55}px)`,
                opacity: Math.min(1, (pullDistance - 35) / 25),
                transition: isPullingRef.current ? 'none' : 'transform 0.3s cubic-bezier(0.1, 0.76, 0.55, 0.94), opacity 0.3s'
              }}
              className="absolute left-0 right-0 top-0 z-40 flex items-center justify-center pointer-events-none pt-4"
            >
              <div className="bg-white/80 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/40 dark:border-white/10 shadow-lg px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                {isRefreshing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Yangilanmoqda...</span>
                  </>
                ) : (
                  <>
                    <div
                      style={{ transform: `rotate(${pullDistance * 4}deg)` }}
                      className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full transition-transform duration-100"
                    />

                  </>
                )}
              </div>
            </div>
          )}

          <div className={`mx-auto ${isReelsPage || isMessagesPage
            ? 'w-full h-full max-w-none px-0'
            : 'w-full max-w-2xl px-4 md:px-6'
            }`}>
            <div
              key={pathname}
              style={{
                transform: pullDistance > 0 && !isRefreshing ? `translateY(${pullDistance * 0.4}px)` : 'none',
                transition: isPullingRef.current ? 'none' : 'transform 0.3s cubic-bezier(0.1, 0.76, 0.55, 0.94)'
              }}
              className={`w-full h-full ${!pathname.includes('explore') && (slideDirection === 'left' ? 'animate-slide-from-right' : 'animate-slide-from-left')
                }`}
            >
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* UPDATE AVAILABLE BOTTOM SHEET */}
      {showUpdateModal && latestCommit && (
        <div className="fixed inset-0 z-70 flex items-end justify-center md:pb-10 p-0 md:p-4 animate-fade-in">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => {
              setShowUpdateModal(false)
              setIsUpdateDismissed(true)
              if (latestCommit?.commitSha) {
                localStorage.setItem('dismissed_commit_sha', latestCommit.commitSha)
              }
            }}
          />

          {/* Bottom Sheet Card */}
          <div
            onTouchStart={handleUpdateTouchStart}
            onTouchMove={handleUpdateTouchMove}
            onTouchEnd={handleUpdateTouchEnd}
            style={{
              transform: `translateY(${updateDragY}px)`,
              transition: isUpdateDraggingRef.current ? 'none' : 'transform 0.3s cubic-bezier(0.1, 0.76, 0.55, 0.94)',
              animation: 'androidSlideUp 0.4s cubic-bezier(0.1, 0.76, 0.55, 0.94) forwards'
            }}
            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t md:border border-slate-200/50 dark:border-white/5 w-full md:max-w-md rounded-t-[32px] md:rounded-[32px] p-6 pb-8 md:pb-6 shadow-2xl relative z-10 flex flex-col select-none"
          >
            {/* Drag Handle */}
            <div className="flex justify-center cursor-grab active:cursor-grabbing pb-4 md:hidden">
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>

            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/20">
                <HiOutlineRss className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                  Yangilanish mavjud
                  <span className="text-[10px] px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-full font-extrabold font-mono">
                    {latestCommit.commitSha.substring(0, 7)}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                  Tizimning yangi versiyasi tayyor
                </p>
              </div>
            </div>

            {/* Commit Message Box */}
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-white/5 rounded-2xl p-4 mb-5 text-left">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                O'zgarishlar tavsifi:
              </p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed italic">
                "{latestCommit.message}"
              </p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-white/5 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                <span>Muallif: {latestCommit.author}</span>
                <span>{new Date(latestCommit.date).toLocaleDateString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full">
              <button
                onClick={() => {
                  setShowUpdateModal(false)
                  setIsUpdateDismissed(true)
                  if (latestCommit?.commitSha) {
                    localStorage.setItem('dismissed_commit_sha', latestCommit.commitSha)
                  }
                }}
                className="flex-1 py-3.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-extrabold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 active:scale-95 transition-all"
              >
                Shart emas
              </button>
              <button
                onClick={() => {
                  setShowUpdateModal(false)
                  window.location.reload()
                }}
                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
              >
                Yangilash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION */}
      {!isMessagesPage && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 md:hidden px-3 flex justify-around items-center pb-[env(safe-area-inset-bottom)] transition-all duration-300 border-t bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-100 dark:border-white/5">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.path
            const Icon = isActive ? item.IconActive : item.IconOutline

            let badgeCount = 0
            if (item.id === 'messages') {
              badgeCount = unreadMsgCount
            }

            return (
              <Link
                key={item.id}
                href={item.path}
                className={`flex items-center justify-center transition-all duration-300 ease-in-out select-none active:scale-95 ${isActive
                  ? 'bg-blue-600 text-white rounded-full px-4 py-2.5'
                  : 'bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
              >
                <div className="relative">
                  {item.id === 'profile' && user && avatarUrl ? (
                    <div className={`w-5 h-5 overflow-hidden rounded-full ring-1 ${isActive
                      ? 'ring-white'
                      : 'ring-slate-350 dark:ring-slate-700'
                      } shrink-0`}>
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-105' : 'scale-100'}`} />
                  )}
                  {badgeCount > 0 && !isActive && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 flex items-center justify-center bg-blue-600 text-white text-[8px] font-black rounded-full ring-1 ring-white dark:ring-slate-900 animate-scale-in">
                      {badgeCount}
                    </span>
                  )}
                </div>

                <span className={`overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap text-xs font-semibold ${isActive
                  ? 'max-w-24 opacity-100 ml-2'
                  : 'max-w-0 opacity-0 ml-0'
                  }`}>
                  {item.label}
                  {badgeCount > 0 && isActive && (
                    <span className="ml-1 px-1.5 py-0.5 bg-white text-blue-600 text-[8px] font-black rounded-full">
                      {badgeCount}
                    </span>
                  )}
                </span>
              </Link>
            )
          })}
        </nav>
      )}

      {/* CREATE MODAL / DRAWER */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-65 flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsCreateOpen(false)}
          />

          <div
            style={{
              animation: 'androidSlideUp 0.35s cubic-bezier(0.1, 0.76, 0.55, 0.94) forwards'
            }}
            className="bg-white dark:bg-slate-900 w-full md:max-w-md rounded-t-[28px] md:rounded-2xl px-4 py-6 pb-8 md:p-6 md:pb-8 relative z-10 border border-neutral-100 dark:border-white/5 max-h-[85vh] overflow-y-auto select-none"
          >
            <div
              className="absolute top-3 left-0 right-0 flex justify-center md:hidden cursor-grab active:cursor-grabbing py-2"
              onClick={() => setIsCreateOpen(false)}
            >
              <div className="w-10 h-1.5 bg-neutral-200 dark:bg-slate-800 rounded-full" />
            </div>

            <div className="pt-3 md:pt-0">
              <CreateWizard onClose={() => setIsCreateOpen(false)} />
            </div>
          </div>

          <style jsx global>{`
            @keyframes androidSlideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
            @keyframes slideFromRight {
              from { transform: translateX(100%); opacity: 0.95; }
              to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideFromLeft {
              from { transform: translateX(-100%); opacity: 0.95; }
              to { transform: translateX(0); opacity: 1; }
            }
            .animate-slide-from-right {
              animation: slideFromRight 0.32s cubic-bezier(0.1, 0.76, 0.55, 0.94) forwards;
              will-change: transform, opacity;
            }
            .animate-slide-from-left {
              animation: slideFromLeft 0.32s cubic-bezier(0.1, 0.76, 0.55, 0.94) forwards;
              will-change: transform, opacity;
            }
          `}</style>
        </div>
      )}
    </div>
  )
}

export default DashboardLayout