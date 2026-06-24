"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { HiArrowLeft, HiCheck, HiXMark as HiX } from 'react-icons/hi2'
import { VerifiedBadge } from '@/components/verified-badge'
import { FaRocket, FaBriefcase, FaStar } from 'react-icons/fa'
import { createClient } from '@/utils/supabase/client'

export default function PricingPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [isPremium, setIsPremium] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [showSuccess, setShowSuccess] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const { data } = await supabase.auth.getUser()
                const user = data?.user
                if (user) {
                    setUser(user)
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('is_premium')
                        .eq('id', user.id)
                        .single()
                    if (profile?.is_premium) {
                        setIsPremium(true)
                    }
                }
            } catch (err) {
                console.warn('[Pricing] User check error:', err)
            }
        }
        fetchUserData()
    }, [])

    const handleUpgrade = async () => {
        if (loading || isPremium) return
        setLoading(true)
        try {
            const res = await fetch('/api/profile/upgrade', {
                method: 'POST',
            })
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Tarifni oshirishda xatolik yuz berdi')
            }
            setIsPremium(true)
            setShowSuccess(true)
        } catch (err: any) {
            alert(err.message || 'Xatolik yuz berdi')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen text-slate-800 dark:text-slate-100 pb-24 relative select-none">
            {/* Header */}
            <div className="flex items-center gap-3 pt-4 px-4 sm:px-6">
                <button
                    onClick={() => router.back()}
                    className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800/40 rounded-xl active:scale-90 transition-all text-slate-700 dark:text-slate-350"
                >
                    <HiArrowLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-black text-slate-900 dark:text-slate-100">Tariflar</span>
            </div>

            {/* Background mesh glow effects */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2 w-72 h-72 bg-blue-600/20 dark:bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-40 left-1/3 w-60 h-60 bg-purple-600/20 dark:bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-4xl mx-auto px-4 mt-8 text-center relative z-10">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                    Profilingizni <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">PRO</span> darajaga yangilang
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
                    Kengaytirilgan imkoniyatlar va professional rezyume vositalaridan to'liq foydalaning.
                </p>

                {/* Plans Grid */}
                <div className="grid md:grid-cols-2 gap-6 mt-10 max-w-2xl mx-auto text-left">
                    {/* Free Plan */}
                    <div className="p-6 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/80 dark:border-white/5 backdrop-blur-md flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-center">
                                <h3 className="text-base font-black text-slate-900 dark:text-white">Boshlang'ich</h3>
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-450 rounded text-[9px] font-bold">Tekin</span>
                            </div>
                            <div className="mt-4 flex items-baseline">
                                <span className="text-3xl font-black text-slate-900 dark:text-white">$0</span>
                                <span className="text-xs text-slate-450 dark:text-slate-500 ml-1">/ umrbod</span>
                            </div>
                            <ul className="mt-6 space-y-3 text-xs text-slate-600 dark:text-slate-350">
                                <li className="flex items-center gap-2">
                                    <HiCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <span>Oddiy ijtimoiy tarmoq profili</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <HiCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <span>Postlar va Reellar yuklash</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <HiCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <span>Bitta postga <b className="font-bold">4 tagacha</b> rasm</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <HiX className="w-4 h-4 text-slate-400 shrink-0" />
                                    <span className="text-slate-400 dark:text-slate-500">Video qo'shish mavjud emas</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <HiCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <span>Asosiy qidiruv tizimi</span>
                                </li>
                            </ul>
                        </div>
                        <button
                            disabled
                            className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-650 font-bold text-xs rounded-xl mt-8 select-none"
                        >
                            Joriy Reja
                        </button>
                    </div>

                    {/* PRO Plan */}
                    <div className="relative p-6 rounded-2xl bg-gradient-to-b from-blue-600/5 to-indigo-600/5 dark:from-blue-650/10 dark:to-indigo-650/10 border-2 border-blue-600/50 dark:border-blue-500/50 flex flex-col justify-between overflow-hidden">
                        {/* Decorative background glow */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/20 rounded-full blur-2xl pointer-events-none" />
                        
                        <div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1.5">
                                    <h3 className="text-base font-black text-slate-900 dark:text-white">PRO Plan</h3>
                                    <FaStar className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
                                </div>
                                <span className="px-2.5 py-0.5 bg-blue-600 text-white rounded-full text-[8px] font-extrabold uppercase tracking-wider">Premium</span>
                            </div>
                            <div className="mt-4 flex items-baseline">
                                <span className="text-3xl font-black text-slate-900 dark:text-white">$4.99</span>
                                <span className="text-xs text-slate-450 dark:text-slate-500 ml-1">/ oyiga</span>
                            </div>
                            <ul className="mt-6 space-y-3 text-xs text-slate-600 dark:text-slate-350">
                                <li className="flex items-center gap-2">
                                    <HiCheck className="w-4 h-4 text-blue-500 shrink-0" />
                                    <span className="flex items-center gap-1">
                                        Ko'k tasdiqlash belgisi <VerifiedBadge className="w-4 h-4" />
                                    </span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <HiCheck className="w-4 h-4 text-blue-500 shrink-0" />
                                    <span>Professional rezyume & portfolio rejimi</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <HiCheck className="w-4 h-4 text-blue-500 shrink-0" />
                                    <span>Explore qidiruvida ustuvorlik (Priority)</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <HiCheck className="w-4 h-4 text-blue-500 shrink-0" />
                                    <span>Bitta postga <b className="font-bold">20 tagacha</b> rasm + <b className="font-bold">1 daqiqalik</b> video</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <HiCheck className="w-4 h-4 text-blue-500 shrink-0" />
                                    <span>Maxsus ijtimoiy havolalar panelini ulash</span>
                                </li>
                            </ul>
                        </div>

                        {isPremium ? (
                            <button
                                disabled
                                className="w-full py-3 bg-emerald-500 text-white font-bold text-xs rounded-xl mt-8 flex items-center justify-center gap-1 cursor-default"
                            >
                                <HiCheck className="w-4 h-4" /> Faollashtirilgan
                            </button>
                        ) : (
                            <button
                                onClick={handleUpgrade}
                                disabled={loading}
                                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl mt-8 transition-all active:scale-[0.98] shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-60"
                            >
                                {loading ? 'Yangilanmoqda...' : 'PRO Rejaga O\'tish'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Success Overlay Dialog */}
            {showSuccess && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowSuccess(false)} />
                    <div className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 max-w-sm w-full p-6 rounded-2xl text-center shadow-2xl animate-drawer-slide-up">
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100/10">
                            <VerifiedBadge className="w-10 h-10" />
                        </div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white">Tabriklaymiz!</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                            Profilingiz muvaffaqiyatli **PRO** darajasiga ko'tarildi! Ismingiz yonida tasdiqlash belgisi (checkmark) paydo bo'ldi.
                        </p>
                        <button
                            onClick={() => {
                                setShowSuccess(false)
                                router.push('/dashboard/profile')
                            }}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl mt-6 transition-all active:scale-[0.98] cursor-pointer"
                        >
                            Profilga Qaytish
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
