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

// GET /api/reels/comments?reelId=xxx
export async function GET(request: Request) {
    try {
        const supabase = await getSupabaseClient()
        const { searchParams } = new URL(request.url)
        const reelId = searchParams.get('reelId')

        if (!reelId) {
            return NextResponse.json({ error: 'reelId kerak' }, { status: 400 })
        }

        // Asosiy kommentlar (parent_id = null) va ularning reply'lari
        const { data: comments, error } = await supabase
            .from('reel_comments')
            .select(`
                id,
                text,
                parent_id,
                likes_count,
                is_deleted,
                created_at,
                user_id,
                profiles (id, nickname, username, avatar_url)
            `)
            .eq('reel_id', reelId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: true })

        if (error) throw error

        // Joriy foydalanuvchining layklari
        const { data: { session } } = await supabase.auth.getSession()
        let likedCommentIds: string[] = []

        if (session?.user) {
            const commentIds = (comments || []).map((c: any) => c.id)
            if (commentIds.length > 0) {
                const { data: likes } = await supabase
                    .from('reel_comment_likes')
                    .select('comment_id')
                    .eq('user_id', session.user.id)
                    .in('comment_id', commentIds)
                likedCommentIds = (likes || []).map((l: any) => l.comment_id)
            }
        }

        const formatted = (comments || []).map((c: any) => {
            const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
            return {
                id: c.id,
                text: c.text,
                parentId: c.parent_id,
                likesCount: c.likes_count || 0,
                isLikedByMe: likedCommentIds.includes(c.id),
                createdAt: c.created_at,
                user: {
                    id: profile?.id || c.user_id,
                    nickname: profile?.nickname || "Noma'lum",
                    username: profile?.username || 'user',
                    avatar: profile?.avatar_url || '/default-avatar.png',
                },
            }
        })

        // Nested tuzilma: parent va children ajratish
        const roots: any[] = []
        const childMap: Record<string, any[]> = {}

        formatted.forEach((c: any) => {
            if (c.parentId) {
                if (!childMap[c.parentId]) childMap[c.parentId] = []
                childMap[c.parentId].push(c)
            } else {
                roots.push(c)
            }
        })

        const result = roots.map((root: any) => ({
            ...root,
            replies: childMap[root.id] || [],
        }))

        return NextResponse.json(result)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST /api/reels/comments — yangi komment yozish
export async function POST(request: Request) {
    try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: "Avtorizatsiyadan o'tilmagan" }, { status: 401 })
        }

        const { reelId, text, parentId } = await request.json()

        if (!reelId || !text?.trim()) {
            return NextResponse.json({ error: 'reelId va text kerak' }, { status: 400 })
        }

        const { data: newComment, error } = await supabase
            .from('reel_comments')
            .insert({
                reel_id: reelId,
                user_id: session.user.id,
                parent_id: parentId || null,
                text: text.trim(),
            })
            .select(`
                id,
                text,
                parent_id,
                likes_count,
                created_at,
                user_id,
                profiles (id, nickname, username, avatar_url)
            `)
            .single()

        if (error) throw error

        // Notification yuborish (reel egasiga)
        try {
            const { data: reel } = await supabase
                .from('reels')
                .select('user_id')
                .eq('id', reelId)
                .single()

            const { data: commenterProfile } = await supabase
                .from('profiles')
                .select('nickname')
                .eq('id', session.user.id)
                .single()
            const commenterName = commenterProfile?.nickname || 'Foydalanuvchi'
            const { sendPushNotification } = await import('@/utils/push')

            if (reel && reel.user_id !== session.user.id) {
                await supabase.from('notifications').insert({
                    user_id: reel.user_id,
                    actor_id: session.user.id,
                    type: parentId ? 'reply' : 'comment',
                    reel_id: reelId,
                    comment_id: newComment.id,
                })

                await sendPushNotification(
                    reel.user_id,
                    {
                        title: parentId ? 'Izohingizga javob! 💬' : 'Yangi izoh! 💬',
                        body: parentId 
                            ? `${commenterName} sizning videongizdagi izohga javob qaytardi.`
                            : `${commenterName} sizning videongizga izoh yozdi.`,
                        url: `/dashboard/notifications`,
                    },
                    parentId ? 'reply' : 'comment'
                )
            }

            // Agar bu reply bo'lsa — parent komment egasiga ham notification
            if (parentId) {
                const { data: parentComment } = await supabase
                    .from('reel_comments')
                    .select('user_id')
                    .eq('id', parentId)
                    .single()

                if (parentComment && parentComment.user_id !== session.user.id && parentComment.user_id !== reel?.user_id) {
                    await supabase.from('notifications').insert({
                        user_id: parentComment.user_id,
                        actor_id: session.user.id,
                        type: 'reply',
                        reel_id: reelId,
                        comment_id: newComment.id,
                    })

                    await sendPushNotification(
                        parentComment.user_id,
                        {
                            title: 'Izohingizga javob! 💬',
                            body: `${commenterName} siz qoldirgan izohga javob qaytardi.`,
                            url: `/dashboard/notifications`,
                        },
                        'reply'
                    )
                }
            }
        } catch (err) {
            console.error("Comment/Reply notification yuborishda xatolik:", err)
        }

        const profile = Array.isArray(newComment.profiles) ? newComment.profiles[0] : newComment.profiles

        return NextResponse.json({
            id: newComment.id,
            text: newComment.text,
            parentId: newComment.parent_id,
            likesCount: 0,
            isLikedByMe: false,
            createdAt: newComment.created_at,
            user: {
                id: profile?.id || session.user.id,
                nickname: profile?.nickname || "Noma'lum",
                username: profile?.username || 'user',
                avatar: profile?.avatar_url || '/default-avatar.png',
            },
            replies: [],
        }, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
