// src/app/appointments/[id]/page.tsx

'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { GPSCapture } from '@/components/GPSCapture'
import { checkIn, checkOut, getAttendanceByAppointment } from '@/lib/api/attendance'

interface Patient {
  nombre: string
  apellido: string
  barrio: string
  direccion: string
  referencia: string | null
  telefono: string | null
}

interface Service {
  nombre: string
}

interface Appointment {
  id: string
  fecha_hora: string
  estado: string
  patologia: string
  observacion: string | null
  patients: Patient
  services: Service
}

interface AttendanceRecord {
  id: string
  hora_llegada_real: string | null
  hora_salida_real: string | null
  duracion_real_minutos: number | null
  llegada_registrada: boolean
  salida_registrada: boolean
  registro_completo: boolean
}

export default function AppointmentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const appointmentId = params.id as string

  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [processingCheckIn, setProcessingCheckIn] = useState(false)
  const [processingCheckOut, setProcessingCheckOut] = useState(false)
  const [elapsedMinutes, setElapsedMinutes] = useState(0)

  useEffect(() => {
    loadAppointmentData()
  }, [appointmentId])

  // Timer para mostrar tiempo transcurrido
  useEffect(() => {
    if (attendance?.llegada_registrada && !attendance?.salida_registrada && attendance.hora_llegada_real) {
      const interval = setInterval(() => {
        const llegada = new Date(attendance.hora_llegada_real!)
        const ahora = new Date()
        const minutos = Math.floor((ahora.getTime() - llegada.getTime()) / (1000 * 60))
        setElapsedMinutes(minutos)
      }, 60000) // Actualizar cada minuto

      // Calcular inmediatamente
      const llegada = new Date(attendance.hora_llegada_real!)
      const ahora = new Date()
      const minutos = Math.floor((ahora.getTime() - llegada.getTime()) / (1000 * 60))
      setElapsedMinutes(minutos)

      return () => clearInterval(interval)
    }
  }, [attendance])

  const loadAppointmentData = async () => {
    try {
      setLoading(true)
      
      // Cargar datos de la cita
      const appointmentResponse = await fetch(`/api/appointments/today`)
      if (!appointmentResponse.ok) {
        if (appointmentResponse.status === 401) {
          router.push('/')
          return
        }
        throw new Error('Error al cargar la cita')
      }

      const appointmentData = await appointmentResponse.json()
      const foundAppointment = appointmentData.appointments.find(
        (apt: Appointment) => apt.id === appointmentId
      )

      if (!foundAppointment) {
        setError('Cita no encontrada')
        setLoading(false)
        return
      }

      setAppointment(foundAppointment)

      // Cargar registro de asistencia
      const attendanceResult = await getAttendanceByAppointment(appointmentId)
      if (attendanceResult.success && attendanceResult.data) {
        setAttendance(attendanceResult.data)
      }

      setLoading(false)
    } catch (error) {
      console.error('Load error:', error)
      setError('Error al cargar los datos')
      setLoading(false)
    }
  }

  const handleCheckInSuccess = async (latitude: number, longitude: number) => {
    setProcessingCheckIn(true)
    setError('')
    setSuccessMessage('')

    const result = await checkIn(appointmentId, latitude, longitude)

    if (result.success) {
      setSuccessMessage('✅ Llegada registrada exitosamente')
      // Recargar datos
      await loadAppointmentData()
    } else {
      setError(result.error || 'Error al registrar llegada')
    }

    setProcessingCheckIn(false)
  }

  const handleCheckInError = (errorMsg: string) => {
    setError(errorMsg)
  }

  const handleCheckOutSuccess = async (latitude: number, longitude: number) => {
    setProcessingCheckOut(true)
    setError('')
    setSuccessMessage('')

    const result = await checkOut(appointmentId, latitude, longitude)

    if (result.success) {
      let message = '✅ Salida registrada exitosamente'
      
      // Mostrar alertas si existen
      if (result.data?.alertas && result.data.alertas.length > 0) {
        message += '\n\n' + result.data.alertas.join('\n')
      }
      
      setSuccessMessage(message)
      // Recargar datos
      await loadAppointmentData()
    } else {
      setError(result.error || 'Error al registrar salida')
    }

    setProcessingCheckOut(false)
  }

  const handleCheckOutError = (errorMsg: string) => {
    setError(errorMsg)
  }

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (dateTime: string) => {
    return new Date(dateTime).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Cargando...</div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Cita no encontrada'}</p>
          <button
            onClick={() => router.push('/appointments/today')}
            className="text-blue-600 hover:underline"
          >
            Volver a Mis Citas
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/appointments/today')}
            className="text-slate-600 hover:text-slate-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Cita con {appointment.patients.nombre} {appointment.patients.apellido}
            </h1>
            <p className="text-sm text-slate-600">
              {formatDate(appointment.fecha_hora)} - {formatTime(appointment.fecha_hora)}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        
        {/* Mensajes de error/éxito */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm whitespace-pre-line">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm whitespace-pre-line">{successMessage}</p>
          </div>
        )}

        {/* Información de la Cita */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase mb-1">Servicio</p>
            <p className="text-slate-800">{appointment.services.nombre}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 uppercase mb-1">Barrio</p>
            <p className="text-slate-800">{appointment.patients.barrio}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 uppercase mb-1">Dirección</p>
            <p className="text-slate-800">{appointment.patients.direccion}</p>
          </div>

          {appointment.patients.referencia && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase mb-1">Referencia</p>
              <p className="text-slate-800">{appointment.patients.referencia}</p>
            </div>
          )}

          {appointment.patients.telefono && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase mb-1">Teléfono</p>
              <p className="text-slate-800">{appointment.patients.telefono}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-slate-500 uppercase mb-1">Patología</p>
            <p className="text-slate-800">{appointment.patologia}</p>
          </div>

          {appointment.observacion && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase mb-1">Observación</p>
              <p className="text-slate-800">{appointment.observacion}</p>
            </div>
          )}
        </div>

        {/* Sección de Registro GPS */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Registro de Asistencia GPS
          </h2>

          {/* Sin registro */}
          {!attendance?.llegada_registrada && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-slate-600 text-sm mb-2">Estado: Sin registrar</p>
                <p className="text-xs text-slate-500">
                  ⚠️ Debes estar en la ubicación del paciente para registrar
                </p>
              </div>
              
              <GPSCapture
                onSuccess={handleCheckInSuccess}
                onError={handleCheckInError}
                buttonText="📍 REGISTRAR LLEGADA"
                loadingText="Obteniendo GPS..."
                disabled={processingCheckIn}
                className="w-full py-4 px-4 rounded-lg font-bold text-lg transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
          )}

          {/* Llegada registrada, esperando salida */}
          {attendance?.llegada_registrada && !attendance?.salida_registrada && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium mb-2">✅ Llegada Registrada</p>
                <p className="text-sm text-green-700">
                  Hora: {formatTime(attendance.hora_llegada_real!)}
                </p>
                <p className="text-sm text-green-700">
                  Ubicación: ✓ Verificada
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-blue-800 font-medium text-lg mb-1">⏱️ Tiempo en sesión:</p>
                <p className="text-3xl font-bold text-blue-600">{elapsedMinutes} minutos</p>
              </div>

              <GPSCapture
                onSuccess={handleCheckOutSuccess}
                onError={handleCheckOutError}
                buttonText="🚪 REGISTRAR SALIDA"
                loadingText="Obteniendo GPS..."
                disabled={processingCheckOut}
                className="w-full py-4 px-4 rounded-lg font-bold text-lg transition-colors bg-green-600 text-white hover:bg-green-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
          )}

          {/* Sesión completada */}
          {attendance?.registro_completo && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-bold text-lg mb-3">✅ Sesión Completada</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-700">Llegada:</span>
                    <span className="font-medium text-green-800">
                      {formatTime(attendance.hora_llegada_real!)} ✓
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-green-700">Salida:</span>
                    <span className="font-medium text-green-800">
                      {formatTime(attendance.hora_salida_real!)} ✓
                    </span>
                  </div>
                  
                  <div className="flex justify-between pt-2 border-t border-green-200">
                    <span className="text-green-700">Duración:</span>
                    <span className="font-bold text-green-800">
                      {attendance.duracion_real_minutos} minutos
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => router.push('/appointments/today')}
                className="w-full py-3 px-4 rounded-lg font-medium bg-slate-600 text-white hover:bg-slate-700 transition-colors"
              >
                ← Volver a Mis Citas
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}