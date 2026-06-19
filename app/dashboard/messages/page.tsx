"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
// MUHIM: bu klient ilovaning boshqa joylarida (masalan layout.tsx) ishlatilayotgan
// bilan AYNAN BIR XIL bo'lishi shart, aks holda getUser()/onAuthStateChange doim
// null qaytaradi (sessiya cookie'da, bu klient esa localStorage'ga qaraydi).
// Agar @/utils/supabase/client boshqa yo'lda bo'lsa, shu importni moslang.
import { createClient } from '@/utils/supabase/client'
import { generateReactHelpers } from "@uploadthing/react"
import type { OurFileRouter } from "@/app/api/uploadthing/core"
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  HiPaperAirplane, HiOutlinePaperClip, HiOutlineFaceSmile,
  HiChevronLeft, HiOutlineEllipsisVertical, HiCheckBadge
} from 'react-icons/hi2'
import { IoSearchOutline, IoChatbubblesOutline } from 'react-icons/io5'

const supabase = createClient()
const { useUploadThing } = generateReactHelpers<OurFileRouter>()

interface Profile {
  id: string
  nickname: string
  username: string
  avatar_url: string | null
  role: string
}

interface Message {
  id: string
  chat_id: string
  sender_id: string
  text: string | null
  file_url: string | null
  file_type: 'image' | 'video' | null
  created_at: string
  _pending?: boolean
}

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'

// PostgREST .or() satrida vergul/qavs/foiz belgilari sintaksisni buzadi,
// shuning uchun qidiruv matnidan tozalaymiz.
const sanitizeSearchTerm = (raw: string) => raw.replace(/[,()%]/g, '').trim()

const isValidUUID = (id?: string | null): boolean => {
  if (!id) return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

const formatDateLabel = (iso: string) => {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (sameDay(date, today)) return 'Bugun'
  if (sameDay(date, yesterday)) return 'Kecha'
  return date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

// "Genie" effekti — Mac dockka oyna yopilganda ko'rinadigan siqilish-cho'zilish
// harakatidan ilhomlangan. Haqiqiy genie effekti suyuqlik egilishi (SVG/WebGL)
// talab qiladi; bu yerda shu hissni beradigan elastik scale/radius animatsiyasi
// ishlatildi — chat bubble uchun bu ancha tabiiy va yengil ishlaydi.
const genieVariants: Variants = {
  hidden: {
    opacity: 0,
    scaleX: 0.4, // Matn buzilib ketmasligi uchun minimal chegara
    scaleY: 0.3,
    y: 50        // Pastroqdan unib chiqadi
  },
  visible: {
    opacity: 1,
    scaleX: 1,
    scaleY: 1,
    y: 0,
    transition: {
      // 1. Yuqoriga otilib chiqish harakati (Silliq va tez)
      y: {
        type: "spring",
        stiffness: 320,
        damping: 18,
        mass: 0.8
      },
      // 2. Eniga kengayishi (Tezroq snap bo'ladi)
      scaleX: {
        type: "spring",
        stiffness: 400,
        damping: 12, // Damping qanchalik past bo'lsa, shunchalik elastik tebranadi
        mass: 1
      },
      // 3. Bo'yiga cho'zilishi (X o'qidan sal sekinroq va tebraniuvchanroq)
      // Aynan shu farq "suyuqlik" (Genie) hissini beradi!
      scaleY: {
        type: "spring",
        stiffness: 200,
        damping: 8,
        mass: 0.8
      },
      opacity: { duration: 0.15 }
    }
  }
}

const plainVariants: Variants = {
  hidden: { opacity: 1, scale: 1, y: 0 },
  visible: { opacity: 1, scale: 1, y: 0 }
}


export default function MessagesPage() {
  const [chats, setChats] = useState<any[]>([])
  const [isLoadingChats, setIsLoadingChats] = useState(true)

  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [typedMessage, setTypedMessage] = useState("")
  const [currentUserId, setCurrentUserId] = useState<string | any>('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Shu sessiya davomida qo'shilgan xabarlarni belgilab boramiz — faqat ular
  // "genie" animatsiyasi bilan chiqadi, eski tarix sukunatda yuklanadi.
  const freshMessageIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    // 1. Dastlabki yuklanishda foydalanuvchini tekshirib ko'rish (Xavfsiz getUser orqali)
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (user && isValidUUID(user.id)) {
        setCurrentUserId(user.id)
      }
    }
    checkUser()

    // 2. Realtime sessiya o'zgarishini tinglash (Eng ishonchli yo'l)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user
      if (user && isValidUUID(user.id)) {
        setCurrentUserId(user.id)
      } else {
        setCurrentUserId(null)
      }
    })

    // Komponent o'chganda (unmount) tinglovchini tozalash
    return () => {
      subscription.unsubscribe()
    }
  }, []) // DIQQAT: Dependency array mutlaqo bo'sh bo'lishi shart!


  const activeChat = chats.find(c => c.id === selectedChatId)
  const activeUser = activeChat ? (activeChat.user_one.id === currentUserId ? activeChat.user_two : activeChat.user_one) : null
  const userIdReady = isValidUUID(currentUserId)



  const { startUpload, isUploading } = useUploadThing("mediaUploader", {
    onClientUploadComplete: async (res) => {
      if (res && res[0] && selectedChatId) {
        const uploadedFile = res[0]
        const isVideo = uploadedFile.type.startsWith("video") || uploadedFile.name.endsWith(".mp4")

        await supabase.from('messages').insert([{
          chat_id: selectedChatId,
          sender_id: currentUserId,
          text: null,
          file_url: uploadedFile.url,
          file_type: isVideo ? 'video' : 'image'
        }])
      }
    },
    onUploadError: (err) => {
      alert(`Fayl yuklashda xatolik: ${err.message}`)
    }
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // --- Diagnostika: agar currentUserId yaroqli UUID bo'lmasa, qidiruv va
  // chatlar ro'yxati jim-jit hech narsa qaytarmaydi. Devkonsolda ko'rinadigan
  // aniq ogohlantirish bo'lishi kerak, aks holda "nega ishlamayapti" degan
  // savol qoladi.
  useEffect(() => {
    if (!userIdReady) {
      console.warn('[Xabarlar] currentUserId yaroqsiz yoki hali yuklanmagan:', currentUserId)
    }
  }, [currentUserId, userIdReady])

  const fetchChats = useCallback(async () => {
    if (!userIdReady) {
      setIsLoadingChats(false)
      return
    }
    setIsLoadingChats(true)
    const { data, error } = await supabase
      .from('chats')
      .select(`
        id,
        created_at,
        user_one:profiles!chats_user_one_fkey(*),
        user_two:profiles!chats_user_two_fkey(*)
      `)
      .or(`user_one.eq.${currentUserId},user_two.eq.${currentUserId}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Xabarlar] Chatlarni yuklashda xato:', error)
    } else if (data) {
      setChats(data)
    }
    setIsLoadingChats(false)
  }, [currentUserId, userIdReady])

  useEffect(() => {
    fetchChats()
  }, [fetchChats])

  // --- Foydalanuvchilarni qidirish ---
  // ASOSIY BUG: ilike uchun PostgREST '%' wildcard talab qiladi, '*' emas.
  // '*' bilan filtr hech qachon mos kelmaydi, shuning uchun har doim
  // "Hech kim topilmadi" chiqadi (so'rov yuborilsa ham, natija bo'sh keladi).
  useEffect(() => {
    const term = sanitizeSearchTerm(searchQuery)

    if (!term || !userIdReady) {
      setSearchResults([])
      setSearchError(null)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    setSearchError(null)

    const delayDebounce = setTimeout(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUserId)
        .or(`username.ilike.%${term}%,nickname.ilike.%${term}%`)
        .limit(10)

      if (error) {
        console.error('[Xabarlar] Qidiruvda xato:', error)
        setSearchError("Qidiruvda xatolik yuz berdi")
        setSearchResults([])
      } else {
        setSearchResults(data ?? [])
      }
      setIsSearching(false)
    }, 350)

    return () => clearTimeout(delayDebounce)
  }, [searchQuery, currentUserId, userIdReady])

  const handleSelectUser = async (partner: Profile) => {
    const existingChat = chats.find(c =>
      (c.user_one.id === partner.id && c.user_two.id === currentUserId) ||
      (c.user_one.id === currentUserId && c.user_two.id === partner.id)
    )

    if (existingChat) {
      setSelectedChatId(existingChat.id)
      setSearchQuery("")
      return
    }

    const [u1, u2] = currentUserId < partner.id ? [currentUserId, partner.id] : [partner.id, currentUserId]

    const { data: newChat, error } = await supabase
      .from('chats')
      .insert([{ user_one: u1, user_two: u2 }])
      .select(`
        id,
        created_at,
        user_one:profiles!chats_user_one_fkey(*),
        user_two:profiles!chats_user_two_fkey(*)
      `)
      .single()

    if (!error && newChat) {
      setChats(prev => [newChat, ...prev])
      setSelectedChatId(newChat.id)
    } else {
      console.error('[Xabarlar] Yangi chat yaratishda xato:', error)
      fetchChats()
    }
    setSearchQuery("")
  }

  const fetchMessages = useCallback(async (chatId: string) => {
    setIsLoadingMessages(true)
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[Xabarlar] Xabarlarni yuklashda xato:', error)
    } else if (data) {
      // Tarixdagi xabarlarni "eski" deb belgilaymiz — ular genie animatsiyasiz chiqadi
      setMessages(data)
    }
    setIsLoadingMessages(false)
    setTimeout(scrollToBottom, 50)
  }, [])

  useEffect(() => {
    if (!selectedChatId) return
    fetchMessages(selectedChatId)

    const channel = supabase
      .channel(`chat:${selectedChatId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChatId}` },
        (payload) => {
          const incoming = payload.new as Message
          setMessages((prev) => {
            // ASOSIY BUG: agar shu ID bilan xabar allaqachon ro'yxatda bo'lsa
            // (masalan o'zimiz yuborib, .insert().select() javobi bilan
            // optimistik nusxa allaqachon almashtirilgan bo'lsa), realtime
            // hodisasi uni YANA bir marta qo'shib, dublikat va "same key"
            // xatosini keltirib chiqargan. Shuning uchun avval ID bo'yicha
            // tekshiramiz va mavjud bo'lsa hech narsa qilmaymiz.
            if (prev.some(m => m.id === incoming.id)) {
              return prev
            }
            // Agar bu o'zimiz optimistik qo'shgan xabarning serverdan qaytgan
            // nusxasi bo'lsa (hali pending holatda) — dublikat qilmasdan,
            // vaqtinchalik yozuvni almashtiramiz
            const pendingMatch = prev.find(m => m._pending && m.sender_id === incoming.sender_id && m.text === incoming.text)
            if (pendingMatch) {
              return prev.map(m => (m.id === pendingMatch.id ? incoming : m))
            }
            freshMessageIds.current.add(incoming.id)
            return [...prev, incoming]
          })
          setTimeout(scrollToBottom, 50)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedChatId, fetchMessages])

  const adjustTextareaHeight = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = typedMessage.trim()
    if (!text || !selectedChatId) return

    setTypedMessage("")
    requestAnimationFrame(adjustTextareaHeight)

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const optimisticMessage: Message = {
      id: tempId,
      chat_id: selectedChatId,
      sender_id: currentUserId,
      text,
      file_url: null,
      file_type: null,
      created_at: new Date().toISOString(),
      _pending: true,
    }

    freshMessageIds.current.add(tempId)
    setMessages(prev => [...prev, optimisticMessage])
    setTimeout(scrollToBottom, 30)

    const { data, error } = await supabase
      .from('messages')
      .insert([{ chat_id: selectedChatId, sender_id: currentUserId, text }])
      .select()
      .single()

    if (error) {
      console.error('[Xabarlar] Xabar yuborishda xato:', error)
      // Yubora olmagan xabarni ro'yxatdan olib tashlaymiz va matnni qaytaramiz
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setTypedMessage(text)
      return
    }

    if (data) {
      freshMessageIds.current.add(data.id)
      setMessages(prev => prev.map(m => (m.id === tempId ? data : m)))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e as any)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      startUpload([files[0]])
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-3xl h-[calc(100vh-140px)] flex overflow-hidden">

      {/* SIDEBAR: CHATS & SEARCH LIST */}
      <div className={`w-full md:w-[340px] border-r border-slate-100 dark:border-white/5 flex flex-col bg-white dark:bg-slate-900 shrink-0 ${selectedChatId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900">
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-3.5 flex items-center gap-2">
            Xabarlar
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600" />
            </span>
          </h1>
          <div className="relative flex items-center group">
            <IoSearchOutline className="w-4 h-4 text-slate-400 absolute left-3.5 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Foydalanuvchi qidirish (ism, username)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-205 text-xs font-semibold pl-10 pr-9 py-3 rounded-2xl border border-transparent dark:border-white/5 focus:border-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
            />
            {isSearching && (
              <span className="absolute right-3.5 w-3.5 h-3.5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            )}
          </div>
          {!userIdReady && (
            <p className="mt-2 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1.5 rounded-lg border border-amber-250/20">
              Profil aniqlanmadi — qidiruv va chatlar yuklanmaydi. Sahifani yangilab ko'ring.
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 [&::-webkit-scrollbar]:hidden">
          {searchQuery.trim().length > 0 ? (
            <>
              <p className="text-[10px] font-bold text-slate-400 px-3 uppercase tracking-wider mb-2">Global qidiruv natijalari</p>
              {searchError ? (
                <p className="text-xs font-medium text-red-400 p-4 text-center">{searchError}</p>
              ) : isSearching ? (
                <div className="space-y-2 px-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="h-14 rounded-2xl bg-slate-50 animate-pulse" />
                  ))}
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="p-3 flex items-center gap-3.5 cursor-pointer rounded-2xl hover:bg-blue-50/50 text-slate-800 transition-all group"
                  >
                    <img src={user.avatar_url || FALLBACK_AVATAR} alt="" className="w-10 h-10 object-cover rounded-full" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 truncate">{user.nickname}</h4>
                      <p className="text-xs text-slate-400 truncate">@{user.username}</p>
                    </div>
                    <IoChatbubblesOutline className="w-4 h-4 text-slate-400 group-hover:text-blue-500 mr-2" />
                  </div>
                ))
              ) : (
                <p className="text-xs font-medium text-slate-400 p-4 text-center">Hech kim topilmadi 😕</p>
              )}
            </>
          ) : isLoadingChats ? (
            <div className="space-y-2 px-1">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-2xl bg-slate-50 animate-pulse" />
              ))}
            </div>
          ) : chats.length === 0 ? (
            <p className="text-xs font-medium text-slate-400 p-6 text-center leading-relaxed">
              Hali hech kim bilan chatingiz yo'q. Yuqoridan foydalanuvchi qidirib, suhbatni boshlang.
            </p>
          ) : (
            chats.map((chat) => {
              const partner = chat.user_one.id === currentUserId ? chat.user_two : chat.user_one
              const isSelected = selectedChatId === chat.id
              return (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`p-3.5 flex items-center gap-3.5 cursor-pointer rounded-2xl transition-all duration-200 active:scale-[0.98] ${isSelected ? 'bg-blue-600 text-white border border-transparent dark:border-white/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                    }`}
                >
                  <img src={partner.avatar_url || FALLBACK_AVATAR} alt="" className="w-11 h-11 object-cover rounded-full" />
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>{partner.nickname}</h4>
                    <p className={`text-xs truncate ${isSelected ? 'text-white/80' : 'text-slate-400 dark:text-slate-550'}`}>@{partner.username}</p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* MAIN: CHAT WINDOW */}
      <div className={`flex-1 flex flex-col bg-slate-50/30 dark:bg-slate-950/20 ${!selectedChatId ? 'hidden md:flex items-center justify-center text-center p-8' : 'flex'}`}>
        {activeChat && activeUser ? (
          <motion.div
            key={selectedChatId}
            initial={{ opacity: 0, scale: 0.97, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex-1 flex flex-col min-h-0"
          >
            {/* CHAT HEADER */}
            <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setSelectedChatId(null)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl md:hidden text-slate-650 dark:text-slate-350 active:scale-90 transition-transform">
                  <HiChevronLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
                <img src={activeUser.avatar_url || FALLBACK_AVATAR} alt="" className="w-10 h-10 object-cover rounded-full" />
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1">{activeUser.nickname} <HiCheckBadge className="w-4 h-4 text-blue-500" /></h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Muloqotda</p>
                </div>
              </div>
              <button className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl text-slate-500 dark:text-slate-400"><HiOutlineEllipsisVertical className="w-5 h-5" /></button>
            </div>

            {/* MESSAGES DISPLAY AREA */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-1 [&::-webkit-scrollbar]:hidden bg-slate-50/10">
              {isLoadingMessages ? (
                <div className="flex-1 flex flex-col gap-3 py-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className={`h-10 rounded-2xl bg-slate-100  ${i % 2 ? 'self-end w-1/3' : 'w-1/2'}`} />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-xs font-bold text-slate-400">Birinchi xabarni yuboring 👋</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.sender_id === currentUserId
                  const prevMsg = messages[idx - 1]
                  const showDateDivider = !prevMsg || formatDateLabel(prevMsg.created_at) !== formatDateLabel(msg.created_at)
                  const isFresh = freshMessageIds.current.has(msg.id)

                  return (
                    <React.Fragment key={msg.id}>
                      {showDateDivider && (
                        <div className="flex items-center justify-center my-3">
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100/80 px-3 py-1 rounded-full">
                            {formatDateLabel(msg.created_at)}
                          </span>
                        </div>
                      )}

                      {/* ASOSIY WRAPPER (Animatsiyasiz static o'rinbosar) */}
                      <div className={`flex flex-col max-w-[70%] mb-2 ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>

                        {/* CHAT BUBBLE (Endi animatsiya aynan shunga va burchagidan unib chiqadi) */}
                        <motion.div
                          variants={isFresh ? genieVariants : plainVariants}
                          initial="hidden"
                          animate="visible"
                          // transformOrigin xabar o'zingiznikiligiga qarab dumidan o'sib chiqishini ta'minlaydi
                          style={{ transformOrigin: isMe ? 'bottom right' : 'bottom left' }}
                          className={`px-4 py-2.5 text-sm font-medium leading-relaxed ${isMe
                            ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-3xl rounded-tr-none'
                            : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 text-slate-800 dark:text-slate-150 rounded-3xl rounded-tl-none'
                            } ${msg._pending ? 'opacity-60' : ''}`}
                        >
                          {msg.file_url && (
                            <div className="mb-1.5 overflow-hidden rounded-xl max-w-xs bg-black/5">
                              {msg.file_type === 'video' ? (
                                <video src={msg.file_url} controls className="w-full max-h-60 object-contain rounded-xl" />
                              ) : (
                                <img src={msg.file_url} alt="Attachment" className="w-full max-h-60 object-cover rounded-xl" />
                              )}
                            </div>
                          )}
                          {msg.text && <div>{msg.text}</div>}
                        </motion.div>

                        {/* SOAT (Animatsiyadan tashqarida, tinchgina turadi) */}
                        <span className="text-[9px] font-bold text-slate-400/80 mt-1 px-1.5">
                          {msg._pending ? 'yuborilmoqda...' : new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>

                      </div>
                    </React.Fragment>
                  )
                })
              )}

              {isUploading && (
                <div className="self-end bg-slate-100 text-slate-500 text-xs px-4 py-2 rounded-2xl animate-pulse font-semibold">
                  Fayl yuklanmoqda... 🚀
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* MESSAGE INPUT FORM */}
            <form onSubmit={handleSendMessage} className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 flex items-end gap-2.5">
                <input type="file" accept="image/*,video/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 mb-0.5 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl active:scale-90 transition-all">
                  <HiOutlinePaperClip className="w-5 h-5" />
                </button>

                <div className="relative flex-1 flex items-end group">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    placeholder="Xabar yozing..."
                    value={typedMessage}
                    onChange={(e) => { setTypedMessage(e.target.value); adjustTextareaHeight() }}
                    onKeyDown={handleKeyDown}
                    disabled={isUploading}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-205 text-xs font-semibold pl-4 pr-10 py-3.5 rounded-2xl border border-transparent dark:border-white/5 focus:border-blue-500/10 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all duration-200 resize-none max-h-[120px] [&::-webkit-scrollbar]:hidden"
                  />
                  <button type="button" className="absolute right-3 bottom-3.5 text-slate-400 hover:text-blue-500"><HiOutlineFaceSmile className="w-5 h-5" /></button>
                </div>

                <motion.button
                  type="submit"
                  disabled={!typedMessage.trim() || isUploading}
                  whileTap={{ scale: 0.85 }}
                  className={`p-3.5 rounded-2xl flex items-center justify-center transition-colors duration-300 border border-transparent dark:border-white/5 ${typedMessage.trim() && !isUploading ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                    }`}
                >
                  <HiPaperAirplane className={`w-4 h-4 transform transition-transform duration-300 -rotate-45 ${typedMessage.trim() ? 'scale-110 translate-x-[1px]' : ''}`} />
                </motion.button>
              </form>
          </motion.div>

        ) : (
          /* EMPTY STATE */
          <div className="flex flex-col items-center justify-center max-w-sm m-auto animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center mb-4 border border-slate-100 dark:border-white/5">
              <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="font-black text-base text-slate-900 dark:text-slate-100 mb-1.5">Muloqotni boshlang</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold leading-relaxed px-4 text-center">Xabarlar, rasm yoki videolarni realtime almashish uchun foydalanuvchini qidiring yoki chatni tanlang.</p>
          </div>
        )}
      </div>
    </div>
  )
}