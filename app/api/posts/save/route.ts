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

// POST /api/posts/save — postni "Kapsula"ga saqlash/olib tashlash (toggle)
export async function POST(request: Request) {
    try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            return NextResponse.json({ error: "Avtorizatsiyadan o'tilmagan" }, { status: 401 })
        }

        const { postId } = await request.json()
        if (postId === undefined || postId === null || postId === '') {
            return NextResponse.json({ error: 'postId kerak' }, { status: 400 })
        }

        const { data: existing } = await supabase
            .from('post_saves')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', session.user.id)
            .maybeSingle()

        if (existing) {
            const { error } = await supabase.from('post_saves').delete().eq('id', existing.id)
            if (error) {
                return NextResponse.json({ error: 'Kapsuladan olib tashlashda xatolik' }, { status: 500 })
            }
            return NextResponse.json({ saved: false })
        } else {
            const { error } = await supabase.from('post_saves').insert({
                post_id: postId,
                user_id: session.user.id,
            })
            if (error) {
                return NextResponse.json({ error: 'Kapsulaga saqlashda xatolik' }, { status: 500 })
            }
            return NextResponse.json({ saved: true })
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// GET /api/posts/save — foydalanuvchining "Kapsula"dagi postlari
export async function GET() {
    try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            return NextResponse.json({ error: "Avtorizatsiyadan o'tilmagan" }, { status: 401 })
        }

        const { data: saves, error } = await supabase
            .from('post_saves')
            .select('post_id, created_at')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })

        if (error) {
            throw error
        }

        return NextResponse.json(saves || [])
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
