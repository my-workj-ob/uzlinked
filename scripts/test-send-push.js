import { sendPushNotification } from '../utils/push.js'
import fs from 'fs'
import path from 'path'

// Read env variables manually
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

async function testSend() {
  console.log('Sending test push to user c26efb31-eadc-4398-b678-6b9672028e19...')
  try {
    const result = await sendPushNotification(
      'c26efb31-eadc-4398-b678-6b9672028e19',
      {
        title: 'Test Bildirishnoma 🚀',
        body: 'Bu mustaqil PWA test push bildirishnomasidir!',
        url: '/dashboard/notifications'
      },
      'like'
    )
    console.log('Result:', JSON.stringify(result, null, 2))
  } catch (err) {
    console.error('Crash error:', err)
  }
}

testSend()
