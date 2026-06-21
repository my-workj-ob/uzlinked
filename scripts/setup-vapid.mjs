import fs from 'fs'
import path from 'path'
import webpush from 'web-push'

const envPath = path.resolve(process.cwd(), '.env')

console.log('Generating VAPID keys...')
const vapidKeys = webpush.generateVAPIDKeys()

let envContent = ''
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8')
}

if (envContent.includes('NEXT_PUBLIC_VAPID_PUBLIC_KEY')) {
  console.log('VAPID keys already exist in .env')
} else {
  const appendLines = `
# PWA VAPID KEYS FOR PUSH NOTIFICATIONS
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
`
  fs.appendFileSync(envPath, appendLines, 'utf8')
  console.log('VAPID keys successfully appended to .env')
}
console.log('VAPID Public Key:', vapidKeys.publicKey)
