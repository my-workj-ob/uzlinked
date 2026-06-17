"use client"

import React, { useState, useRef, useEffect } from 'react'
import { HiOutlineCamera, HiOutlineDocumentText, HiOutlineShoppingBag, HiArrowLeft } from 'react-icons/hi2'
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"

interface CreateWizardProps {
    onClose: () => void
}

export const CreateWizard = ({ onClose }: CreateWizardProps) => {
    const [step, setStep] = useState<'menu' | 'post' | 'market' | 'reel'>('menu')

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
    
    // Video siqish progressi uchun holat
    const [compressionProgress, setCompressionProgress] = useState<number | null>(null)

    const ffmpegRef = useRef(new FFmpeg())

    // Komponent yuklanganda FFmpeg-ni fonda tayyorlab turish (Tezlikni oshirish uchun)
    useEffect(() => {
        const loadFFmpeg = async () => {
            try {
                const ffmpeg = ffmpegRef.current;
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

    // Rasm tanlanganda
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            setImagePreview(URL.createObjectURL(file))
        }
    }

    // Video tanlanganda
    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedVideo(file)
            setVideoPreview(URL.createObjectURL(file))
        }
    }

    // Videoni brauzerning o'zida siqish mantiqi (Faqat Reel uchun)
    const compressVideoFile = async (file: File): Promise<File> => {
        const ffmpeg = ffmpegRef.current
        
        // Agar kutilmaganda hali yuklanmagan bo'lsa, qayta tekshirib yuklaymiz
        if (!ffmpeg.loaded) {
            const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm"
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
            })
        }

        // Siqish foizini kuzatib borish uchun event tinglovchisi
        ffmpeg.on('progress', ({ progress }) => {
            setCompressionProgress(Math.round(progress * 100))
        })

        // Virtual xotiraga yozamiz
        await ffmpeg.writeFile("input.mp4", await fetchFile(file))

        // Siqish komandalari: ultrafast va crf 28 hajmni keskin kamaytiradi va tez ishlaydi
        await ffmpeg.exec([
            "-i", "input.mp4",
            "-vcodec", "libx264",
            "-crf", "28",
            "-preset", "ultrafast",
            "output.mp4"
        ])

        // Tayyor siqilgan faylni o'qiymiz
        const data = await ffmpeg.readFile("output.mp4") as any
        
        // Progressni tozalaymiz
        setCompressionProgress(null)

        return new File([data.buffer], file.name, { type: "video/mp4" })
    }

    // Post yuklash
    const handlePostSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!postText.trim() || isSubmitting) return

        setIsSubmitting(true)
        try {
            const formData = new FormData()
            formData.append('content', postText)
            if (selectedFile) {
                formData.append('image', selectedFile)
            }

            const response = await fetch('/api/posts', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || 'Post yuklashda xatolik')
            }

            setPostText('')
            setImagePreview(null)
            setSelectedFile(null)
            onClose()
            window.location.reload()
        } catch (error: any) {
            alert(`Xatolik: ${error.message}`)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Reel yuklash (Avtomatik siqish bilan birlashtirildi)
    const handleReelSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedVideo || isSubmitting) return

        setIsSubmitting(true)
        try {
            let videoToSend = selectedVideo

            // 🔥 Video yuklanishidan oldin uni siqish funksiyasini chaqiramiz
            try {
                videoToSend = await compressVideoFile(selectedVideo)
            } catch (compressErr) {
                console.error("Siqishda xatolik, original fayl yuboriladi:", compressErr)
            }

            const formData = new FormData()
            formData.append('video', videoToSend)
            formData.append('title', reelTitle)
            formData.append('description', reelDescription)

            const response = await fetch('/api/reels', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || 'Reel yuklashda xatolik')
            }

            setReelTitle('')
            setReelDescription('')
            setVideoPreview(null)
            setSelectedVideo(null)
            onClose()
            window.location.reload()
        } catch (error: any) {
            alert(`Xatolik: ${error.message}`)
        } finally {
            setIsSubmitting(false)
            setCompressionProgress(null)
        }
    }

    // Market e'loni
    const handleMarketSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!marketTitle.trim() || !marketPrice.trim() || isSubmitting) return

        setIsSubmitting(true)
        try {
            const formData = new FormData()
            formData.append('title', marketTitle)
            formData.append('price', marketPrice)
            formData.append('category', marketCategory)
            if (selectedFile) {
                formData.append('image', selectedFile)
            }

            const response = await fetch('/api/listings', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || 'E\'lon yaratishda xatolik')
            }

            setMarketTitle('')
            setMarketPrice('')
            setImagePreview(null)
            setSelectedFile(null)
            onClose()
            window.location.reload()
        } catch (error: any) {
            alert(`Xatolik: ${error.message}`)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="w-full max-w-md mx-auto bg-white rounded-3xl overflow-hidden pb-4">
            
            {/* 1. ASOSIY MENU STEP */}
            {step === 'menu' && (
                <div className="flex flex-col gap-3 p-1 animate-in fade-in slide-in-from-bottom-8 duration-300 timing-bezier-[0.32,0.94,0.6,1]">
                    <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-2 shrink-0" />
                    
                    <button
                        onClick={() => setStep('post')}
                        className="w-full p-4 flex items-center gap-4 bg-slate-50/70 hover:bg-emerald-50/60 border border-slate-100 rounded-2xl text-left transition-all duration-200 active:scale-[0.97] cursor-pointer group select-none"
                    >
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200 shrink-0 shadow-sm">
                            <HiOutlineDocumentText className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-slate-800">Yangi Post yozish</h4>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Tasmaga rasm va fikrlaringizni joylang</p>
                        </div>
                    </button>

                    <button
                        onClick={() => setStep('reel')}
                        className="w-full p-4 flex items-center gap-4 bg-slate-50/70 hover:bg-rose-50/60 border border-slate-100 rounded-2xl text-left transition-all duration-200 active:scale-[0.97] cursor-pointer group select-none"
                    >
                        <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all duration-200 shrink-0 shadow-sm">
                            <HiOutlineCamera className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-slate-800">Reels yuklash</h4>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Qisqa video yuklang va auditoriyangizni kengaytiring</p>
                        </div>
                    </button>

                    <button
                        onClick={() => setStep('market')}
                        className="w-full p-4 flex items-center gap-4 bg-slate-50/70 hover:bg-amber-50/60 border border-slate-100 rounded-2xl text-left transition-all duration-200 active:scale-[0.97] cursor-pointer group select-none"
                    >
                        <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all duration-200 shrink-0 shadow-sm">
                            <HiOutlineShoppingBag className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-slate-800">E'lon joylashtirish (Market)</h4>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Mahsulot yoki xizmatlaringizni sotuvga qo'ying</p>
                        </div>
                    </button>
                </div>
            )}

            {/* 2. POST YARATISH STEP */}
            {step === 'post' && (
                <form onSubmit={handlePostSubmit} className="space-y-4 p-1 animate-in slide-in-from-right-12 duration-300 timing-bezier-[0.32,0.94,0.6,1]">
                    <div className="flex items-center gap-3 text-slate-700 pb-1 border-b border-slate-50">
                        <button type="button" disabled={isSubmitting} onClick={() => setStep('menu')} className="p-2 hover:bg-slate-100 active:scale-90 rounded-xl transition-all disabled:opacity-50 cursor-pointer">
                            <HiArrowLeft className="w-5 h-5" />
                        </button>
                        <span className="text-sm font-black">Post yaratish</span>
                    </div>

                    <label className="relative aspect-video w-full bg-slate-50/80 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:bg-slate-100/70 transition-all duration-200 active:scale-[0.99] group">
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

                    <textarea
                        placeholder="Nimalar haqida o'ylayapsiz?..."
                        rows={4}
                        value={postText}
                        disabled={isSubmitting}
                        onChange={(e) => setPostText(e.target.value)}
                        className="w-full bg-slate-50/50 text-xs font-semibold p-3.5 rounded-2xl border border-slate-100/80 focus:border-blue-500/30 focus:bg-white outline-none resize-none transition-all disabled:opacity-60 placeholder:text-slate-400"
                    />

                    <button
                        type="submit"
                        disabled={!postText.trim() || isSubmitting}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 text-white disabled:text-slate-400 font-bold text-xs rounded-2xl transition-all duration-200 active:scale-[0.97] flex items-center justify-center shadow-sm cursor-pointer disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? "Yuklanmoqda..." : "Ulashish"}
                    </button>
                </form>
            )}

            {/* 3. REELS YUKLASH STEP (SIQISH VA SILLIQ SENSOR SIFATI BILAN) */}
            {step === 'reel' && (
                <form onSubmit={handleReelSubmit} className="space-y-4 p-1 animate-in slide-in-from-right-12 duration-300 timing-bezier-[0.32,0.94,0.6,1]">
                    <div className="flex items-center gap-3 text-slate-700 pb-1 border-b border-slate-50">
                        <button type="button" disabled={isSubmitting} onClick={() => setStep('menu')} className="p-2 hover:bg-slate-100 active:scale-90 rounded-xl transition-all disabled:opacity-50 cursor-pointer">
                            <HiArrowLeft className="w-5 h-5" />
                        </button>
                        <span className="text-sm font-black">Reels yuklash</span>
                    </div>

                    <label className="relative aspect-[9/16] max-h-64 w-full bg-slate-50/80 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:bg-slate-100/70 transition-all duration-200 active:scale-[0.99] group mx-auto">
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

                    <input
                        type="text"
                        placeholder="Mavzu (Sarlavha)"
                        value={reelTitle}
                        disabled={isSubmitting}
                        onChange={(e) => setReelTitle(e.target.value)}
                        className="w-full bg-slate-50/50 text-xs font-semibold p-3.5 rounded-2xl border border-slate-100/80 focus:border-blue-500/30 focus:bg-white outline-none transition-all disabled:opacity-60 placeholder:text-slate-400"
                    />

                    <textarea
                        placeholder="Reel haqida tavsif yozing..."
                        rows={3}
                        value={reelDescription}
                        disabled={isSubmitting}
                        onChange={(e) => setReelDescription(e.target.value)}
                        className="w-full bg-slate-50/50 text-xs font-semibold p-3.5 rounded-2xl border border-slate-100/80 focus:border-blue-500/30 focus:bg-white outline-none resize-none transition-all disabled:opacity-60 placeholder:text-slate-400"
                    />

                    <button
                        type="submit"
                        disabled={!selectedVideo || isSubmitting}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 text-white disabled:text-slate-400 font-bold text-xs rounded-2xl transition-all duration-200 active:scale-[0.97] flex items-center justify-center shadow-sm cursor-pointer disabled:cursor-not-allowed relative overflow-hidden"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                {compressionProgress !== null ? (
                                    <>Video siqilmoqda: {compressionProgress}%</>
                                ) : (
                                    <>Serverga yuklanmoqda...</>
                                )}
                            </span>
                        ) : (
                            "Ulashish"
                        )}
                    </button>
                </form>
            )}

            {/* 4. MARKET STEP */}
            {step === 'market' && (
                <form onSubmit={handleMarketSubmit} className="space-y-3 p-1 animate-in slide-in-from-right-12 duration-300 timing-bezier-[0.32,0.94,0.6,1]">
                    <div className="flex items-center gap-3 text-slate-700 pb-1 border-b border-slate-50">
                        <button type="button" disabled={isSubmitting} onClick={() => setStep('menu')} className="p-2 hover:bg-slate-100 active:scale-90 rounded-xl transition-all cursor-pointer">
                            <HiArrowLeft className="w-5 h-5" />
                        </button>
                        <span className="text-sm font-black">Marketga e'lon qo'shish</span>
                    </div>

                    <label className="relative h-32 w-full bg-slate-50/80 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:bg-slate-100/70 transition-all duration-200 active:scale-[0.99] group">
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

                    <input
                        type="text"
                        placeholder="Sarlavha (masalan: Mexanik klaviatura)"
                        required
                        value={marketTitle}
                        disabled={isSubmitting}
                        onChange={(e) => setMarketTitle(e.target.value)}
                        className="w-full bg-slate-50/50 text-xs font-semibold p-3.5 rounded-2xl border border-slate-100/80 focus:border-blue-500/30 focus:bg-white outline-none transition-all disabled:opacity-60 placeholder:text-slate-400"
                    />

                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="text"
                            placeholder="Narxi (masalan: 150,000 UZS)"
                            required
                            value={marketPrice}
                            disabled={isSubmitting}
                            onChange={(e) => setMarketPrice(e.target.value)}
                            className="w-full bg-slate-50/50 text-xs font-semibold p-3.5 rounded-2xl border border-slate-100/80 focus:border-blue-500/30 focus:bg-white outline-none transition-all disabled:opacity-60 placeholder:text-slate-400"
                        />
                        <select
                            value={marketCategory}
                            disabled={isSubmitting}
                            onChange={(e) => setMarketCategory(e.target.value)}
                            className="w-full bg-slate-50/50 text-xs font-bold p-3.5 rounded-2xl border border-slate-100/80 focus:border-blue-500/30 text-slate-600 outline-none transition-all disabled:opacity-60 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748B%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-[right_14px_center] bg-no-repeat"
                        >
                            <option value="digital" className="cursor-pointer">Raqamli</option>
                            <option value="physical" className="cursor-pointer">Jismoniy</option>
                            <option value="service" className="cursor-pointer">Xizmatlar</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={!marketTitle || !marketPrice || !imagePreview || isSubmitting}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 text-white disabled:text-slate-400 font-bold text-xs rounded-2xl transition-all duration-200 active:scale-[0.97] mt-2 shadow-sm cursor-pointer disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? "Yuklanmoqda..." : "E'lonni joylashtirish"}
                    </button>
                </form>
            )}

        </div>
    )
}