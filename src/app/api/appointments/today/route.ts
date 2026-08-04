import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBogotaDayRange } from '@/lib/utils/dateRangeBogota'

export async function GET() {
  try {
    const supabase = await createClient()

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Obtener el therapist_id del usuario autenticado
    const { data: therapist, error: therapistError } = await supabase
      .from('therapists')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (therapistError || !therapist) {
      return NextResponse.json(
        { error: 'Terapeuta no encontrado' },
        { status: 404 }
      )
    }

    // Calcular el rango de hoy en hora Bogotá (00:00:00 a 23:59:59)
    const { startISO, endISO } = getBogotaDayRange(0)

    // Obtener citas de hoy con datos relacionados
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        fecha_hora,
        estado,
        patologia,
        observacion,
        direccion_override,
        barrio_override,
        referencia_override,
        direccion_lat_override,
        direccion_lng_override,
        patients (
          nombre,
          apellido,
          barrio,
          direccion,
          referencia,
          direccion_lat,
          direccion_lng
        ),
        services (
          nombre
        )
      `)
      .eq('therapist_id', therapist.id)
      .gte('fecha_hora', startISO)
      .lte('fecha_hora', endISO)
      .order('fecha_hora', { ascending: true })

    if (appointmentsError) {
      console.error('Appointments error:', appointmentsError)
      return NextResponse.json(
        { error: 'Error al obtener las citas' },
        { status: 500 }
      )
    }

    // ✅ NUEVO: Calcular dirección final para cada cita
    const appointmentsWithLocation = appointments?.map(appointment => {
      // Extraer el objeto patient (no es array, es objeto único)
      const patient = appointment.patients as any

      const hasOverride = !!(
        appointment.direccion_override || 
        appointment.barrio_override || 
        appointment.direccion_lat_override
      )

      return {
        ...appointment,
        // Campos calculados de dirección final
        direccion_final: appointment.direccion_override || patient?.direccion || null,
        barrio_final: appointment.barrio_override || patient?.barrio || null,
        referencia_final: appointment.referencia_override || patient?.referencia || null,
        direccion_lat_final: appointment.direccion_lat_override || patient?.direccion_lat || null,
        direccion_lng_final: appointment.direccion_lng_override || patient?.direccion_lng || null,
        tiene_direccion_temporal: hasOverride
      }
    })

    return NextResponse.json({
      success: true,
      appointments: appointmentsWithLocation || [],
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}