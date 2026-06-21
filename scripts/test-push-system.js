import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Read env variables manually since dotenv might not be fully configured in direct node execution
const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8')
  envFile.split('\n').forEach(line => {
    const parts = line.split('=')
    if (parts.length >= 2) {
      const key = parts[0].trim()
      const val = parts.slice(1).join('=').trim()
      if (key && !key.startsWith('#')) {
        process.env[key] = val
      }
    }
  })
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function runDiagnostics() {
  console.log('=== PWA Push Notification System Diagnostics ===\n')

  console.log('1. Checking Environment Variables in .env:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'OK' : 'MISSING')
  console.log('- NEXT_PUBLIC_VAPID_PUBLIC_KEY:', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? 'OK' : 'MISSING')
  console.log('- VAPID_PRIVATE_KEY:', process.env.VAPID_PRIVATE_KEY ? 'OK' : 'MISSING')
  console.log('')

  console.log('2. Verifying public.profiles schema update:')
  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('id, nickname, notification_settings')
    .limit(1)

  if (profileErr) {
    console.error('❌ Error querying profiles:', profileErr.message)
  } else if (profiles && profiles.length > 0) {
    const profile = profiles[0]
    console.log('✅ Profiles table is accessible.')
    if ('notification_settings' in profile) {
      console.log('✅ "notification_settings" column exists in profiles table.')
      console.log('Sample settings data:', JSON.stringify(profile.notification_settings, null, 2))
    } else {
      console.log('❌ "notification_settings" column does NOT exist in profiles table. Did you run the SQL migration?')
    }
  } else {
    console.log('ℹ️ Profiles table is empty. Cannot verify columns.')
  }
  console.log('')

  console.log('3. Verifying public.push_subscriptions table existence:')
  const { data: subs, error: subsErr } = await supabase
    .from('push_subscriptions')
    .select('*')
    .limit(5)

  if (subsErr) {
    console.log('❌ "push_subscriptions" table does NOT exist in the database.')
    console.log('Error message:', subsErr.message)
    console.log('👉 ACTION REQUIRED: Run the SQL query from database/pwa_push_setup.sql in your Supabase SQL Editor.')
  } else {
    console.log('✅ "push_subscriptions" table exists in the database.')
    console.log(`Registered active browser endpoints: ${subs.length}`)
    if (subs.length > 0) {
      console.log('Active subscription endpoints:')
      subs.forEach((sub, i) => {
        console.log(`[Subscription ${i + 1}] User ID: ${sub.user_id}`)
        console.log(`- Endpoint: ${sub.endpoint.slice(0, 60)}...`)
      })
    } else {
      console.log('👉 NOTICE: No browsers have registered for push notifications yet.')
      console.log('If you are testing locally, make sure:')
      console.log('  a. You restarted your Next.js dev server after adding VAPID keys to .env.')
      console.log('  b. Your browser has granted Notification permissions to http://localhost:3000.')
    }
  }
  console.log('\n================================================')
}

runDiagnostics()
