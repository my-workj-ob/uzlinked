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

// POST /api/reels/share — share hodisasini qayd qilish
export async function POST(request: Request) {
    try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()

        const { reelId, method } = await request.json()

        if (!reelId) {
            return NextResponse.json({ error: 'reelId kerak' }, { status: 400 })
        }

        try {
            const { error } = await supabase.from('reel_shares').insert({
                reel_id: reelId,
                user_id: session?.user?.id || null,
                method: method || 'link',
            })

            if (error) {
                throw error
            }
        } catch (error) {
            console.error('Error recording share event:', error)
            return NextResponse.json({ error: 'Ulashish hodisasini qayd qilishda xatolik yuz berdi' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
