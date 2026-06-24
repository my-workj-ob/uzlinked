"use client"

import React, { useState, useRef, useEffect } from 'react'
import { HiOutlineCamera, HiOutlineDocumentText, HiOutlineShoppingBag, HiArrowLeft, HiXMark } from 'react-icons/hi2'
import { LuInfinity, LuTimer, LuImagePlus, LuVideo, LuGripVertical, LuStar } from 'react-icons/lu'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { toast } from 'sonner'
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"
import { uploadFiles } from '@/utils/uploadthing/uploadthing'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

// Postga qo'shilgan har bir media (rasm yoki video)
interface PostMediaItem {
    id: string
    file: File
    previewUrl: string
    type: 'image' | 'video'
    duration?: number
}

const MAX_VIDEO_SEC = 60
const FREE_IMAGE_LIMIT = 4
const PRO_IMAGE_LIMIT = 20

const getVideoDuration = (file: File): Promise<number> =>
    new Promise((resolve, reject) => {
        const v = document.createElement('video')
        v.preload = 'metadata'
        v.onloadedmetadata = () => {
            URL.revokeObjectURL(v.src)
            resolve(v.duration || 0)
        }
        v.onerror = () => reject(new Error('Video o\'qib bo\'lmadi'))
        v.src = URL.createObjectURL(file)
    })

interface CreateWizardProps {
    onClose: () => void
}

const stepTitles: Record<string, string> = {
    post: "Post yaratish",
    reel: "Reels yuklash",
    market: "Marketga e'lon qo'shish",
}

export const CreateWizard = ({ onClose }: CreateWizardProps) => {
    const [step, setStep] = useState<'menu' | 'post' | 'market' | 'reel'>('menu')
    const router = useRouter()
    const queryClient = useQueryClient()

    const [postText, setPostText] = useState('')
    // Vaqtinchalik post tanlovi: false = Doimiy, true = 72 soatda o'chadi
    const [postEphemeral, setPostEphemeral] = useState(false)
    // Postga qo'shilgan media (rasm/video) ro'yxati — draggable tartibda
    const [postMedia, setPostMedia] = useState<PostMediaItem[]>([])
    const [isPremium, setIsPremium] = useState(false)
    const postMediaInputRef = useRef<HTMLInputElement>(null)
    const [marketTitle, setMarketTitle] = useState('')
    const [marketPrice, setMarketPrice] = useState('')
    const [marketCategory, setMarketCategory] = useState('digital')

    // Reel holatlari
    const [reelTitle, setReelTitle] = useState('')
    const [reelDescription, setReelDescription] = useState('')
    const [videoPreview, setVideoPreview] = useState<string | null>(null)
    const [selectedVideo, setSelectedVideo] = useState<File | null>(null)

    // Rasm va yuklash holatlari
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Video siqish progressi
    const [compressionProgress, setCompressionProgress] = useState<number | null>(null)

    const ffmpegRef = useRef(new FFmpeg())

    useEffect(() => {
        const loadFFmpeg = async () => {
            try {
                const ffmpeg = ffmpegRef.current
                if (!ffmpeg.loaded) {
                    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm"
                    await ffmpeg.load({
                        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
                        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
                    })
                }
            } catch (e) {
                console.error("FFmpeg yuklanishida xatolik:", e)
            }
        }
        loadFFmpeg()
    }, [])

    // Foydalanuvchi PRO yoki yo'qligini aniqlash (media limitlari uchun)
    useEffect(() => {
        const checkPremium = async () => {
            try {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('is_premium')
                    .eq('id', user.id)
                    .single()
                setIsPremium(!!profile?.is_premium)
            } catch {
                /* default: bepul */
            }
        }
        checkPremium()
    }, [])

    // Komponent yopilganda preview URL'larini tozalash (xotira oqishi oldini olish)
    useEffect(() => {
        return () => {
            postMedia.forEach((m) => URL.revokeObjectURL(m.previewUrl))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const imageLimit = isPremium ? PRO_IMAGE_LIMIT : FREE_IMAGE_LIMIT
    const imageCount = postMedia.filter((m) => m.type === 'image').length
    const hasVideo = postMedia.some((m) => m.type === 'video')

    const handlePostMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return
        e.target.value = '' // bir xil faylni qayta tanlash uchun reset

        const next: PostMediaItem[] = []
        let curImages = imageCount
        let curHasVideo = hasVideo

        for (const file of files) {
            const isVideo = file.type.startsWith('video/')
            const isImage = file.type.startsWith('image/')

            if (isVideo) {
                if (!isPremium) {
                    toast.error('Video qo\'shish faqat PRO foydalanuvchilar uchun')
                    continue
                }
                if (curHasVideo) {
                    toast.error('Bitta postga faqat bitta video qo\'shish mumkin')
                    continue
                }
                let duration = 0
                try {
                    duration = await getVideoDuration(file)
                } catch {
                    toast.error('Videoni o\'qib bo\'lmadi')
                    continue
                }
                if (duration > MAX_VIDEO_SEC + 0.5) {
                    toast.error(`Video ${MAX_VIDEO_SEC} soniyadan oshmasligi kerak`)
                    continue
                }
                curHasVideo = true
                next.push({ id: `${Date.now()}-${file.name}`, file, previewUrl: URL.createObjectURL(file), type: 'video', duration })
            } else if (isImage) {
                if (curImages >= imageLimit) {
                    toast.error(
                        isPremium
                            ? `Maksimal ${imageLimit} ta rasm`
                            : `Bepul rejada ${imageLimit} ta rasm — ko'proq uchun PRO ga o'ting`
                    )
                    break
                }
                curImages += 1
                next.push({ id: `${Date.now()}-${file.name}-${curImages}`, file, previewUrl: URL.createObjectURL(file), type: 'image', duration: undefined })
            }
        }

        if (next.length > 0) setPostMedia((prev) => [...prev, ...next])
    }

    const removePostMedia = (id: string) => {
        setPostMedia((prev) => {
            const target = prev.find((m) => m.id === id)
            if (target) URL.revokeObjectURL(target.previewUrl)
            return prev.filter((m) => m.id !== id)
        })
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            setImagePreview(URL.createObjectURL(file))
        }
    }

    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedVideo(file)
            setVideoPreview(URL.createObjectURL(file))
        }
    }

    const removeImage = () => {
        setSelectedFile(null)
        setImagePreview(null)
    }

    const removeVideo = () => {
        setSelectedVideo(null)
        setVideoPreview(null)
    }

    const compressVideoFile = async (file: File): Promise<File> => {
        const ffmpeg = ffmpegRef.current

        if (!ffmpeg.loaded) {
            const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm"
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
            })
        }

        ffmpeg.on('progress', ({ progress }) => {
            setCompressionProgress(Math.min(100, Math.round(progress * 100)))
        })

        await ffmpeg.writeFile("input.mp4", await fetchFile(file))

        await ffmpeg.exec([
            "-i", "input.mp4",
            "-vcodec", "libx264",
            "-crf", "28",
            "-preset", "ultrafast",
            "output.mp4"
        ])

        const data = await ffmpeg.readFile("output.mp4") as any
        setCompressionProgress(null)

        return new File([data.buffer], file.name, { type: "video/mp4" })
    }

    const closeAndRefresh = () => {
        onClose()
        router.refresh()
    }

    // 1. POST YUKLASH
    const handlePostSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (isSubmitting) return
        if (!postText.trim() && postMedia.length === 0) {
            toast.error("Post bo'sh bo'lmasligi kerak — matn yoki media qo'shing")
            return
        }

        setIsSubmitting(true)
        const toastId = toast.loading("Post tayyorlanmoqda...")

        try {
            // Media yuklash (tartibni saqlagan holda)
            const media: { url: string; key: string; type: 'image' | 'video'; duration?: number }[] = []

            if (postMedia.length > 0) {
                toast.loading(`Media yuklanmoqda (${postMedia.length})...`, { id: toastId })
                const results = await uploadFiles('mediaUploader', { files: postMedia.map((m) => m.file) })
                postMedia.forEach((m, i) => {
                    const res = results[i]
                    if (res?.url) {
                        media.push({ url: res.url, key: res.key, type: m.type, duration: m.duration })
                    }
                })
            }

            // Orqaga moslik uchun: birinchi rasmni image_url sifatida ham yuboramiz
            const firstImage = media.find((m) => m.type === 'image')

            toast.loading("Ma'lumotlar saqlanmoqda...", { id: toastId })
            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: postText,
                    imageUrl: firstImage?.url ?? null,
                    imageKey: firstImage?.key ?? null,
                    media,
                    ephemeral: postEphemeral,
                }),
            })

            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || 'Post yuklashda xatolik')
            }

            toast.success("Post muvaffaqiyatli ulashildi!", { id: toastId })

            setPostText('')
            setPostEphemeral(false)
            postMedia.forEach((m) => URL.revokeObjectURL(m.previewUrl))
            setPostMedia([])
            removeImage()
            queryClient.invalidateQueries({ queryKey: ['posts'] })
            onClose()
        } catch (error: any) {
            toast.error(error.message || "Postni ulashishda xatolik yuz berdi", { id: toastId })
        } finally {
            setIsSubmitting(false)
        }
    }

    // 2. REEL YUKLASH
    const handleReelSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedVideo || isSubmitting) return

        setIsSubmitting(true)
        const toastId = toast.loading("Video tayyorlanmoqda...")

        try {
            let videoToSend = selectedVideo

            try {
                toast.loading("Video siqilmoqda...", { id: toastId })
                videoToSend = await compressVideoFile(selectedVideo)
            } catch (compressErr) {
                console.error("Siqishda xatolik, original fayl yuklanadi:", compressErr)
            }

            toast.loading("Video tarmoqqa yuklanmoqda...", { id: toastId })
            const [res] = await uploadFiles('mediaUploader', { files: [videoToSend] })

            toast.loading("Ma'lumotlar saqlanmoqda...", { id: toastId })
            const response = await fetch('/api/reels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: reelTitle,
                    description: reelDescription,
                    videoUrl: res.url,
                    videoKey: res.key
                }),
            })

            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || 'Reel yuklashda xatolik')
            }

            toast.success("Reel muvaffaqiyatli yuklandi!", { id: toastId })

            setReelTitle('')
            setReelDescription('')
            removeVideo()
            closeAndRefresh()
        } catch (error: any) {
            toast.error(error.message || "Reel yuklashda xatolik yuz berdi", { id: toastId })
        } finally {
            setIsSubmitting(false)
            setCompressionProgress(null)
        }
    }

    // 3. MARKET E'LONI
    const handleMarketSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!marketTitle.trim() || !marketPrice.trim() || !selectedFile || isSubmitting) return

        setIsSubmitting(true)
        const toastId = toast.loading("Rasm yuklanmoqda...")

        try {
            const [res] = await uploadFiles('mediaUploader', { files: [selectedFile] })

            toast.loading("E'lon yaratilmoqda...", { id: toastId })
            const response = await fetch('/api/listings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: marketTitle,
                    price: marketPrice,
                    category: marketCategory,
                    imageUrl: res.url,
                    imageKey: res.key
                }),
            })

            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || 'E\'lon yaratishda xatolik')
            }

            toast.success("E'lon muvaffaqiyatli joylandi!", { id: toastId })

            setMarketTitle('')
            setMarketPrice('')
            removeImage()
            closeAndRefresh()
        } catch (error: any) {
            toast.error(error.message || "E'lon yaratishda xatolik yuz berdi", { id: toastId })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleBack = () => {
        if (isSubmitting) return
        setStep('menu')
    }

    return (
        <div className="w-full max-w-md mx-auto bg-transparent overflow-hidden pb-4 px-0">
            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -14 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                    {/* Step: Menu */}
                    {step === 'menu' && (
                        <div className="flex flex-col gap-2.5 p-0.5">
                            <div className="flex items-center justify-between px-1 pb-1">
                                <span className="text-sm font-black text-slate-900 dark:text-white">Yangi yaratish</span>
                                <button onClick={onClose} className="p-1.5 -mr-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-lg active:scale-90 transition-all">
                                    <HiXMark className="w-5 h-5" />
                                </button>
                            </div>

                            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep('post')} className="w-full p-3.5 flex items-center gap-3.5 bg-slate-50/80 dark:bg-slate-900/40 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 border border-slate-100/50 dark:border-slate-800/80 rounded-2xl text-left transition-colors group">
                                <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0">
                                    <HiOutlineDocumentText className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Yangi Post yozish</h4>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Tasmaga rasm va fikrlaringizni joylang</p>
                                </div>
                            </motion.button>

                            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep('reel')} className="w-full p-3.5 flex items-center gap-3.5 bg-slate-50/80 dark:bg-slate-900/40 hover:bg-rose-50/60 dark:hover:bg-rose-950/30 border border-slate-100/50 dark:border-slate-800/80 rounded-2xl text-left transition-colors group">
                                <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all shrink-0">
                                    <HiOutlineCamera className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Reels yuklash</h4>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Qisqa video yuklang</p>
                                </div>
                            </motion.button>

                            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep('market')} className="w-full p-3.5 flex items-center gap-3.5 bg-slate-50/80 dark:bg-slate-900/40 hover:bg-amber-50/60 dark:hover:bg-amber-950/30 border border-slate-100/50 dark:border-slate-800/80 rounded-2xl text-left transition-colors group">
                                <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all shrink-0">
                                    <HiOutlineShoppingBag className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">E'lon joylashtirish (Market)</h4>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Mahsulot yoki xizmatlarni sotuvga qo'ying</p>
                                </div>
                            </motion.button>
                        </div>
                    )}

                    {/* Step: Post */}
                    {step === 'post' && (
                        <form onSubmit={handlePostSubmit} className="space-y-4 p-2">
                            <div className="flex items-center justify-between text-slate-800 dark:text-slate-200 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                                <div className="flex items-center gap-2.5">
                                    <button type="button" disabled={isSubmitting} onClick={handleBack} className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl disabled:opacity-50 active:scale-90 transition-all">
                                        <HiArrowLeft className="w-5 h-5" />
                                    </button>
                                    <span className="text-sm font-black">{stepTitles.post}</span>
                                </div>
                                <button type="button" disabled={isSubmitting} onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl active:scale-90 transition-all disabled:opacity-50">
                                    <HiXMark className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Media: rasm (max {imageLimit}) + video (PRO, 60s). Bir nechta bo'lsa drag bilan tartiblanadi */}
                            <div className="space-y-2.5">
                                <input
                                    ref={postMediaInputRef}
                                    type="file"
                                    accept="image/*,video/*"
                                    multiple
                                    disabled={isSubmitting}
                                    onChange={handlePostMediaChange}
                                    className="hidden"
                                />

                                {postMedia.length === 0 ? (
                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={() => postMediaInputRef.current?.click()}
                                        className="relative aspect-video w-full bg-slate-50/80 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition-all group"
                                    >
                                        <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:scale-110 transition-transform">
                                            <LuImagePlus className="w-5 h-5" />
                                        </div>
                                        <span className="text-xs text-slate-600 dark:text-slate-300 font-bold mt-2.5">Rasm yoki video qo'shing</span>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1">
                                            {imageLimit} tagacha rasm{isPremium ? ' + 1 daqiqalik video' : ''} · ixtiyoriy
                                        </span>
                                    </button>
                                ) : (
                                    <>
                                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                                        <Reorder.Group
                                            axis="x"
                                            values={postMedia}
                                            onReorder={setPostMedia}
                                            className="flex gap-2"
                                            as="div"
                                        >
                                            <AnimatePresence>
                                                {postMedia.map((m, idx) => (
                                                    <Reorder.Item
                                                        key={m.id}
                                                        value={m}
                                                        as="div"
                                                        layout
                                                        initial={{ opacity: 0, scale: 0.85 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.85 }}
                                                        whileDrag={{ scale: 1.06, zIndex: 50, boxShadow: '0 12px 30px rgba(0,0,0,0.25)' }}
                                                        transition={{ type: 'spring', stiffness: 600, damping: 38 }}
                                                        className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 cursor-grab active:cursor-grabbing touch-none select-none"
                                                    >
                                                        {m.type === 'video' ? (
                                                            <video src={m.previewUrl} muted playsInline className="w-full h-full object-cover pointer-events-none" />
                                                        ) : (
                                                            <img src={m.previewUrl} alt="" className="w-full h-full object-cover pointer-events-none" draggable={false} />
                                                        )}

                                                        {/* Birinchi element = muqova */}
                                                        {idx === 0 && (
                                                            <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-extrabold shadow">
                                                                <LuStar className="w-2.5 h-2.5" /> Muqova
                                                            </span>
                                                        )}

                                                        {m.type === 'video' && (
                                                            <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-900/75 text-white text-[9px] font-bold">
                                                                <LuVideo className="w-2.5 h-2.5" /> {Math.round(m.duration ?? 0)}s
                                                            </span>
                                                        )}

                                                        <span className="absolute bottom-1.5 right-1.5 w-5 h-5 rounded-md bg-slate-900/55 text-white/90 flex items-center justify-center pointer-events-none">
                                                            <LuGripVertical className="w-3 h-3" />
                                                        </span>

                                                        <button
                                                            type="button"
                                                            onPointerDownCapture={(e) => e.stopPropagation()}
                                                            onClick={() => removePostMedia(m.id)}
                                                            disabled={isSubmitting}
                                                            className="absolute top-1.5 right-1.5 w-5 h-5 bg-slate-900/70 hover:bg-rose-600 text-white rounded-md flex items-center justify-center active:scale-90 transition-all"
                                                        >
                                                            <HiXMark className="w-3.5 h-3.5" />
                                                        </button>
                                                    </Reorder.Item>
                                                ))}
                                            </AnimatePresence>
                                        </Reorder.Group>

                                        {(imageCount < imageLimit || (isPremium && !hasVideo)) && (
                                            <button
                                                type="button"
                                                disabled={isSubmitting}
                                                onClick={() => postMediaInputRef.current?.click()}
                                                className="shrink-0 w-24 h-24 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                                            >
                                                <LuImagePlus className="w-5 h-5" />
                                                <span className="text-[9px] font-bold mt-1">Qo'shish</span>
                                            </button>
                                        )}
                                      </div>

                                        <div className="flex items-center justify-between px-1">
                                            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                                {postMedia.length > 1 ? 'Tartibni surib o\'zgartiring · birinchisi muqova' : 'Yana qo\'shishingiz mumkin'}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                                {imageCount}/{imageLimit} rasm{hasVideo ? ' · 1 video' : ''}
                                            </p>
                                        </div>
                                    </>
                                )}

                                {!isPremium && (
                                    <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 px-1">
                                        Bepul reja: {FREE_IMAGE_LIMIT} ta rasm, video yo'q. PRO: {PRO_IMAGE_LIMIT} ta rasm + 1 daqiqalik video.
                                    </p>
                                )}
                            </div>

                            <div>
                                <textarea
                                    placeholder="Nimalar haqida o'ylayapsiz?..."
                                    rows={4}
                                    maxLength={500}
                                    value={postText}
                                    disabled={isSubmitting}
                                    onChange={(e) => setPostText(e.target.value)}
                                    className="w-full bg-slate-50/80 dark:bg-slate-900/40 text-slate-900 dark:text-slate-100 text-xs font-semibold p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900/80 outline-none resize-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                                <p className="text-right text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 mr-1">{postText.length}/500</p>
                            </div>

                            {/* Kapsula tanlovi: Doimiy yoki 72 soatda eriydigan */}
                            <div>
                                <div className="relative grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
                                    <motion.span
                                        layout
                                        transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                                        className={`absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-xl shadow-sm ${postEphemeral ? 'bg-amber-500 left-[calc(50%+0rem)]' : 'bg-blue-600 left-1'}`}
                                    />
                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={() => setPostEphemeral(false)}
                                        className={`relative z-10 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold rounded-xl transition-colors ${!postEphemeral ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}
                                    >
                                        <LuInfinity className="w-3.5 h-3.5" /> Doimiy
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={() => setPostEphemeral(true)}
                                        className={`relative z-10 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold rounded-xl transition-colors ${postEphemeral ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}
                                    >
                                        <LuTimer className="w-3.5 h-3.5" /> Vaqtinchalik (72 soat)
                                    </button>
                                </div>
                                <AnimatePresence mode="wait">
                                    <motion.p
                                        key={postEphemeral ? 'eph' : 'perm'}
                                        initial={{ opacity: 0, y: -3 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 3 }}
                                        transition={{ duration: 0.15 }}
                                        className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1.5 px-1"
                                    >
                                        {postEphemeral
                                            ? "Post 72 soatdan keyin o'chadi — kimdir saqlab qolsa, o'shada qoladi."
                                            : "Post lentada doimiy qoladi."}
                                    </motion.p>
                                </AnimatePresence>
                            </div>

                            <button
                                type="submit"
                                disabled={(!postText.trim() && postMedia.length === 0) || isSubmitting}
                                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 dark:disabled:bg-slate-900/60 text-white disabled:text-slate-400 dark:disabled:text-slate-600 font-bold text-xs rounded-2xl transition-all active:scale-[0.99] flex items-center justify-center gap-2 border border-transparent"
                            >
                                {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                                {isSubmitting ? "Yuklanmoqda..." : "Ulashish"}
                            </button>
                        </form>
                    )}

                    {/* Step: Reels */}
                    {step === 'reel' && (
                        <form onSubmit={handleReelSubmit} className="space-y-4 p-2">
                            <div className="flex items-center justify-between text-slate-800 dark:text-slate-200 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                                <div className="flex items-center gap-2.5">
                                    <button type="button" disabled={isSubmitting} onClick={handleBack} className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl disabled:opacity-50 active:scale-90 transition-all">
                                        <HiArrowLeft className="w-5 h-5" />
                                    </button>
                                    <span className="text-sm font-black">{stepTitles.reel}</span>
                                </div>
                                <button type="button" disabled={isSubmitting} onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl active:scale-90 transition-all disabled:opacity-50">
                                    <HiXMark className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="relative mx-auto w-full flex flex-col items-center">
                                <label className="relative aspect-[9/16] max-h-64 w-full bg-slate-50/80 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition-all group">
                                    {videoPreview ? (
                                        <video src={videoPreview} controls className="w-full h-full object-contain bg-black" />
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:scale-110 transition-transform">
                                                <HiOutlineCamera className="w-5 h-5" />
                                            </div>
                                            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-2">Video tanlang *</span>
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">Avtomatik optimal siqiladi</span>
                                        </>
                                    )}
                                    <input type="file" accept="video/*" required disabled={isSubmitting} onChange={handleVideoChange} className="hidden" />
                                </label>
                                {videoPreview && (
                                    <button type="button" onClick={removeVideo} disabled={isSubmitting} className="absolute top-2 right-2 w-7 h-7 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full flex items-center justify-center active:scale-90 transition-all">
                                        <HiXMark className="w-4 h-4" />
                                    </button>
                                )}

                                {compressionProgress !== null && (
                                    <div className="w-full mt-2.5">
                                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-blue-600 rounded-full"
                                                animate={{ width: `${compressionProgress}%` }}
                                                transition={{ ease: 'linear', duration: 0.2 }}
                                            />
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 text-center">Video siqilmoqda: {compressionProgress}%</p>
                                    </div>
                                )}
                            </div>

                            <input
                                type="text"
                                placeholder="Mavzu (Sarlavha)"
                                value={reelTitle}
                                disabled={isSubmitting}
                                onChange={(e) => setReelTitle(e.target.value)}
                                className="w-full bg-slate-50/80 dark:bg-slate-900/40 text-slate-900 dark:text-slate-100 text-xs font-semibold p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900/80 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />

                            <div>
                                <textarea
                                    placeholder="Reel haqida tavsif yozing..."
                                    rows={3}
                                    maxLength={300}
                                    value={reelDescription}
                                    disabled={isSubmitting}
                                    onChange={(e) => setReelDescription(e.target.value)}
                                    className="w-full bg-slate-50/80 dark:bg-slate-900/40 text-slate-900 dark:text-slate-100 text-xs font-semibold p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900/80 outline-none resize-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                                <p className="text-right text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 mr-1">{reelDescription.length}/300</p>
                            </div>

                            <button
                                type="submit"
                                disabled={!selectedVideo || isSubmitting}
                                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 dark:disabled:bg-slate-900/60 text-white disabled:text-slate-400 dark:disabled:text-slate-600 font-bold text-xs rounded-2xl transition-all active:scale-[0.99] flex items-center justify-center gap-2 border border-transparent"
                            >
                                {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                                {isSubmitting
                                    ? (compressionProgress !== null ? `Siqilmoqda: ${compressionProgress}%` : "Yuklanmoqda...")
                                    : "Ulashish"}
                            </button>
                        </form>
                    )}

                    {/* Step: Market */}
                    {step === 'market' && (
                        <form onSubmit={handleMarketSubmit} className="space-y-3 p-2">
                            <div className="flex items-center justify-between text-slate-800 dark:text-slate-200 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                                <div className="flex items-center gap-2.5">
                                    <button type="button" disabled={isSubmitting} onClick={handleBack} className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl disabled:opacity-50 active:scale-90 transition-all">
                                        <HiArrowLeft className="w-5 h-5" />
                                    </button>
                                    <span className="text-sm font-black">{stepTitles.market}</span>
                                </div>
                                <button type="button" disabled={isSubmitting} onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl active:scale-90 transition-all disabled:opacity-50">
                                    <HiXMark className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="relative">
                                <label className="relative aspect-video w-full bg-slate-50/80 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition-all group">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:scale-110 transition-transform">
                                                <HiOutlineCamera className="w-4 h-4" />
                                            </div>
                                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1.5">Mahsulot rasmini yuklang *</span>
                                        </>
                                    )}
                                    <input type="file" accept="image/*" required disabled={isSubmitting} onChange={handleImageChange} className="hidden" />
                                </label>
                                {imagePreview && (
                                    <button type="button" onClick={removeImage} disabled={isSubmitting} className="absolute top-2 right-2 w-7 h-7 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full flex items-center justify-center active:scale-90 transition-all">
                                        <HiXMark className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <input
                                type="text"
                                placeholder="Sarlavha"
                                required
                                value={marketTitle}
                                disabled={isSubmitting}
                                onChange={(e) => setMarketTitle(e.target.value)}
                                className="w-full bg-slate-50/80 dark:bg-slate-900/40 text-slate-900 dark:text-slate-100 text-xs font-semibold p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900/80 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />

                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    placeholder="Narxi"
                                    required
                                    value={marketPrice}
                                    disabled={isSubmitting}
                                    onChange={(e) => setMarketPrice(e.target.value)}
                                    className="w-full bg-slate-50/80 dark:bg-slate-900/40 text-slate-900 dark:text-slate-100 text-xs font-semibold p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900/80 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                                <select
                                    value={marketCategory}
                                    disabled={isSubmitting}
                                    onChange={(e) => setMarketCategory(e.target.value)}
                                    className="w-full bg-slate-50/80 dark:bg-slate-900/40 text-slate-800 dark:text-slate-200 text-xs font-bold p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 outline-none cursor-pointer appearance-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748B%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-[right_14px_center] bg-no-repeat"
                                >
                                    <option value="digital" className="bg-white dark:bg-slate-900 dark:text-white">Raqamli</option>
                                    <option value="physical" className="bg-white dark:bg-slate-900 dark:text-white">Jismoniy</option>
                                    <option value="service" className="bg-white dark:bg-slate-900 dark:text-white">Xizmatlar</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={!marketTitle || !marketPrice || !imagePreview || isSubmitting}
                                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 dark:disabled:bg-slate-900/60 text-white disabled:text-slate-400 dark:disabled:text-slate-600 font-bold text-xs rounded-2xl transition-all active:scale-[0.99] mt-2 flex items-center justify-center gap-2 border border-transparent"
                            >
                                {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                                {isSubmitting ? "Yuklanmoqda..." : "E'lonni joylashtirish"}
                            </button>
                        </form>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}