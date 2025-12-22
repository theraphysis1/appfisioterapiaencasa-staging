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

    // Calcular el rango del mes actual
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // Obtener citas completadas del mes con sus comisiones
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('comision')
      .eq('therapist_id', therapist.id)
      .eq('estado', 'completada')
      .gte('fecha_hora', startOfMonth.toISOString())
      .lte('fecha_hora', endOfMonth.toISOString())

    if (appointmentsError) {
      console.error('Appointments error:', appointmentsError)
      return NextResponse.json(
        { error: 'Error al obtener las citas' },
        { status: 500 }
      )
    }

    // Calcular total de comisiones
    const totalCommissions = appointments.reduce((sum, apt) => sum + Number(apt.comision), 0)
    const completedCount = appointments.length

    return NextResponse.json({
      success: true,
      totalCommissions,
      completedCount,
      month: now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}