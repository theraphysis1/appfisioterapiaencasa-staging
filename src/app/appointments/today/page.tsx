'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { GPSCapture } from '@/components/GPSCapture'
import { checkIn, checkOut, getAttendanceByAppointment } from '@/lib/api/attendance'

interface Patient {
  nombre: string
  apellido: string
  barrio: string
  direccion: string
  referencia: string | null
}

interface Service {
  nombre: string
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

interface Appointment {
  id: string
  fecha_hora: string
  estado: string
  patologia: string
  observacion: string | null
  patients: Patient
  services: Service
  attendance?: AttendanceRecord | null
}

export default function TodayAppointmentsPage() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessages, setSuccessMessages] = useState<Record<string, string>>({})
  const [elapsedTimes, setElapsedTimes] = useState<Record<string, number>>({})

  useEffect(() => {
    loadAppointments()
  }, [])

  // Timer para actualizar tiempos transcurridos
  useEffect(() => {
    const interval = setInterval(() => {
      const newElapsedTimes: Record<string, number> = {}
      
      appointments.forEach(apt => {
        if (apt.attendance?.llegada_registrada && 
            !apt.attendance?.salida_registrada && 
            apt.attendance.hora_llegada_real) {
          const llegada = new Date(apt.attendance.hora_llegada_real)
          const ahora = new Date()
          const minutos = Math.floor((ahora.getTime() - llegada.getTime()) / (1000 * 60))
          newElapsedTimes[apt.id] = minutos
        }
      })
      
      setElapsedTimes(newElapsedTimes)
    }, 60000) // Cada minuto

    // Calcular inmediatamente al cargar
    const initialTimes: Record<string, number> = {}
    appointments.forEach(apt => {
      if (apt.attendance?.llegada_registrada && 
          !apt.attendance?.salida_registrada && 
          apt.attendance.hora_llegada_real) {
        const llegada = new Date(apt.attendance.hora_llegada_real)
        const ahora = new Date()
        const minutos = Math.floor((ahora.getTime() - llegada.getTime()) / (1000 * 60))
        initialTimes[apt.id] = minutos
      }
    })
    setElapsedTimes(initialTimes)

    return () => clearInterval(interval)
  }, [appointments])

  const loadAppointments = async () => {
    try {
      const response = await fetch('/api/appointments/today')
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/')
          return
        }
        throw new Error('Error al cargar las citas')
      }

      const data = await response.json()
      const appointmentsData = data.appointments

      // Cargar estado de asistencia GPS para cada cita
      const appointmentsPromises = appointmentsData.map(async (apt: Appointment) => {
        const attendanceResult = await getAttendanceByAppointment(apt.id)
        
        return {
          ...apt,
          attendance: attendanceResult.success && attendanceResult.data ? attendanceResult.data : null
        }
      })

      const appointmentsWithStatus = await Promise.all(appointmentsPromises)
      setAppointments(appointmentsWithStatus)
      setLoading(false)
    } catch (error) {
      console.error('Load appointments error:', error)
      setLoading(false)
    }
  }

  const handleCheckInSuccess = async (appointmentId: string, latitude: number, longitude: number) => {
    setProcessingId(appointmentId)
    setErrors(prev => ({ ...prev, [appointmentId]: '' }))
    setSuccessMessages(prev => ({ ...prev, [appointmentId]: '' }))

    const result = await checkIn(appointmentId, latitude, longitude)

    if (result.success) {
      setSuccessMessages(prev => ({ ...prev, [appointmentId]: '✅ Llegada registrada' }))
      // Recargar datos
      await loadAppointments()
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => {
        setSuccessMessages(prev => ({ ...prev, [appointmentId]: '' }))
      }, 3000)
    } else {
      setErrors(prev => ({ ...prev, [appointmentId]: result.error || 'Error al registrar llegada' }))
    }

    setProcessingId(null)
  }

  const handleCheckInError = (appointmentId: string, errorMsg: string) => {
    setErrors(prev => ({ ...prev, [appointmentId]: errorMsg }))
  }

  const handleCheckOutSuccess = async (appointmentId: string, latitude: number, longitude: number) => {
    setProcessingId(appointmentId)
    setErrors(prev => ({ ...prev, [appointmentId]: '' }))
    setSuccessMessages(prev => ({ ...prev, [appointmentId]: '' }))

    const result = await checkOut(appointmentId, latitude, longitude)

    if (result.success) {
      let message = '✅ Salida registrada'
      
      if (result.data?.alertas && result.data.alertas.length > 0) {
        message += '\n' + result.data.alertas.join('\n')
      }
      
      setSuccessMessages(prev => ({ ...prev, [appointmentId]: message }))
      await loadAppointments()
      
      setTimeout(() => {
        setSuccessMessages(prev => ({ ...prev, [appointmentId]: '' }))
      }, 5000)
    } else {
      setErrors(prev => ({ ...prev, [appointmentId]: result.error || 'Error al registrar salida' }))
    }

    setProcessingId(null)
  }

  const handleCheckOutError = (appointmentId: string, errorMsg: string) => {
    setErrors(prev => ({ ...prev, [appointmentId]: errorMsg }))
  }

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'agendada':
        return 'bg-blue-100 text-blue-800'
      case 'completada':
        return 'bg-green-100 text-green-800'
      case 'cancelada':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-slate-100 text-slate-800'
    }
  }

  const getEstadoText = (estado: string) => {
    switch (estado) {
      case 'agendada':
        return 'Agendada'
      case 'completada':
        return 'Completada'
      case 'cancelada':
        return 'Cancelada'
      default:
        return estado
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Cargando citas...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-slate-600 hover:text-slate-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Citas de Hoy - {new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </h1>
            <p className="text-sm text-slate-600">{appointments.length} cita{appointments.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {appointments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-slate-600">No tienes citas programadas para hoy</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => {
              const isExpanded = expandedId === appointment.id
              const isProcessing = processingId === appointment.id
              const error = errors[appointment.id]
              const successMessage = successMessages[appointment.id]
              const attendance = appointment.attendance
              const elapsedTime = elapsedTimes[appointment.id] || 0

              return (
                <div
                  key={appointment.id}
                  className="bg-white rounded-lg shadow-sm overflow-hidden"
                >
                  {/* Card Header - NO clickable, info básica */}
                  <div className="p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-800">
                          {appointment.patients.nombre} {appointment.patients.apellido}
                        </h3>
                        <div className="mt-1 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{new Date(appointment.fecha_hora).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{formatTime(appointment.fecha_hora)}</span>
                          </div>
                        </div>
                        <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(appointment.estado)}`}>
                          {getEstadoText(appointment.estado)}
                        </span>
                      </div>
                    </div>

                    {/* Separador */}
                    <div className="border-t border-slate-200 my-3"></div>

                    {/* Mensajes de error/éxito */}
                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                        <p className="text-red-800 text-sm">{error}</p>
                      </div>
                    )}

                    {successMessage && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                        <p className="text-green-800 text-sm whitespace-pre-line">{successMessage}</p>
                      </div>
                    )}

                    {/* Sección GPS - SIEMPRE VISIBLE - Sin registro */}
                    {!attendance?.llegada_registrada && (
                      <div className="space-y-2">
                        <GPSCapture
                          onSuccess={(lat, lng) => handleCheckInSuccess(appointment.id, lat, lng)}
                          onError={(error) => handleCheckInError(appointment.id, error)}
                          buttonText="📍 REGISTRAR LLEGADA"
                          loadingText="Obteniendo GPS..."
                          disabled={isProcessing}
                          className="w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                        />
                        <div className="bg-slate-100 rounded p-2 text-xs text-slate-600">
                          <p className="font-medium">Estado: Sin registrar</p>
                          <p className="mt-1">⚠️ Debes estar en la ubicación del paciente para registrar</p>
                        </div>
                      </div>
                    )}

                    {/* Sección GPS - SIEMPRE VISIBLE - Llegada registrada */}
                    {attendance?.llegada_registrada && !attendance?.salida_registrada && (
                      <div className="space-y-2">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-green-800 font-medium text-sm">✅ Llegada: {formatTime(attendance.hora_llegada_real!)}</p>
                          <p className="text-green-700 text-xs mt-1">Ubicación verificada</p>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                          <p className="text-blue-800 font-medium text-sm">⏱️ Tiempo en sesión:</p>
                          <p className="text-2xl font-bold text-blue-600 mt-1">{elapsedTime} min</p>
                        </div>

                        <GPSCapture
                          onSuccess={(lat, lng) => handleCheckOutSuccess(appointment.id, lat, lng)}
                          onError={(error) => handleCheckOutError(appointment.id, error)}
                          buttonText="🚪 REGISTRAR SALIDA"
                          loadingText="Obteniendo GPS..."
                          disabled={isProcessing}
                          className="w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-colors bg-green-600 text-white hover:bg-green-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                        />
                      </div>
                    )}

                    {/* Sección GPS - SIEMPRE VISIBLE - Completada */}
                    {attendance?.registro_completo && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-green-800 font-bold text-sm mb-2">✅ Sesión Completada</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-green-700">Llegada:</span>
                            <span className="font-medium text-green-800">{formatTime(attendance.hora_llegada_real!)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-700">Salida:</span>
                            <span className="font-medium text-green-800">{formatTime(attendance.hora_salida_real!)}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-green-200">
                            <span className="text-green-700">Duración:</span>
                            <span className="font-bold text-green-800">{attendance.duracion_real_minutos} minutos</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Botón para expandir detalles adicionales */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : appointment.id)}
                      className="w-full mt-3 py-2 px-4 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <span>{isExpanded ? 'Ver menos' : 'Ver más detalles'}</span>
                      <svg 
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Expanded Content - Detalles adicionales */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-3">
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
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
