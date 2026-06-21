'use client'

import { useEffect } from 'react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64Url(arrayBuffer: ArrayBuffer): string {
  const buffer = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i])
  }
  const base64 = window.btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export default function PWARegister() {
  useEffect(() => {
    // Only run on client-side and if Service Worker/Push are supported
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      return
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })
        console.log('PWA Service Worker registered:', registration)

        let subscription = await registration.pushManager.getSubscription()

        // If subscription exists, verify if VAPID public key matches current key
        if (subscription) {
          const currentKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
          const subscribedKeyBuffer = subscription.options.applicationServerKey
          
          let keyMismatch = false
          if (currentKey && subscribedKeyBuffer) {
            const subscribedKeyBase64 = arrayBufferToBase64Url(subscribedKeyBuffer)
            if (subscribedKeyBase64 !== currentKey.trim()) {
              console.log('VAPID public key mismatch detected. Re-subscribing...')
              keyMismatch = true
            }
          } else if (currentKey && !subscribedKeyBuffer) {
            keyMismatch = true
          }

          if (keyMismatch) {
            try {
              // Delete old subscription on the backend first
              await fetch('/api/push/subscribe', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint: subscription.endpoint }),
              })
            } catch (e) {
              console.warn('Could not delete old subscription from backend:', e)
            }
            
            await subscription.unsubscribe()
            subscription = await subscribeUser(registration)
          }
        } else {
          // Request permission and subscribe if not already done
          if (Notification.permission === 'granted') {
            subscription = await subscribeUser(registration)
          } else if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission()
            if (permission === 'granted') {
              subscription = await subscribeUser(registration)
            }
          }
        }

        // Send active subscription details to the server
        if (subscription) {
          await syncSubscription(subscription)
        }
      } catch (err) {
        console.error('Service worker registration failed:', err)
      }
    }

    const subscribeUser = async (registration: ServiceWorkerRegistration) => {
      try {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidPublicKey) {
          console.warn('VAPID public key not found in env.')
          return null
        }
        const convertedKey = urlBase64ToUint8Array(vapidPublicKey)

        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        })
        return sub
      } catch (err) {
        console.error('Failed to subscribe browser to push:', err)
        return null
      }
    }

    const syncSubscription = async (subscription: PushSubscription) => {
      try {
        const response = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription }),
        })
        if (!response.ok) {
          console.warn('Failed to sync PWA subscription with database')
        }
      } catch (err) {
        console.error('Failed to sync PWA subscription:', err)
      }
    }

    // Delay registration slightly to keep page loading fast
    if (document.readyState === 'complete') {
      registerSW()
    } else {
      const handleLoad = () => registerSW()
      window.addEventListener('load', handleLoad)
      return () => window.removeEventListener('load', handleLoad)
    }
  }, [])

  return null
}
