// src/app/api/push/subscribe/route.ts

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
    const { endpoint, keys, user_agent } = body

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'endpoint y keys (p256dh, auth) son requeridos' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    const { error: upsertError } = await adminSupabase
      .from('push_subscriptions')
      .upsert(
        {
          therapist_id: therapist.id,
          endpoint,
          keys_p256dh: keys.p256dh,
          keys_auth: keys.auth,
          user_agent: user_agent || null
        },
        { onConflict: 'endpoint' }
      )

    if (upsertError) {
      console.error('Error guardando push subscription:', upsertError)
      return NextResponse.json(
        { error: 'Error al guardar la suscripción' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error en push/subscribe:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}