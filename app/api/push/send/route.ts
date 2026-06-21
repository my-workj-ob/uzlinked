import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { sendPushNotification } from '@/utils/push'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 })
    }

    const body = await request.json()
    const { recipientId, title, body: textContent, url, type } = body

    if (!recipientId || !title || !textContent || !type) {
      return NextResponse.json({ error: 'Ma\'lumotlar to\'liq emas (recipientId, title, body, type talab qilinadi)' }, { status: 400 })
    }

    let finalTitle = title
    let finalBody = textContent

    if (type === 'dm') {
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', user.id)
        .single()
      const senderName = senderProfile?.nickname || 'Foydalanuvchi'
      finalTitle = `${senderName} dan yangi xabar 💬`
      finalBody = textContent || 'Sizga xabar yubordi'
    }

    const result = await sendPushNotification(
      recipientId,
      {
        title: finalTitle,
        body: finalBody,
        url,
        icon: '/icon.png',
        badge: '/favicon.ico'
      },
      type
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Send push notification API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
