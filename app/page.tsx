"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  HiOutlineDocumentText, 
  HiOutlineCamera, 
  HiOutlineShoppingBag, 
  HiOutlineSparkles,
  HiOutlineArrowRight,
  HiOutlineCheckCircle
} from 'react-icons/hi2'
import { FiTrendingUp, FiZap, FiShield, FiLayers, FiCompass } from 'react-icons/fi'

export default function RootPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isRedirecting, setIsRedirecting] = useState(true)

  useEffect(() => {
    // Client-side check for onboarding completion
    const onboardingCompleted = localStorage.getItem('onboarding_completed')
    if (onboardingCompleted === 'true') {
      router.replace('/dashboard')
    } else {
      setIsRedirecting(false)
    }
  }, [router])

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleComplete = () => {
    localStorage.setItem('onboarding_completed', 'true')
    router.push('/dashboard')
  }

  const handleSkip = () => {
    handleComplete()
  }

  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-400">Yuklanmoqda...</p>
      </div>
    )
  }

  // Slide content data
  const slides = [
    {
      title: "VibeGrid-ga xush kelibsiz",
      subtitle: "Boshqalardan farqli ijtimoiy tarmoq",
      description: "An'anaviy ijtimoiy tarmoqlardagi keraksiz chalg'itishlar, reklamalar va algoritmik manipulyatsiyalardan butunlay xoli bo'lgan yangi makon.",
      content: (
        <div className="grid grid-cols-1 gap-3.5 w-full max-w-lg mt-4">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl flex items-start gap-4"
          >
            <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl shrink-0">
              <HiOutlineSparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Instagram-dan farqi
              </h4>
              <p className="text-[11px] text-slate-400 font-medium mt-1 leading-relaxed">
                Reklamasiz, xronologik toza tasma va ijodkorlarni bevosita qo'llab-quvvatlash (Tipping) tizimi.
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl flex items-start gap-4"
          >
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl shrink-0">
              <FiLayers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Telegram-dan farqi
              </h4>
              <p className="text-[11px] text-slate-400 font-medium mt-1 leading-relaxed">
                Shunchaki oddiy chat ro'yxati emas, balki kashfiyotlar paneli va chiroyli tartiblangan vizual gridlar.
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl flex items-start gap-4"
          >
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl shrink-0">
              <FiZap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Facebook-dan farqi
              </h4>
              <p className="text-[11px] text-slate-400 font-medium mt-1 leading-relaxed">
                Og'ir va keraksiz funksiyalardan xoli, zamonaviy dizayn hamda o'ta tez ishlovchi interfeys.
              </p>
            </div>
          </motion.div>
        </div>
      )
    },
    {
      title: "Cheksiz imkoniyatlar",
      subtitle: "Hammasi bir joyda jamlangan",
      description: "VibeGrid o'zida zamonaviy ijtimoiy tarmoqning eng kerakli va qiziqarli jihatlarini birlashtiradi.",
      content: (
        <div className="grid grid-cols-2 gap-3 w-full max-w-lg mt-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl flex flex-col gap-3 text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-500 flex items-center justify-center shrink-0">
              <HiOutlineDocumentText className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-xs font-black text-slate-200">Aqlli Tasma</h5>
              <p className="text-[10px] text-slate-400 font-medium mt-1 leading-normal">
                Pastga tortish orqali ochiladigan stories paneli va chiroyli postlar.
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl flex flex-col gap-3 text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-600/10 text-rose-500 flex items-center justify-center shrink-0">
              <HiOutlineCamera className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-xs font-black text-slate-200">Reels Format</h5>
              <p className="text-[10px] text-slate-400 font-medium mt-1 leading-normal">
                To'liq ekrandagi qisqa videolar va double-tap layk animatsiyasi.
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl flex flex-col gap-3 text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-600/10 text-amber-500 flex items-center justify-center shrink-0">
              <HiOutlineShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-xs font-black text-slate-200">Marketplace</h5>
              <p className="text-[10px] text-slate-400 font-medium mt-1 leading-normal">
                Raqamli yoki jismoniy mahsulotlarni to'g'ridan-to'g'ri sotish.
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl flex flex-col gap-3 text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 text-purple-500 flex items-center justify-center shrink-0">
              <FiCompass className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-xs font-black text-slate-200">Kashfiyot (Explore)</h5>
              <p className="text-[10px] text-slate-400 font-medium mt-1 leading-normal">
                Qiziqarli trendlarni va yangi odamlarni topishning vizual paneli.
              </p>
            </div>
          </motion.div>
        </div>
      )
    },
    {
      title: "Boshlashga tayyormisiz?",
      subtitle: "VibeGrid olamiga qadam qo'ying",
      description: "Hoziroq ro'yxatdan o'ting yoki ijtimoiy tarmoqni mehmon sifatida kuzatib ko'ring.",
      content: (
        <div className="flex flex-col gap-3 w-full max-w-sm mt-8">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleComplete}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm rounded-2xl shadow-xl shadow-blue-900/30 flex items-center justify-center gap-2 cursor-pointer border border-transparent dark:border-white/5"
          >
            Mehmon sifatida boshlash
            <HiOutlineArrowRight className="w-4 h-4" />
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/login')}
            className="w-full py-4 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 font-bold text-sm rounded-2xl transition-all cursor-pointer"
          >
            Hisobga kirish / Ro'yxatdan o'tish
          </motion.button>
        </div>
      )
    }
  ]

  return (
    <div className="min-h-screen w-full bg-[#020617] text-slate-100 flex flex-col relative overflow-hidden select-none">
      {/* Background Ambient Glow Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] aspect-square rounded-full bg-blue-600/10 blur-[120px] pointer-events-none animate-landing-glow-1" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square rounded-full bg-purple-600/10 blur-[120px] pointer-events-none animate-landing-glow-2" />

      {/* Header */}
      <header className="w-full max-w-5xl mx-auto px-6 h-20 flex items-center justify-between z-20 shrink-0">
        <span className="text-xl font-black tracking-tight bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
          VibeGrid
        </span>
        
        {currentStep < 2 && (
          <button 
            onClick={handleSkip}
            className="text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 px-4 py-2 rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            O'tkazib yuborish
          </button>
        )}
      </header>

      {/* Main Slide Carousel Container */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 z-10">
        <div className="w-full max-w-xl text-center flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="w-full flex flex-col items-center"
            >
              {/* Top accent badge */}
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-950/40 px-3 py-1 rounded-full border border-blue-900/20 mb-3">
                {slides[currentStep].subtitle}
              </span>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight leading-tight">
                {slides[currentStep].title}
              </h1>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-3 max-w-md leading-relaxed">
                {slides[currentStep].description}
              </p>

              {/* Slide Custom Render Content */}
              <div className="w-full flex justify-center mt-2">
                {slides[currentStep].content}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Navigation controls */}
      <footer className="w-full max-w-xl mx-auto px-6 py-10 z-20 flex flex-col gap-6 items-center shrink-0">
        {/* Indicators */}
        <div className="flex items-center gap-2">
          {slides.map((_, idx) => (
            <div 
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentStep === idx 
                  ? 'w-6 bg-blue-500' 
                  : 'w-1.5 bg-slate-800'
              }`}
            />
          ))}
        </div>

        {/* Buttons Row */}
        {currentStep < 2 && (
          <div className="flex items-center gap-3 w-full">
            {currentStep > 0 ? (
              <button
                onClick={handlePrev}
                className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-850 text-slate-350 border border-slate-850 font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer"
              >
                Orqaga
              </button>
            ) : (
              <div className="flex-1" />
            )}

            <button
              onClick={handleNext}
              className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-xl active:scale-95 transition-all cursor-pointer border border-transparent dark:border-white/5"
            >
              Keyingi
            </button>
          </div>
        )}
      </footer>
    </div>
  )
}