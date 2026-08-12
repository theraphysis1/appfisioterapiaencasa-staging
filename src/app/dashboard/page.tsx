'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const router = useRouter()
  const [therapistName, setTherapistName] = useState('')
  const [loading, setLoading] = useState(true)
  const [commissions, setCommissions] = useState({ total: 0, count: 0, month: '' })
  const [loadingCommissions, setLoadingCommissions] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/check')
      
      if (!response.ok) {
        router.push('/')
        return
      }

      const data = await response.json()
      setTherapistName(`${data.therapist.nombre} ${data.therapist.apellido}`)
      setLoading(false)
      
      // Cargar comisiones del mes
      loadCommissions()
    } catch (error) {
      console.error('Auth check error:', error)
      router.push('/')
    }
  }

  const loadCommissions = async () => {
    try {
      const response = await fetch('/api/stats/monthly-commissions')
      
      if (response.ok) {
        const data = await response.json()
        setCommissions({
          total: data.totalCommissions,
          count: data.completedCount,
          month: data.month
        })
      }
      setLoadingCommissions(false)
    } catch (error) {
      console.error('Commissions error:', error)
      setLoadingCommissions(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      })
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Fisioterapia en Casa</h1>
            <p className="text-sm text-slate-600">{therapistName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Salir
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Mis Citas</h2>
          <p className="text-slate-600">Selecciona el día que deseas consultar</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Botón Citas de Hoy */}
          <button
            onClick={() => router.push('/appointments/today')}
            className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow group"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-slate-600 rounded-full flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Citas de Hoy</h3>
                <p className="text-slate-600 text-sm mt-1">Ver citas programadas para hoy</p>
              </div>
            </div>
          </button>

          {/* Botón Citas de Mañana */}
          <button
            onClick={() => router.push('/appointments/tomorrow')}
            className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow group"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-slate-600 rounded-full flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Citas de Mañana</h3>
                <p className="text-slate-600 text-sm mt-1">Ver citas programadas para mañana</p>
              </div>
            </div>
          </button>
        </div>

        {/* Card de Comisiones */}
        {!loadingCommissions && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Comisiones de {commissions.month}</p>
                  <p className="text-2xl font-bold text-slate-800">
                    ${commissions.total.toLocaleString('es-CO')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Citas completadas</p>
                <p className="text-2xl font-bold text-slate-600">{commissions.count}</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}