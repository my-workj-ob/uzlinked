import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const postId = searchParams.get('postId')

        if (!postId) {
            return NextResponse.json({ error: 'Post ID topilmadi' }, { status: 400 })
        }

        // Get current user id to check likedByMe
        const { data: authData } = await supabase.auth.getUser()
        const currentUserId = authData?.user?.id

        let comments: any[] = []
        let likedCommentIds: string[] = []
        let hasNewSchema = true

        // Try querying with new columns (likes_count and parent_id)
        const { data: newComments, error: newError } = await supabase
            .from('comments')
            .select(`
                id,
                content,
                created_at,
                user_id,
                parent_id,
                likes_count,
                profiles (
                    nickname,
                    avatar_url
                )
            `)
            .eq('post_id', postId)
            .order('created_at', { ascending: true })

        if (newError) {
            hasNewSchema = false
            // Fallback to original schema
            const { data: oldComments, error: oldError } = await supabase
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

            if (oldError) {
                throw oldError
            }
            comments = oldComments || []
        } else {
            comments = newComments || []
        }

        if (hasNewSchema && currentUserId && comments.length > 0) {
            try {
                const { data: myLikes } = await supabase
                    .from('comment_likes')
                    .select('comment_id')
                    .eq('user_id', currentUserId)
                    .in('comment_id', comments.map(c => c.id))
                if (myLikes) {
                    likedCommentIds = myLikes.map(l => l.comment_id)
                }
            } catch (likeErr) {
                // If comment_likes table is missing but parent_id exists
                console.warn('comment_likes table missing:', likeErr)
            }
        }

        const formattedComments = comments.map((c: any) => {
            const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
            return {
                id: c.id,
                user: profile?.nickname || 'Yashirin foydalanuvchi',
                avatar: profile?.avatar_url ? `${profile.avatar_url}` : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
                text: c.content,
                createdAt: c.created_at,
                userId: c.user_id,
                parentId: c.parent_id || null,
                likesCount: c.likes_count || 0,
                likedByMe: likedCommentIds.includes(c.id)
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

        if (!session) {
            return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 })
        }

        const { postId, content, parentId } = await request.json()

        if (!content?.trim()) {
            return NextResponse.json({ error: 'Matn bo\'sh' }, { status: 400 })
        }

        let newComment: any = null

        // Try inserting with parent_id first
        const { data: resNew, error: errNew } = await supabase
            .from('comments')
            .insert({
                post_id: postId,
                user_id: session.user.id,
                content: content,
                parent_id: parentId || null
            })
            .select(`
                id,
                content,
                created_at,
                user_id,
                parent_id,
                likes_count,
                profiles (
                    nickname,
                    avatar_url
                )
            `)
            .maybeSingle()

        if (errNew) {
            // Fallback to original columns without parent_id and likes_count
            const { data: resOld, error: errOld } = await supabase
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

            if (errOld) {
                throw errOld
            }
            newComment = resOld
        } else {
            newComment = resNew
        }

        const profile = Array.isArray(newComment.profiles) ? newComment.profiles[0] : newComment.profiles
        const formatted = {
            id: newComment.id,
            user: profile?.nickname || 'Siz',
            avatar: profile?.avatar_url ? `${profile.avatar_url}` : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            text: newComment.content,
            createdAt: newComment.created_at,
            userId: newComment.user_id,
            parentId: newComment.parent_id || null,
            likesCount: newComment.likes_count || 0,
            likedByMe: false
        }

        return NextResponse.json(formatted)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
