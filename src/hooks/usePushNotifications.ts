// src/hooks/usePushNotifications.ts

import { useEffect, useState } from 'react'
import { setupPushNotifications } from '@/lib/push/registerPush'

type PushStatus = 'idle' | 'setting_up' | 'ready' | 'unsupported' | 'denied' | 'error'

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>('idle')

  useEffect(() => {
    const setup = async () => {
      setStatus('setting_up')
      const result = await setupPushNotifications()

      if (result.success) {
        setStatus('ready')
        console.log('✅ Notificaciones push activadas')
      } else if (result.reason === 'not_supported') {
        setStatus('unsupported')
      } else if (result.reason === 'permission_denied') {
        setStatus('denied')
      } else {
        setStatus('error')
        console.warn('⚠️ No se pudieron activar las notificaciones push:', result.reason)
      }
    }

    setup()
  }, [])

  return { status }
}