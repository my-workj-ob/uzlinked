"use client"
import { useState } from "react"
import { emailLogin, emailSignup, loginWithGoogle } from "./actions" // loginWithGoogle qo'shildi
import { FcGoogle } from "react-icons/fc"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-sm p-6 border border-neutral-200 rounded-[2rem]">
        <h2 className="text-2xl font-bold mb-6 tracking-tight">
          {isLogin ? "Kirish" : "Ro'yxatdan o'tish"}
        </h2>
        
        {/* Google tugmasi */}
        <form action={loginWithGoogle}>
          <button className="w-full flex items-center justify-center gap-3 py-3 border border-neutral-200 rounded-2xl font-semibold hover:bg-neutral-50 transition active:scale-95 mb-4">
            <FcGoogle className="w-5 h-5" />
            Google bilan davom etish
          </button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-100"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-neutral-400">yoki</span></div>
        </div>

        {/* Email/Parol formasi */}
        <form action={isLogin ? emailLogin : emailSignup} className="space-y-4">
          {!isLogin && (
            <input name="username" placeholder="Username" className="w-full p-3 bg-neutral-50 rounded-2xl border border-neutral-100 outline-none focus:ring-2 ring-neutral-200 transition" required />
          )}
          <input name="email" type="email" placeholder="Email" className="w-full p-3 bg-neutral-50 rounded-2xl border border-neutral-100 outline-none focus:ring-2 ring-neutral-200 transition" required />
          <input name="password" type="password" placeholder="Parol" className="w-full p-3 bg-neutral-50 rounded-2xl border border-neutral-100 outline-none focus:ring-2 ring-neutral-200 transition" required />
          
          <button className="w-full bg-black text-white py-3 rounded-2xl font-bold hover:bg-neutral-800 transition active:scale-95">
            {isLogin ? "Kirish" : "Hisob yaratish"}
          </button>
        </form>

        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-4 text-xs text-neutral-500 hover:text-black transition"
        >
          {isLogin ? "Hisobingiz yo'qmi? Ro'yxatdan o'ting" : "Allaqachon hisobingiz bormi? Kiring"}
        </button>
      </div>
    </div>
  )
}