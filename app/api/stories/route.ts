import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// GET — barcha aktiv (24 soat ichidagi) story'larni profil bo'yicha guruhlab qaytaradi
export async function GET() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 })
    }

    const { data, error } = await supabase
        .from('active_stories_grouped')
        .select('*')
        .order('user_id', { ascending: false })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
}

// POST — yangi story yaratish (rasm yoki video)
export async function POST(req: Request) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 })
    }

    const body = await req.json()
    const { mediaUrl, mediaKey, mediaType } = body

    if (!mediaUrl || !mediaKey || !mediaType) {
        return NextResponse.json({ error: 'Media ma\'lumotlari to\'liq emas' }, { status: 400 })
    }

    if (!['image', 'video'].includes(mediaType)) {
        return NextResponse.json({ error: 'Noto\'g\'ri media turi' }, { status: 400 })
    }

    const { data, error } = await supabase
        .from('stories')
        .insert({
            user_id: user.id,
            media_url: mediaUrl,
            media_key: mediaKey,
            media_type: mediaType,
        })
        .select()
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
}