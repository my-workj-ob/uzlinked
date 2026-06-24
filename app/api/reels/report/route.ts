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

// POST /api/reels/report — reel haqida shikoyat qilish
export async function POST(request: Request) {
    try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: "Avtorizatsiyadan o'tilmagan" }, { status: 401 })
        }

        const { reelId, reason } = await request.json()

        if (!reelId || !reason?.trim()) {
            return NextResponse.json({ error: 'reelId va sabab kerak' }, { status: 400 })
        }

        // Oldin report qilganligini tekshirish
        const { data: existing } = await supabase
            .from('reel_reports')
            .select('id')
            .eq('reel_id', reelId)
            .eq('reporter_id', session.user.id)
            .single()

        if (existing) {
            return NextResponse.json({ error: 'Siz bu reel haqida allaqachon shikoyat qilgansiz' }, { status: 409 })
        }

        const { error } = await supabase.from('reel_reports').insert({
            reel_id: reelId,
            reporter_id: session.user.id,
            reason: reason.trim(),
        })

        if (error) {
            throw error
        }

        return NextResponse.json({ success: true, message: "Shikoyatingiz qabul qilindi. Tez orada ko'rib chiqiladi." })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
