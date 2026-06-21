import webpush from 'web-push'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY

if (publicKey && privateKey) {
  webpush.setVapidDetails(
    'mailto:support@snapline.uz',
    publicKey,
    privateKey
  )
}

function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Maps client event types to JSONB settings hierarchy
const SETTINGS_MAP: Record<string, string> = {
  like: 'interactions.likes',
  comment: 'interactions.comments',
  reply: 'interactions.comments',
  mention: 'interactions.mentions',
  share: 'interactions.shares',
  follow: 'social.followers',
  follow_request: 'social.requests',
  friend_activity: 'social.friend_activity',
  dm: 'chat.direct_messages',
  group_mention: 'chat.group_mentions',
  story: 'content.stories',
  live: 'content.live',
  tip: 'monetization.tips',
  marketplace: 'monetization.marketplace',
  daily_goal: 'retention.daily_goals',
  reminder: 'retention.reminders',
  security: 'system.security_alerts',
  billing: 'system.billing',
}

function checkSettingEnabled(settings: any, path: string): boolean {
  if (!settings) return true // Default to true if no settings are stored yet
  const parts = path.split('.')
  let current = settings
  for (const part of parts) {
    if (current === undefined || current === null) return true
    current = current[part]
  }
  return current !== false // Only disable if explicitly false
}

export async function sendPushNotification(
  userId: string,
  payload: {
    title: string
    body: string
    url?: string
    icon?: string
    badge?: string
  },
  type: string
) {
  try {
    const supabase = createAdminClient()

    // 1. Check user preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('notification_settings')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('Error fetching settings for push:', profileError)
    } else {
      const settingsKey = SETTINGS_MAP[type]
      if (settingsKey) {
        const isEnabled = checkSettingEnabled(profile?.notification_settings, settingsKey)
        if (!isEnabled) {
          console.log(`Push notification type "${type}" is muted by user: ${userId}`)
          return { success: false, reason: 'muted_by_user' }
        }
      }
    }

    // 2. Fetch push endpoints
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (subError) {
      console.error('Error fetching push subscriptions:', subError)
      return { success: false, error: subError.message }
    }

    if (!subscriptions || subscriptions.length === 0) {
      return { success: false, reason: 'no_subscriptions' }
    }

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon.png',
      badge: payload.badge || '/favicon.ico',
      data: {
        url: payload.url || '/dashboard/notifications'
      }
    })

    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          }
          await webpush.sendNotification(pushSubscription, pushPayload)
          return { endpoint: sub.endpoint, success: true }
        } catch (error: any) {
          // Prune stale/expired endpoints
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`Pruning stale push subscription: ${sub.endpoint}`)
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id)
          } else {
            console.error(`Push subscription error for endpoint ${sub.endpoint}:`, error)
          }
          return { endpoint: sub.endpoint, success: false, statusCode: error.statusCode }
        }
      })
    )

    return { success: true, results }
  } catch (error: any) {
    console.error('Failed to dispatch push notification:', error)
    return { success: false, error: error.message }
  }
}
