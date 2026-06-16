"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

async function ensureProfileExists(userId: string) {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single()

  if (!profile) {
    const { error: insertError } = await supabase
      .from("profiles")
      .insert([{
        id: userId,
        nickname: "Yangi foydalanuvchi",
      }])

    if (insertError) {
      console.error("Profil yaratishda xatolik:", insertError)
    }
  }
}

export async function loginWithGoogle() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    console.error("Google Auth error:", error)
    return
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function emailSignup(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    console.error("Signup error:", error)
    return
  }

  if (data.user) {
    await ensureProfileExists(data.user.id)
  }

  redirect("/dashboard")
}

export async function emailLogin(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error("Login error:", error)
    return
  }

  if (data.user) {
    await ensureProfileExists(data.user.id)
  }

  redirect("/dashboard")
}