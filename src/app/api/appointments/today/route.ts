import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Calcular el rango de hoy (00:00:00 a 23:59:59)
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    // Obtener citas de hoy con datos relacionados
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        fecha_hora,
        estado,
        patologia,
        observacion,
        patients (
          nombre,
          apellido,
          barrio,
          direccion,
          referencia
        ),
        services (
          nombre
        )
      `)
      .eq('therapist_id', therapist.id)
      .gte('fecha_hora', startOfDay.toISOString())
      .lte('fecha_hora', endOfDay.toISOString())
      .order('fecha_hora', { ascending: true })

    if (appointmentsError) {
      console.error('Appointments error:', appointmentsError)
      return NextResponse.json(
        { error: 'Error al obtener las citas' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      appointments: appointments || [],
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}