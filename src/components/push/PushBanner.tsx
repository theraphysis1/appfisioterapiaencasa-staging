// src/components/push/PushBanner.tsx

'use client'

import { useState } from 'react'
import PushInstructionsModal from './PushInstructionsModal'

type PushStatus = 'idle' | 'setting_up' | 'ready' | 'unsupported' | 'denied' | 'error'

interface PushBannerProps {
  status: PushStatus
  onRetry: () => void
}

export default function PushBanner({ status, onRetry }: PushBannerProps) {
  const [showInstructions, setShowInstructions] = useState(false)
  const [unsupportedDismissed, setUnsupportedDismissed] = useState(false)

  if (status === 'unsupported' && unsupportedDismissed) return null
  if (status !== 'denied' && status !== 'error' && status !== 'unsupported') return null

  const config = {
    denied: {
      icon: '⚠️',
      text: 'No recibirás notificaciones de nuevas citas. Actívalas desde el navegador.',
      bg: 'bg-amber-50 border-amber-300 text-amber-800',
    },
    error: {
      icon: '⚠️',
      text: 'No pudimos activar tus notificaciones.',
      bg: 'bg-amber-50 border-amber-300 text-amber-800',
    },
    unsupported: {
      icon: 'ℹ️',
      text: 'Tu navegador no soporta notificaciones push. Instala la app como PWA para poder recibirlas.',
      bg: 'bg-slate-100 border-slate-300 text-slate-700',
    },
  }[status]

  return (
    <>
      <div className={`sticky top-0 z-40 flex items-center justify-between gap-3 border-b px-4 py-2 text-sm ${config.bg}`}>
        <span className="flex items-center gap-2">
          <span>{config.icon}</span>
          <span>{config.text}</span>
        </span>

        <span className="flex shrink-0 items-center gap-3">
          {status === 'denied' && (
            <button
              onClick={() => setShowInstructions(true)}
              className="font-medium underline underline-offset-2"
            >
              Cómo activarlas
            </button>
          )}

          {status === 'error' && (
            <button
              onClick={onRetry}
              className="font-medium underline underline-offset-2"
            >
              Reintentar
            </button>
          )}

          {status === 'unsupported' && (
            <button
              onClick={() => setUnsupportedDismissed(true)}
              aria-label="Cerrar"
              className="text-lg leading-none"
            >
              ×
            </button>
          )}
        </span>
      </div>

      <PushInstructionsModal
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
      />
    </>
  )
}