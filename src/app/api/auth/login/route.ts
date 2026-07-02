import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validar campos requeridos
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Autenticar con Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    // Verificar que el usuario sea un terapeuta
    const { data: therapist, error: therapistError } = await supabase
      .from('therapists')
      .select('id, nombre, apellido, email, activo')
      .eq('user_id', authData.user.id)
      .single()
    if (therapistError || !therapist) {
      // Si no es terapeuta, cerrar sesión
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'Usuario no autorizado' },
        { status: 403 }
      )
    }

    if (therapist.activo === false) {
      // Terapeuta desactivado, cerrar sesión aunque las credenciales sean válidas
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'Tu cuenta ha sido desactivada. Contacta al administrador.' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      therapist,
    })
    
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}