const CACHE_NAME = 'snapline-cache-v1'
const ASSETS_TO_CACHE = [
  '/',
  '/favicon.ico',
  '/manifest.webmanifest',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/apple-touch-icon.png'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE)
    }).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  // Skip non-GET, API routes, authentication endpoints, and external Supabase queries
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/auth') ||
    url.origin.includes('supabase.co')
  ) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful requests for static resources dynamically
        if (response.status === 200 && (
          url.pathname.endsWith('.js') ||
          url.pathname.endsWith('.css') ||
          url.pathname.includes('/_next/static') ||
          url.pathname.includes('/icons/') ||
          url.pathname.includes('/images/')
        )) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request)
        if (cachedResponse) return cachedResponse

        if (event.request.mode === 'navigate') {
          return caches.match('/')
        }
      })
  )
})

// Listen to server push event
self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json()
      const options = {
        body: data.body,
        icon: data.icon || '/icons/icon-192x192.png',
        badge: data.badge || '/favicon.ico',
        vibrate: [100, 50, 100],
        data: {
          url: data.data?.url || '/dashboard/notifications'
        }
      }
      event.waitUntil(self.registration.showNotification(data.title, options))
    } catch (err) {
      console.error('Error parsing push data:', err)
      const options = {
        body: event.data.text(),
        icon: '/icons/icon-192x192.png',
        badge: '/favicon.ico',
        vibrate: [100, 50, 100],
        data: {
          url: '/dashboard/notifications'
        }
      }
      event.waitUntil(self.registration.showNotification('snapline', options))
    }
  }
})

// Handle click on native notification card
self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/dashboard/notifications'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // Focus existing tab if open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        const clientUrl = new URL(client.url)
        const checkUrl = new URL(targetUrl, self.location.origin)
        if (clientUrl.origin === checkUrl.origin && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      // Open new tab if none exists
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})
