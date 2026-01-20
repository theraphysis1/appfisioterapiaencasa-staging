// src/hooks/useAttendanceRealtime.ts

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AttendanceRealtimePayload {
  id: string
  appointment_id: string | null
  cancelada_por_admin: boolean
  razon_cancelacion: string | null
  fecha_cancelacion: string | null
  [key: string]: any
}

/**
 * Hook para escuchar cambios en tiempo real en attendance_records
 * Detecta cuando un registro es cancelado por el admin
 */
export function useAttendanceRealtime(
  onCancelled: (appointmentId: string, razon: string | null) => void
) {
  useEffect(() => {
    const supabase = createClient()

    // Suscripción a cambios en attendance_records
    const channel = supabase
      .channel('attendance-realtime-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'attendance_records',
        },
        (payload) => {
          console.log('🔔 Cambio detectado en attendance_records:', payload)
          
          const updatedRecord = payload.new as AttendanceRealtimePayload
          
          // Solo procesar si fue cancelada por admin
          if (updatedRecord.cancelada_por_admin && updatedRecord.appointment_id) {
            console.log('❌ Registro cancelado detectado:', {
              appointmentId: updatedRecord.appointment_id,
              razon: updatedRecord.razon_cancelacion
            })
            
            onCancelled(
              updatedRecord.appointment_id,
              updatedRecord.razon_cancelacion
            )
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado suscripción attendance realtime:', status)
      })

    // Cleanup al desmontar
    return () => {
      console.log('🔌 Desconectando suscripción attendance realtime')
      supabase.removeChannel(channel)
    }
  }, [onCancelled])
}