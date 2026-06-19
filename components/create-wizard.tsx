"use client"

import React, { useState, useRef, useEffect } from 'react'
import { HiOutlineCamera, HiOutlineDocumentText, HiOutlineShoppingBag, HiArrowLeft, HiXMark } from 'react-icons/hi2'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"
import { uploadFiles } from '@/utils/uploadthing/uploadthing'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'

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
        if (!postText.trim() || isSubmitting) return

        setIsSubmitting(true)
        const toastId = toast.loading("Post tayyorlanmoqda...")

        try {
            // ASOSIY BUG: avval faqat imageKey yuborilardi, imageUrl umuman
            // jo'natilmasdi — shuning uchun bazada image_url doim NULL bo'lib
            // qolardi. Endi uploadthing javobidan ikkisini ham olamiz.
            let uploadedUrl: string | null = null
            let uploadedKey: string | null = null

            if (selectedFile) {
                toast.loading("Rasm yuklanmoqda...", { id: toastId })
                const [res] = await uploadFiles('mediaUploader', { files: [selectedFile] })
                uploadedUrl = res.url
                uploadedKey = res.key
            }

            toast.loading("Ma'lumotlar saqlanmoqda...", { id: toastId })
            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: postText,
                    imageUrl: uploadedUrl,
                    imageKey: uploadedKey
                }),
            })

            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || 'Post yuklashda xatolik')
            }

            toast.success("Post muvaffaqiyatli ulashildi!", { id: toastId })

            setPostText('')
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
        <div className="w-full max-w-md mx-auto bg-white rounded-3xl overflow-hidden pb-4 px-1">
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1 shrink-0" />

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
                        <div className="flex flex-col gap-3 p-2">
                            <div className="flex items-center justify-between px-1 pb-1">
                                <span className="text-sm font-black text-slate-900">Yangi yaratish</span>
                                <button onClick={onClose} className="p-1.5 -mr-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg active:scale-90 transition-all">
                                    <HiXMark className="w-5 h-5" />
                                </button>
                            </div>

                            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep('post')} className="w-full p-4 flex items-center gap-4 bg-slate-50/70 hover:bg-emerald-50/60 border border-slate-100 rounded-2xl text-left transition-colors group">
                                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0">
                                    <HiOutlineDocumentText className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-slate-800">Yangi Post yozish</h4>
                                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Tasmaga rasm va fikrlaringizni joylang</p>
                                </div>
                            </motion.button>

                            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep('reel')} className="w-full p-4 flex items-center gap-4 bg-slate-50/70 hover:bg-rose-50/60 border border-slate-100 rounded-2xl text-left transition-colors group">
                                <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all shrink-0">
                                    <HiOutlineCamera className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-slate-800">Reels yuklash</h4>
                                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Qisqa video yuklang</p>
                                </div>
                            </motion.button>

                            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep('market')} className="w-full p-4 flex items-center gap-4 bg-slate-50/70 hover:bg-amber-50/60 border border-slate-100 rounded-2xl text-left transition-colors group">
                                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all shrink-0">
                                    <HiOutlineShoppingBag className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-slate-800">E'lon joylashtirish (Market)</h4>
                                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Mahsulot yoki xizmatlarni sotuvga qo'ying</p>
                                </div>
                            </motion.button>
                        </div>
                    )}

                    {/* Step: Post */}
                    {step === 'post' && (
                        <form onSubmit={handlePostSubmit} className="space-y-4 p-2">
                            <div className="flex items-center justify-between text-slate-700 pb-1 border-b border-slate-50">
                                <div className="flex items-center gap-3">
                                    <button type="button" disabled={isSubmitting} onClick={handleBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-xl disabled:opacity-50 active:scale-90 transition-all">
                                        <HiArrowLeft className="w-5 h-5" />
                                    </button>
                                    <span className="text-sm font-black">{stepTitles.post}</span>
                                </div>
                                <button type="button" disabled={isSubmitting} onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg active:scale-90 transition-all disabled:opacity-50">
                                    <HiXMark className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="relative">
                                <label className="relative aspect-video w-full bg-slate-50/80 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:bg-slate-100/70 transition-all group">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
                                                <HiOutlineCamera className="w-5 h-5" />
                                            </div>
                                            <span className="text-xs text-slate-500 font-semibold mt-2">Rasm yuklash (Ixtiyoriy)</span>
                                        </>
                                    )}
                                    <input type="file" accept="image/*" disabled={isSubmitting} onChange={handleImageChange} className="hidden" />
                                </label>
                                {imagePreview && (
                                    <button type="button" onClick={removeImage} disabled={isSubmitting} className="absolute top-2 right-2 w-7 h-7 bg-slate-900/60 hover:bg-slate-900/80 text-white rounded-full flex items-center justify-center active:scale-90 transition-all">
                                        <HiXMark className="w-4 h-4" />
                                    </button>
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
                                    className="w-full bg-slate-50/50 text-xs font-semibold p-3.5 rounded-2xl border border-slate-100 focus:border-blue-500 focus:bg-white outline-none resize-none transition-all placeholder:text-slate-400"
                                />
                                <p className="text-right text-[10px] font-bold text-slate-300 mt-1 mr-1">{postText.length}/500</p>
                            </div>

                            <button
                                type="submit"
                                disabled={!postText.trim() || isSubmitting}
                                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 text-white disabled:text-slate-400 font-bold text-xs rounded-2xl transition-all active:scale-[0.99] flex items-center justify-center gap-2 border border-transparent dark:border-white/5"
                            >
                                {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                                {isSubmitting ? "Yuklanmoqda..." : "Ulashish"}
                            </button>
                        </form>
                    )}

                    {/* Step: Reels */}
                    {step === 'reel' && (
                        <form onSubmit={handleReelSubmit} className="space-y-4 p-2">
                            <div className="flex items-center justify-between text-slate-700 pb-1 border-b border-slate-50">
                                <div className="flex items-center gap-3">
                                    <button type="button" disabled={isSubmitting} onClick={handleBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-xl disabled:opacity-50 active:scale-90 transition-all">
                                        <HiArrowLeft className="w-5 h-5" />
                                    </button>
                                    <span className="text-sm font-black">{stepTitles.reel}</span>
                                </div>
                                <button type="button" disabled={isSubmitting} onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg active:scale-90 transition-all disabled:opacity-50">
                                    <HiXMark className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="relative mx-auto w-full flex flex-col items-center">
                                <label className="relative aspect-[9/16] max-h-64 w-full bg-slate-50/80 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:bg-slate-100/70 transition-all group">
                                    {videoPreview ? (
                                        <video src={videoPreview} controls className="w-full h-full object-contain bg-black" />
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
                                                <HiOutlineCamera className="w-5 h-5" />
                                            </div>
                                            <span className="text-xs text-slate-500 font-semibold mt-2">Video tanlang *</span>
                                            <span className="text-[10px] text-slate-400 mt-0.5 font-medium">Avtomatik optimal siqiladi</span>
                                        </>
                                    )}
                                    <input type="file" accept="video/*" required disabled={isSubmitting} onChange={handleVideoChange} className="hidden" />
                                </label>
                                {videoPreview && (
                                    <button type="button" onClick={removeVideo} disabled={isSubmitting} className="absolute top-2 right-2 w-7 h-7 bg-slate-900/60 hover:bg-slate-900/80 text-white rounded-full flex items-center justify-center active:scale-90 transition-all">
                                        <HiXMark className="w-4 h-4" />
                                    </button>
                                )}

                                {compressionProgress !== null && (
                                    <div className="w-full mt-2.5">
                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-blue-600 rounded-full"
                                                animate={{ width: `${compressionProgress}%` }}
                                                transition={{ ease: 'linear', duration: 0.2 }}
                                            />
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 mt-1 text-center">Video siqilmoqda: {compressionProgress}%</p>
                                    </div>
                                )}
                            </div>

                            <input
                                type="text"
                                placeholder="Mavzu (Sarlavha)"
                                value={reelTitle}
                                disabled={isSubmitting}
                                onChange={(e) => setReelTitle(e.target.value)}
                                className="w-full bg-slate-50/50 text-xs font-semibold p-3.5 rounded-2xl border border-slate-100 focus:border-blue-500 focus:bg-white outline-none"
                            />

                            <div>
                                <textarea
                                    placeholder="Reel haqida tavsif yozing..."
                                    rows={3}
                                    maxLength={300}
                                    value={reelDescription}
                                    disabled={isSubmitting}
                                    onChange={(e) => setReelDescription(e.target.value)}
                                    className="w-full bg-slate-50/50 text-xs font-semibold p-3.5 rounded-2xl border border-slate-100 focus:border-blue-500 focus:bg-white outline-none resize-none"
                                />
                                <p className="text-right text-[10px] font-bold text-slate-300 mt-1 mr-1">{reelDescription.length}/300</p>
                            </div>

                            <button
                                type="submit"
                                disabled={!selectedVideo || isSubmitting}
                                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 text-white disabled:text-slate-400 font-bold text-xs rounded-2xl transition-all active:scale-[0.99] flex items-center justify-center gap-2 border border-transparent dark:border-white/5"
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
                            <div className="flex items-center justify-between text-slate-700 pb-1 border-b border-slate-50">
                                <div className="flex items-center gap-3">
                                    <button type="button" disabled={isSubmitting} onClick={handleBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-xl disabled:opacity-50 active:scale-90 transition-all">
                                        <HiArrowLeft className="w-5 h-5" />
                                    </button>
                                    <span className="text-sm font-black">{stepTitles.market}</span>
                                </div>
                                <button type="button" disabled={isSubmitting} onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg active:scale-90 transition-all disabled:opacity-50">
                                    <HiXMark className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="relative">
                                <label className="relative aspect-video w-full bg-slate-50/80 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:bg-slate-100/70 transition-all group">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
                                                <HiOutlineCamera className="w-4 h-4" />
                                            </div>
                                            <span className="text-[11px] text-slate-500 font-semibold mt-1.5">Mahsulot rasmini yuklang *</span>
                                        </>
                                    )}
                                    <input type="file" accept="image/*" required disabled={isSubmitting} onChange={handleImageChange} className="hidden" />
                                </label>
                                {imagePreview && (
                                    <button type="button" onClick={removeImage} disabled={isSubmitting} className="absolute top-2 right-2 w-7 h-7 bg-slate-900/60 hover:bg-slate-900/80 text-white rounded-full flex items-center justify-center active:scale-90 transition-all">
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
                                className="w-full bg-slate-50/50 text-xs font-semibold p-3.5 rounded-2xl border border-slate-100 focus:border-blue-500 focus:bg-white outline-none"
                            />

                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    placeholder="Narxi"
                                    required
                                    value={marketPrice}
                                    disabled={isSubmitting}
                                    onChange={(e) => setMarketPrice(e.target.value)}
                                    className="w-full bg-slate-50/50 text-xs font-semibold p-3.5 rounded-2xl border border-slate-100 focus:border-blue-500 focus:bg-white outline-none"
                                />
                                <select
                                    value={marketCategory}
                                    disabled={isSubmitting}
                                    onChange={(e) => setMarketCategory(e.target.value)}
                                    className="w-full bg-slate-50/50 text-xs font-bold p-3.5 rounded-2xl border border-slate-100 text-slate-600 outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748B%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-[right_14px_center] bg-no-repeat"
                                >
                                    <option value="digital">Raqamli</option>
                                    <option value="physical">Jismoniy</option>
                                    <option value="service">Xizmatlar</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={!marketTitle || !marketPrice || !imagePreview || isSubmitting}
                                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 text-white disabled:text-slate-400 font-bold text-xs rounded-2xl transition-all active:scale-[0.99] mt-2 flex items-center justify-center gap-2 border border-transparent dark:border-white/5"
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