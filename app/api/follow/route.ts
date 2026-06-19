import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// POST — obuna bo'lish yoki bekor qilish (toggle)
export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 })
        }

        const { targetUserId } = await request.json()

        if (!targetUserId) {
            return NextResponse.json({ error: 'Foydalanuvchi ID si yuborilmadi' }, { status: 400 })
        }

        if (targetUserId === user.id) {
            return NextResponse.json({ error: 'O\'zingizga obuna bo\'la olmaysiz' }, { status: 400 })
        }

        // Allaqachon obuna bo'lganmi tekshirish
        const { data: existing } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', targetUserId)
            .maybeSingle()

        if (existing) {
            // Obunani bekor qilish
            const { error: deleteError } = await supabase
                .from('follows')
                .delete()
                .eq('follower_id', user.id)
                .eq('following_id', targetUserId)

            if (deleteError) throw deleteError

            return NextResponse.json({ following: false })
        } else {
            // Obuna bo'lish
            const { error: insertError } = await supabase
                .from('follows')
                .insert({ follower_id: user.id, following_id: targetUserId })

            if (insertError) throw insertError

            return NextResponse.json({ following: true })
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}