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
                    } catch {}
                },
            },
        }
    )
}

// Reel like'ni toggle qilish
export async function POST(request: Request) {
    try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return NextResponse.json({ error: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 })

        const { reelId } = await request.json()
        if (!reelId) return NextResponse.json({ error: 'Reel ID kerak' }, { status: 400 })

        // Like bor yoki yo'qligini tekshiramiz
        const { data: existing } = await supabase
            .from('reel_likes')
            .select('id')
            .eq('reel_id', reelId)
            .eq('user_id', session.user.id)
            .single()

        if (existing) {
            // Like bor — o'chiramiz
            await supabase.from('reel_likes').delete().eq('id', existing.id)
            return NextResponse.json({ liked: false })
        } else {
            // Like yo'q — qo'shamiz
            await supabase.from('reel_likes').insert({
                reel_id: reelId,
                user_id: session.user.id,
            })
            return NextResponse.json({ liked: true })
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
