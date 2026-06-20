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

// GET /api/notifications — foydalanuvchining bildirishnomalari
export async function GET() {
    try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: "Avtorizatsiyadan o'tilmagan" }, { status: 401 })
        }

        const { data: notifications, error } = await supabase
            .from('notifications')
            .select(`
                id,
                type,
                reel_id,
                comment_id,
                is_read,
                created_at,
                actor:actor_id (id, nickname, username, avatar_url),
                reels:reel_id (id, thumbnail_key, video_key)
            `)
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) throw error

        const formatted = (notifications || []).map((n: any) => {
            const actor = Array.isArray(n.actor) ? n.actor[0] : n.actor
            const reel = Array.isArray(n.reels) ? n.reels[0] : n.reels
            
            let reelThumbnail = null
            if (reel) {
                if (reel.thumbnail_key) {
                    reelThumbnail = reel.thumbnail_key.includes('/')
                        ? `/api/images?key=${reel.thumbnail_key}`
                        : `https://utfs.io/f/${reel.thumbnail_key}`
                }
            }

            return {
                id: n.id,
                type: n.type,
                reelId: n.reel_id,
                commentId: n.comment_id,
                isRead: n.is_read,
                createdAt: n.created_at,
                actor: {
                    id: actor?.id,
                    nickname: actor?.nickname || "Noma'lum",
                    username: actor?.username || 'user',
                    avatar: actor?.avatar_url || '/default-avatar.png',
                },
                reelThumbnail,
            }
        })

        return NextResponse.json(formatted)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// PATCH /api/notifications — o'qilgan deb belgilash
export async function PATCH(request: Request) {
    try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: "Avtorizatsiyadan o'tilmagan" }, { status: 401 })
        }

        const { notificationIds, markAll } = await request.json()

        if (markAll) {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', session.user.id)
                .eq('is_read', false)

            if (error) throw error
        } else if (notificationIds?.length > 0) {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', session.user.id)
                .in('id', notificationIds)

            if (error) throw error
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
