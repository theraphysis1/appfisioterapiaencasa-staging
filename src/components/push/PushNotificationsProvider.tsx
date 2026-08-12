// src/components/push/PushNotificationsProvider.tsx

'use client'

import { usePushNotifications } from '@/hooks/usePushNotifications'
import PushBanner from './PushBanner'

export default function PushNotificationsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { status, retry } = usePushNotifications()

  return (
    <>
      <PushBanner status={status} onRetry={retry} />
      {children}
    </>
  )
}