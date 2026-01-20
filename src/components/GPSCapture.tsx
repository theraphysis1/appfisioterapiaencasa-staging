// src/components/GPSCapture.tsx

'use client'

import { useState } from 'react'

interface GPSCaptureProps {
  onSuccess: (latitude: number, longitude: number) => void
  onError: (error: string) => void
  buttonText?: string
  loadingText?: string
  disabled?: boolean
  className?: string
}

export function GPSCapture({
  onSuccess,
  onError,
  buttonText = 'Obtener Ubicación',
  loadingText = 'Obteniendo GPS...',
  disabled = false,
  className = ''
}: GPSCaptureProps) {
  const [loading, setLoading] = useState(false)

  const captureLocation = () => {
    setLoading(true)

    // Verificar soporte de geolocalización
    if (!navigator.geolocation) {
      setLoading(false)
      onError('Tu navegador no soporta GPS')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLoading(false)
        onSuccess(position.coords.latitude, position.coords.longitude)
      },
      (error) => {
        setLoading(false)
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            onError('Debes permitir acceso a la ubicación en la configuración de tu navegador')
            break
          case error.POSITION_UNAVAILABLE:
            onError('No se pudo obtener tu ubicación. Verifica que el GPS esté activo')
            break
          case error.TIMEOUT:
            onError('Tiempo de espera agotado. Intenta nuevamente')
            break
          default:
            onError('Error desconocido al obtener ubicación')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  return (
    <button
      onClick={captureLocation}
      disabled={disabled || loading}
      className={className || `w-full py-3 px-4 rounded-lg font-medium transition-colors ${
        disabled || loading
          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {loadingText}
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          {buttonText}
        </span>
      )}
    </button>
  )
}