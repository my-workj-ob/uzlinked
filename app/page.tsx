"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  HiOutlineArrowRight,
  HiOutlineSparkles,
} from 'react-icons/hi2'
import {
  FiHeart,
  FiMessageCircle,
  FiBookmark,
  FiSend,
  FiMapPin,
  FiClock,
  FiPlay,
  FiImage,
  FiVideo,
  FiCompass,
  FiShoppingBag,
  FiZap,
  FiShield,
  FiLayers,
  FiTrendingUp,
  FiGlobe,
  FiSearch,
  FiMove,
} from 'react-icons/fi'

/* ------------------------------------------------------------
   Reusable phone frame — ilovaning telefon ko'rinishi
------------------------------------------------------------ */
function PhoneFrame({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`relative ${className}`}>
      {/* glow behind phone */}
      <div className="absolute inset-0 -z-10 scale-110 rounded-[3rem] bg-gradient-to-br from-blue-600/30 via-indigo-600/20 to-purple-600/30 blur-2xl" />
      <div className="relative mx-auto w-[230px] sm:w-[250px] rounded-[2.6rem] border-[9px] border-slate-800 bg-slate-950 shadow-2xl shadow-blue-950/40 ring-1 ring-white/5">
        {/* notch */}
        <div className="absolute left-1/2 top-0 z-20 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-slate-800" />
        {/* side buttons */}
        <div className="absolute -left-[11px] top-20 h-10 w-[3px] rounded-l bg-slate-800" />
        <div className="absolute -left-[11px] top-32 h-14 w-[3px] rounded-l bg-slate-800" />
        <div className="absolute -right-[11px] top-28 h-16 w-[3px] rounded-r bg-slate-800" />
        {/* screen */}
        <div className="relative aspect-[9/19.2] overflow-hidden rounded-[2rem] bg-[#020617]">
          {children}
        </div>
      </div>
    </div>
  )
}

const grad = (a: string, b: string) =>
  ({ backgroundImage: `linear-gradient(135deg, ${a}, ${b})` }) as React.CSSProperties

/* ------------------------------------------------------------
   SCREEN 1 — Feed + Vibe Bar
------------------------------------------------------------ */
function FeedScreen() {
  const vibes = [
    { e: '⚡️', t: 'Ilhom', on: false },
    { e: '☕️', t: 'Qahva', on: true },
    { e: '🌧', t: 'Falsafa', on: false },
    { e: '🎧', t: 'Focus', on: false },
  ]
  return (
    <div className="flex h-full flex-col text-white">
      {/* top bar */}
      <div className="flex items-center justify-between px-3 pt-7 pb-2">
        <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-[13px] font-black text-transparent">
          VibeGrid
        </span>
        <div className="flex items-center gap-2 text-slate-400">
          <FiSearch className="h-3.5 w-3.5" />
          <div className="h-5 w-5 rounded-full" style={grad('#6366f1', '#a855f7')} />
        </div>
      </div>
      {/* vibe bar */}
      <div className="flex gap-1.5 overflow-hidden px-3 pb-2">
        {vibes.map((v) => (
          <div
            key={v.t}
            className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[8px] font-bold ${
              v.on
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800/80 text-slate-300'
            }`}
          >
            <span>{v.e}</span>
            {v.t}
          </div>
        ))}
      </div>
      {/* post */}
      <div className="flex-1 px-3">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-2.5">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full" style={grad('#f43f5e', '#f59e0b')} />
            <div>
              <div className="text-[9px] font-bold leading-tight">Dilnoza</div>
              <div className="flex items-center gap-1 text-[7px] text-slate-500">
                <FiMapPin className="h-2 w-2" /> Toshkent
              </div>
            </div>
            <div className="ml-auto flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[7px] font-bold text-amber-400">
              <FiClock className="h-2 w-2" /> 71s
            </div>
          </div>
          <div className="mt-2 h-24 w-full rounded-xl" style={grad('#0ea5e9', '#6366f1')} />
          <div className="mt-2 flex items-center gap-3 text-slate-300">
            <div className="flex items-center gap-1 text-[8px]">
              <FiHeart className="h-3 w-3 text-rose-400" /> 248
            </div>
            <div className="flex items-center gap-1 text-[8px]">
              <FiMessageCircle className="h-3 w-3" /> 32
            </div>
            <FiBookmark className="ml-auto h-3 w-3 text-blue-400" />
          </div>
        </div>
        <div className="mt-2 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-2.5">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full" style={grad('#10b981', '#0ea5e9')} />
            <div className="h-2 w-16 rounded-full bg-slate-700" />
          </div>
          <div className="mt-2 h-12 w-full rounded-xl" style={grad('#a855f7', '#ec4899')} />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------
   SCREEN 2 — Reels
------------------------------------------------------------ */
function ReelsScreen() {
  return (
    <div className="relative h-full" style={grad('#1e1b4b', '#831843')}>
      <div className="absolute inset-0 bg-black/20" />
      {/* play hint */}
      <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
        <FiPlay className="h-5 w-5 text-white" />
      </div>
      {/* right actions */}
      <div className="absolute bottom-16 right-2.5 flex flex-col items-center gap-3 text-white">
        <div className="flex flex-col items-center">
          <FiHeart className="h-5 w-5" />
          <span className="text-[7px] font-bold">12k</span>
        </div>
        <div className="flex flex-col items-center">
          <FiMessageCircle className="h-5 w-5" />
          <span className="text-[7px] font-bold">340</span>
        </div>
        <div className="flex flex-col items-center">
          <FiSend className="h-5 w-5" />
          <span className="text-[7px] font-bold">Ulash</span>
        </div>
      </div>
      {/* caption */}
      <div className="absolute bottom-6 left-3 right-12 text-white">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full border border-white/40" style={grad('#f59e0b', '#f43f5e')} />
          <span className="text-[9px] font-bold">@samandar</span>
        </div>
        <div className="mt-1 h-2 w-3/4 rounded-full bg-white/30" />
        <div className="mt-1 h-2 w-1/2 rounded-full bg-white/20" />
      </div>
      <div className="absolute right-2.5 top-8 text-[8px] font-black text-white/80">Reels</div>
    </div>
  )
}

/* ------------------------------------------------------------
   SCREEN 3 — Gidro-Warp (geografik teleport)
------------------------------------------------------------ */
function WarpScreen() {
  return (
    <div className="relative h-full overflow-hidden text-white" style={grad('#020617', '#0b1220')}>
      {/* star streaks */}
      {[...Array(7)].map((_, i) => (
        <div
          key={i}
          className="absolute h-[2px] rounded-full bg-gradient-to-r from-transparent via-white to-transparent opacity-60"
          style={{
            top: `${12 + i * 11}%`,
            left: `${5 + (i % 3) * 10}%`,
            width: `${40 + (i % 4) * 22}%`,
          }}
        />
      ))}
      <div className="relative px-3 pt-9">
        <div className="text-center text-[9px] font-black tracking-widest text-blue-300">
          GIDRO-WARP
        </div>
        <div className="mt-1 text-center text-[7px] text-slate-400">
          Shaharlar aro teleport
        </div>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
          <div className="h-16 w-full rounded-xl" style={grad('#0ea5e9', '#6366f1')} />
          {/* draggable location chip */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[8px] font-bold">
              <FiMapPin className="h-2.5 w-2.5 text-blue-300" /> Toshkent
            </div>
            <FiMove className="h-3 w-3 text-slate-500" />
            <div className="flex items-center gap-1 rounded-full bg-blue-600/80 px-2 py-1 text-[8px] font-bold">
              Samarqand <HiOutlineArrowRight className="h-2.5 w-2.5" />
            </div>
          </div>
        </div>
        <div className="mt-4 text-center text-[7px] text-slate-500">
          📍 kapsulani o'ngga suring →
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------
   SCREEN 4 — Composer (multi-media + draggable)
------------------------------------------------------------ */
function ComposerScreen() {
  const tiles = ['#0ea5e9', '#a855f7', '#f43f5e', '#10b981', '#f59e0b']
  return (
    <div className="flex h-full flex-col text-white" style={grad('#020617', '#0b1220')}>
      <div className="px-3 pt-8 pb-2">
        <div className="text-[11px] font-black">Yangi post</div>
        <div className="text-[7px] text-slate-500">20 tagacha rasm + video</div>
      </div>
      <div className="px-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-[8px] text-slate-500">
          Nima haqida o'ylayapsiz?
        </div>
        {/* draggable media row */}
        <div className="mt-2 flex gap-1.5 overflow-hidden">
          {tiles.map((c, i) => (
            <div key={i} className="relative shrink-0">
              <div className="h-12 w-12 rounded-lg" style={grad(c, '#1e293b')} />
              {i === 0 && (
                <span className="absolute left-0.5 top-0.5 rounded bg-blue-600 px-1 text-[5px] font-bold">
                  muqova
                </span>
              )}
              <div className="absolute bottom-0.5 right-0.5 rounded bg-black/50 p-0.5">
                <FiMove className="h-2 w-2" />
              </div>
            </div>
          ))}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-700 text-slate-500">
            <FiImage className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[7px] text-slate-500">
          <span>Tartibni surib o'zgartiring</span>
          <span className="font-bold text-blue-400">5 / 20</span>
        </div>
        {/* video chip */}
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-slate-900/60 px-2 py-1.5">
          <FiVideo className="h-3 w-3 text-purple-400" />
          <span className="text-[8px]">video.mp4</span>
          <span className="ml-auto text-[7px] text-slate-500">0:48 / 1:00</span>
        </div>
        {/* ephemeral toggle */}
        <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-slate-900/60 p-1 text-[8px] font-bold">
          <div className="rounded-lg bg-blue-600 py-1.5 text-center">♾ Doimiy</div>
          <div className="flex items-center justify-center gap-1 py-1.5 text-center text-slate-400">
            <FiClock className="h-2.5 w-2.5" /> Vaqtinchalik
          </div>
        </div>
      </div>
      <div className="mt-auto p-3">
        <div className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2 text-center text-[9px] font-bold">
          Joylash
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------
   Scroll reveal helper
------------------------------------------------------------ */
const reveal = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
}

function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      variants={reveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export default function RootPage() {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(true)

  useEffect(() => {
    const onboardingCompleted = localStorage.getItem('onboarding_completed')
    if (onboardingCompleted === 'true') {
      router.replace('/dashboard')
    } else {
      setIsRedirecting(false)
    }
  }, [router])

  const handleGuest = () => {
    localStorage.setItem('onboarding_completed', 'true')
    router.push('/dashboard')
  }

  if (isRedirecting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="text-xs font-semibold text-slate-400">Yuklanmoqda...</p>
      </div>
    )
  }

  const features = [
    {
      icon: FiZap,
      color: 'text-blue-400 bg-blue-500/10',
      title: 'Emotsiya = navigatsiya',
      desc: 'Cheksiz lenta yo\'q. Avval kayfiyatni tanlaysiz — tarmoq sizni o\'sha "xona"ga teleport qiladi.',
    },
    {
      icon: FiGlobe,
      color: 'text-purple-400 bg-purple-500/10',
      title: 'Gidro-Warp teleport',
      desc: 'Joylashuv kapsulasini barmog\'ingiz bilan surib, shaharma-shahar sakraysiz. Star Wars effekti bilan.',
    },
    {
      icon: FiClock,
      color: 'text-amber-400 bg-amber-500/10',
      title: 'Vaqtinchalik postlar',
      desc: 'Yengil postlar 72 soatda eriydi. Faqat odamlar saqlab qolgani qoladi — like emas, rezonans muhim.',
    },
    {
      icon: FiImage,
      color: 'text-emerald-400 bg-emerald-500/10',
      title: '20 rasm + video',
      desc: 'Bitta postga 20 tagacha rasmni draggable bilan silliq tartiblang, 1 daqiqalik video qo\'shing.',
    },
    {
      icon: FiShield,
      color: 'text-rose-400 bg-rose-500/10',
      title: 'Algoritmsiz',
      desc: 'Sizni ushlab turadigan manipulyativ algoritm yo\'q. Kontentni odamlarning haqiqiy tanlovi saralaydi.',
    },
    {
      icon: FiTrendingUp,
      color: 'text-sky-400 bg-sky-500/10',
      title: 'Hammasi bir joyda',
      desc: 'Reels, Marketplace, Kashfiyot, Xabarlar va guruhlar — bitta tez va zamonaviy ilovada.',
    },
  ]

  const showcase = [
    {
      tag: '⚡️ VIBE BAR',
      title: 'Lentani unuting. Kayfiyatni tanlang.',
      desc: 'Yuqoridagi emotsional chastota kapsulalarini suring — "Qahva ustida", "Falsafa", "Ilhom". Sayt reload bo\'lmaydi, postlar 0.2 soniyada almashinadi.',
      screen: <FeedScreen />,
      accent: 'from-blue-600/20 to-indigo-600/10',
    },
    {
      tag: '🌍 GIDRO-WARP',
      title: 'Skroll emas — geografik sakrash.',
      desc: 'Postdagi joylashuv kapsulasini o\'ngga surib yuboring. Yulduzlar tezlashib o\'tadi va siz boshqa shaharda yozilgan postning ichiga teleport bo\'lasiz.',
      screen: <WarpScreen />,
      accent: 'from-purple-600/20 to-fuchsia-600/10',
    },
    {
      tag: '🖼 MULTI-MEDIA',
      title: '20 tagacha rasm, silliq draggable.',
      desc: 'Bir nechta rasmni barmog\'ingiz bilan surib tartiblang, birinchisini muqova qiling, 1 daqiqalik video qo\'shing. Bepul 4 ta, PRO 20 ta.',
      screen: <ComposerScreen />,
      accent: 'from-emerald-600/20 to-teal-600/10',
    },
    {
      tag: '🎬 REELS',
      title: 'To\'liq ekran, tirik effektlar.',
      desc: 'Double-tap layk animatsiyasi, silliq o\'tishlar va light/dark bir xil dizayn. Mobil tajriba — webda ham xuddi telefondagidek.',
      screen: <ReelsScreen />,
      accent: 'from-rose-600/20 to-pink-600/10',
    },
  ]

  const compareRows = [
    { f: 'Cheksiz, charchatadigan lenta', them: true, us: false },
    { f: 'Manipulyativ algoritm', them: true, us: false },
    { f: 'Emotsiya bo\'yicha navigatsiya', them: false, us: true },
    { f: 'Geografik teleport', them: false, us: true },
    { f: 'Vaqtinchalik (eriydigan) postlar', them: false, us: true },
    { f: 'Reklamasiz, raqamlarsiz', them: false, us: true },
  ]

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#020617] text-slate-100 selection:bg-blue-600/40">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute left-[-10%] top-[-5%] -z-0 aspect-square w-[55%] animate-landing-glow-1 rounded-full bg-blue-600/15 blur-[130px]" />
      <div className="pointer-events-none absolute right-[-12%] top-[35%] -z-0 aspect-square w-[55%] animate-landing-glow-2 rounded-full bg-purple-600/15 blur-[130px]" />

      {/* ============ NAV ============ */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#020617]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-xl font-black tracking-tight text-transparent">
            VibeGrid
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/login')}
              className="cursor-pointer rounded-xl px-4 py-2 text-xs font-bold text-slate-300 transition-colors hover:text-white"
            >
              Kirish
            </button>
            <button
              onClick={handleGuest}
              className="cursor-pointer rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-900/30 transition-transform active:scale-95"
            >
              Boshlash
            </button>
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pt-14 pb-10 sm:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          {/* copy */}
          <div className="text-center lg:text-left">
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-900/40 bg-blue-950/40 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-400"
            >
              <HiOutlineSparkles className="h-3.5 w-3.5" /> Boshqacha ijtimoiy tarmoq
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
            >
              Lentani unuting.{' '}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Kayfiyatni tanlang.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-slate-400 sm:text-base lg:mx-0"
            >
              VibeGrid — emotsiya orqali navigatsiya qilinadigan, shaharlar aro teleport bo&apos;ladigan
              va algoritmsiz ijtimoiy tarmoq. Cheksiz skroll o&apos;rniga — tirik tajriba.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="mt-7 flex flex-col items-center gap-3 sm:flex-row lg:items-start"
            >
              <button
                onClick={handleGuest}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-900/40 transition-transform active:scale-95 sm:w-auto"
              >
                Mehmon sifatida boshlash
                <HiOutlineArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={() => router.push('/login')}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 px-6 py-3.5 text-sm font-bold text-slate-200 transition-colors hover:bg-slate-900 active:scale-95 sm:w-auto"
              >
                Ro&apos;yxatdan o&apos;tish
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-6 flex items-center justify-center gap-4 text-[11px] font-medium text-slate-500 lg:justify-start"
            >
              <span className="flex items-center gap-1.5"><FiShield className="h-3.5 w-3.5 text-emerald-400" /> Reklamasiz</span>
              <span className="flex items-center gap-1.5"><FiZap className="h-3.5 w-3.5 text-blue-400" /> O&apos;ta tez</span>
              <span className="flex items-center gap-1.5"><FiHeart className="h-3.5 w-3.5 text-rose-400" /> Raqamlarsiz</span>
            </motion.div>
          </div>

          {/* phones */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
            className="relative flex justify-center"
          >
            <div className="animate-landing-float-slow opacity-90 [transform:perspective(1200px)_rotateY(12deg)]">
              <div className="hidden sm:block">
                <PhoneFrame className="scale-90">
                  <ReelsScreen />
                </PhoneFrame>
              </div>
            </div>
            <div className="animate-landing-float sm:-ml-20 sm:mt-10 z-10">
              <PhoneFrame>
                <FeedScreen />
              </PhoneFrame>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ MARQUEE ============ */}
      <div className="relative z-10 overflow-hidden border-y border-white/5 bg-slate-950/40 py-3">
        <div className="flex w-max animate-landing-marquee gap-8 whitespace-nowrap text-sm font-black text-slate-700">
          {[...Array(2)].map((_, k) => (
            <React.Fragment key={k}>
              <span>⚡️ ILHOM</span><span className="text-slate-800">•</span>
              <span>☕️ QAHVA USTIDA</span><span className="text-slate-800">•</span>
              <span>🌧 FALSAFA</span><span className="text-slate-800">•</span>
              <span>🤬 DARDI BORLAR</span><span className="text-slate-800">•</span>
              <span>🎧 DEEP FOCUS</span><span className="text-slate-800">•</span>
              <span>🌍 TELEPORT</span><span className="text-slate-800">•</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ============ SHOWCASE (phone per feature) ============ */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
            Nimasi bilan <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">farq qiladi?</span>
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Har bir ekran — boshqa tarmoqlarda yo&apos;q bo&apos;lgan yangi tajriba.
          </p>
        </Reveal>

        <div className="mt-14 flex flex-col gap-20 sm:gap-28">
          {showcase.map((s, i) => (
            <div
              key={s.tag}
              className={`grid items-center gap-10 lg:grid-cols-2 ${i % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''}`}
            >
              <Reveal className="text-center lg:text-left">
                <span className="inline-block rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black tracking-widest text-slate-300">
                  {s.tag}
                </span>
                <h3 className="mt-4 text-2xl font-black leading-tight sm:text-3xl">{s.title}</h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400 lg:mx-0">
                  {s.desc}
                </p>
              </Reveal>
              <Reveal delay={0.1} className="flex justify-center">
                <div className={`rounded-[3rem] bg-gradient-to-br ${s.accent} p-6`}>
                  <div className="animate-landing-float">
                    <PhoneFrame>{s.screen}</PhoneFrame>
                  </div>
                </div>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* ============ FEATURE GRID ============ */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-16">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Asosiy imkoniyatlar</h2>
          <p className="mt-3 text-sm text-slate-400">Zamonaviy tarmoqning eng kerakli jihatlari — bittada.</p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06}>
              <div className="group h-full rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-sm transition-all hover:border-slate-700 hover:bg-slate-900/70">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${f.color}`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-black text-slate-100">{f.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ COMPARISON ============ */}
      <section className="relative z-10 mx-auto max-w-3xl px-5 py-16">
        <Reveal>
          <div className="overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm">
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-slate-800 px-5 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">
              <span>Jihat</span>
              <span className="w-16 text-center">Boshqalar</span>
              <span className="w-16 text-center text-blue-400">VibeGrid</span>
            </div>
            {compareRows.map((r) => (
              <div
                key={r.f}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-slate-800/50 px-5 py-3.5 text-sm last:border-0"
              >
                <span className="text-slate-300">{r.f}</span>
                <span className="w-16 text-center">
                  {r.them ? <span className="text-rose-500">✓</span> : <span className="text-slate-700">✕</span>}
                </span>
                <span className="w-16 text-center">
                  {r.us ? <span className="font-black text-emerald-400">✓</span> : <span className="text-slate-700">✕</span>}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="relative z-10 mx-auto max-w-4xl px-5 py-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-blue-900/30 bg-gradient-to-br from-blue-950/60 via-indigo-950/40 to-purple-950/50 px-6 py-14 text-center">
            <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-blue-600/30 blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                Yangi tajribaga qadam qo&apos;ying
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-slate-300">
                Bir necha soniyada kiring — algoritmsiz, reklamasiz, raqamlarsiz tarmoqni o&apos;zingiz his eting.
              </p>
              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  onClick={handleGuest}
                  className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-900/40 transition-transform active:scale-95 sm:w-auto"
                >
                  Mehmon sifatida boshlash
                  <HiOutlineArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-7 py-3.5 text-sm font-bold text-slate-200 transition-colors hover:bg-slate-900 active:scale-95 sm:w-auto"
                >
                  Hisobga kirish
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="relative z-10 border-t border-white/5 px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-xs text-slate-500 sm:flex-row">
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text font-black text-transparent">
            VibeGrid
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><FiCompass className="h-3.5 w-3.5" /> Kashfiyot</span>
            <span className="flex items-center gap-1"><FiShoppingBag className="h-3.5 w-3.5" /> Marketplace</span>
            <span className="flex items-center gap-1"><FiLayers className="h-3.5 w-3.5" /> Reels</span>
          </div>
          <span>© {new Date().getFullYear()} VibeGrid</span>
        </div>
      </footer>
    </div>
  )
}
