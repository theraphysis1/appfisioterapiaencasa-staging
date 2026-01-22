// src/app/api/attendance/check-out/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      appointment_id,
      latitude,
      longitude,
      device_model,
      device_fingerprint,
      user_agent
    } = body

    // 1. VALIDACIONES DE ENTRADA
    if (!appointment_id || !latitude || !longitude || !device_model || !device_fingerprint) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
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

    // 4. OBTENER REGISTRO EXISTENTE (DEBE TENER LLEGADA)
    const { data: existingRecord, error: recordError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('appointment_id', appointment_id)
      .eq('therapist_id', therapist_id)
      .single()

    if (recordError || !existingRecord) {
      return NextResponse.json(
        { error: 'No existe un registro de llegada para esta cita' },
        { status: 404 }
      )
    }

    if (!existingRecord.llegada_registrada) {
      return NextResponse.json(
        { error: 'Debes registrar la llegada antes de registrar la salida' },
        { status: 400 }
      )
    }

    if (existingRecord.salida_registrada) {
      return NextResponse.json(
        { error: 'Ya registraste tu salida para esta cita' },
        { status: 400 }
      )
    }

    // 5. OBTENER COORDENADAS DEL PACIENTE
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        patient_id,
        direccion_lat_override,
        direccion_lng_override,
        patients (
          id,
          direccion_lat,
          direccion_lng
        )
      `)
      .eq('id', appointment_id)
      .single()

    if (appointmentError || !appointment) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      )
    }

    const patientData = Array.isArray(appointment.patients) 
      ? appointment.patients[0] 
      : appointment.patients
    
    // Usar coordenadas override si existen, sino usar las del paciente
    const patient_lat = appointment.direccion_lat_override || patientData?.direccion_lat
    const patient_lng = appointment.direccion_lng_override || patientData?.direccion_lng

    // 6. CALCULAR DISTANCIA GPS
    let distancia_metros = null

    if (patient_lat && patient_lng) {
      const { data: distanceData, error: distanceError } = await supabase
        .rpc('calculate_distance_meters', {
          lat1: patient_lat,
          lng1: patient_lng,
          lat2: latitude,
          lng2: longitude
        })

      if (distanceError) {
        console.error('Error calculating distance:', distanceError)
      } else {
        distancia_metros = distanceData
      }

      // Validar radio máximo (100 metros) - puede ser más flexible en salida
      if (distancia_metros && distancia_metros > 150) {
        return NextResponse.json(
          { 
            error: 'Estás muy lejos de la dirección del paciente',
            distancia_metros,
            distancia_maxima: 150
          },
          { status: 400 }
        )
      }
    }

    // 7. CALCULAR DURACIÓN
    const hora_llegada = new Date(existingRecord.hora_llegada_real)
    const hora_salida = new Date()
    const duracion_minutos = Math.round((hora_salida.getTime() - hora_llegada.getTime()) / (1000 * 60))

    // 8. COMPARAR DISPOSITIVOS
    const dispositivo_consistente = 
      device_model === existingRecord.device_model_llegada
    
    const fingerprint_consistente = 
      device_fingerprint === existingRecord.device_fingerprint_llegada

    // 9. OBTENER IP DEL REQUEST
    const ip_address = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'

    // 10. ACTUALIZAR REGISTRO CON SALIDA
    const updateData = {
      hora_salida_real: hora_salida.toISOString(),
      ubicacion_salida_lat: latitude,
      ubicacion_salida_lng: longitude,
      device_model_salida: device_model,
      device_fingerprint_salida: device_fingerprint,
      user_agent_salida: user_agent || null,
      ip_address_salida: ip_address,
      distancia_salida_metros: distancia_metros,
      duracion_real_minutos: duracion_minutos,
      dispositivo_consistente,
      fingerprint_consistente,
      salida_registrada: true,
      registro_completo: true
    }

    const { data: updatedRecord, error: updateError } = await supabase
      .from('attendance_records')
      .update(updateData)
      .eq('id', existingRecord.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating check-out:', updateError)
      return NextResponse.json(
        { error: 'Error al registrar la salida' },
        { status: 500 }
      )
    }

    // 11. GENERAR ALERTAS
    const alertas = []

    if (duracion_minutos < 40) {
      alertas.push('⚠️ Duración menor a 40 minutos')
    }

    if (!dispositivo_consistente) {
      alertas.push('⚠️ Dispositivo diferente detectado')
    }

    if (!fingerprint_consistente) {
      alertas.push('⚠️ Fingerprint diferente detectado')
    }

    if (distancia_metros && distancia_metros > 100) {
      alertas.push(`⚠️ Distancia de salida: ${distancia_metros}m (mayor a 100m)`)
    }

    return NextResponse.json({
      success: true,
      hora_salida: updatedRecord.hora_salida_real,
      duracion_minutos,
      dispositivo_consistente,
      fingerprint_consistente,
      distancia_metros,
      mensaje: 'Salida registrada exitosamente',
      alertas: alertas.length > 0 ? alertas : undefined
    }, { status: 200 })

  } catch (error) {
    console.error('Unexpected error in check-out:', error)
    return NextResponse.json(
      { error: 'Error inesperado del servidor' },
      { status: 500 }
    )
  }
}