import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 })
        }

        const { postId, amount } = await request.json()

        if (!postId || !amount || amount <= 0) {
            return NextResponse.json({ error: 'Noto\'g\'ri parametrlar' }, { status: 400 })
        }

        // Post va muallif profilini tekshiramiz
        const { data: post, error: postError } = await supabase
            .from('posts')
            .select(`
                *,
                profiles (id, nickname, is_premium)
            `)
            .eq('id', postId)
            .maybeSingle()

        if (postError || !post) {
            return NextResponse.json({ error: 'Post topilmadi' }, { status: 404 })
        }

        const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles

        if (!profile) {
            return NextResponse.json({ error: 'Muallif profili topilmadi' }, { status: 404 })
        }

        if (!profile.is_premium) {
            return NextResponse.json({ error: 'Faqat premium ijodkorlarga tip yuborish mumkin!' }, { status: 400 })
        }

        if (profile.id === session.user.id) {
            return NextResponse.json({ error: 'O\'zingizga tip yubora olmaysiz' }, { status: 400 })
        }

        // Yuboruvchining taxallusini olamiz
        const { data: senderProfile } = await supabase
            .from('profiles')
            .select('nickname')
            .eq('id', session.user.id)
            .maybeSingle()

        const senderName = senderProfile?.nickname || 'Foydalanuvchi'

        // Real-time Push bildirishnoma yuboramiz
        try {
            const { sendPushNotification } = await import('@/utils/push')
            await sendPushNotification(
                profile.id,
                {
                    title: 'Yangi rag\'bat! 💸',
                    body: `${senderName} sizga ${amount.toLocaleString('uz-UZ')} UZS miqdorida tip yubordi!`,
                    url: `/dashboard`,
                },
                'tip'
            )
        } catch (pushErr) {
            console.error('Push notification yuborishda xatolik:', pushErr)
            return NextResponse.json({ error: 'Push bildirishnoma yuborishda xatolik yuz berdi' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
