// src/lib/push/registerPush.ts

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    return registration
  } catch (error) {
    console.error('Error registrando Service Worker:', error)
    return null
  }
}

export async function subscribeToPush(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  try {
    const existingSubscription = await registration.pushManager.getSubscription()
    if (existingSubscription) return existingSubscription

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey) as BufferSource
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    })

    return subscription
  } catch (error) {
    console.error('Error creando suscripción push:', error)
    return null
  }
}

export async function saveSubscriptionToServer(subscription: PushSubscription): Promise<boolean> {
  try {
    const subJson = subscription.toJSON()

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        keys: subJson.keys,
        user_agent: navigator.userAgent
      })
    })

    return response.ok
  } catch (error) {
    console.error('Error guardando suscripción en servidor:', error)
    return false
  }
}

export async function setupPushNotifications(): Promise<{ success: boolean; reason?: string }> {
  if (!isPushSupported()) {
    return { success: false, reason: 'not_supported' }
  }

  if (Notification.permission === 'denied') {
    return { success: false, reason: 'permission_denied' }
  }

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return { success: false, reason: 'permission_denied' }
    }
  }

  const registration = await registerServiceWorker()
  if (!registration) {
    return { success: false, reason: 'sw_registration_failed' }
  }

  const subscription = await subscribeToPush(registration)
  if (!subscription) {
    return { success: false, reason: 'subscription_failed' }
  }

  const saved = await saveSubscriptionToServer(subscription)
  if (!saved) {
    return { success: false, reason: 'save_failed' }
  }

  return { success: true }
}