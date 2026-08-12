// public/sw.js

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch (e) {
    payload = { title: 'Fisioterapia En Casa', body: event.data.text() }
  }

  const title = payload.title || 'Fisioterapia En Casa'
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: payload.url || '/dashboard' },
    tag: payload.tag || undefined,
  }

  const showNotificationPromise = self.registration.showNotification(title, options)

  // Confirmación silenciosa de entrega — no bloquea ni afecta la notificación visible.
  // Si falla (sin internet, endpoint caído, etc.), simplemente no se confirma.
  const confirmDeliveryPromise = payload.delivery_id
    ? fetch('/api/push/confirm-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivery_id: payload.delivery_id })
      }).catch((err) => {
        console.error('Error confirmando entrega de push:', err)
      })
    : Promise.resolve()

  event.waitUntil(Promise.all([showNotificationPromise, confirmDeliveryPromise]))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})