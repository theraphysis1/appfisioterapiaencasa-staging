// src/app/api/attendance/record/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const appointment_id = searchParams.get('appointment_id')

    // 1. VALIDAR PARÁMETRO
    if (!appointment_id) {
      return NextResponse.json(
        { error: 'appointment_id es requerido' },
        { status: 400 }
      )
    }

    // 2. OBTENER USUARIO AUTENTICADO
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // 3. OBTENER TERAPEUTA ID DEL USUARIO
    const { data: therapist, error: therapistError } = await supabase
      .from('therapists')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (therapistError || !therapist) {
      return NextResponse.json(
        { error: 'Usuario no es un terapeuta' },
        { status: 403 }
      )
    }

    const therapist_id = therapist.id

    // 4. BUSCAR REGISTRO DE ASISTENCIA
    const { data: record, error: recordError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('appointment_id', appointment_id)
      .eq('therapist_id', therapist_id)
      .single()

    // Si no existe registro, devolver null (no es error)
    if (recordError && recordError.code === 'PGRST116') {
      return NextResponse.json({
        success: true,
        record: null,
        mensaje: 'No hay registro para esta cita'
      })
    }

    if (recordError) {
      console.error('Error fetching record:', recordError)
      return NextResponse.json(
        { error: 'Error al obtener el registro' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      record: {
        id: record.id,
        appointment_id: record.appointment_id,
        hora_llegada_real: record.hora_llegada_real,
        hora_salida_real: record.hora_salida_real,
        duracion_real_minutos: record.duracion_real_minutos,
        device_model_llegada: record.device_model_llegada,
        device_model_salida: record.device_model_salida,
        dispositivo_consistente: record.dispositivo_consistente,
        fingerprint_consistente: record.fingerprint_consistente,
        registro_completo: record.registro_completo,
        llegada_registrada: record.llegada_registrada,
        salida_registrada: record.salida_registrada,
        distancia_llegada_metros: record.distancia_llegada_metros,
        distancia_salida_metros: record.distancia_salida_metros,
        created_at: record.created_at,
        updated_at: record.updated_at
      }
    })

  } catch (error) {
    console.error('Unexpected error in get record:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}