// src/lib/api/attendance.ts

import { getFingerprint, getDeviceModel, getUserAgent } from '@/lib/deviceFingerprint'

interface CheckInData {
  appointment_id: string
  latitude: number
  longitude: number
  device_model: string
  device_fingerprint: string
  user_agent: string
}

interface CheckOutData {
  appointment_id: string
  latitude: number
  longitude: number
  device_model: string
  device_fingerprint: string
  user_agent: string
}

interface AttendanceRecord {
  id: string
  appointment_id: string | null
  hora_llegada_real: string | null
  hora_salida_real: string | null
  duracion_real_minutos: number | null
  device_model_llegada: string | null
  device_model_salida: string | null
  dispositivo_consistente: boolean | null
  registro_completo: boolean
  llegada_registrada: boolean
  salida_registrada: boolean
  distancia_llegada_metros: number | null
  distancia_salida_metros: number | null
  cancelada_por_admin: boolean
  razon_cancelacion: string | null
  fecha_cancelacion: string | null
}

/**
 * Registra la llegada del terapeuta con GPS
 */
export async function checkIn(
  appointmentId: string,
  latitude: number,
  longitude: number
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const deviceFingerprint = await getFingerprint()
    const deviceModel = getDeviceModel()
    const userAgent = getUserAgent()

    const requestData: CheckInData = {
      appointment_id: appointmentId,
      latitude,
      longitude,
      device_model: deviceModel,
      device_fingerprint: deviceFingerprint,
      user_agent: userAgent,
    }

    const response = await fetch('/api/attendance/check-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Error al registrar llegada',
      }
    }

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('Check-in error:', error)
    return {
      success: false,
      error: 'Error de conexión. Verifica tu internet.',
    }
  }
}

/**
 * Registra la salida del terapeuta con GPS
 */
export async function checkOut(
  appointmentId: string,
  latitude: number,
  longitude: number
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const deviceFingerprint = await getFingerprint()
    const deviceModel = getDeviceModel()
    const userAgent = getUserAgent()

    const requestData: CheckOutData = {
      appointment_id: appointmentId,
      latitude,
      longitude,
      device_model: deviceModel,
      device_fingerprint: deviceFingerprint,
      user_agent: userAgent,
    }

    const response = await fetch('/api/attendance/check-out', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Error al registrar salida',
      }
    }

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('Check-out error:', error)
    return {
      success: false,
      error: 'Error de conexión. Verifica tu internet.',
    }
  }
}

/**
 * Obtiene el registro de asistencia de una cita específica
 */
export async function getAttendanceByAppointment(
  appointmentId: string
): Promise<{ success: boolean; data?: AttendanceRecord | null; error?: string }> {
  try {
    const response = await fetch(`/api/attendance/record?appointment_id=${appointmentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Error al obtener registro',
      }
    }

    return {
      success: true,
      data: result.record || null,
    }
  } catch (error) {
    console.error('Get attendance error:', error)
    return {
      success: false,
      error: 'Error de conexión',
    }
  }
}