'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

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

interface Appointment {
  id: string
  fecha_hora: string
  estado: string
  patologia: string
  observacion: string | null
  patients: Patient
  services: Service
}

export default function TodayAppointmentsPage() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    loadAppointments()
  }, [])

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
      setAppointments(data.appointments)
      setLoading(false)
    } catch (error) {
      console.error('Load appointments error:', error)
      setLoading(false)
    }
  }

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime)
    const timeStr = date.toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
    const dateStr = date.toLocaleDateString('es-CO', { 
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
    return { time: timeStr, date: dateStr }
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
            <h1 className="text-xl font-bold text-slate-800">Citas de Hoy</h1>
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
              const { time, date } = formatDateTime(appointment.fecha_hora)
              const isExpanded = expandedId === appointment.id

              return (
                <div
                  key={appointment.id}
                  className="bg-white rounded-lg shadow-sm overflow-hidden"
                >
                  {/* Card Header - Clickable */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : appointment.id)}
                    className="w-full p-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-800">
                          {appointment.patients.nombre} {appointment.patients.apellido}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{time}</span>
                        </div>
                        <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(appointment.estado)}`}>
                          {getEstadoText(appointment.estado)}
                        </span>
                      </div>
                      <svg 
                        className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 p-4 bg-slate-50">
                      <div className="space-y-3">
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