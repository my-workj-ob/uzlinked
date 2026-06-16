"use client"

import React, { useState } from 'react'
import { HiOutlineCamera, HiOutlineDocumentText, HiOutlineShoppingBag, HiArrowLeft } from 'react-icons/hi2'

interface CreateWizardProps {
    onClose: () => void
}

export const CreateWizard = ({ onClose }: CreateWizardProps) => {
    const [step, setStep] = useState<'menu' | 'post' | 'market'>('menu')

    const [postText, setPostText] = useState('')
    const [marketTitle, setMarketTitle] = useState('')
    const [marketPrice, setMarketPrice] = useState('')
    const [marketCategory, setMarketCategory] = useState('digital')
    
    // Rasm uchun state-lar
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Rasm tanlanganda uni xotiraga olish
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file) // Haqiqiy faylni serverga yuborish uchun saqlaymiz
            setImagePreview(URL.createObjectURL(file)) // UI da ko'rsatish uchun
        }
    }

    // Postni serverga yuborish funksiyasi
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

            // Muvaffaqiyatli yuklangach, inputlarni tozalash va modalni yopish
            setPostText('')
            setImagePreview(null)
            setSelectedFile(null)
            onClose()

            // Agar feed sahifasida bo'lsangiz, yangi post chiqishi uchun sahifani yangilaymiz
            window.location.reload()

        } catch (error: any) {
            alert(`Xatolik: ${error.message}`)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="w-full">

            {step === 'menu' && (
                <div className="flex flex-col gap-2.5 animate-in fade-in duration-150">
                    <button
                        onClick={() => setStep('post')}
                        className="w-full p-4 flex items-center gap-4 bg-slate-50/60 hover:bg-emerald-50/50 border border-slate-100 rounded-xl text-left transition-all group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0">
                            <HiOutlineDocumentText className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-slate-800">Yangi Post yozish</h4>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Tasmaga rasm va fikrlaringizni joylang</p>
                        </div>
                    </button>

                    <button
                        onClick={() => setStep('market')}
                        className="w-full p-4 flex items-center gap-4 bg-slate-50/60 hover:bg-amber-50/50 border border-slate-100 rounded-xl text-left transition-all group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all shrink-0">
                            <HiOutlineShoppingBag className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-slate-800">E'lon joylashtirish (Market)</h4>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Mahsulot yoki xizmatlaringizni sotuvga qo'ying</p>
                        </div>
                    </button>
                </div>
            )}

            {step === 'post' && (
                <form onSubmit={handlePostSubmit} className="space-y-4 animate-in slide-in-from-right-4 duration-200">
                    <div className="flex items-center gap-2 text-slate-600 mb-2">
                        <button type="button" disabled={isSubmitting} onClick={() => setStep('menu')} className="p-1 hover:bg-slate-50 rounded-lg disabled:opacity-50">
                            <HiArrowLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-bold">Post yaratish</span>
                    </div>

                    <label className="relative aspect-video w-full bg-slate-50 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:bg-slate-100/50 transition-colors">
                        {imagePreview ? (
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <>
                                <HiOutlineCamera className="w-6 h-6 text-slate-400 mb-1" />
                                <span className="text-[11px] text-slate-500 font-medium">Rasm yuklash (Ixtiyoriy)</span>
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
                        className="w-full bg-slate-50/50 text-xs font-medium p-3 rounded-xl border border-slate-100 focus:border-blue-500/30 outline-none resize-none transition-all disabled:opacity-60"
                    />

                    <button
                        type="submit"
                        disabled={!postText.trim() || isSubmitting}
                        className="w-full py-3 bg-blue-600 disabled:bg-slate-100 text-white disabled:text-slate-400 font-bold text-xs rounded-xl transition-all active:scale-[0.99] flex items-center justify-center"
                    >
                        {isSubmitting ? "Yuklanmoqda..." : "Ulashish"}
                    </button>
                </form>
            )}

            {step === 'market' && (
                <form onSubmit={(e) => { e.preventDefault(); onClose(); }} className="space-y-3 animate-in slide-in-from-right-4 duration-200">
                    {/* Market formi o'zgarishsiz qoladi */}
                    <div className="flex items-center gap-2 text-slate-600 mb-2">
                        <button type="button" onClick={() => setStep('menu')} className="p-1 hover:bg-slate-50 rounded-lg">
                            <HiArrowLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-bold">Marketga e'lon qo'shish</span>
                    </div>

                    <label className="relative h-32 w-full bg-slate-50 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:bg-slate-100/50 transition-colors">
                        {imagePreview ? (
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <>
                                <HiOutlineCamera className="w-5 h-5 text-slate-400 mb-1" />
                                <span className="text-[10px] text-slate-500 font-medium">Mahsulot rasmini yuklang *</span>
                            </>
                        )}
                        <input type="file" accept="image/*" required onChange={handleImageChange} className="hidden" />
                    </label>

                    <input
                        type="text"
                        placeholder="Sarlavha (masalan: Mexanik klaviatura)"
                        required
                        value={marketTitle}
                        onChange={(e) => setMarketTitle(e.target.value)}
                        className="w-full bg-slate-50/50 text-xs font-medium p-3 rounded-xl border border-slate-100 focus:border-blue-500/30 outline-none transition-all"
                    />

                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="text"
                            placeholder="Narxi (masalan: 150,000 UZS)"
                            required
                            value={marketPrice}
                            onChange={(e) => setMarketPrice(e.target.value)}
                            className="w-full bg-slate-50/50 text-xs font-medium p-3 rounded-xl border border-slate-100 focus:border-blue-500/30 outline-none transition-all"
                        />
                        <select
                            value={marketCategory}
                            onChange={(e) => setMarketCategory(e.target.value)}
                            className="w-full bg-slate-50/50 text-xs font-bold p-3 rounded-xl border border-slate-100 focus:border-blue-500/30 text-slate-600 outline-none transition-all"
                        >
                            <option value="digital">Raqamli</option>
                            <option value="physical">Jismoniy</option>
                            <option value="service">Xizmatlar</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={!marketTitle || !marketPrice || !imagePreview}
                        className="w-full py-3 bg-blue-600 disabled:bg-slate-100 text-white disabled:text-slate-400 font-bold text-xs rounded-xl transition-all active:scale-[0.99] mt-2"
                    >
                        E'lonni joylashtirish
                    </button>
                </form>
            )}

        </div>
    )
}