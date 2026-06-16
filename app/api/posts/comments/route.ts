import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const postId = searchParams.get('postId')

        if (!postId) return NextResponse.json({ error: 'Post ID topilmadi' }, { status: 400 })

        const { data: comments, error } = await supabase
            .from('comments')
            .select(`
                id,
                content,
                created_at,
                user_id,
                profiles (
                    nickname,
                    avatar_url
                )
            `)
            .eq('post_id', postId)
            .order('created_at', { ascending: true })

        if (error) throw error

        const formattedComments = comments.map((c: any) => {
            const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
            return {
                id: c.id,
                user: profile?.nickname || 'Yashirin foydalanuvchi',
                avatar: profile?.avatar_url ? `${profile.avatar_url}` : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
                text: c.content,
                createdAt: c.created_at,
                userId: c.user_id
            }
        })

        return NextResponse.json(formattedComments)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 })

        const { postId, content } = await request.json()

        if (!content?.trim()) return NextResponse.json({ error: 'Matn bo\'sh' }, { status: 400 })

        const { data: newComment, error } = await supabase
            .from('comments')
            .insert({
                post_id: postId,
                user_id: session.user.id,
                content: content
            })
            .select(`
                id,
                content,
                created_at,
                user_id,
                profiles (
                    nickname,
                    avatar_url
                )
            `)
            .single()

        if (error) throw error

        const profile = Array.isArray(newComment.profiles) ? newComment.profiles[0] : newComment.profiles
        const formatted = {
            id: newComment.id,
            user: profile?.nickname || 'Siz',
            avatar: profile?.avatar_url ? `${profile.avatar_url}` : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            text: newComment.content,
            createdAt: newComment.created_at,
            userId: newComment.user_id
        }

        return NextResponse.json(formatted)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}