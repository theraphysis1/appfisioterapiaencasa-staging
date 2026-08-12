// src/app/api/push/confirm-delivery/route.ts

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { delivery_id } = body

    if (!delivery_id || typeof delivery_id !== 'string') {
      return NextResponse.json(
        { error: 'delivery_id es requerido' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { error } = await supabase
      .from('notifications_log')
      .update({
        estado_entrega: 'confirmado',
        fecha_confirmacion: new Date().toISOString()
      })
      .eq('delivery_id', delivery_id)
      .eq('estado_entrega', 'enviado_pendiente') // evita sobreescribir si ya estaba confirmado

    if (error) {
      console.error('Error confirmando entrega:', error)
      return NextResponse.json(
        { error: 'Error al confirmar entrega' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error en push/confirm-delivery:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}