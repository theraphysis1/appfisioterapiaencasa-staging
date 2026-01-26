// src/hooks/useAppointmentsRealtime.ts

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AppointmentRealtimePayload {
  id: string
  therapist_id: string
  fecha_hora: string
  estado: string
  barrio: string
  direccion: string
  patologia: string
  observacion: string | null
  // Campos de override
  override_barrio: string | null
  override_direccion: string | null
  override_referencia: string | null
  override_latitud: number | null
  override_longitud: number | null
  [key: string]: any
}

interface AppointmentRealtimeCallbacks {
  onInsert?: (appointment: AppointmentRealtimePayload) => void
  onUpdate?: (appointment: AppointmentRealtimePayload) => void
  onDelete?: (appointmentId: string) => void
}

/**
 * Hook para escuchar cambios en tiempo real en appointments
 * Detecta INSERT, UPDATE y DELETE de citas
 * 
 * @param callbacks - Funciones callback para cada tipo de evento
 * @param therapistId - ID del terapeuta para filtrar (opcional, si no se proporciona escucha todas)
 */
export function useAppointmentsRealtime(
  callbacks: AppointmentRealtimeCallbacks,
  therapistId?: string
) {
  useEffect(() => {
    const supabase = createClient()

    console.log('📡 Iniciando suscripción appointments realtime', { therapistId })

    // Configurar el canal base
    let channel = supabase.channel('appointments-realtime-updates')

    // INSERT - Nueva cita creada
    if (callbacks.onInsert) {
      channel = channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: therapistId ? `therapist_id=eq.${therapistId}` : undefined
        },
        (payload) => {
          console.log('🔔 Nueva cita detectada (INSERT):', payload)
          const newAppointment = payload.new as AppointmentRealtimePayload
          callbacks.onInsert!(newAppointment)
        }
      )
    }

    // UPDATE - Cita modificada
    if (callbacks.onUpdate) {
      channel = channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: therapistId ? `therapist_id=eq.${therapistId}` : undefined
        },
        (payload) => {
          console.log('🔔 Cita actualizada (UPDATE):', payload)
          const updatedAppointment = payload.new as AppointmentRealtimePayload
          callbacks.onUpdate!(updatedAppointment)
        }
      )
    }

    // DELETE - Cita eliminada
    if (callbacks.onDelete) {
      channel = channel.on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'appointments',
          filter: therapistId ? `therapist_id=eq.${therapistId}` : undefined
        },
        (payload) => {
          console.log('🔔 Cita eliminada (DELETE):', payload)
          const deletedAppointment = payload.old as AppointmentRealtimePayload
          callbacks.onDelete!(deletedAppointment.id)
        }
      )
    }

    // Suscribirse al canal
    channel.subscribe((status) => {
      console.log('📡 Estado suscripción appointments realtime:', status)
    })

    // Cleanup al desmontar
    return () => {
      console.log('🔌 Desconectando suscripción appointments realtime')
      supabase.removeChannel(channel)
    }
  }, [callbacks.onInsert, callbacks.onUpdate, callbacks.onDelete, therapistId])
}