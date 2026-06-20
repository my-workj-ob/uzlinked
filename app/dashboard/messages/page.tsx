"use client"

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { get } from 'lodash'
import { createClient } from '@/utils/supabase/client'
import { generateReactHelpers } from "@uploadthing/react"
import type { OurFileRouter } from "@/app/api/uploadthing/core"
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  HiPaperAirplane, HiOutlinePaperClip, HiOutlineFaceSmile,
  HiChevronLeft, HiOutlineEllipsisVertical, HiCheckBadge,
  HiOutlineMicrophone, HiOutlineArrowUturnLeft, HiOutlinePencil,
  HiOutlineTrash, HiOutlineDocumentDuplicate, HiOutlineEye,
  HiOutlineExclamationTriangle, HiOutlineMinusCircle
} from 'react-icons/hi2'
import { IoSearchOutline, IoChatbubblesOutline } from 'react-icons/io5'
import { BottomSheet } from '@/components/bottom-sheet'

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
  file_type: 'image' | 'video' | 'audio' | null
  transcription?: string | null
  created_at: string
  reply_to_id?: string | null
  is_edited?: boolean
  is_deleted?: boolean
  _pending?: boolean
  reactions?: any
  is_read?: boolean
}

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'

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

const genieVariants: Variants = {
  hidden: {
    opacity: 0,
    scaleX: 0.4,
    scaleY: 0.3,
    y: 50
  },
  visible: {
    opacity: 1,
    scaleX: 1,
    scaleY: 1,
    y: 0,
    transition: {
      y: {
        type: "spring",
        stiffness: 320,
        damping: 18,
        mass: 0.8
      },
      scaleX: {
        type: "spring",
        stiffness: 400,
        damping: 12,
        mass: 1
      },
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

function MessagesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const chatParam = searchParams.get('chat')

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

  // Real-time typing and online status states
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())
  const [isPartnerTyping, setIsPartnerTyping] = useState(false)
  const typingTimeoutRef = useRef<any>(null)

  // Block states
  const [isBlockedByMe, setIsBlockedByMe] = useState(false)
  const [isBlockedByPartner, setIsBlockedByPartner] = useState(false)
  const [isEllipsisOpen, setIsEllipsisOpen] = useState(false)

  // Edit / Delete / Reply states
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [replyingMessage, setReplyingMessage] = useState<Message | null>(null)
  const [activeContextMsg, setActiveContextMsg] = useState<Message | null>(null)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number, y: number }>({ x: 0, y: 0 })
  const longPressTimeoutRef = useRef<any>(null)

  // Media previewer states
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // Voice Recording States
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [audioTranscript, setAudioTranscript] = useState("")
  const [selectedTranscriptMsg, setSelectedTranscriptMsg] = useState<Message | null>(null)

  // Search / Scroll / Reaction premium states
  const [isMsgSearchOpen, setIsMsgSearchOpen] = useState(false)
  const [msgSearchQuery, setMsgSearchQuery] = useState("")
  const [msgSearchMatches, setMsgSearchMatches] = useState<number[]>([])
  const [currentMatchIdx, setCurrentMatchIdx] = useState(-1)
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false)
  const [hasNewMessagesBelow, setHasNewMessagesBelow] = useState(false)
  const [heartBurstMsgId, setHeartBurstMsgId] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<any>(null)
  const timerRef = useRef<any>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const freshMessageIds = useRef<Set<string>>(new Set())

  const activeChat = chats.find(c => c.id === selectedChatId)
  const activeUser = activeChat ? (activeChat.user_one.id === currentUserId ? activeChat.user_two : activeChat.user_one) : null
  const userIdReady = isValidUUID(currentUserId)

  // Handle URL Param change
  useEffect(() => {
    if (chatParam && chatParam !== selectedChatId) {
      setSelectedChatId(chatParam)
    }
  }, [chatParam])

  // Track online users using Supabase Presence
  useEffect(() => {
    if (!currentUserId || !userIdReady) return

    const presenceChannel = supabase.channel('online-status', {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    })

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const onlineIds = new Set<string>()
        Object.keys(state).forEach((key) => {
          onlineIds.add(key)
        })
        setOnlineUserIds(onlineIds)
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
  }, [currentUserId, userIdReady])

  // Check Block Status between users
  const checkBlockStatus = useCallback(async () => {
    if (!selectedChatId || !activeUser || !currentUserId) return
    try {
      const { data: blocks, error } = await supabase
        .from('user_blocks')
        .select('*')
        .or(`and(blocker_id.eq.${currentUserId},blocked_id.eq.${activeUser.id}),and(blocker_id.eq.${activeUser.id},blocked_id.eq.${currentUserId})`)

      if (!error && blocks) {
        const blockedMe = blocks.some((b: any) => b.blocker_id === activeUser.id)
        const blockedThem = blocks.some((b: any) => b.blocker_id === currentUserId)
        setIsBlockedByPartner(blockedMe)
        setIsBlockedByMe(blockedThem)
      } else {
        setIsBlockedByPartner(false)
        setIsBlockedByMe(false)
      }
    } catch (err) {
      console.error("Block tekshirishda xatolik:", err)
    }
  }, [selectedChatId, activeUser, currentUserId])

  useEffect(() => {
    checkBlockStatus()
  }, [checkBlockStatus])

  // Realtime subscription for blocks/unblocks/spam
  useEffect(() => {
    if (!currentUserId || !userIdReady) return

    const blockChannel = supabase
      .channel('user-blocks-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_blocks' },
        (payload: any) => {
          const oldBlock = payload.old
          const newBlock = payload.new
          const blockerId = newBlock?.blocker_id || oldBlock?.blocker_id
          const blockedId = newBlock?.blocked_id || oldBlock?.blocked_id

          if (blockerId === currentUserId || blockedId === currentUserId) {
            checkBlockStatus()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(blockChannel)
    }
  }, [currentUserId, userIdReady, checkBlockStatus])

  // Voice recording triggers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })

        stream.getTracks().forEach(track => track.stop())

        if (selectedChatId) {
          try {
            const finalTranscript = audioTranscript.trim();
            const uploadRes = await startUpload([audioFile])
            if (uploadRes && uploadRes[0]) {
              const uploadedFile = uploadRes[0]

              await supabase.from('messages').insert([{
                chat_id: selectedChatId,
                sender_id: currentUserId,
                text: null,
                file_url: uploadedFile.url,
                file_type: 'audio',
                transcription: finalTranscript || null,
                reply_to_id: replyingMessage?.id || null
              }])
              setReplyingMessage(null)
            }
          } catch (err) {
            console.error("Audio yuklashda xato:", err)
          }
        }
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.lang = 'uz-UZ'
        recognition.continuous = true
        recognition.interimResults = false

        recognition.onresult = (event: any) => {
          let text = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            text += event.results[i][0].transcript
          }
          setAudioTranscript(prev => (prev + ' ' + text).trim())
        }

        recognitionRef.current = recognition
        recognition.start()
      } else {
        setAudioTranscript("Ovozli xabar...")
      }

      setAudioTranscript("")
      setRecordingDuration(0)
      setIsRecording(true)
      mediaRecorder.start()

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)

    } catch (err) {
      toast.error("Mikrofonga ruxsat berilmadi yoki xatolik yuz berdi.")
      console.error(err)
    }
  }

  const stopRecording = (shouldSend = true) => {
    if (timerRef.current) clearInterval(timerRef.current)

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch { }
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (!shouldSend) {
        mediaRecorderRef.current.onstop = null
        const stream = mediaRecorderRef.current.stream
        stream.getTracks().forEach(track => track.stop())
      }
      mediaRecorderRef.current.stop()
    }

    setIsRecording(false)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && isValidUUID(user.id)) {
        setCurrentUserId(user.id)
      }
    }
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      const user = session?.user
      if (user && isValidUUID(user.id)) {
        setCurrentUserId(user.id)
      } else {
        setCurrentUserId(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const { startUpload, isUploading } = useUploadThing("mediaUploader", {
    onClientUploadComplete: async (res) => {
      if (res && res[0] && selectedChatId) {
        const uploadedFile = res[0]
        const isVideo = uploadedFile.type.startsWith("video") || uploadedFile.name.endsWith(".mp4")
        const isAudio = uploadedFile.type.startsWith("audio") || uploadedFile.name.endsWith(".webm") || uploadedFile.name.includes("voice")

        if (isAudio) return

        await supabase.from('messages').insert([{
          chat_id: selectedChatId,
          sender_id: currentUserId,
          text: null,
          file_url: uploadedFile.url,
          file_type: isVideo ? 'video' : 'image',
          reply_to_id: replyingMessage?.id || null
        }])
        setReplyingMessage(null)
      }
    },
    onUploadError: (err) => {
      toast.error(`Fayl yuklashda xatolik: ${err.message}`)
    }
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

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

  const markMessagesAsRead = useCallback(async (chatId: string) => {
    if (!currentUserId) return
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('chat_id', chatId)
      .neq('sender_id', currentUserId)
      .eq('is_read', false)
  }, [currentUserId])

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
      setMessages(data)
      markMessagesAsRead(chatId)
    }
    setIsLoadingMessages(false)
    setTimeout(scrollToBottom, 50)
  }, [markMessagesAsRead])

  // Subscribe to changes (Realtime message additions, edits, deletions)
  useEffect(() => {
    if (!selectedChatId) return
    fetchMessages(selectedChatId)

    const channel = supabase
      .channel(`chat:${selectedChatId}`)
      .on('postgres_changes',
        { event: 'INSERT' as any, schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChatId}` },
        (payload: any) => {
          const incoming = payload.new as Message
          setMessages((prev) => {
            if (prev.some(m => m.id === incoming.id)) {
              return prev
            }
            const pendingMatch = prev.find(m => m._pending && m.sender_id === incoming.sender_id && m.text === incoming.text)
            if (pendingMatch) {
              return prev.map(m => (m.id === pendingMatch.id ? incoming : m))
            }
            freshMessageIds.current.add(incoming.id)
            return [...prev, incoming]
          })

          if (incoming.sender_id !== currentUserId) {
            markMessagesAsRead(selectedChatId)
          }

          // Check scroll position to scroll bottom or show notification badge on bottom button
          const container = messagesContainerRef.current
          if (container) {
            const isFarUp = container.scrollHeight - container.scrollTop - container.clientHeight > 150
            if (isFarUp) {
              setHasNewMessagesBelow(true)
            }
          } else {
            setTimeout(scrollToBottom, 50)
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChatId}` },
        (payload: any) => {
          const updated = payload.new as Message
          setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m))
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChatId}` },
        (payload: any) => {
          const deleted = payload.old as { id: string }
          setMessages(prev => prev.filter(m => m.id !== deleted.id))
        }
      )
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        const { userId, isTyping } = payload.payload
        if (userId !== currentUserId) {
          setIsPartnerTyping(isTyping)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedChatId, fetchMessages, currentUserId])

  const adjustTextareaHeight = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  // Throttled typing broadcaster
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTypedMessage(e.target.value)
    adjustTextareaHeight()

    if (selectedChatId) {
      const channel = supabase.channel(`chat:${selectedChatId}`)
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUserId, isTyping: true }
      })

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: { userId: currentUserId, isTyping: false }
        })
      }, 2000)
    }
  }

  // Handle Send / Edit flows
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = typedMessage.trim()
    if (!text || !selectedChatId) return

    setTypedMessage("")
    requestAnimationFrame(adjustTextareaHeight)

    // Edit message path
    if (editingMessageId) {
      const msgId = editingMessageId
      setEditingMessageId(null)

      const { error } = await supabase
        .from('messages')
        .update({ text, is_edited: true })
        .eq('id', msgId)

      if (error) {
        toast.error("Xabarni o'zgartirib bo'lmadi")
      } else {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text, is_edited: true } : m))
      }
      return
    }

    // New message path
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const replyId = replyingMessage?.id || null

    const optimisticMessage: Message = {
      id: tempId,
      chat_id: selectedChatId,
      sender_id: currentUserId,
      text,
      file_url: null,
      file_type: null,
      created_at: new Date().toISOString(),
      reply_to_id: replyId,
      _pending: true,
    }

    freshMessageIds.current.add(tempId)
    setMessages(prev => [...prev, optimisticMessage])
    setReplyingMessage(null)
    setTimeout(scrollToBottom, 30)

    const { data, error } = await supabase
      .from('messages')
      .insert([{ chat_id: selectedChatId, sender_id: currentUserId, text, reply_to_id: replyId }])
      .select()
      .single()

    if (error) {
      console.error('[Xabarlar] Xabar yuborishda xato:', error)
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

  // Edit / Delete / Copy Actions
  const handleEditMessage = (msg: Message) => {
    setEditingMessageId(msg.id)
    setReplyingMessage(null)
    setTypedMessage(msg.text || "")
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const handleDeleteMessage = async (msg: Message) => {
    if (!confirm("Ushbu xabarni o'chirishni xohlaysizmi?")) return
    const { error } = await supabase
      .from('messages')
      .update({ text: "Bu xabar o'chirilgan", is_deleted: true })
      .eq('id', msg.id)

    if (error) {
      toast.error("O'chirishda xatolik yuz berdi")
    } else {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, text: "Bu xabar o'chirilgan", is_deleted: true } : m))
    }
  }

  const handleCopyMessage = (msg: Message) => {
    if (!msg.text) return
    navigator.clipboard.writeText(msg.text)
    toast.success("Xabar buferga nusxalandi")
  }

  const handleToggleReaction = async (msg: Message, emoji: string) => {
    if (!currentUserId || !msg.id) return
    setActiveContextMsg(null) // Close menu

    let currentReactions: any[] = []
    try {
      currentReactions = typeof msg.reactions === 'string'
        ? JSON.parse(msg.reactions)
        : (msg.reactions || [])
    } catch {
      currentReactions = []
    }

    if (!Array.isArray(currentReactions)) {
      currentReactions = []
    }

    const existingIdx = currentReactions.findIndex(r => r.user_id === currentUserId && r.emoji === emoji)
    if (existingIdx >= 0) {
      currentReactions.splice(existingIdx, 1)
    } else {
      const userPrevIdx = currentReactions.findIndex(r => r.user_id === currentUserId)
      if (userPrevIdx >= 0) {
        currentReactions.splice(userPrevIdx, 1)
      }
      currentReactions.push({ user_id: currentUserId, emoji })
    }

    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, reactions: currentReactions } : m))

    await supabase
      .from('messages')
      .update({ reactions: currentReactions })
      .eq('id', msg.id)
  }

  const handleDoubleTap = async (msg: Message) => {
    if (msg.is_deleted) return
    setHeartBurstMsgId(msg.id)
    setTimeout(() => setHeartBurstMsgId(null), 800)
    await handleToggleReaction(msg, '❤️')
  }

  // Inside Chat Search logic
  useEffect(() => {
    if (!msgSearchQuery.trim() || messages.length === 0) {
      setMsgSearchMatches([])
      setCurrentMatchIdx(-1)
      return
    }
    const query = msgSearchQuery.toLowerCase()
    const matches: number[] = []
    messages.forEach((msg, idx) => {
      if (msg.text && !msg.is_deleted && msg.text.toLowerCase().includes(query)) {
        matches.push(idx)
      }
    })
    setMsgSearchMatches(matches)
    setCurrentMatchIdx(matches.length > 0 ? matches.length - 1 : -1)
  }, [msgSearchQuery, messages])

  const scrollToMatch = useCallback((idx: number) => {
    const matchMsg = messages[idx]
    if (matchMsg) {
      const el = document.getElementById(`message-${matchMsg.id}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('bg-yellow-500/20', 'dark:bg-yellow-500/30', 'scale-102')
        setTimeout(() => {
          el.classList.remove('bg-yellow-500/20', 'dark:bg-yellow-500/30', 'scale-102')
        }, 1500)
      }
    }
  }, [messages])

  useEffect(() => {
    if (currentMatchIdx >= 0 && msgSearchMatches[currentMatchIdx] !== undefined) {
      scrollToMatch(msgSearchMatches[currentMatchIdx])
    }
  }, [currentMatchIdx, msgSearchMatches, scrollToMatch])

  const renderCheckmarks = (msg: Message) => {
    if (msg._pending) return null;
    const isOnline = activeUser && onlineUserIds.has(activeUser.id);
    if (msg.is_read) {
      return (
        <span className="flex text-blue-500 select-none ml-1">
          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17zM16.59 7.41L15.18 6l-6.18 6.18 1.41 1.41 4.77-4.76 1.42 1.58z" />
          </svg>
        </span>
      )
    }
    if (isOnline) {
      return (
        <span className="flex text-slate-400 dark:text-slate-500 select-none ml-1">
          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17zM16.59 7.41L15.18 6l-6.18 6.18 1.41 1.41 4.77-4.76 1.42 1.58z" />
          </svg>
        </span>
      )
    }
    return (
      <span className="flex text-slate-400 dark:text-slate-500 select-none ml-1">
        <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
      </span>
    )
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const isFarUp = el.scrollHeight - el.scrollTop - el.clientHeight > 300
    setShowScrollBottomBtn(isFarUp)
    if (!isFarUp) {
      setHasNewMessagesBelow(false)
    }
  }

  // Context Menu Long Press Triggers
  const handleTouchStart = (e: React.TouchEvent, msg: Message) => {
    if (msg.is_deleted) return
    const touch = e.touches[0]
    const x = touch.clientX
    const y = touch.clientY

    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current)
    longPressTimeoutRef.current = setTimeout(() => {
      setContextMenuPos({ x, y: y - 50 })
      setActiveContextMsg(msg)
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }, 500)
  }

  const handleTouchEnd = () => {
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current)
  }

  // Context Menu for desktop right-click
  const handleContextMenu = (e: React.MouseEvent, msg: Message) => {
    if (msg.is_deleted) return
    e.preventDefault()
    setContextMenuPos({ x: e.clientX, y: e.clientY })
    setActiveContextMsg(msg)
  }

  // Header Dropdown Blocks & Spam
  const handleBlockAction = async (action: 'block' | 'unblock' | 'spam') => {
    if (!activeUser || !currentUserId) return
    setIsEllipsisOpen(false)

    try {
      if (action === 'block' || action === 'spam') {
        const { error } = await supabase
          .from('user_blocks')
          .insert([{
            blocker_id: currentUserId,
            blocked_id: activeUser.id,
            is_spam: action === 'spam'
          }])
        if (error) throw error
        toast.success(action === 'spam' ? "Foydalanuvchi spam deb belgilandi va bloklandi" : "Foydalanuvchi bloklandi")
      } else {
        const { error } = await supabase
          .from('user_blocks')
          .delete()
          .eq('blocker_id', currentUserId)
          .eq('blocked_id', activeUser.id)
        if (error) throw error
        toast.success("Foydalanuvchi blokdan chiqarildi")
      }
      checkBlockStatus()
    } catch (err: any) {
      toast.error(err.message || "Amalda xatolik yuz berdi")
    }
  }

  return (
    <div className="bg-white dark:bg-slate-950 w-full h-full flex overflow-hidden border-none rounded-none select-none relative">

      {/* LIGHTBOX FOR IMAGE PREVIEW */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md"
            onClick={() => setLightboxUrl(null)}
          >
            <button className="absolute top-5 right-5 text-white hover:text-slate-305 p-2 text-2xl font-black">✕</button>
            <motion.img
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              src={lightboxUrl}
              alt="Preview"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl select-none"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTEXT POPUP MENU */}
      <AnimatePresence>
        {activeContextMsg && (
          <>
            <div className="fixed inset-0 z-80" onClick={() => setActiveContextMsg(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: 'fixed',
                top: Math.min(contextMenuPos.y, window.innerHeight - 250),
                left: Math.min(contextMenuPos.x, window.innerWidth - 220),
              }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 shadow-2xl rounded-2xl p-1.5 w-52 z-90 flex flex-col text-left font-semibold text-xs text-slate-700 dark:text-slate-200 select-none backdrop-blur-md"
            >
              {/* Quick Reactions Bar */}
              <div className="flex justify-between items-center px-2 py-1.5 border-b border-slate-100 dark:border-white/5 mb-1.5 select-none">
                {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleToggleReaction(activeContextMsg, emoji)}
                    className="text-base hover:scale-130 active:scale-95 transition-transform duration-200 cursor-pointer p-0.5"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <button
                onClick={() => { setReplyingMessage(activeContextMsg); setActiveContextMsg(null) }}
                className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                <HiOutlineArrowUturnLeft className="w-4 h-4 text-blue-500" />
                <span className="whitespace-nowrap">Javob berish</span>
              </button>

              {activeContextMsg.text && (
                <button
                  onClick={() => { handleCopyMessage(activeContextMsg); setActiveContextMsg(null) }}
                  className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  <HiOutlineDocumentDuplicate className="w-4 h-4 text-slate-400" />
                  <span className="whitespace-nowrap">Nusxalash</span>
                </button>
              )}

              {activeContextMsg.sender_id === currentUserId && (
                <>
                  {activeContextMsg.text && (
                    <button
                      onClick={() => { handleEditMessage(activeContextMsg); setActiveContextMsg(null) }}
                      className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                    >
                      <HiOutlinePencil className="w-4 h-4 text-emerald-500" />
                      <span className="whitespace-nowrap">Tahrirlash</span>
                    </button>
                  )}
                  <button
                    onClick={() => { handleDeleteMessage(activeContextMsg); setActiveContextMsg(null) }}
                    className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-rose-600 dark:text-rose-455 rounded-xl cursor-pointer"
                  >
                    <HiOutlineTrash className="w-4 h-4 text-rose-500" />
                    <span className="whitespace-nowrap">O'chirish</span>
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* SIDEBAR: CHATS & SEARCH LIST */}
      <div className={`w-full md:w-[320px] border-r border-slate-100 dark:border-white/5 flex flex-col bg-white dark:bg-slate-950 shrink-0 h-full ${selectedChatId ? 'hidden md:flex' : 'flex'}`}>

        {/* Mobile Custom Header */}
        <div className="flex items-center justify-between p-4 md:hidden border-b border-slate-100 dark:border-white/5 select-none shrink-0 bg-white dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 active:scale-95 transition-all">
              <HiChevronLeft className="w-6 h-6 stroke-[2.5]" />
            </button>
            <span className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">Xabarlar</span>
          </div>
        </div>

        {/* Desktop Sidebar Header */}
        <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-slate-950 hidden md:block shrink-0">
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-3.5 flex items-center gap-2">
            Xabarlar
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600" />
            </span>
          </h1>
        </div>

        {/* Global User Search */}
        <div className="px-4 py-2 shrink-0 bg-white dark:bg-slate-950">
          <div className="relative flex items-center group">
            <IoSearchOutline className="w-4 h-4 text-slate-400 absolute left-3.5 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Suhbatdosh qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-semibold pl-10 pr-9 py-3 rounded-2xl border border-transparent dark:border-white/5 focus:border-blue-500/20 focus:bg-white dark:focus:bg-slate-950 outline-none transition-all"
            />
            {isSearching && (
              <span className="absolute right-3.5 w-3.5 h-3.5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            )}
          </div>
          {!userIdReady && (
            <p className="mt-2 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1.5 rounded-lg border border-amber-200/20">
              Profil sozlanmoqda...
            </p>
          )}
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 [&::-webkit-scrollbar]:hidden bg-white dark:bg-slate-950">
          {searchQuery.trim().length > 0 ? (
            <>
              <p className="text-[10px] font-bold text-slate-400 px-3 uppercase tracking-wider mb-2 text-left">Foydalanuvchilar</p>
              {searchError ? (
                <p className="text-xs font-medium text-red-400 p-4 text-center">{searchError}</p>
              ) : isSearching ? (
                <div className="space-y-2 px-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 animate-pulse" />
                  ))}
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="p-3 flex items-center gap-3.5 cursor-pointer rounded-2xl hover:bg-blue-50/50 dark:hover:bg-slate-900/40 text-slate-800 dark:text-slate-200 transition-all group"
                  >
                    <div className="relative">
                      <img src={user.avatar_url || FALLBACK_AVATAR} alt="" className="w-10 h-10 object-cover rounded-full" />
                      {onlineUserIds.has(user.id) && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-950 animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">{user.nickname}</h4>
                      <p className="text-xs text-slate-400 truncate">@{user.username}</p>
                    </div>
                    <IoChatbubblesOutline className="w-4 h-4 text-slate-400 group-hover:text-blue-500 mr-2" />
                  </div>
                ))
              ) : (
                <p className="text-xs font-medium text-slate-400 p-4 text-center">Foydalanuvchi topilmadi 😕</p>
              )}
            </>
          ) : isLoadingChats ? (
            <div className="space-y-2 px-1">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 animate-pulse" />
              ))}
            </div>
          ) : chats.length === 0 ? (
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 p-6 text-center leading-relaxed font-bold">
              Chatlar mavjud emas. Suhbatni boshlash uchun foydalanuvchini qidiring.
            </p>
          ) : (
            chats.map((chat) => {
              const partner = chat.user_one.id === currentUserId ? chat.user_two : chat.user_one
              const isSelected = selectedChatId === chat.id
              const isPartnerOnline = onlineUserIds.has(partner.id)
              return (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`p-3 flex items-center gap-3 cursor-pointer rounded-2xl transition-all duration-200 active:scale-[0.98] ${isSelected ? 'bg-blue-600 text-white border border-transparent dark:border-white/5 shadow-md shadow-blue-500/20' : 'hover:bg-slate-50 dark:hover:bg-slate-900/40 text-slate-800 dark:text-slate-200'
                    }`}
                >
                  <div className="relative shrink-0">
                    <img src={partner.avatar_url || FALLBACK_AVATAR} alt="" className="w-10 h-10 object-cover rounded-full" />
                    {isPartnerOnline && (
                      <span className={`absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ${isSelected ? 'ring-blue-600' : 'ring-white dark:ring-slate-950'} animate-pulse`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h4 className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>{partner.nickname}</h4>
                    <p className={`text-xs truncate ${isSelected ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'}`}>@{partner.username}</p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* MAIN: CHAT WINDOW */}
      <div className={`flex-1 flex flex-col bg-slate-50/20 dark:bg-slate-950/40 h-full ${!selectedChatId ? 'hidden md:flex items-center justify-center text-center p-8' : 'flex'}`}>
        {activeChat && activeUser ? (
          <motion.div
            key={selectedChatId}
            initial={{ opacity: 0, scale: 0.99, y: 3 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex-1 flex flex-col min-h-0 h-full"
          >
            {/* CHAT HEADER */}
            <div className="px-4 py-3 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0 select-none">
              {isMsgSearchOpen ? (
                <div className="flex items-center gap-2.5 w-full">
                  <IoSearchOutline className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Xabarlarni qidirish..."
                    value={msgSearchQuery}
                    onChange={(e) => setMsgSearchQuery(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl outline-none border border-transparent focus:border-blue-500/10 focus:bg-white dark:focus:bg-slate-950"
                    autoFocus
                  />
                  {msgSearchMatches.length > 0 && (
                    <span className="text-[10px] font-bold text-slate-400 shrink-0">
                      {currentMatchIdx + 1}/{msgSearchMatches.length}
                    </span>
                  )}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (msgSearchMatches.length === 0) return
                        setCurrentMatchIdx(prev => prev > 0 ? prev - 1 : msgSearchMatches.length - 1)
                      }}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-500 active:scale-90"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (msgSearchMatches.length === 0) return
                        setCurrentMatchIdx(prev => prev < msgSearchMatches.length - 1 ? prev + 1 : 0)
                      }}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-500 active:scale-90"
                    >
                      ▼
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMsgSearchOpen(false)
                      setMsgSearchQuery("")
                    }}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-500 hover:text-rose-500 font-bold shrink-0 text-xs"
                  >
                    Yopish
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => setSelectedChatId(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl md:hidden text-slate-700 dark:text-slate-300 active:scale-90 transition-transform">
                      <HiChevronLeft className="w-6 h-6 stroke-[2.5]" />
                    </button>
                    <div className="relative">
                      <img src={activeUser.avatar_url || FALLBACK_AVATAR} alt="" className="w-10 h-10 object-cover rounded-full" />
                      {onlineUserIds.has(activeUser.id) && !isBlockedByMe && !isBlockedByPartner && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-950" />
                      )}
                    </div>
                    <div className="text-left">
                      <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1">
                        {activeUser.nickname}
                        {activeUser.role === 'admin' && <HiCheckBadge className="w-4 h-4 text-blue-500" />}
                      </h3>
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 min-h-[14px]">
                        {isPartnerTyping && !isBlockedByMe && !isBlockedByPartner ? (
                          <div className="flex items-center gap-1">
                            <span className="text-blue-600 dark:text-blue-400 lowercase italic normal-case">yozmoqda</span>
                            <span className="flex gap-0.5 items-center justify-center pt-0.5">
                              <span className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.8s' }} />
                              <span className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '0.8s' }} />
                              <span className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '0.8s' }} />
                            </span>
                          </div>
                        ) : onlineUserIds.has(activeUser.id) && !isBlockedByMe && !isBlockedByPartner ? (
                          <span className="text-emerald-500">Muloqotda</span>
                        ) : (
                          <span>tarmoqdan tashqarida</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setIsMsgSearchOpen(true)}
                      className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-slate-500 dark:text-slate-400 active:scale-95"
                      title="Xabarlarni qidirish"
                    >
                      <IoSearchOutline className="w-5 h-5" />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setIsEllipsisOpen(!isEllipsisOpen)}
                        className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-slate-500 dark:text-slate-400 active:scale-95"
                      >
                        <HiOutlineEllipsisVertical className="w-5 h-5" />
                      </button>

                      {/* Ellipsis Actions Menu */}
                      <AnimatePresence>
                        {isEllipsisOpen && (
                          <>
                            <div className="fixed inset-0 z-45" onClick={() => setIsEllipsisOpen(false)} />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute right-0 mt-1 w-60 bg-white/95 dark:bg-slate-900/95 border border-slate-100 dark:border-white/10 rounded-2xl shadow-2xl p-1.5 z-50 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 backdrop-blur-md"
                            >
                              {isBlockedByMe ? (
                                <button
                                  onClick={() => handleBlockAction('unblock')}
                                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-blue-600 cursor-pointer"
                                >
                                  <HiOutlineMinusCircle className="w-4 h-4 text-blue-500" />
                                  <span className="whitespace-nowrap">Blokdan chiqarish</span>
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleBlockAction('block')}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl text-rose-600 dark:text-rose-400 cursor-pointer"
                                  >
                                    <HiOutlineMinusCircle className="w-4 h-4 text-rose-500" />
                                    <span className="whitespace-nowrap">Foydalanuvchini bloklash</span>
                                  </button>
                                  <button
                                    onClick={() => handleBlockAction('spam')}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl text-amber-600 dark:text-amber-400 cursor-pointer"
                                  >
                                    <HiOutlineExclamationTriangle className="w-4 h-4 text-amber-500" />
                                    <span className="whitespace-nowrap">Spam deb belgilash</span>
                                  </button>
                                </>
                              )}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* MESSAGES DISPLAY AREA */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 p-4 overflow-y-auto flex flex-col gap-1 bg-slate-50/10 dark:bg-slate-950/10 [&::-webkit-scrollbar]:hidden select-none relative"
            >
              {isLoadingMessages ? (
                <div className="flex-1 flex flex-col gap-3 py-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className={`h-10 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse  ${i % 2 ? 'self-end w-1/3' : 'w-1/2'}`} />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-xs font-bold text-slate-400">Suhbatni boshlash uchun ilk xabarni yozing 👋</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.sender_id === currentUserId
                  const prevMsg = messages[idx - 1]
                  const showDateDivider = !prevMsg || formatDateLabel(prevMsg.created_at) !== formatDateLabel(msg.created_at)
                  const isFresh = freshMessageIds.current.has(msg.id)

                  // Replied message resolution
                  const repliedToMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null

                  return (
                    <React.Fragment key={msg.id}>
                      {showDateDivider && (
                        <div className="flex items-center justify-center my-3 select-none">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-white/5">
                            {formatDateLabel(msg.created_at)}
                          </span>
                        </div>
                      )}

                      {/* MESSAGE LAYOUT WRAPPER */}
                      <div
                        id={`message-${msg.id}`}
                        className={`flex flex-col max-w-[75%] mb-2 relative transition-all duration-300 rounded-2xl ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
                      >
                        {/* Reply Icon Behind Bubble when swiped */}
                        {!isMe && (
                          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none select-none z-0 text-blue-500 opacity-60">
                            <HiOutlineArrowUturnLeft className="w-5 h-5 animate-pulse" />
                          </div>
                        )}

                        {/* Swipe gesture wrapped message bubble */}
                        <motion.div
                          drag={!isMe ? "x" : false}
                          dragConstraints={{ left: 0, right: 80 }}
                          dragElastic={0.2}
                          dragSnapToOrigin={true}
                          onDragEnd={(e, info) => {
                            if (info.offset.x > 55) {
                              setReplyingMessage(msg)
                              if (navigator.vibrate) navigator.vibrate(30)
                            }
                          }}
                          onDoubleClick={() => handleDoubleTap(msg)}
                          onTouchStart={(e) => handleTouchStart(e, msg)}
                          onTouchEnd={handleTouchEnd}
                          onContextMenu={(e) => handleContextMenu(e, msg)}
                          variants={isFresh ? genieVariants : plainVariants}
                          initial="hidden"
                          animate="visible"
                          style={{ transformOrigin: isMe ? 'bottom right' : 'bottom left', touchAction: 'pan-y' }}
                          className={`text-sm font-medium leading-relaxed shadow-xs relative select-none cursor-default z-10 transition-colors duration-200 ${isMe
                            ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-3xl rounded-tr-none'
                            : 'bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 rounded-3xl rounded-tl-none'
                            } ${msg._pending ? 'opacity-60' : ''}`}
                        >
                          {/* Heart Burst Overlay Animation */}
                          <AnimatePresence>
                            {heartBurstMsgId === msg.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0, y: 0 }}
                                animate={{ opacity: 1, scale: [0, 1.6, 1], y: -35 }}
                                exit={{ opacity: 0, y: -50 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="absolute inset-0 m-auto flex items-center justify-center pointer-events-none select-none z-20 text-3xl"
                              >
                                ❤️
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Replied Snippet Header inside bubble */}
                          {repliedToMsg && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                const el = document.getElementById(`message-${repliedToMsg.id}`);
                                if (el) {
                                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  el.classList.add('bg-blue-500/20', 'dark:bg-blue-500/30', 'scale-[1.02]');
                                  setTimeout(() => {
                                    el.classList.remove('bg-blue-500/20', 'dark:bg-blue-500/30', 'scale-[1.02]');
                                  }, 1500);
                                }
                              }}
                              className={`mx-3 mt-2.5 mb-1.5 p-2 rounded-xl text-xs border-l-3 text-left font-semibold flex flex-col gap-0.5 select-none cursor-pointer transition-all ${isMe
                                ? 'bg-black/15 border-white/50 text-white/90 hover:bg-black/25'
                                : 'bg-slate-50 dark:bg-slate-950 border-blue-500 text-slate-500 dark:text-slate-400 hover:bg-slate-105 dark:hover:bg-slate-900'
                                }`}
                            >
                              <span className="text-[9px] font-black uppercase tracking-wider">
                                {repliedToMsg.sender_id === currentUserId ? "Siz" : activeUser.nickname}
                              </span>
                              <span className="truncate max-w-[200px]">
                                {repliedToMsg.is_deleted ? "O'chirilgan xabar" : (repliedToMsg.text || "Fayl yuborilgan")}
                              </span>
                            </div>
                          )}

                          <div className="px-4 py-2.5 select-none">
                            {msg.file_url && (
                              <div className="mb-1.5 overflow-hidden rounded-xl max-w-xs select-none">
                                {msg.file_type === 'video' ? (
                                  <video
                                    src={msg.file_url}
                                    controls
                                    className="w-full max-h-60 object-contain rounded-xl bg-black/80 shadow-md border border-white/10"
                                  />
                                ) : msg.file_type === 'audio' ? (
                                  <div className="p-2 dark:bg-slate-950 rounded-xl flex flex-col gap-1.5 min-w-[200px] select-none border border-transparent dark:border-white/5">
                                    <audio src={msg.file_url} controls className="w-full h-8 rounded-md bg-transparent" />
                                    {msg.transcription && (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedTranscriptMsg(msg)}
                                        className="text-[9px] font-extrabold uppercase tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors text-left pl-1 cursor-pointer font-bold"
                                      >
                                        Matnni o'qish (Transcription)
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <img
                                    src={msg.file_url}
                                    alt="Attachment"
                                    onClick={() => setLightboxUrl(msg.file_url)}
                                    className="w-full max-h-60 object-cover rounded-xl bg-black/5 hover:opacity-95 transition-all cursor-zoom-in"
                                  />
                                )}
                              </div>
                            )}

                            {msg.text && (
                              <div className={msg.is_deleted ? 'italic text-xs opacity-60' : `select-none ${isMe ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                                {msg.text}
                              </div>
                            )}
                          </div>
                        </motion.div>

                        {/* Reactions Pill Display */}
                        {msg.reactions && (typeof msg.reactions === 'string' ? JSON.parse(msg.reactions) : msg.reactions).length > 0 && (
                          <div className={`absolute bottom-[-8px] flex gap-0.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 rounded-full px-1.5 py-0.5 shadow-md select-none z-10 text-[10px] font-bold text-slate-505 dark:text-slate-300 cursor-pointer ${isMe ? 'right-4' : 'left-4'}`}>
                            {(() => {
                              const reactList = (typeof msg.reactions === 'string' ? JSON.parse(msg.reactions) : msg.reactions) as any[]
                              const counts: { [emoji: string]: number } = {}
                              reactList.forEach(r => { counts[r.emoji] = (counts[r.emoji] || 0) + 1 })
                              return Object.entries(counts).map(([emoji, count]) => (
                                <span key={emoji} className="flex items-center gap-0.5" onClick={() => handleToggleReaction(msg, emoji)}>
                                  <span>{emoji}</span>
                                  {reactList.length > 1 && <span>{count}</span>}
                                </span>
                              ))
                            })()}
                          </div>
                        )}

                        {/* TIME & STATUS */}
                        <div className="flex items-center gap-1 mt-1.5 px-1.5 select-none">
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                            {msg._pending ? 'yuborilmoqda...' : new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {msg.is_edited && !msg.is_deleted && (
                            <span className="text-[9px] font-bold text-blue-500 dark:text-blue-400 italic">
                              (tahrirlandi)
                            </span>
                          )}
                          {isMe && renderCheckmarks(msg)}
                        </div>

                      </div>
                    </React.Fragment>
                  )
                })
              )}

              {isUploading && (
                <div className="self-end bg-slate-100 dark:bg-slate-900 border border-slate-100 dark:border-white/5 text-slate-500 text-xs px-4 py-2.5 rounded-2xl animate-pulse font-bold select-none">
                  Fayl yuklanmoqda... 🚀
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* MESSAGE ACTION INPUT HEADER (Edit/Reply bars) */}
            <div className="shrink-0 select-none bg-white dark:bg-slate-900 relative">
              {/* Scroll-to-Bottom Button */}
              <AnimatePresence>
                {showScrollBottomBtn && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    type="button"
                    onClick={() => {
                      scrollToBottom()
                      setHasNewMessagesBelow(false)
                    }}
                    className="absolute -top-16 right-6 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 rounded-full shadow-2xl text-slate-650 dark:text-slate-300 hover:scale-105 active:scale-95 transition-all z-35 cursor-pointer flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                    </svg>
                    {hasNewMessagesBelow && (
                      <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-blue-505 rounded-full animate-pulse" />
                    )}
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Edit Mode Preview */}
              {editingMessageId && (
                <div className="px-4 py-2.5 bg-blue-50/50 dark:bg-blue-950/20 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                  <div className="flex items-center gap-1.5">
                    <HiOutlinePencil className="w-4 h-4" />
                    <span>Xabarni tahrirlash...</span>
                  </div>
                  <button
                    onClick={() => { setEditingMessageId(null); setTypedMessage("") }}
                    className="p-1 hover:bg-blue-100/50 dark:hover:bg-blue-900/50 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Reply Mode Preview */}
              {replyingMessage && (
                <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-950/20 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2 truncate pr-4 text-left">
                    <HiOutlineArrowUturnLeft className="w-4 h-4 text-blue-500" />
                    <div className="truncate">
                      <span className="font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wide mr-1">Javob:</span>
                      {replyingMessage.text || "Fayl biriktirilgan"}
                    </div>
                  </div>
                  <button
                    onClick={() => setReplyingMessage(null)}
                    className="p-1 hover:bg-slate-105 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* MESSAGE INPUT FORM */}
            <div className="p-3 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-white/5 shrink-0">
              {isBlockedByMe ? (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 border border-rose-100/50 dark:border-rose-900/10">
                  <span>Siz bu foydalanuvchini bloklagansiz. Xabar yozish uchun blokdan chiqaring.</span>
                  <button
                    onClick={() => handleBlockAction('unblock')}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl active:scale-95 transition-all text-[10px] font-black cursor-pointer uppercase tracking-wider"
                  >
                    Blokdan chiqarish
                  </button>
                </div>
              ) : isBlockedByPartner ? (
                <div className="p-3.5 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs font-bold rounded-2xl text-center border border-slate-200/50 dark:border-white/5">
                  Siz bloklangansiz. Ushbu foydalanuvchiga xabar yuborib bo'lmaydi.
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="flex items-end gap-2 text-left">
                  <input type="file" accept="image/*,video/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

                  <div className="flex items-center gap-0.5 select-none">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 mb-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl active:scale-90 transition-all cursor-pointer">
                      <HiOutlinePaperClip className="w-5 h-5" />
                    </button>

                    {!isRecording && (
                      <button type="button" onClick={startRecording} className="p-2.5 mb-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl active:scale-90 transition-all cursor-pointer">
                        <HiOutlineMicrophone className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {isRecording ? (
                    <div className="flex-1 bg-slate-50 dark:bg-slate-900 p-2 rounded-2xl border border-rose-500/20 flex items-center justify-between min-h-[46px] select-none text-left">
                      <div className="flex items-center gap-2 pl-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
                        </span>
                        <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                          {recordingDuration}s
                        </span>
                        {audioTranscript && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 italic max-w-[120px] truncate">
                            ({audioTranscript})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => stopRecording(false)}
                          className="text-[11px] font-black text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-3 py-2 rounded-xl active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
                        >
                          Bekor qilish
                        </button>
                        <button
                          type="button"
                          onClick={() => stopRecording(true)}
                          className="text-[11px] font-black text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-2 rounded-xl active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
                        >
                          Yuborish
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative flex-1 flex items-end group">
                      <textarea
                        ref={textareaRef}
                        rows={1}
                        placeholder="Xabar yozing..."
                        value={typedMessage}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        disabled={isUploading}
                        className="w-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-semibold pl-4 pr-10 py-3.5 rounded-2xl border border-transparent dark:border-white/5 focus:border-blue-500/10 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all duration-200 resize-none max-h-[120px] [&::-webkit-scrollbar]:hidden"
                      />
                      <button type="button" className="absolute right-3 bottom-3 text-slate-400 hover:text-blue-500 select-none"><HiOutlineFaceSmile className="w-5 h-5" /></button>
                    </div>
                  )}

                  {!isRecording && (
                    <motion.button
                      type="submit"
                      disabled={!typedMessage.trim() || isUploading}
                      whileTap={{ scale: 0.85 }}
                      className={`p-3.5 rounded-2xl flex items-center justify-center transition-colors duration-300 border border-transparent dark:border-white/5 cursor-pointer shrink-0 select-none ${typedMessage.trim() && !isUploading ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        }`}
                    >
                      <HiPaperAirplane className={`w-4 h-4 transform transition-transform duration-300 -rotate-45 ${typedMessage.trim() ? 'scale-110 translate-x-[1px]' : ''}`} />
                    </motion.button>
                  )}
                </form>
              )}
            </div>

          </motion.div>
        ) : (
          /* EMPTY STATE */
          <div className="flex flex-col items-center justify-center max-w-sm m-auto animate-in fade-in zoom-in-95 select-none">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center mb-4 border border-slate-100 dark:border-white/5">
              <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="font-black text-base text-slate-900 dark:text-slate-100 mb-1.5">Muloqotni boshlang</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold leading-relaxed px-4 text-center">Xabarlar, rasm va ovozlarni realtime almashish uchun suhbatdoshni tanlang.</p>
          </div>
        )}
      </div>

      {/* Voice Transcript Bottom Sheet */}
      <BottomSheet
        isOpen={selectedTranscriptMsg !== null}
        onClose={() => setSelectedTranscriptMsg(null)}
        title="Ovozli xabar transkripsiyasi"
      >
        <div className="flex flex-col gap-4 py-2 select-text text-left">
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-white/5">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-400 leading-relaxed whitespace-pre-line">
              "{selectedTranscriptMsg?.transcription}"
            </p>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold text-center">
            🎤 Nutq o'zbek tilida (uz-UZ) Web Speech API orqali matnga o'girildi
          </p>
        </div>
      </BottomSheet>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full w-full bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider animate-pulse">Yuklanmoqda...</div>}>
      <MessagesPageContent />
    </Suspense>
  )
}