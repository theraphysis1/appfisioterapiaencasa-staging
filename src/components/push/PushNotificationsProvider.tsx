// src/components/push/PushNotificationsProvider.tsx

'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import PushBanner from './PushBanner'

export default function PushNotificationsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetch('/api/auth/check')
      .then((res) => {
        if (!cancelled) setIsAuthenticated(res.ok)
      })
      .catch(() => {
        if (!cancelled) setIsAuthenticated(false)
      })

    return () => {
      cancelled = true
    }
  }, [pathname])

  const { status, retry } = usePushNotifications(isAuthenticated)

  return (
    <>
      <PushBanner status={status} onRetry={retry} />
      {children}
    </>
  )
}