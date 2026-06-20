import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// POST /api/posts/comments/like — post comment likes toggle
export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return NextResponse.json({ error: "Avtorizatsiyadan o'tilmagan" }, { status: 401 })

        const { commentId } = await request.json()
        if (!commentId) return NextResponse.json({ error: 'commentId kerak' }, { status: 400 })

        // Check existing like
        const { data: existing } = await supabase
            .from('comment_likes')
            .select('id')
            .eq('comment_id', commentId)
            .eq('user_id', session.user.id)
            .maybeSingle()

        if (existing) {
            // Unlike
            await supabase.from('comment_likes').delete().eq('id', existing.id)
            // decrement likes_count
            const { data } = await supabase.from('comments').select('likes_count').eq('id', commentId).single()
            if (data) {
                await supabase.from('comments').update({ likes_count: Math.max(0, (data.likes_count || 0) - 1) }).eq('id', commentId)
            }
            return NextResponse.json({ liked: false })
        } else {
            // Like
            await supabase.from('comment_likes').insert({
                comment_id: commentId,
                user_id: session.user.id,
            })
            // increment likes_count
            const { data } = await supabase.from('comments').select('likes_count').eq('id', commentId).single()
            if (data) {
                await supabase.from('comments').update({ likes_count: (data.likes_count || 0) + 1 }).eq('id', commentId)
            }
            return NextResponse.json({ liked: true })
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
