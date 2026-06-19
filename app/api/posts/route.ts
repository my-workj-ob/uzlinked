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
        if (!session) return NextResponse.json({ error: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 })

        // Xavfsiz JSON parslash (SyntaxError oldini olish uchun)
        const text = await request.text()
        if (!text.trim()) return NextResponse.json({ error: 'So\'rov tanasi bo\'sh' }, { status: 400 })
        
        const body = JSON.parse(text)
        const { content, imageUrl, url, imageKey, key } = body

        if (!content?.trim()) return NextResponse.json({ error: 'Post matni bo\'sh' }, { status: 400 })

        // MUAMMONI YECHIMI: Frontenddan 'imageUrl' yoki 'url' kelishidan qat'iy nazar aniqlab olamiz
        const finalImageUrl = imageUrl || url || null
        const finalImageKey = imageKey || key || null

        // Supabase bazasiga yozish
        const { data: newPost, error: dbError } = await supabase
            .from('posts')
            .insert({ 
                user_id: session.user.id, 
                content: content.trim(), 
                image_url: finalImageUrl, // Endi NULL bo'lib qolmaydi!
                image_key: finalImageKey  
            })
            .select()
            .single()

        if (dbError) throw dbError
        return NextResponse.json({ success: true, post: newPost }, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// ==========================================
// 2. GET - POSTLARNI OLISH
// ==========================================
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()
        const currentUserId = session?.user?.id

        const { data: posts, error } = await supabase
            .from('posts')
            .select(`
                *,
                profiles (nickname, avatar_url),
                likes (user_id)
            `)
            .order('created_at', { ascending: false })

        if (error) throw error

        const formattedPosts = posts.map((post: any) => {
            const totalLikes = post.likes ? post.likes.length : 0
            const isLikedByMe = post.likes ? post.likes.some((l: any) => l.user_id === currentUserId) : false
            const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles

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
                isOwner: post.user_id === currentUserId
            }
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
        if (!session) return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) return NextResponse.json({ error: 'Post ID topilmadi' }, { status: 400 })

        const { data: post, error: fetchError } = await supabase
            .from('posts')
            .select('image_key, user_id')
            .eq('id', id)
            .single()

        if (fetchError || !post) return NextResponse.json({ error: 'Post topilmadi' }, { status: 404 })
        if (post.user_id !== session.user.id) return NextResponse.json({ error: 'Bu sizning postingiz emas' }, { status: 403 })

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

        if (deleteError) throw deleteError
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
        if (!session) return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 })

        const { id, content } = await request.json()

        if (!id || !content?.trim()) return NextResponse.json({ error: 'ID yoki matn yuborilmadi' }, { status: 400 })

        const { data: updatedPost, error: dbError } = await supabase
            .from('posts')
            .update({ content: content.trim() })
            .eq('id', id)
            .eq('user_id', session.user.id)
            .select()
            .maybeSingle() 

        if (dbError) throw dbError
      
        if (!updatedPost) return NextResponse.json({ error: 'Post topilmadi yoki uni tahrirlashga ruxsatingiz yo\'q' }, { status: 404 })

        return NextResponse.json({ success: true, post: updatedPost }, { status: 200 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}