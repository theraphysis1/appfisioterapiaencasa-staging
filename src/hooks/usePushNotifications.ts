// src/hooks/usePushNotifications.ts

import { useEffect, useState, useCallback } from 'react'
import { setupPushNotifications } from '@/lib/push/registerPush'

type PushStatus = 'idle' | 'setting_up' | 'ready' | 'unsupported' | 'denied' | 'error'

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>('idle')

  const runSetup = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    runSetup()
  }, [runSetup])

  return { status, retry: runSetup }
}