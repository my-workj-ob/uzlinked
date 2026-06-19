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

// POST /api/reels/comments/like — komment laykni toggle qilish
export async function POST(request: Request) {
    try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return NextResponse.json({ error: "Avtorizatsiyadan o'tilmagan" }, { status: 401 })

        const { commentId } = await request.json()
        if (!commentId) return NextResponse.json({ error: 'commentId kerak' }, { status: 400 })

        // Like mavjudligini tekshirish
        const { data: existing } = await supabase
            .from('reel_comment_likes')
            .select('id')
            .eq('comment_id', commentId)
            .eq('user_id', session.user.id)
            .single()

        if (existing) {
            // Unlike
            await supabase.from('reel_comment_likes').delete().eq('id', existing.id)
            // likes_count'ni kamaytirish
            try {
                await supabase.rpc('decrement_comment_likes', { p_comment_id: commentId })
            } catch {
                // fallback: oddiy update
                const { data } = await supabase.from('reel_comments').select('likes_count').eq('id', commentId).single()
                if (data) {
                    await supabase.from('reel_comments').update({ likes_count: Math.max(0, (data.likes_count || 0) - 1) }).eq('id', commentId)
                }
            }
            return NextResponse.json({ liked: false })
        } else {
            // Like
            await supabase.from('reel_comment_likes').insert({
                comment_id: commentId,
                user_id: session.user.id,
            })
            // likes_count'ni oshirish
            try {
                await supabase.rpc('increment_comment_likes', { p_comment_id: commentId })
            } catch {
                const { data } = await supabase.from('reel_comments').select('likes_count').eq('id', commentId).single()
                if (data) {
                    await supabase.from('reel_comments').update({ likes_count: (data.likes_count || 0) + 1 }).eq('id', commentId)
                }
            }
            return NextResponse.json({ liked: true })
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
