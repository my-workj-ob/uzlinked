import { NextResponse } from 'next/server'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

const endpointInput = process.env.BLACKBAZE_BUCKET_ENDPOINT || ''
const rawEndpoint = endpointInput.startsWith('http') ? endpointInput : `https://${endpointInput}`

const s3 = new S3Client({
    endpoint: rawEndpoint,
    credentials: {
        accessKeyId: process.env.BLACKBAZE_APPLICATION_ID!,
        secretAccessKey: process.env.BLACKBAZE_APPLICATION_KEY!,
    },
    region: process.env.BLACKBAZE_BUCKET_REGION || 'us-east-005',
    forcePathStyle: true,
})

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

// 1. POST - YANGI POST YARATISH (Buni oldingi safar yozgandik)
export async function POST(request: Request) {
    try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return NextResponse.json({ error: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 })

        const formData = await request.formData()
        const content = formData.get('content') as string
        const imageFile = formData.get('image') as File | null

        if (!content?.trim()) return NextResponse.json({ error: 'Post matni bo\'sh' }, { status: 400 })

        let imageKey: string | null = null

        if (imageFile && imageFile.size > 0) {
            const buffer = Buffer.from(await imageFile.arrayBuffer())
            const fileExtension = imageFile.name.split('.').pop() || 'png'
            imageKey = `images/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExtension}`

            await s3.send(new PutObjectCommand({
                Bucket: process.env.BLACKBAZE_BUCKET_NAME || 'uzlinked',
                Key: imageKey,
                Body: buffer,
                ContentType: imageFile.type,
            }))
        }

        const { data: newPost, error: dbError } = await supabase
            .from('posts')
            .insert({ user_id: session.user.id, content, image_key: imageKey })
            .select()
            .single()

        if (dbError) throw dbError
        return NextResponse.json({ success: true, post: newPost }, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function GET() {
    try {
        const supabase = await createClient()
        
        // Tizimga kirgan foydalanuvchini aniqlaymiz (Likelarni tekshirish uchun)
        const { data: { session } } = await supabase.auth.getSession()
        const currentUserId = session?.user?.id

        // Postlarni va unga tegishli barcha likelarni bazadan tortamiz
        const { data: posts, error } = await supabase
            .from('posts')
            .select(`
                *,
                profiles (nickname, avatar_url),
                likes (user_id) -- Postga bosilgan barcha likelarning user_id'larini olamiz
            `)
            .order('created_at', { ascending: false })

        if (error) throw error

        // Ma'lumotlarni frontand formatiga moslaymiz
        const formattedPosts = posts.map((post: any) => {
            // Likelar sonini massiv uzunligidan kelib chiqib hisoblaymiz
            const totalLikes = post.likes ? post.likes.length : 0
            
            // Hozirgi foydalanuvchi bu postga like bosganmi yoki yo'qmi tekshiramiz
            const isLikedByMe = post.likes ? post.likes.some((l: any) => l.user_id === currentUserId) : false
            
            const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles

            return {
                id: post.id,
                author: profile?.nickname || 'Noma\'lum',
                avatar: profile?.avatar_url ? `${profile.avatar_url}` : '/default-avatar.png',
                time: post.created_at, // O'zingizning vaqt formatingiz
                location: post.location || 'O\'zbekiston',
                image: post.image_key ? `/api/images?key=${post.image_key}` : null,
                content: post.content,
                likes: totalLikes,       // <--- ENDI BU YERDA STATIK "0" EMAS, HAQIQIY HISOBLANGAN SON BORADI!
                isLiked: isLikedByMe,   // Frontandda yurakcha qizil bo'lib turishi uchun kerak
                isOwner: post.user_id === currentUserId
            }
        })

        return NextResponse.json(formattedPosts)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// 3. DELETE - POSTNI O'CHIRISH
export async function DELETE(request: Request) {
    try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) return NextResponse.json({ error: 'Post ID topilmadi' }, { status: 400 })

        // O'chirishdan oldin rasm borligini tekshiramiz (Backblaze'dan ham o'chirish uchun)
        const { data: post, error: fetchError } = await supabase
            .from('posts')
            .select('image_key, user_id')
            .eq('id', id)
            .single()

        if (fetchError || !post) return NextResponse.json({ error: 'Post topilmadi' }, { status: 404 })
        if (post.user_id !== session.user.id) return NextResponse.json({ error: 'Bu sizning postingiz emas' }, { status: 403 })

        // Agar postda rasm bo'lsa, uni Backblaze B2 storage'dan ham o'chiramiz
        if (post.image_key) {
            try {
                await s3.send(new DeleteObjectCommand({
                    Bucket: process.env.BLACKBAZE_BUCKET_NAME || 'uzlinked',
                    Key: post.image_key,
                }))
            } catch (s3Err) {
                console.error("Storage rasm o'chirishda xato:", s3Err)
            }
        }

        // Bazadan o'chirish
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
            .update({ content: content })
            .eq('id', id)
            .eq('user_id', session.user.id)
            .select()
            .maybeSingle() 

        if (dbError) throw dbError

      
        if (!updatedPost) {
            return NextResponse.json({ 
                error: 'Post topilmadi yoki uni tahrirlashga ruxsatingiz yo\'q' 
            }, { status: 404 })
        }

        return NextResponse.json({ success: true, post: updatedPost }, { status: 200 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}