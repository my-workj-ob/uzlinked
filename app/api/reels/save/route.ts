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

// POST /api/reels/save — saqlash/saqlashdan olish toggle
export async function POST(request: Request) {
    try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return NextResponse.json({ error: "Avtorizatsiyadan o'tilmagan" }, { status: 401 })

        const { reelId } = await request.json()
        if (!reelId) return NextResponse.json({ error: 'reelId kerak' }, { status: 400 })

        // Mavjudligini tekshirish
        const { data: existing } = await supabase
            .from('reel_saves')
            .select('id')
            .eq('reel_id', reelId)
            .eq('user_id', session.user.id)
            .single()

        if (existing) {
            // Unsave
            await supabase.from('reel_saves').delete().eq('id', existing.id)
            return NextResponse.json({ saved: false })
        } else {
            // Save
            await supabase.from('reel_saves').insert({
                reel_id: reelId,
                user_id: session.user.id,
            })
            return NextResponse.json({ saved: true })
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// GET /api/reels/save — foydalanuvchining saqlangan reellarini olish
export async function GET() {
    try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return NextResponse.json({ error: "Avtorizatsiyadan o'tilmagan" }, { status: 401 })

        const { data: saves, error } = await supabase
            .from('reel_saves')
            .select(`
                reel_id,
                created_at,
                reels (id, title, thumbnail_key, video_key)
            `)
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json(saves || [])
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
