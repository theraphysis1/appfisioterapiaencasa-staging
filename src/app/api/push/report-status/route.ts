// src/app/api/push/report-status/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: therapist, error: therapistError } = await supabase
      .from('therapists')
      .select('id, activo')
      .eq('user_id', user.id)
      .single()

    if (therapistError || !therapist) {
      return NextResponse.json({ error: 'Terapeuta no encontrado' }, { status: 404 })
    }

    if (therapist.activo === false) {
      return NextResponse.json({ error: 'Cuenta desactivada' }, { status: 403 })
    }

    const body = await request.json()
    const { plataforma, modo_standalone, push_soportado } = body

    const plataformasValidas = ['android', 'ios', 'desktop', 'unknown']
    const plataformaFinal = plataformasValidas.includes(plataforma) ? plataforma : 'unknown'

    const adminSupabase = createAdminClient()

    const { error: upsertError } = await adminSupabase
      .from('therapist_device_status')
      .upsert(
        {
          therapist_id: therapist.id,
          plataforma: plataformaFinal,
          modo_standalone: Boolean(modo_standalone),
          push_soportado: Boolean(push_soportado),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'therapist_id' }
      )

    if (upsertError) {
      console.error('Error guardando device status:', upsertError)
      return NextResponse.json(
        { error: 'Error al guardar el estado del dispositivo' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error en push/report-status:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}