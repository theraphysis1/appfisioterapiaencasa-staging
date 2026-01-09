// src/lib/deviceFingerprint.ts

/**
 * Genera un fingerprint único del dispositivo basado en características del navegador
 */
export async function getFingerprint(): Promise<string> {
  const data = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    touchSupport: 'ontouchstart' in window,
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio,
  }
  
  const jsonString = JSON.stringify(data)
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(jsonString)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  return hashHex
}

/**
 * Obtiene el modelo/nombre del dispositivo basado en el user agent
 */
export function getDeviceModel(): string {
  const ua = navigator.userAgent
  
  // Android
  if (/Android/.test(ua)) {
    const match = ua.match(/Android.*; (.*?) Build/)
    if (match) {
      return match[1]
    }
    return 'Android Device'
  }
  
  // iPhone
  if (/iPhone/.test(ua)) {
    const match = ua.match(/iPhone OS ([\d_]+)/)
    if (match) {
      const version = match[1].replace(/_/g, '.')
      return `iPhone (iOS ${version})`
    }
    return 'iPhone'
  }
  
  // iPad
  if (/iPad/.test(ua)) {
    const match = ua.match(/iPad.*OS ([\d_]+)/)
    if (match) {
      const version = match[1].replace(/_/g, '.')
      return `iPad (iOS ${version})`
    }
    return 'iPad'
  }
  
  // Desktop
  if (/Windows/.test(ua)) {
    return 'Windows PC'
  }
  
  if (/Mac OS/.test(ua)) {
    return 'Mac'
  }
  
  if (/Linux/.test(ua)) {
    return 'Linux PC'
  }
  
  return 'Desktop/Laptop'
}

/**
 * Obtiene la IP del cliente (se capturará en el backend)
 */
export function getUserAgent(): string {
  return navigator.userAgent
}