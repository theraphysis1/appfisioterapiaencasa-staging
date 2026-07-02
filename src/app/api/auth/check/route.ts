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

    // Obtener datos del terapeuta
    const { data: therapist, error: therapistError } = await supabase
      .from('therapists')
      .select('id, nombre, apellido, email, activo')
      .eq('user_id', user.id)
      .single()
    if (therapistError || !therapist) {
      return NextResponse.json(
        { error: 'Terapeuta no encontrado' },
        { status: 404 }
      )
    }

    if (therapist.activo === false) {
      // Sesión activa pero terapeuta fue desactivado mientras tanto: cerrar sesión
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'Tu cuenta ha sido desactivada. Contacta al administrador.' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      therapist,
    })
    
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}