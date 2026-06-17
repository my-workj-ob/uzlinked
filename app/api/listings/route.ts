import { NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

// GET — Barcha e'lonlarni olish
export async function GET(request: Request) {
    try {
        const supabase = await getSupabaseClient()
        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')
        const search = searchParams.get('q')

        let query = supabase
            .from('listings')
            .select(`
                *,
                profiles (nickname, avatar_url, username)
            `)
            .eq('is_active', true)
            .order('created_at', { ascending: false })

        if (category && category !== 'all') {
            query = query.eq('category', category)
        }

        if (search) {
            query = query.ilike('title', `%${search}%`)
        }

        const { data: listings, error } = await query
        if (error) throw error

        const formattedListings = listings.map((listing: any) => {
            const profile = Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles
            return {
                id: listing.id,
                title: listing.title,
                description: listing.description,
                price: listing.price,
                category: listing.category,
                image: listing.image_key ? `/api/images?key=${listing.image_key}` : null,
                contact: listing.contact,
                seller: {
                    name: profile?.nickname || 'Noma\'lum',
                    username: profile?.username || 'user',
                    avatar: profile?.avatar_url || '/default-avatar.png',
                },
                createdAt: listing.created_at,
            }
        })

        return NextResponse.json(formattedListings)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST — Yangi e'lon yaratish
export async function POST(request: Request) {
    try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return NextResponse.json({ error: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 })

        const formData = await request.formData()
        const title = formData.get('title') as string
        const description = formData.get('description') as string || ''
        const price = formData.get('price') as string
        const category = formData.get('category') as string || 'digital'
        const contact = formData.get('contact') as string || ''
        const imageFile = formData.get('image') as File | null

        if (!title?.trim() || !price?.trim()) {
            return NextResponse.json({ error: 'Sarlavha va narx majburiy' }, { status: 400 })
        }

        let imageKey: string | null = null

        if (imageFile && imageFile.size > 0) {
            const buffer = Buffer.from(await imageFile.arrayBuffer())
            const ext = imageFile.name.split('.').pop() || 'jpg'
            imageKey = `images/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`

            await s3.send(new PutObjectCommand({
                Bucket: process.env.BLACKBAZE_BUCKET_NAME || 'uzlinked',
                Key: imageKey,
                Body: buffer,
                ContentType: imageFile.type,
            }))
        }

        const { data: newListing, error: dbError } = await supabase
            .from('listings')
            .insert({
                user_id: session.user.id,
                title,
                description,
                price,
                category,
                contact,
                image_key: imageKey,
            })
            .select()
            .single()

        if (dbError) throw dbError
        return NextResponse.json({ success: true, listing: newListing }, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
