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

// Follow/Unfollow toggle
export async function POST(request: Request) {
    try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 401 })

        const { targetUserId } = await request.json()
        if (!targetUserId) return NextResponse.json({ error: 'Target user ID kerak' }, { status: 400 })

        if (targetUserId === session.user.id) {
            return NextResponse.json({ error: 'O\'zingizga obuna bo\'la olmaysiz' }, { status: 400 })
        }

        // Obuna bormi tekshirish
        const { data: existing } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', session.user.id)
            .eq('following_id', targetUserId)
            .single()

        if (existing) {
            await supabase.from('follows').delete().eq('id', existing.id)
            return NextResponse.json({ following: false })
        } else {
            await supabase.from('follows').insert({
                follower_id: session.user.id,
                following_id: targetUserId,
            })
            return NextResponse.json({ following: true })
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
