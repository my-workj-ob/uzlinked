"use client"

import React, { useState, useEffect, useCallback } from 'react'
import {
    HiOutlineAdjustmentsHorizontal,
    HiOutlineChatBubbleLeftRight,
    HiOutlinePlusCircle
} from 'react-icons/hi2'
import { VerifiedBadge } from '@/components/verified-badge'
import { IoSearchOutline } from 'react-icons/io5'

interface ListingType {
    id: string
    title: string
    description: string
    price: string
    category: string
    image: string | null
    contact: string
    seller: {
        name: string
        username: string
        avatar: string
    }
    createdAt: string
}

const categoryBadge: Record<string, string> = {
    digital: 'Raqamli',
    physical: 'Jismoniy',
    service: 'Xizmat',
}

export default function MarketPage() {
    const [activeCategory, setActiveCategory] = useState<'all' | 'digital' | 'physical' | 'service'>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [listings, setListings] = useState<ListingType[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateForm, setShowCreateForm] = useState(false)

    // Create form states
    const [formTitle, setFormTitle] = useState('')
    const [formPrice, setFormPrice] = useState('')
    const [formDescription, setFormDescription] = useState('')
    const [formCategory, setFormCategory] = useState('digital')
    const [formContact, setFormContact] = useState('')
    const [formImage, setFormImage] = useState<File | null>(null)
    const [formImagePreview, setFormImagePreview] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const categories = [
        { id: 'all', label: 'Barchasi' },
        { id: 'digital', label: 'Raqamli' },
        { id: 'physical', label: 'Jismoniy mahsulotlar' },
        { id: 'service', label: 'Xizmatlar' },
    ]

    const fetchListings = useCallback(async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (activeCategory !== 'all') params.set('category', activeCategory)
            if (searchQuery) params.set('q', searchQuery)

            const res = await fetch(`/api/listings?${params.toString()}`)
            if (res.ok) {
                const data = await res.json()
                setListings(data)
            }
        } catch {
            console.error('E\'lonlarni yuklashda xato')
        } finally {
            setLoading(false)
        }
    }, [activeCategory, searchQuery])

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchListings()
        }, searchQuery ? 400 : 0)
        return () => clearTimeout(debounce)
    }, [fetchListings, searchQuery])

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setFormImage(file)
            setFormImagePreview(URL.createObjectURL(file))
        }
    }

    const handleCreateListing = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formTitle.trim() || !formPrice.trim() || isSubmitting) return

        setIsSubmitting(true)
        try {
            const formData = new FormData()
            formData.append('title', formTitle)
            formData.append('price', formPrice)
            formData.append('description', formDescription)
            formData.append('category', formCategory)
            formData.append('contact', formContact)
            if (formImage) formData.append('image', formImage)

            const res = await fetch('/api/listings', {
                method: 'POST',
                body: formData,
            })

            if (res.ok) {
                setShowCreateForm(false)
                setFormTitle('')
                setFormPrice('')
                setFormDescription('')
                setFormCategory('digital')
                setFormContact('')
                setFormImage(null)
                setFormImagePreview(null)
                fetchListings()
            } else {
                const err = await res.json()
                alert(err.error || 'Xatolik yuz berdi')
            }
        } catch {
            alert('E\'lon yaratishda xatolik')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div>
            <div className="space-y-6 pb-12">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Market</h1>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">Kreatorlardan eksklyuziv raqamli va jismoniy mahsulotlar.</p>
                        </div>
                        <button
                            onClick={() => setShowCreateForm(!showCreateForm)}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl active:scale-95 transition-all"
                        >
                            <HiOutlinePlusCircle className="w-4 h-4" />
                            E'lon qo'shish
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <div className="relative flex-1 flex items-center">
                            <IoSearchOutline className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Mahsulotlardan izlash..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white text-xs font-medium pl-10 pr-4 py-3 rounded-xl border border-slate-100 focus:border-blue-500/30 outline-none transition-all"
                            />
                        </div>
                        <button className="p-3 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 text-slate-600 active:scale-95 transition-all">
                            <HiOutlineAdjustmentsHorizontal className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* E'lon yaratish formasi */}
                {showCreateForm && (
                    <form onSubmit={handleCreateListing} className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-3 duration-200">
                        <h3 className="font-black text-sm text-slate-900">Yangi e'lon</h3>

                        <label className="relative h-32 w-full bg-slate-50 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:bg-slate-100/50 transition-colors">
                            {formImagePreview ? (
                                <img src={formImagePreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <>
                                    <HiOutlinePlusCircle className="w-6 h-6 text-slate-400 mb-1" />
                                    <span className="text-[10px] text-slate-500 font-medium">Mahsulot rasmini yuklang</span>
                                </>
                            )}
                            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                        </label>

                        <input
                            type="text"
                            placeholder="Sarlavha *"
                            required
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            className="w-full bg-slate-50/50 text-xs font-medium p-3 rounded-xl border border-slate-100 focus:border-blue-500/30 outline-none transition-all"
                        />

                        <textarea
                            placeholder="Tavsif (ixtiyoriy)"
                            value={formDescription}
                            onChange={(e) => setFormDescription(e.target.value)}
                            rows={2}
                            className="w-full bg-slate-50/50 text-xs font-medium p-3 rounded-xl border border-slate-100 focus:border-blue-500/30 outline-none transition-all resize-none"
                        />

                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="text"
                                placeholder="Narxi (masalan: 150,000 UZS) *"
                                required
                                value={formPrice}
                                onChange={(e) => setFormPrice(e.target.value)}
                                className="w-full bg-slate-50/50 text-xs font-medium p-3 rounded-xl border border-slate-100 focus:border-blue-500/30 outline-none transition-all"
                            />
                            <select
                                value={formCategory}
                                onChange={(e) => setFormCategory(e.target.value)}
                                className="w-full bg-slate-50/50 text-xs font-bold p-3 rounded-xl border border-slate-100 focus:border-blue-500/30 text-slate-600 outline-none transition-all"
                            >
                                <option value="digital">Raqamli</option>
                                <option value="physical">Jismoniy</option>
                                <option value="service">Xizmatlar</option>
                            </select>
                        </div>

                        <input
                            type="text"
                            placeholder="Aloqa ma'lumotlari (telefon, telegram)"
                            value={formContact}
                            onChange={(e) => setFormContact(e.target.value)}
                            className="w-full bg-slate-50/50 text-xs font-medium p-3 rounded-xl border border-slate-100 focus:border-blue-500/30 outline-none transition-all"
                        />

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setShowCreateForm(false)}
                                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all active:scale-95"
                            >
                                Bekor qilish
                            </button>
                            <button
                                type="submit"
                                disabled={!formTitle.trim() || !formPrice.trim() || isSubmitting}
                                className="flex-1 py-3 bg-blue-600 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold text-xs rounded-xl transition-all active:scale-95"
                            >
                                {isSubmitting ? 'Yuklanmoqda...' : 'E\'lonni joylashtirish'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Kategoriya filterlari */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {categories.map((cat) => {
                        const isSelected = activeCategory === cat.id
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id as any)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 ${
                                    isSelected
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-white text-slate-600 border border-slate-100 hover:border-slate-200'
                                }`}
                            >
                                {cat.label}
                            </button>
                        )
                    })}
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {/* E'lonlar ro'yxati */}
                {!loading && listings.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {listings.map((product) => (
                            <div
                                key={product.id}
                                className="bg-white border border-slate-100 rounded-2xl overflow-hidden flex flex-col group transition-all duration-200 hover:border-slate-200"
                            >
                                <div className="relative aspect-4/3 w-full bg-slate-50 overflow-hidden">
                                    {product.image ? (
                                        <img
                                            src={product.image}
                                            alt={product.title}
                                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
                                            <span className="text-slate-300 text-xs font-bold">Rasm yo'q</span>
                                        </div>
                                    )}
                                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-100/20">
                                        {categoryBadge[product.category] || product.category}
                                    </span>
                                </div>

                                <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-black text-blue-600 tracking-tight">{product.price}</span>
                                        </div>
                                        <h3 className="font-bold text-xs text-slate-800 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                                            {product.title}
                                        </h3>
                                        {product.description && (
                                            <p className="text-[11px] text-slate-500 line-clamp-2">{product.description}</p>
                                        )}
                                    </div>

                                    <div className="pt-3 border-t border-slate-50 flex items-center justify-between gap-2 mt-auto">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <img
                                                src={product.seller.avatar.startsWith('http') ? product.seller.avatar : product.seller.avatar}
                                                alt={product.seller.name}
                                                className="w-6 h-6 object-cover rounded-full bg-slate-100"
                                            />
                                            <div className="flex items-center gap-0.5 min-w-0">
                                                <span className="text-[11px] font-bold text-slate-600 truncate">{product.seller.name}</span>
                                                <VerifiedBadge className="w-3 h-3 shrink-0" />
                                            </div>
                                        </div>

                                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/80 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg text-[11px] font-bold transition-all duration-150 active:scale-95 shrink-0">
                                            <HiOutlineChatBubbleLeftRight className="w-3.5 h-3.5" />
                                            <span>Aloqa</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Bo'sh holat */}
                {!loading && listings.length === 0 && (
                    <div className="py-12 bg-white border border-slate-100 rounded-2xl flex flex-col items-center justify-center text-center p-6">
                        <p className="text-xs font-bold text-slate-400">
                            {searchQuery ? `"${searchQuery}" bo'yicha hech qanday e'lon topilmadi.` : 'Hozircha hech qanday e\'lon yo\'q.'}
                        </p>
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="mt-3 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all"
                        >
                            Birinchi e'lonni qo'shing
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}