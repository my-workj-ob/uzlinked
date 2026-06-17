import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { UTApi } from 'uploadthing/server'

// UploadThing Backend SDK-ni ishga tushiramiz (.env ichidagi UPLOADTHING_TOKEN-ni avtomatik oladi)
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
                    } catch {}
                },
            },
        }
    )
}

// GET — Barcha reellarni olish
export async function GET() {
    try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        const currentUserId = session?.user?.id

        const { data: reels, error } = await supabase
            .from('reels')
            .select(`
                *,
                profiles (nickname, avatar_url, username),
                reel_likes (user_id)
            `)
            .order('created_at', { ascending: false })

        if (error) throw error

        const formattedReels = reels.map((reel: any) => {
            const totalLikes = reel.reel_likes ? reel.reel_likes.length : 0
            const isLikedByMe = reel.reel_likes
                ? reel.reel_likes.some((l: any) => l.user_id === currentUserId)
                : false
            const profile = Array.isArray(reel.profiles) ? reel.profiles[0] : reel.profiles

            // Eskidan qolgan Backblaze videolari va yangi UploadThing manzillarini moslashtirish
            let videoUrl = ''
            if (reel.video_key) {
                if (reel.video_key.startsWith('http')) {
                    videoUrl = reel.video_key
                } else if (reel.video_key.includes('/')) {
                    // Agar kalitda '/' bo'lsa (masalan: videos/123.mp4), demak bu eski Backblaze fayli
                    videoUrl = `/api/videos?key=${reel.video_key}`
                } else {
                    // Agar toza unikal kalit bo'lsa, demak yangi UploadThing CDN manzili
                    videoUrl = `https://utfs.io/f/${reel.video_key}`
                }
            }

            // Huddi shu mantiq rasm muqovalari (Thumbnail) uchun ham amal qiladi
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
                views: reel.views_count || 0,
                isOwner: reel.user_id === currentUserId,
                createdAt: reel.created_at,
            }
        })

        return NextResponse.json(formattedReels)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST — Yangi reel yuklash
export async function POST(request: Request) {
    try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return NextResponse.json({ error: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 })

        const formData = await request.formData()
        const videoFile = formData.get('video') as File | null
        const title = formData.get('title') as string || ''
        const description = formData.get('description') as string || ''

        if (!videoFile || videoFile.size === 0) {
            return NextResponse.json({ error: 'Video fayl tanlanmagan' }, { status: 400 })
        }

        // Frontend-dan kelgan faylni to'g'ridan-to'g'ri UploadThing serveriga yuboramiz
        const response = await utapi.uploadFiles(videoFile)
        
        if (response.error) {
            throw new Error(`UploadThing xatoligi: ${response.error.message}`)
        }

        // Yuklangan faylning unikal kalitini (key) olamiz
        const videoKey = response.data.key

        // Supabase bazasiga yangi qator qo'shamiz
        const { data: newReel, error: dbError } = await supabase
            .from('reels')
            .insert({
                user_id: session.user.id,
                video_key: videoKey,
                title,
                description,
            })
            .select()
            .single()

        if (dbError) throw dbError
        return NextResponse.json({ success: true, reel: newReel }, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// DELETE — Reelni o'chirish
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
                // Agar kalit ichida '/' bo'lmasa, demak bu yangi UploadThing fayli va uni bulutdan o'chiramiz
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