"use client"

import React, { useState } from 'react'
import DashboardLayout from '../layout'
import { 
  HiPaperAirplane, 
  HiOutlinePaperClip, 
  HiOutlineFaceSmile,
  HiChevronLeft,
  HiOutlineEllipsisVertical,
  HiCheckBadge
} from 'react-icons/hi2'
import { IoSearchOutline } from 'react-icons/io5'


const mockChats = [
  {
    id: 1,
    name: "Sarah Jenkins",
    username: "sarah_v",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop",
    status: "typing",
    role: "Creator",
    unread: 2,
    lastMessage: "Yozmoqda...",
    time: "Hozir",
    messages: [
      { id: 101, sender: 'them', text: "Salom Baxtiyor! Portfoliongizni ko'rib chiqdim, juda yoqdi. 🔥", time: "14:20" },
      { id: 102, sender: 'me', text: "Salom Sarah! Rahmat, katta rahmat. Loyiha ustida ishlayapmiz.", time: "14:22" },
      { id: 103, sender: 'them', text: "Yangi Masterclass uchun UI dizayn qila olasizmi? Shartlarni gaplashsak degandim.", time: "14:25" },
    ]
  },
  {
    id: 2,
    name: "Elena Art",
    username: "elena.design",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop",
    status: "online",
    role: "Buyer",
    unread: 0,
    lastMessage: "E'londagi krossovka sotildimi?",
    time: "Kecha",
    messages: [
      { id: 201, sender: 'them', text: "Assalomu alaykum! Marketdagi e'lon bo'yicha yozgandim.", time: "Kecha" },
      { id: 202, sender: 'me', text: "Va alaykum assalom! Ha, hali sotilmadi, holati ideal.", time: "Kecha" },
      { id: 203, sender: 'them', text: "E'londagi krossovka sotildimi? Oxirgi narxini aytsangiz, bugun olib ketardim.", time: "Kecha" },
    ]
  },
  {
    id: 3,
    name: "Jordan Tech",
    username: "jord_t",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop",
    status: "offline",
    role: "Premium",
    unread: 0,
    lastMessage: "Rahmat aka, kod mukammal ishladi!",
    time: "3 kun avval",
    messages: [
      { id: 301, sender: 'them', text: "Aka, Appwrite konfiguratsiyasida ozroq xatolik bo'lyapti, yordam bera olasizmi?", time: "12.06.2026" },
      { id: 302, sender: 'me', text: "Vercel environment xatoligini tekshiring, kalitlarni noto'g'ri qo'ygandirsiz.", time: "12.06.2026" },
      { id: 303, sender: 'them', text: "Rahmat aka, kod mukammal ishladi!", time: "12.06.2026" },
    ]
  }
]

export default function MessagesPage() {
  const [selectedChat, setSelectedChat] = useState<typeof mockChats[0] | null>(null)
  const [typedMessage, setTypedMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!typedMessage.trim() || !selectedChat) return

    const newMsg = {
      id: Date.now(),
      sender: 'me',
      text: typedMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    
    selectedChat.messages.push(newMsg)
    setTypedMessage("")
  }

  const filteredChats = mockChats.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    chat.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      <div className="bg-white border border-slate-100 rounded-2xl h-[calc(100vh-260px)] md:h-[calc(100vh-200px)] flex overflow-hidden">
        
        <div className={`w-full md:w-80 border-r border-slate-100 flex flex-col shrink-0 ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
          
          <div className="p-4 border-b border-slate-50">
            <h1 className="text-xl font-black text-slate-900 tracking-tight mb-3 flex items-center gap-2">
              Xabarlar
              <span className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
            </h1>
            <div className="relative flex items-center">
              <IoSearchOutline className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input 
                type="text"
                placeholder="Suhbatlarni qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 text-xs font-medium pl-9 pr-4 py-2.5 rounded-xl border border-transparent focus:border-blue-500/20 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-50/50 [&::-webkit-scrollbar]:hidden">
            {filteredChats.map((chat) => {
              const isUserTyping = chat.status === 'typing'
              return (
                <div 
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`p-4 flex items-center gap-3 cursor-pointer transition-all duration-150 relative border-l-2 ${
                    selectedChat?.id === chat.id 
                      ? 'bg-blue-50/40 border-l-blue-600' 
                      : 'border-l-transparent hover:bg-slate-50/60'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img src={chat.avatar} alt={chat.name} className="w-11 h-11 object-cover rounded-full border border-slate-100" />
                    {chat.status === 'online' && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-[2.5px] border-white rounded-full" />
                    )}
                    {isUserTyping && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-blue-600 border-[2.5px] border-white rounded-full animate-pulse" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1">
                        <h4 className="font-bold text-xs text-slate-900 truncate max-w-[110px]">{chat.name}</h4>
                        {chat.role === 'Creator' && <HiCheckBadge className="w-3.5 h-3.5 text-blue-500" />}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">{chat.time}</span>
                    </div>

                    <p className={`text-[11px] truncate ${isUserTyping ? 'text-blue-600 font-bold italic' : 'text-slate-500 font-medium'}`}>
                      {chat.lastMessage}
                    </p>
                  </div>

                  {chat.unread > 0 && (
                    <span className="bg-blue-600 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full shrink-0">
                      {chat.unread}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className={`flex-1 flex flex-col bg-slate-50/30 ${!selectedChat ? 'hidden md:flex items-center justify-center text-center p-8' : 'flex'}`}>
          {selectedChat ? (
            <>
              <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <button 
                    onClick={() => setSelectedChat(null)}
                    className="p-1.5 hover:bg-slate-50 rounded-lg md:hidden text-slate-600 active:scale-95 transition-transform"
                  >
                    <HiChevronLeft className="w-5 h-5" />
                  </button>
                  <img src={selectedChat.avatar} alt={selectedChat.name} className="w-9 h-9 object-cover rounded-full" />
                  <div className="min-w-0">
                    <h3 className="font-black text-xs text-slate-900 flex items-center gap-1">
                      {selectedChat.name}
                      {selectedChat.role === 'Creator' && <HiCheckBadge className="w-3.5 h-3.5 text-blue-500" />}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      {selectedChat.status === 'typing' ? 'yozmoqda...' : selectedChat.status}
                    </p>
                  </div>
                </div>
                <button className="p-2 hover:bg-slate-50 rounded-full text-slate-500">
                  <HiOutlineEllipsisVertical className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 [&::-webkit-scrollbar]:hidden">
                {selectedChat.messages.map((msg) => {
                  const isMe = msg.sender === 'me'
                  return (
                    <div key={msg.id} className={`flex flex-col max-w-[75%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                      <div className={`px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed ${
                        isMe 
                          ? 'bg-blue-600 text-white rounded-tr-none' 
                          : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 mt-1 px-1">{msg.time}</span>
                    </div>
                  )
                })}

                {selectedChat.status === 'typing' && (
                  <div className="flex flex-col self-start items-start max-w-[75%]">
                    <div className="px-4 py-3 bg-white border border-slate-100 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
                <button type="button" className="p-2 text-slate-400 hover:text-slate-600 active:scale-90 transition-transform">
                  <HiOutlinePaperClip className="w-5 h-5" />
                </button>
                <div className="relative flex-1 flex items-center">
                  <input 
                    type="text" 
                    placeholder="Xabar yozing..." 
                    value={typedMessage}
                    onChange={(e) => setTypedMessage(e.target.value)}
                    className="w-full bg-slate-50 text-xs font-medium pl-4 pr-10 py-3 rounded-xl border border-transparent focus:border-blue-500/20 focus:bg-white outline-none transition-all"
                  />
                  <button type="button" className="absolute right-3 text-slate-400 hover:text-slate-600">
                    <HiOutlineFaceSmile className="w-5 h-5" />
                  </button>
                </div>
                <button 
                  type="submit"
                  disabled={!typedMessage.trim()}
                  className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                    typedMessage.trim() 
                      ? 'bg-blue-600 text-white active:scale-95' 
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <HiPaperAirplane className="w-4 h-4 transform -rotate-45 -translate-y-[1px] translate-x-[1px]" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center max-w-sm">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="font-black text-sm text-slate-900 mb-1">Muloqotni boshlang</h3>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                Hamkorlar, xaridorlar yoki do'stlaringiz bilan bog'lanish uchun chap tomondagi ro'yxatdan suhbatni tanlang.
              </p>
            </div>
          )}
        </div>

      </div>
    </>
  )
}