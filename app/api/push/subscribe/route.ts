import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          return NextResponse.json({ error: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 })
        }

    const body = await request.json()
    const { subscription } = body

        if (!subscription || !subscription.endpoint || !subscription.keys) {
          return NextResponse.json({ error: 'Noto\'g\'ri obuna ma\'lumotlari' }, { status: 400 })
        }

    const { endpoint, keys: { p256dh, auth } } = subscription

    // 1. Check if this subscription already exists
    const { data: existing, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('id, user_id')
      .eq('endpoint', endpoint)
      .maybeSingle()

        if (fetchError) {
          throw fetchError
        }

        if (existing) {
          if (existing.user_id === user.id) {
            // Subscription already exists and belongs to the current user. No need to update.
            return NextResponse.json({ success: true })
          } else {
            // Belongs to a different user, delete it first to avoid duplicate endpoint conflicts
            try {
              const { error: deleteError } = await supabase
                .from('push_subscriptions')
                .delete()
                .eq('endpoint', endpoint)
              if (deleteError) {
                throw deleteError
              }
            } catch (error) {
              console.error('Error deleting existing subscription:', error)
              return NextResponse.json({ error: 'Mavjud obuna o\'chirishda xatolik yuz berdi' }, { status: 500 })
            }
          }
        }

    // 2. Insert new subscription (safe insert under RLS)
    const { error: insertError } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: user.id,
        endpoint,
        p256dh,
        auth
      })

        if (insertError) {
          throw insertError
        }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Subscribe API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          return NextResponse.json({ error: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 })
        }

    const body = await request.json()
    const { endpoint } = body

        if (!endpoint) {
          return NextResponse.json({ error: 'Endpoint ko\'rsatilmadi' }, { status: 400 })
        }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', user.id)

        if (error) {
          throw error
        }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Unsubscribe API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
