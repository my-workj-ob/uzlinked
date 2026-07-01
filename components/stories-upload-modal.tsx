"use client"

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { HiOutlineCamera, HiOutlineVideoCamera, HiXMark } from 'react-icons/hi2'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"
import { uploadFiles } from '@/utils/uploadthing/uploadthing'

interface StoryUploadModalProps {
    onClose: () => void
    onUploaded: () => void
}

export const StoryUploadModal = ({ onClose, onUploaded }: StoryUploadModalProps) => {
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

    const [preview, setPreview] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const isVideo = file.type.startsWith('video/')
        const isImage = file.type.startsWith('image/')

        if (!isVideo && !isImage) {
            toast.error("Faqat rasm yoki video formatdagi fayllarni yuklash mumkin")
            return
        }

        setSelectedFile(file)
        setMediaType(isVideo ? 'video' : 'image')
        setPreview(URL.createObjectURL(file))
    }

    const removeMedia = () => {
        setSelectedFile(null)
        setMediaType(null)
        setPreview(null)
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
            "-t", "30",
            "output.mp4"
        ])

        const data = await ffmpeg.readFile("output.mp4") as any
        setCompressionProgress(null)

        return new File([data.buffer], file.name, { type: "video/mp4" })
    }

    const handleSubmit = async () => {
        if (!selectedFile || !mediaType || isSubmitting) return

        setIsSubmitting(true)
        const toastId = toast.loading("Story tayyorlanmoqda...")

        try {
            let fileToSend = selectedFile

            if (mediaType === 'video') {
                try {
                    toast.loading("Video siqilmoqda...", { id: toastId })
                    fileToSend = await compressVideoFile(selectedFile)
                } catch (compressErr) {
                    console.error("Siqishda xatolik, original fayl yuklanadi:", compressErr)
                }
            }

            toast.loading("Yuklanmoqda...", { id: toastId })
            const [res] = await uploadFiles('mediaUploader', { files: [fileToSend] })

            toast.loading("Saqlanmoqda...", { id: toastId })
            const response = await fetch('/api/stories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mediaUrl: res.url,
                    mediaKey: res.key,
                    mediaType: mediaType,
                }),
            })

            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || 'Story yuklashda xatolik')
            }

            toast.success("Story muvaffaqiyatli joylandi!", { id: toastId })
            onUploaded()
        } catch (error: any) {
            toast.error(error.message || "Story yuklashda xatolik yuz berdi", { id: toastId })
        } finally {
            setIsSubmitting(false)
            setCompressionProgress(null)
        }
    }

    if (!mounted) return null

    return createPortal(
        <div className="fixed inset-0 z-[999999] bg-black/60 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl overflow-hidden p-4 border border-slate-150 dark:border-white/5"
            >
                <div className="flex items-center justify-between pb-3 border-b border-slate-50 dark:border-white/5">
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100">Story qo'shish</span>
                    <button onClick={onClose} disabled={isSubmitting} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg active:scale-90 transition-all disabled:opacity-50 cursor-pointer">
                        <HiXMark className="w-5 h-5" />
                    </button>
                </div>

                <div className="relative mt-4">
                    <label className="relative aspect-[9/16] max-h-80 w-full bg-slate-50/80 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-white/5 rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:bg-slate-100/70 dark:hover:bg-slate-900/50 transition-all group">
                        {preview ? (
                            mediaType === 'video' ? (
                                <video src={preview} controls className="w-full h-full object-contain bg-black" />
                            ) : (
                                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                            )
                        ) : (
                            <>
                                <div className="flex gap-2 mb-2">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:scale-110 transition-transform">
                                        <HiOutlineCamera className="w-5 h-5" />
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:scale-110 transition-transform">
                                        <HiOutlineVideoCamera className="w-5 h-5" />
                                    </div>
                                </div>
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Rasm yoki video tanlang</span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">24 soat davomida ko'rinadi</span>
                            </>
                        )}
                        <input
                            type="file"
                            accept="image/*,video/*"
                            disabled={isSubmitting}
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </label>
                    {preview && (
                        <button type="button" onClick={removeMedia} disabled={isSubmitting} className="absolute top-2 right-2 w-7 h-7 bg-slate-900/60 hover:bg-slate-900/80 text-white rounded-full flex items-center justify-center active:scale-90 transition-all cursor-pointer">
                            <HiXMark className="w-4 h-4" />
                        </button>
                    )}

                    {compressionProgress !== null && (
                        <div className="w-full mt-2.5">
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
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

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!selectedFile || isSubmitting}
                    className="w-full mt-4 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 dark:disabled:text-slate-600 font-bold text-xs rounded-2xl transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer border border-transparent dark:border-white/5"
                >
                    {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                    {isSubmitting
                        ? (compressionProgress !== null ? `Siqilmoqda: ${compressionProgress}%` : "Yuklanmoqda...")
                        : "Story sifatida joylash"}
                </button>
            </motion.div>
        </div>,
        document.body
    )
}