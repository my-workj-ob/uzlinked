"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { FiHeart, FiMessageSquare, FiShare2, FiZap } from 'react-icons/fi'
import { FaHeart } from 'react-icons/fa'
import { HiSpeakerWave, HiSpeakerXMark, HiPlay, HiPause } from 'react-icons/hi2'
import { BsFilm, BsCpu } from 'react-icons/bs'
import { MdSubtitles, MdSubtitlesOff } from 'react-icons/md'

// ============================================================
// TYPES
// ============================================================

type VibeTag = 'motivatsion' | 'kulgili' | 'taʼlim' | 'lifestyle' | 'texnologiya' | 'musiqa'

interface CaptionLine {
    start: number
    end: number
    text: string
}

interface ReelType {
    id: string
    videoUrl: string
    title: string
    description: string
    author: string
    username: string
    avatar: string
    likes: number
    isLikedByMe: boolean
    views: number
    isOwner: boolean
    vibeTags?: VibeTag[]
    hookStart?: number
    captions?: CaptionLine[]
    aiRecap?: string
}

const VIBE_CONFIG: Record<VibeTag, { label: string; color: string; emoji: string }> = {
    motivatsion: { label: 'Motivatsion', color: 'from-orange-500 to-rose-500', emoji: '🔥' },
    kulgili: { label: 'Kulgili', color: 'from-amber-400 to-yellow-500', emoji: '😂' },
    'taʼlim': { label: "Ta'lim", color: 'from-blue-500 to-cyan-500', emoji: '🎓' },
    lifestyle: { label: 'Lifestyle', color: 'from-pink-500 to-fuchsia-500', emoji: '✨' },
    texnologiya: { label: 'Texnologiya', color: 'from-violet-500 to-indigo-500', emoji: '💻' },
    musiqa: { label: 'Musiqa', color: 'from-emerald-500 to-teal-500', emoji: '🎵' },
}

// ============================================================
// AI CAPTION OVERLAY
// ============================================================

function CaptionOverlay({
    captions,
    currentTime,
    visible,
}: {
    captions: CaptionLine[] | undefined
    currentTime: number
    visible: boolean
}) {
    const activeLine = useMemo(() => {
        if (!captions || captions.length === 0) return null
        return captions.find(c => currentTime >= c.start && currentTime <= c.end) || null
    }, [captions, currentTime])

    if (!visible || !activeLine) return null

    return (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[160px] z-20 max-w-[85%] px-2 pointer-events-none w-full flex justify-center">
            <p
                key={activeLine.text}
                className="text-center text-white text-[15px] sm:text-base font-bold leading-snug px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 shadow-2xl animate-caption-in"
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
            >
                {activeLine.text}
            </p>
        </div>
    )
}

// ============================================================
// VIBE BADGE ROW
// ============================================================

function VibeBadges({ tags }: { tags: VibeTag[] | undefined }) {
    if (!tags || tags.length === 0) return null
    return (
        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
            {tags.slice(0, 2).map(tag => {
                const cfg = VIBE_CONFIG[tag]
                if (!cfg) return null
                return (
                    <span
                        key={tag}
                        className={`inline-flex items-center gap-1 text-[11px] font-extrabold text-white px-2.5 py-1 rounded-full bg-gradient-to-r ${cfg.color} shadow-md border border-white/10`}
                    >
                        <span>{cfg.emoji}</span>
                        {cfg.label}
                    </span>
                )
            })}
        </div>
    )
}

// ============================================================
// AI RECAP CARD
// ============================================================

function AiRecapCard({ recap }: { recap: string }) {
    return (
        <div className="flex items-start gap-2.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-3 max-w-[260px] shadow-2xl ring-1 ring-white/5">
            <div className="w-6.5 h-6.5 rounded-xl bg-gradient-to-br from-violet-400 via-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg">
                <BsCpu className="w-3.5 h-3.5 text-white animate-pulse" />
            </div>
            <div>
                <p className="text-[10px] font-black tracking-wider text-violet-300 uppercase mb-0.5">AI Xulosa</p>
                <p className="text-[12px] text-white/90 leading-snug font-medium">{recap}</p>
            </div>
        </div>
    )
}

// ============================================================
// REEL CARD
// ============================================================

function ReelCard({
    reel,
    isActive,
    isMuted,
    onToggleMute,
    captionsOn,
    onToggleCaptions,
}: {
    reel: ReelType
    isActive: boolean
    isMuted: boolean
    onToggleMute: () => void
    captionsOn: boolean
    onToggleCaptions: () => void
}) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [liked, setLiked] = useState(reel.isLikedByMe)
    const [likesCount, setLikesCount] = useState(reel.likes)
    const [showPlayIcon, setShowPlayIcon] = useState(false)
    const [progress, setProgress] = useState(0)
    const [currentTime, setCurrentTime] = useState(0)
    const [showRecap, setShowRecap] = useState(false)
    const hookAppliedRef = useRef(false)

    // Auto play & Pause boshqaruvi va silliq transitions
    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        if (isActive) {
            const startPlayback = () => {
                if (!hookAppliedRef.current && reel.hookStart && reel.hookStart > 0) {
                    video.currentTime = reel.hookStart
                    hookAppliedRef.current = true
                }
                
                // Playback va'dasini xatoliklarsiz boshqarish
                video.play()
                    .then(() => setIsPlaying(true))
                    .catch(() => {
                        setIsPlaying(false)
                        // Agar brauzer bloklasa, ovozsiz qilib ijro etishga urinadi
                        video.muted = true
                        video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
                    })
            }

            if (video.readyState >= 1) {
                startPlayback()
            } else {
                video.addEventListener('loadedmetadata', startPlayback, { once: true })
            }

            const recapTimer = setTimeout(() => setShowRecap(true), 1200)
            return () => clearTimeout(recapTimer)
        } else {
            video.pause()
            video.currentTime = 0
            hookAppliedRef.current = false
            setIsPlaying(false)
            setShowRecap(false)
            setProgress(0)
        }
    }, [isActive, reel.hookStart])

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted
        }
    }, [isMuted])

    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        const handleTimeUpdate = () => {
            if (video.duration) {
                setProgress((video.currentTime / video.duration) * 100)
            }
            setCurrentTime(video.currentTime)
        }
        video.addEventListener('timeupdate', handleTimeUpdate)
        return () => video.removeEventListener('timeupdate', handleTimeUpdate)
    }, [])

    const togglePlay = () => {
        const video = videoRef.current
        if (!video) return

        if (video.paused) {
            video.play().then(() => setIsPlaying(true))
        } else {
            video.pause()
            setIsPlaying(false)
        }

        setShowPlayIcon(true)
        setTimeout(() => setShowPlayIcon(false), 500)
    }

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation()
        const prevLiked = liked
        const prevCount = likesCount
        setLiked(!liked)
        setLikesCount(prev => liked ? prev - 1 : prev + 1)

        try {
            const res = await fetch('/api/reels/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reelId: reel.id }),
            })
            if (!res.ok) throw new Error()
        } catch {
            setLiked(prevLiked)
            setLikesCount(prevCount)
        }
    }

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (navigator.share) {
            navigator.share({
                title: reel.title || 'VibeGrid Reel',
                url: `${window.location.origin}/dashboard/reels?id=${reel.id}`,
            })
        } else {
            navigator.clipboard.writeText(`${window.location.origin}/dashboard/reels?id=${reel.id}`)
        }
    }

    return (
        <div className="relative w-full h-full bg-slate-950 snap-start snap-always shrink-0 overflow-hidden flex items-center justify-center">
            <div className={`relative w-full h-full transition-all duration-700 ease-out transform ${
                isActive ? 'scale-100 opacity-100 blur-0' : 'scale-95 opacity-40 blur-xs'
            }`}>
                <video
                    ref={videoRef}
                    src={reel.videoUrl}
                    loop
                    playsInline
                    muted={isMuted}
                    onClick={togglePlay}
                    className="w-full h-full object-contain cursor-pointer"
                />
            </div>

            {showPlayIcon && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                    <div className="w-20 h-20 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center animate-ping-once border border-white/20">
                        {!isPlaying ? (
                            <HiPlay className="w-10 h-10 text-white ml-1.5" />
                        ) : (
                            <HiPause className="w-10 h-10 text-white" />
                        )}
                    </div>
                </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 z-30 h-1 bg-white/10 backdrop-blur-sm">
                <div
                    className="h-full bg-linear-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(99,102,241,0.8)]"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/10 to-black/40 pointer-events-none z-10" />

            <CaptionOverlay captions={reel.captions} currentTime={currentTime} visible={captionsOn} />

            <div className="absolute right-4 bottom-24 z-20 flex flex-col items-center gap-4.5">
                <button 
                    onClick={handleLike} 
                    className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 active:scale-75 hover:bg-white/15 transition-all shadow-xl group"
                >
                    {liked ? (
                        <FaHeart className="w-5 h-5 text-rose-500 filter drop-shadow-[0_0_6px_rgba(244,63,94,0.6)] animate-heart-pop" />
                    ) : (
                        <FiHeart className="w-5 h-5 text-white group-hover:text-rose-400 transition-colors" />
                    )}
                    <span className="absolute -bottom-5 text-white/90 text-[10px] font-black tracking-wide drop-shadow">{likesCount}</span>
                </button>

                <button className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 active:scale-75 hover:bg-white/15 transition-all shadow-xl mt-3 relative">
                    <FiMessageSquare className="w-5 h-5 text-white" />
                    <span className="absolute -bottom-5 text-white/90 text-[10px] font-black tracking-wide drop-shadow">{reel.aiRecap ? 1 : 0}</span>
                </button>

                <button 
                    onClick={handleShare} 
                    className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 active:scale-75 hover:bg-white/15 transition-all shadow-xl mt-3 relative"
                >
                    <FiShare2 className="w-5 h-5 text-white" />
                    <span className="absolute -bottom-5 text-white/90 text-[10px] font-black tracking-wide drop-shadow">Ulashing</span>
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); onToggleCaptions(); }}
                    className="w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center active:scale-75 hover:bg-white/15 transition-all shadow-xl mt-3"
                    aria-label="Subtitr"
                >
                    {captionsOn ? (
                        <MdSubtitles className="w-5 h-5 text-indigo-400" />
                    ) : (
                        <MdSubtitlesOff className="w-5 h-5 text-white/50" />
                    )}
                </button>

                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleMute(); }} 
                    className="w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center active:scale-75 hover:bg-white/15 transition-all shadow-xl mt-1"
                >
                    {isMuted ? (
                        <HiSpeakerXMark className="w-5 h-5 text-rose-400" />
                    ) : (
                        <HiSpeakerWave className="w-5 h-5 text-emerald-400" />
                    )}
                </button>
            </div>

            <div className={`absolute bottom-6 left-4 right-20 z-20 transition-all duration-500 delay-100 ${
                isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}>
                {showRecap && reel.aiRecap && (
                    <div className="mb-4 animate-recap-in origin-bottom-left">
                        <AiRecapCard recap={reel.aiRecap} />
                    </div>
                )}

                <VibeBadges tags={reel.vibeTags} />

                <div className="flex items-center gap-3 mb-2.5">
                    <img
                        src={reel.avatar.startsWith('http') ? reel.avatar : `${typeof window !== 'undefined' ? window.location.origin : ''}${reel.avatar}`}
                        alt={reel.author}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-white/30 shadow-md transform hover:rotate-6 transition-transform"
                    />
                    <div>
                        <h4 className="text-white font-black text-sm drop-shadow-md tracking-wide">{reel.author}</h4>
                        <span className="text-white/60 text-xs font-semibold">@{reel.username}</span>
                    </div>
                </div>

                {reel.title && (
                    <p className="text-white text-[14px] font-bold drop-shadow-md mb-1.5 leading-snug">{reel.title}</p>
                )}
                {reel.description && (
                    <p className="text-white/80 text-xs leading-relaxed line-clamp-2 drop-shadow-sm max-w-xl font-medium">{reel.description}</p>
                )}
            </div>
        </div>
    )
}

// ============================================================
// VIBE FILTER BAR
// ============================================================

function VibeFilterBar({
    activeFilter,
    onSelect,
}: {
    activeFilter: VibeTag | 'hammasi'
    onSelect: (tag: VibeTag | 'hammasi') => void
}) {
    const tags: (VibeTag | 'hammasi')[] = ['hammasi', ...(Object.keys(VIBE_CONFIG) as VibeTag[])]

    return (
        <div
            className="absolute top-14 left-0 right-0 z-40 flex gap-2 px-4 overflow-x-auto pb-2.5 pt-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
            {tags.map(tag => {
                const isActive = activeFilter === tag
                if (tag === 'hammasi') {
                    return (
                        <button
                            key={tag}
                            onClick={() => onSelect(tag)}
                            className={`shrink-0 text-[12px] font-black px-4 py-2 rounded-full transition-all duration-300 transform active:scale-95 ${isActive
                                ? 'bg-white text-slate-900 shadow-[0_4px_14px_rgba(255,255,255,0.3)] scale-105'
                                : 'bg-black/30 text-white border border-white/10 backdrop-blur-md hover:bg-black/40'
                                }`}
                        >
                            Hammasi
                        </button>
                    )
                }
                const cfg = VIBE_CONFIG[tag]
                return (
                    <button
                        key={tag}
                        onClick={() => onSelect(tag)}
                        className={`shrink-0 inline-flex items-center gap-1.5 text-[12px] font-black px-4 py-2 rounded-full transition-all duration-300 transform active:scale-95 ${isActive
                            ? `bg-linear-to-r ${cfg.color} text-white shadow-lg scale-105 border border-white/20`
                            : 'bg-black/30 text-white border border-white/10 backdrop-blur-md hover:bg-black/40'
                            }`}
                    >
                        <span>{cfg.emoji}</span>
                        {cfg.label}
                    </button>
                )
            })}
        </div>
    )
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function ReelsPage() {
    const [reels, setReels] = useState<ReelType[]>([])
    const [loading, setLoading] = useState(true)
    const [isMuted, setIsMuted] = useState(true)
    const [captionsOn, setCaptionsOn] = useState(true)
    const [activeIndex, setActiveIndex] = useState(0)
    const [vibeFilter, setVibeFilter] = useState<VibeTag | 'hammasi'>('hammasi')
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        async function fetchReels() {
            try {
                const res = await fetch('/api/reels')
                if (res.ok) {
                    const data = await res.json()
                    setReels(data)
                }
            } catch (err) {
                console.error('Reellarni yuklashda xato:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchReels()
    }, [])

    const filteredReels = useMemo(() => {
        if (vibeFilter === 'hammasi') return reels
        return reels.filter(r => r.vibeTags?.includes(vibeFilter))
    }, [reels, vibeFilter])

    const handleScroll = useCallback(() => {
        const container = containerRef.current
        if (!container) return

        const scrollTop = container.scrollTop
        const height = container.clientHeight
        const newIndex = Math.round(scrollTop / height)

        if (newIndex !== activeIndex && newIndex >= 0 && newIndex < filteredReels.length) {
            setActiveIndex(newIndex)
        }
    }, [activeIndex, filteredReels.length])

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        container.addEventListener('scroll', handleScroll, { passive: true })
        return () => container.removeEventListener('scroll', handleScroll)
    }, [handleScroll])

    useEffect(() => {
        setActiveIndex(0)
        if (containerRef.current) {
            containerRef.current.scrollTo({ top: 0 })
        }
    }, [vibeFilter])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[75vh] gap-4">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin shadow-md" />
                <p className="text-sm font-bold text-slate-400 tracking-wide animate-pulse">Reellar yuklanmoqda...</p>
            </div>
        )
    }

    if (reels.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] gap-5 px-6">
                <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center shadow-xl border border-slate-800">
                    <BsFilm className="w-10 h-10 text-slate-600" />
                </div>
                <div className="text-center">
                    <h3 className="text-xl font-black text-slate-200 mb-1">Hozircha reellar yo'q</h3>
                    <p className="text-xs text-slate-400 font-semibold max-w-xs leading-relaxed">
                        Birinchi bo'lib siz reel yuklang! Videolaringizni ulashish vaqti keldi.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="relative -mx-2 md:-mx-6 select-none">
            <style>{`
                @keyframes ping-once {
                    0% { transform: scale(0.6); opacity: 0; }
                    40% { transform: scale(1.1); opacity: 0.9; }
                    100% { transform: scale(1); opacity: 0; }
                }
                .animate-ping-once { animation: ping-once 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

                @keyframes caption-in {
                    from { opacity: 0; transform: translateY(8px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-caption-in { animation: caption-in 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

                @keyframes recap-in {
                    from { opacity: 0; transform: translateY(12px) scale(0.9); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-recap-in { animation: recap-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }

                @keyframes heart-pop {
                    0% { transform: scale(0.8); }
                    50% { transform: scale(1.3); }
                    100% { transform: scale(1); }
                }
                .animate-heart-pop { animation: heart-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
            `}</style>

            <div
                ref={containerRef}
                className="h-[calc(100svh-8rem)] md:h-[calc(100svh-4rem)] overflow-y-scroll snap-y snap-mandatory scroll-smooth rounded-3xl overflow-hidden relative shadow-2xl bg-black"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {filteredReels.length === 0 ? (
                    <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950 gap-4 px-6">
                        <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                            <FiZap className="w-6 h-6 text-indigo-400" />
                        </div>
                        <p className="text-white/80 text-sm font-bold text-center tracking-wide">
                            Bu vibe bo'yicha hech qanday reel topilmadi
                        </p>
                        <button
                            onClick={() => setVibeFilter('hammasi')}
                            className="text-xs font-black text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-full border border-indigo-500/20 hover:bg-indigo-500/20 transition-all"
                        >
                            Barcha reellarni ko'rish
                        </button>
                    </div>
                ) : (
                    filteredReels.map((reel, index) => (
                        <div key={reel.id} className="h-[calc(100svh-8rem)] md:h-[calc(100svh-4rem)] w-full">
                            <ReelCard
                                reel={reel}
                                isActive={index === activeIndex}
                                isMuted={isMuted}
                                onToggleMute={() => setIsMuted(!isMuted)}
                                captionsOn={captionsOn}
                                onToggleCaptions={() => setCaptionsOn(!captionsOn)}
                            />
                        </div>
                    ))
                )}
            </div>

            <div className="absolute top-4 left-4 z-40 flex items-center gap-2 bg-black/20 backdrop-blur-md px-3 rounded-full border border-white/10 shadow-lg">
                <BsFilm className="w-4 h-4 text-white animate-pulse" />
                <span className="text-white font-black text-xs tracking-wide">Reels</span>
                <span className="bg-white/20 text-white/90 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {filteredReels.length === 0 ? 0 : activeIndex + 1}/{filteredReels.length}
                </span>
            </div>

            <VibeFilterBar activeFilter={vibeFilter} onSelect={setVibeFilter} />
        </div>
    )
}