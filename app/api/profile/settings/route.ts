import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (profileError) throw profileError

    // Xavfsizlik jurnallarini olish
    const { data: logs, error: logsError } = await supabase
      .from('security_logs')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Agar jurnallar hali mavjud bo'lmasa, bo'sh massiv qaytaramiz
    return NextResponse.json({
      profile,
      logs: logs || []
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      nickname, 
      username, 
      bio, 
      avatar_url, 
      is_private, 
      is_two_factor_enabled, 
      password,
      chat_read_receipts_enabled,
      chat_who_can_message,
      chat_notifications_enabled
    } = body

    // 1. Agar parol jo'natilgan bo'lsa, parolni yangilash
    if (password && password.trim().length >= 6) {
      const { error: passwordError } = await supabase.auth.updateUser({
        password: password.trim()
      })
      if (passwordError) throw passwordError

      // Jurnalga yozish
      await supabase.from('security_logs').insert({
        user_id: session.user.id,
        event_type: 'password_change',
        ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
        user_agent: request.headers.get('user-agent') || 'Browser'
      })
    }

    // 2. Profil ma'lumotlarini olish (eski holatni tekshirish uchun)
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('is_private, is_two_factor_enabled')
      .eq('id', session.user.id)
      .single()

    // 3. Profilni yangilash
    const updateData: any = {}
    if (nickname !== undefined) updateData.nickname = nickname
    if (username !== undefined) updateData.username = username
    if (bio !== undefined) updateData.bio = bio
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url
    if (is_private !== undefined) updateData.is_private = is_private
    if (is_two_factor_enabled !== undefined) updateData.is_two_factor_enabled = is_two_factor_enabled
    if (chat_read_receipts_enabled !== undefined) updateData.chat_read_receipts_enabled = chat_read_receipts_enabled
    if (chat_who_can_message !== undefined) updateData.chat_who_can_message = chat_who_can_message
    if (chat_notifications_enabled !== undefined) updateData.chat_notifications_enabled = chat_notifications_enabled

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', session.user.id)

    if (updateError) throw updateError

    // 4. Agar maxfiylik sozlamalari o'zgargan bo'lsa, jurnalga yozish
    if (currentProfile) {
      if (is_private !== undefined && currentProfile.is_private !== is_private) {
        await supabase.from('security_logs').insert({
          user_id: session.user.id,
          event_type: 'privacy_toggle',
          ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
          user_agent: request.headers.get('user-agent') || 'Browser'
        })
      }
      if (is_two_factor_enabled !== undefined && currentProfile.is_two_factor_enabled !== is_two_factor_enabled) {
        await supabase.from('security_logs').insert({
          user_id: session.user.id,
          event_type: 'two_factor_toggle',
          ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
          user_agent: request.headers.get('user-agent') || 'Browser'
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 })
    }

    // Hisobni o'chirish logikasi:
    // Supabase RLS va references ON DELETE CASCADE yordamida,
    // foydalanuvchining profile yozuvi o'chirilganda, barcha postlar, layklar,
    // va jurnallar avtomatik ravishda o'chiriladi.
    // Auth foydalanuvchini faqat Admin API o'chira oladi. Bu yerda biz profiles jadvalidan o'chiramiz.
    
    // Avval jurnal yozamiz (lekin cascade sabab o'chib ketadi)
    await supabase.from('security_logs').insert({
      user_id: session.user.id,
      event_type: 'account_delete_attempt',
      ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
      user_agent: request.headers.get('user-agent') || 'Browser'
    })

    // Profilni o'chirish
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', session.user.id)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
