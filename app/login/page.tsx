"use client"
import { useState } from "react"
import { emailLogin, emailSignup, loginWithGoogle } from "./actions"
import { FcGoogle } from "react-icons/fc"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 relative overflow-hidden transition-colors duration-300 px-4 select-none font-sans">
      {/* Background Ambient Glow Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] aspect-square rounded-full bg-blue-600/10 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square rounded-full bg-purple-600/10 blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

      {/* Main Card */}
      <div className="w-full max-w-md p-8 sm:p-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-100 dark:border-white/5 rounded-[2.5rem] shadow-2xl relative z-10 transition-colors duration-300">
        
        {/* Logo Branding */}
        <div className="flex flex-col items-center mb-8">
          <span className="text-3xl font-black tracking-tight bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent mb-1">
            VibeGrid
          </span>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Raqamli Mutaxassislar Tarmog'i
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-1.5 text-left">
          {isLogin ? "Kirish" : "Ro'yxatdan o'tish"}
        </h2>
        
        <p className="text-[11px] text-slate-450 dark:text-slate-500 font-bold mb-6 text-left leading-relaxed">
          {isLogin 
            ? "Tizimga kirish uchun Google hisobingizdan yoki email va parolingizdan foydalaning." 
            : "Platformaning barcha imkoniyatlaridan foydalanish uchun hisob yarating."
          }
        </p>
        
        {/* Google Button */}
        <form action={loginWithGoogle}>
          <button className="w-full flex items-center justify-center gap-3 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 hover:border-blue-500/25 dark:hover:border-blue-500/25 hover:bg-white dark:hover:bg-slate-900 rounded-2xl font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-250 transition-all active:scale-[0.98] cursor-pointer mb-5 shadow-sm">
            <FcGoogle className="w-5 h-5" />
            Google bilan davom etish
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100 dark:border-white/5"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
            <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 dark:text-slate-500 transition-colors duration-300">yoki</span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form action={isLogin ? emailLogin : emailSignup} className="space-y-4">
          {!isLogin && (
            <input 
              name="username" 
              placeholder="Foydalanuvchi nomi (username)" 
              className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500/50 dark:focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 dark:focus:ring-blue-500/5 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-inner" 
              required 
            />
          )}
          
          <input 
            name="email" 
            type="email" 
            placeholder="Email manzili" 
            className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500/50 dark:focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 dark:focus:ring-blue-500/5 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-inner" 
            required 
          />
          
          <input 
            name="password" 
            type="password" 
            placeholder="Parol" 
            className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500/50 dark:focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 dark:focus:ring-blue-500/5 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-inner" 
            required 
          />
          
          <button className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all cursor-pointer border border-transparent dark:border-white/5 mt-2">
            {isLogin ? "Kirish" : "Hisob yaratish"}
          </button>
        </form>

        {/* Form Toggle Button */}
        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-6 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer hover:underline"
        >
          {isLogin ? "Hisobingiz yo'qmi? Ro'yxatdan o'ting" : "Allaqachon hisobingiz bormi? Kiring"}
        </button>
      </div>
    </div>
  )
}