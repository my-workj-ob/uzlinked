import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { UTApi } from 'uploadthing/server'

const utapi = new UTApi()

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

function extractHashtags(text: string): string[] {
    if (!text) return []
    const matches = text.match(/#[\wʼ'’]+/g) || []
    return [...new Set(matches.map(t => t.slice(1).toLowerCase()))]
}

// GET /api/reels?mode=foryou|following&filter=<vibeTag>
export async function GET(request: Request) {
    try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        const currentUserId = session?.user?.id

        const { searchParams } = new URL(request.url)
        const mode = searchParams.get('mode') || 'foryou' // 'foryou' | 'following'

        let reelIds: string[] | null = null

        try {
            if (mode === 'foryou') {
                // Algoritmik ranking — SQL funksiyasi get_ranked_reels orqali
                const { data: ranked, error: rankError } = await supabase.rpc('get_ranked_reels', {
                    p_user_id: currentUserId || null,
                    p_limit: 50,
                    p_offset: 0,
                })
                if (!rankError && ranked) {
                    reelIds = ranked.map((r: any) => r.reel_id)
                }
            } else if (mode === 'following' && currentUserId) {
                const { data: following } = await supabase
                    .from('follows')
                    .select('following_id')
                    .eq('follower_id', currentUserId)
                const followingIds = (following || []).map((f: any) => f.following_id)
                if (followingIds.length === 0) {
                    return NextResponse.json([])
                }
                const { data: followedReels } = await supabase
                    .from('reels')
                    .select('id')
                    .in('user_id', followingIds)
                    .order('created_at', { ascending: false })
                reelIds = (followedReels || []).map((r: any) => r.id)
            }
        } catch (error) {
            console.error('Error fetching reels:', error)
            return NextResponse.json({ error: 'Reellarni olishda xatolik yuz berdi' }, { status: 500 })
        }

        let query = supabase
            .from('reels')
            .select(`
                *,
                profiles (nickname, avatar_url, username),
                reel_likes (user_id)
            `)
            .eq('moderation_status', 'active')

        if (reelIds) {
            if (reelIds.length === 0) return NextResponse.json([])
            query = query.in('id', reelIds)
        } else {
            query = query.order('created_at', { ascending: false })
        }

        const { data: reels, error } = await query
        if (error) throw error

        // Reel statistikasi (comments/saves/shares soni) bitta so'rovda
        const { data: stats } = await supabase
            .from('reel_stats')
            .select('*')
            .in('reel_id', reels.map((r: any) => r.id))

        const statsMap = new Map((stats || []).map((s: any) => [s.reel_id, s]))

        // Foydalanuvchining saqlagan reellari
        let savedReelIds: string[] = []
        if (currentUserId) {
            const { data: saves } = await supabase
                .from('reel_saves')
                .select('reel_id')
                .eq('user_id', currentUserId)
                .in('reel_id', reels.map((r: any) => r.id))
            savedReelIds = (saves || []).map((s: any) => s.reel_id)
        }

        // Agar foryou bo'lsa, score tartibini saqlab qolamiz
        const orderMap = reelIds ? new Map(reelIds.map((id, i) => [id, i])) : null

        let formattedReels = reels.map((reel: any) => {
            const totalLikes = reel.reel_likes ? reel.reel_likes.length : 0
            const isLikedByMe = reel.reel_likes
                ? reel.reel_likes.some((l: any) => l.user_id === currentUserId)
                : false
            const profile = Array.isArray(reel.profiles) ? reel.profiles[0] : reel.profiles
            const stat = statsMap.get(reel.id)

            let videoUrl = ''
            if (reel.video_key) {
                if (reel.video_key.startsWith('http')) {
                    videoUrl = reel.video_key
                } else if (reel.video_key.includes('/')) {
                    videoUrl = `/api/videos?key=${reel.video_key}`
                } else {
                    videoUrl = `https://utfs.io/f/${reel.video_key}`
                }
            }

            let thumbnailUrl = null
            if (reel.thumbnail_key) {
                thumbnailUrl = reel.thumbnail_key.includes('/')
                    ? `/api/images?key=${reel.thumbnail_key}`
                    : `https://utfs.io/f/${reel.thumbnail_key}`
            }

            return {
                id: reel.id,
                videoUrl,
                thumbnailUrl,
                title: reel.title || '',
                description: reel.description || '',
                author: profile?.nickname || 'Noma\'lum',
                username: profile?.username || 'user',
                avatar: profile?.avatar_url || '/default-avatar.png',
                likes: totalLikes,
                isLikedByMe,
                commentsCount: stat?.comments_count || 0,
                sharesCount: stat?.shares_count || 0,
                savesCount: stat?.saves_count || 0,
                views: reel.views_count || 0,
                isOwner: reel.user_id === currentUserId,
                isSavedByMe: savedReelIds.includes(reel.id),
                createdAt: reel.created_at,
            }
        })

        if (orderMap) {
            formattedReels = formattedReels.sort(
                (a: any, b: any) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999)
            )
        }

        return NextResponse.json(formattedReels)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 })
        }

        const body = await request.json()
        const { title, description, videoKey } = body
        if (!videoKey) {
            return NextResponse.json({ error: 'videoKey bo\'lishi shart!' }, { status: 400 })
        }

        const { data: newReel, error: dbError } = await supabase
            .from('reels')
            .insert({
                user_id: session.user.id,
                video_key: videoKey,
                title: title || '',
                description: description || '',
            })
            .select()
            .single()

        if (dbError) throw dbError

        // Description va title'dan hashtag'larni ajratib, alohida jadvalga yozamiz (qidiruv uchun)
        const tags = extractHashtags(`${title || ''} ${description || ''}`)
        if (tags.length > 0) {
            await supabase.from('reel_hashtags').insert(
                tags.map(tag => ({ reel_id: newReel.id, tag }))
            )
        }

        return NextResponse.json({ success: true, reel: newReel }, { status: 201 })
    } catch (error: any) {
        console.error("Reel POST Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// PUT /api/reels — reel sarlavhasi va tavsifini yangilash (faqat egasi).
// SQL UPDATE policy (database/reels.sql) allaqachon yozilgan.
export async function PUT(request: Request) {
    try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            return NextResponse.json({ error: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 })
        }

        const body = await request.json()
        const { id, title, description } = body
        if (!id) {
            return NextResponse.json({ error: 'Reel ID topilmadi' }, { status: 400 })
        }

        const { data: reel } = await supabase
            .from('reels')
            .select('user_id')
            .eq('id', id)
            .single()

        if (!reel || reel.user_id !== session.user.id) {
            return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 })
        }

        const { data: updated, error: updateError } = await supabase
            .from('reels')
            .update({
                title: title || '',
                description: description || '',
            })
            .eq('id', id)
            .select()
            .single()

        if (updateError) throw updateError

        // Hashtag'larni qayta hisoblaymiz (qidiruv indeksi yangilanishi uchun)
        const tags = extractHashtags(`${title || ''} ${description || ''}`)
        await supabase.from('reel_hashtags').delete().eq('reel_id', id)
        if (tags.length > 0) {
            await supabase.from('reel_hashtags').insert(
                tags.map(tag => ({ reel_id: id, tag }))
            )
        }

        return NextResponse.json({ success: true, reel: updated })
    } catch (error) {
        console.error("Reel PUT Error:", error)
        const message = error instanceof Error ? error.message : 'Server xatosi'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Reel ID topilmadi' }, { status: 400 })

        const { data: reel } = await supabase
            .from('reels')
            .select('video_key, user_id')
            .eq('id', id)
            .single()

        if (!reel || reel.user_id !== session.user.id) {
            return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 })
        }

        if (reel.video_key) {
            try {
                if (!reel.video_key.includes('/')) {
                    await utapi.deleteFiles(reel.video_key)
                }
            } catch (err) {
                console.error("Faylni bulutdan o'chirishda xatolik yuz berdi:", err)
            }
        }

        const { error } = await supabase.from('reels').delete().eq('id', id)
        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
