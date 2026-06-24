import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { UTApi } from 'uploadthing/server'

// Uploadthing backend API client
const utapi = new UTApi()

// Supabase Client Helper
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

// ==========================================
// 1. POST - YANGI POST YARATISH
// ==========================================
export async function POST(request: Request) {
    try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            return NextResponse.json({ error: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 })
        }

        // Xavfsiz JSON parslash (SyntaxError oldini olish uchun)
        const text = await request.text()
        if (!text.trim()) return NextResponse.json({ error: 'So\'rov tanasi bo\'sh' }, { status: 400 })
        
        const body = JSON.parse(text)
        const { content, imageUrl, url, imageKey, key, ephemeral, ttlHours, media } = body

        // Media (rasm/video) ro'yxati — tartiblangan
        type IncomingMedia = { url: string; key?: string; type?: 'image' | 'video'; duration?: number }
        const mediaList: IncomingMedia[] = Array.isArray(media)
            ? media.filter((m: IncomingMedia) => m && typeof m.url === 'string')
            : []

        // Post bo'sh bo'lmasligi kerak: matn YOKI media bo'lsin
        if (!content?.trim() && mediaList.length === 0) {
            return NextResponse.json({ error: 'Post bo\'sh bo\'lmasligi kerak' }, { status: 400 })
        }

        // ----- Subscription limitlari (server tomonida majburlash) -----
        const FREE_IMAGE_LIMIT = 4
        const PRO_IMAGE_LIMIT = 20
        const MAX_VIDEO_SEC = 60

        const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('id', session.user.id)
            .single()
        const isPremium = !!profile?.is_premium

        const imageItems = mediaList.filter((m) => (m.type ?? 'image') === 'image')
        const videoItems = mediaList.filter((m) => m.type === 'video')
        const imageLimit = isPremium ? PRO_IMAGE_LIMIT : FREE_IMAGE_LIMIT

        if (imageItems.length > imageLimit) {
            return NextResponse.json(
                { error: isPremium ? `Maksimal ${imageLimit} ta rasm` : `Bepul rejada ${imageLimit} ta rasm — PRO ga o'ting` },
                { status: 403 }
            )
        }
        if (videoItems.length > 0 && !isPremium) {
            return NextResponse.json({ error: 'Video qo\'shish faqat PRO uchun' }, { status: 403 })
        }
        if (videoItems.length > 1) {
            return NextResponse.json({ error: 'Bitta postga faqat bitta video' }, { status: 403 })
        }
        if (videoItems.some((v) => Number(v.duration) > MAX_VIDEO_SEC + 1)) {
            return NextResponse.json({ error: `Video ${MAX_VIDEO_SEC} soniyadan oshmasligi kerak` }, { status: 403 })
        }

        // MUAMMONI YECHIMI: Frontenddan 'imageUrl' yoki 'url' kelishidan qat'iy nazar aniqlab olamiz
        // Birinchi rasmni orqaga moslik uchun image_url sifatida saqlaymiz
        const firstImage = imageItems[0]
        const finalImageUrl = imageUrl || url || firstImage?.url || null
        const finalImageKey = imageKey || key || firstImage?.key || null

        // Kapsula tanlovi: ephemeral=true bo'lsa post TTL oladi (default 72 soat),
        // aks holda doimiy (expires_at = NULL).
        const hours = Number(ttlHours) > 0 ? Number(ttlHours) : 72
        const expiresAt = ephemeral
            ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
            : null

        const insertPayload: Record<string, unknown> = {
            user_id: session.user.id,
            content: (content?.trim() ?? ''),
            image_url: finalImageUrl,
            image_key: finalImageKey,
        }

        // Birinchi urinish: expires_at bilan. Agar ustun hali yo'q bo'lsa
        // (migratsiya qo'llanmagan) — expires_at'siz qayta urinamiz.
        let { data: newPost, error: dbError } = await supabase
            .from('posts')
            .insert({ ...insertPayload, expires_at: expiresAt })
            .select()
            .single()

        if (dbError) {
            const retry = await supabase
                .from('posts')
                .insert(insertPayload)
                .select()
                .single()
            newPost = retry.data
            dbError = retry.error
        }

        if (dbError) {
            throw dbError
        }

        // post_media jadvaliga media (rasm/video)'ni tartib bilan yozamiz.
        // Jadval mavjud bo'lmasa (migratsiya qo'llanmagan) — jim degrade qilamiz,
        // post baribir image_url orqali ko'rinadi.
        if (newPost?.id && mediaList.length > 0) {
            const rows = mediaList.map((m, i) => ({
                post_id: newPost!.id,
                url: m.url,
                storage_key: m.key ?? null,
                type: (m.type ?? 'image'),
                position: i,
                duration: m.type === 'video' ? (Number(m.duration) || null) : null,
            }))
            const { error: mediaErr } = await supabase.from('post_media').insert(rows)
            if (mediaErr) {
                console.error('post_media yozishda xatolik (degrade):', mediaErr.message)
            }
        }

        return NextResponse.json({ success: true, post: newPost }, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// ==========================================
// 2. GET - POSTLARNI OLISH
// ==========================================
export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()
        const currentUserId = session?.user?.id

        const { searchParams } = new URL(request.url)
        const postId = searchParams.get('id')

        // Kapsula (efemerlik) bilan boyitilgan so'rov. Agar migratsiya hali
        // qo'llanilmagan bo'lsa (post_saves / expires_at yo'q), oddiy so'rovga
        // qaytamiz — shunda ilova baribir ishlayveradi.
        // To'liq: media galereyasi + kapsula saqlashlari bilan
        const fullSelect = `
                *,
                profiles (nickname, avatar_url, is_premium),
                likes (user_id),
                post_saves (user_id),
                post_media (url, type, position, duration)
            `
        // O'rta: media yo'q, lekin kapsula bor (post_media migratsiya qo'llanmagan)
        const enrichedSelect = `
                *,
                profiles (nickname, avatar_url, is_premium),
                likes (user_id),
                post_saves (user_id)
            `
        // Eng oddiy: faqat profil + like
        const basicSelect = `
                *,
                profiles (nickname, avatar_url, is_premium),
                likes (user_id)
            `

        const runQuery = (select: string) => {
            let q = supabase.from('posts').select(select)
            if (postId) q = q.eq('id', postId)
            return q.order('created_at', { ascending: false })
        }

        let { data: posts, error } = await runQuery(fullSelect)
        if (error) {
            // Ehtimol post_media jadvali hali mavjud emas — kapsula bilan urinamiz
            const mid = await runQuery(enrichedSelect)
            posts = mid.data
            error = mid.error
        }
        if (error) {
            // Ehtimol post_saves ham yo'q — oddiy so'rovga qaytamiz
            const fallback = await runQuery(basicSelect)
            posts = fallback.data
            error = fallback.error
        }

        if (error) {
            throw error
        }

        const nowMs = Date.now()

        const formattedPosts = (posts || []).map((post: any) => {
            const totalLikes = post.likes ? post.likes.length : 0
            const isLikedByMe = post.likes ? post.likes.some((l: any) => l.user_id === currentUserId) : false
            const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
            const savedByMe = Array.isArray(post.post_saves)
                ? post.post_saves.some((s: any) => s.user_id === currentUserId)
                : false

            // Media galereyasi (tartiblangan). Migratsiya yo'q bo'lsa — image_url'ga qaytamiz.
            const mediaRows = Array.isArray(post.post_media) ? [...post.post_media] : []
            mediaRows.sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
            let media = mediaRows.map((m: any) => ({
                url: m.url,
                type: (m.type === 'video' ? 'video' : 'image') as 'image' | 'video',
                duration: m.duration ?? null,
            }))
            if (media.length === 0 && post.image_url) {
                media = [{ url: post.image_url, type: 'image', duration: null }]
            }

            return {
                id: post.id,
                authorId: post.user_id, // Profilga o'tish uchun shart — postni yozgan userning UUID'si
                author: profile?.nickname || 'Noma\'lum',
                avatar: profile?.avatar_url ? `${profile.avatar_url}` : '/default-avatar.png',
                time: post.created_at,
                location: post.location || 'O\'zbekiston',
                image: post.image_url || (media[0]?.type === 'image' ? media[0].url : null),
                media,
                content: post.content,
                likes: totalLikes,
                likedByMe: isLikedByMe,
                isOwner: post.user_id === currentUserId,
                authorIsPremium: profile?.is_premium || false,
                // Kapsula maydonlari
                expiresAt: post.expires_at ?? null,
                savesCount: post.saves_count ?? 0,
                savedByMe,
            }
        }).filter((post: any) => {
            // Erib ketgan postlar yashiriladi — agar foydalanuvchi o'zi
            // saqlamagan yoki egasi bo'lmasa. expiresAt yo'q = abadiy.
            if (!post.expiresAt) return true
            if (new Date(post.expiresAt).getTime() > nowMs) return true
            return post.savedByMe || post.isOwner
        })

        return NextResponse.json(formattedPosts)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// ==========================================
// 3. DELETE - POSTNI O'CHIRISH
// ==========================================
export async function DELETE(request: Request) {
    try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Post ID topilmadi' }, { status: 400 })
        }

        const { data: post, error: fetchError } = await supabase
            .from('posts')
            .select('image_key, user_id')
            .eq('id', id)
            .single()

        if (fetchError || !post) {
            return NextResponse.json({ error: 'Post topilmadi' }, { status: 404 })
        }
        if (post.user_id !== session.user.id) {
            return NextResponse.json({ error: 'Bu sizning postingiz emas' }, { status: 403 })
        }

        // Uploadthing fayllarini tozalash: eski image_key + barcha post_media kalitlari
        const keysToDelete: string[] = []
        if (post.image_key) keysToDelete.push(post.image_key)
        try {
            const { data: mediaRows } = await supabase
                .from('post_media')
                .select('storage_key')
                .eq('post_id', id)
            for (const m of mediaRows ?? []) {
                if (m.storage_key) keysToDelete.push(m.storage_key)
            }
        } catch {
            /* post_media jadvali yo'q bo'lishi mumkin — e'tiborsiz qoldiramiz */
        }
        if (keysToDelete.length > 0) {
            try {
                await utapi.deleteFiles(Array.from(new Set(keysToDelete)))
            } catch (utErr) {
                console.error("Uploadthing fayllarini o'chirishda xatolik:", utErr)
            }
        }

        const { error: deleteError } = await supabase
            .from('posts')
            .delete()
            .eq('id', id)

        if (deleteError) {
            throw deleteError
        }
        return NextResponse.json({ success: true }, { status: 200 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// ==========================================
// 4. PUT - POSTNI TAHRIRLASH
// ==========================================
export async function PUT(request: Request) {
    try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 })
        }

        const { id, content } = await request.json()

        if (!id || !content?.trim()) {
            return NextResponse.json({ error: 'ID yoki matn yuborilmadi' }, { status: 400 })
        }

        const { data: updatedPost, error: dbError } = await supabase
            .from('posts')
            .update({ content: content.trim() })
            .eq('id', id)
            .eq('user_id', session.user.id)
            .select()
            .maybeSingle() 

        if (dbError) {
            throw dbError
        }
      
        if (!updatedPost) {
            return NextResponse.json({ error: 'Post topilmadi yoki uni tahrirlashga ruxsatingiz yo\'q' }, { status: 404 })
        }

        return NextResponse.json({ success: true, post: updatedPost }, { status: 200 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
