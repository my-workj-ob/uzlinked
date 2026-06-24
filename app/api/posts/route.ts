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
        const { content, imageUrl, url, imageKey, key, ephemeral, ttlHours } = body

        if (!content?.trim()) {
            return NextResponse.json({ error: 'Post matni bo\'sh' }, { status: 400 })
        }

        // MUAMMONI YECHIMI: Frontenddan 'imageUrl' yoki 'url' kelishidan qat'iy nazar aniqlab olamiz
        const finalImageUrl = imageUrl || url || null
        const finalImageKey = imageKey || key || null

        // Kapsula tanlovi: ephemeral=true bo'lsa post TTL oladi (default 72 soat),
        // aks holda doimiy (expires_at = NULL).
        const hours = Number(ttlHours) > 0 ? Number(ttlHours) : 72
        const expiresAt = ephemeral
            ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
            : null

        const insertPayload: Record<string, unknown> = {
            user_id: session.user.id,
            content: content.trim(),
            image_url: finalImageUrl, // Endi NULL bo'lib qolmaydi!
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
        const enrichedSelect = `
                *,
                profiles (nickname, avatar_url, is_premium),
                likes (user_id),
                post_saves (user_id)
            `
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

        let { data: posts, error } = await runQuery(enrichedSelect)
        if (error) {
            // Ehtimol post_saves jadvali hali mavjud emas — degrade qilamiz
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

            return {
                id: post.id,
                authorId: post.user_id, // Profilga o'tish uchun shart — postni yozgan userning UUID'si
                author: profile?.nickname || 'Noma\'lum',
                avatar: profile?.avatar_url ? `${profile.avatar_url}` : '/default-avatar.png',
                time: post.created_at,
                location: post.location || 'O\'zbekiston',
                image: post.image_url || null, // Agar bazada rasm bo'lsa UI rasm ko'rsatadi
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

        if (post.image_key) {
            try {
                await utapi.deleteFiles(post.image_key)
            } catch (utErr) {
                console.error("Uploadthing faylini o'chirishda xatolik:", utErr)
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
