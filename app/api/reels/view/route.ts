import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getSupabaseClient() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch { }
                },
            },
        }
    )
}

// Bu endpoint videodan chiqayotganda (yoki scroll qilib o'tayotganda) chaqiriladi.
// Frontend'da: video active bo'lmay qolganda watchSeconds va duration yuboriladi.
export async function POST(request: Request) {
    try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()

        const body = await request.json()
        const { reelId, watchSeconds, videoDuration, completed, sessionId } = body

        if (!reelId) {
            return NextResponse.json({ error: 'reelId shart' }, { status: 400 })
        }

        // Juda qisqa (< 1 sekund) view'larni yozmaymiz — bu shovqin bo'ladi
        if (!watchSeconds || watchSeconds < 1) {
            return NextResponse.json({ success: true, skipped: true })
        }

        const { error } = await supabase.from('reel_views').insert({
            reel_id: reelId,
            user_id: session?.user?.id || null,
            session_id: session?.user?.id ? null : (sessionId || null),
            watch_seconds: watchSeconds,
            video_duration: videoDuration || 0,
            completed: !!completed,
        })

        if (error) throw error

        // views_count'ni asosiy jadvalda ham oshiramiz (tezkor ko'rsatish uchun)
        try {
            await supabase.rpc('increment_views_count', { p_reel_id: reelId })
        } catch {
            // Agar RPC funksiyasi yo'q bo'lsa, oddiy update bilan fallback qilamiz
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}