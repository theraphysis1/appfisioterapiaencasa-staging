// src/lib/utils/dateRangeBogota.ts

/**
 * Colombia usa UTC-5 todo el año (no tiene horario de verano/DST).
 * El servidor de Vercel corre en UTC, por eso no podemos usar
 * new Date().getFullYear()/getMonth()/getDate() directamente:
 * a partir de las 7:00 p.m. hora Bogotá, el servidor ya está
 * en el día calendario siguiente.
 */
const BOGOTA_OFFSET_HOURS = 5

/**
 * Calcula el rango UTC (inicio y fin del día) correspondiente
 * a un día calendario en Bogotá.
 *
 * @param daysOffset 0 = hoy, 1 = mañana, -1 = ayer, etc.
 */
export function getBogotaDayRange(daysOffset: number = 0): { startISO: string; endISO: string } {
  const now = new Date()

  // Hora actual "vista" desde Bogotá
  const bogotaNow = new Date(now.getTime() - BOGOTA_OFFSET_HOURS * 60 * 60 * 1000)
  bogotaNow.setUTCDate(bogotaNow.getUTCDate() + daysOffset)

  const year = bogotaNow.getUTCFullYear()
  const month = bogotaNow.getUTCMonth()
  const day = bogotaNow.getUTCDate()

  // 00:00:00 Bogotá = 05:00:00 UTC del mismo día
  const startUTC = new Date(Date.UTC(year, month, day, BOGOTA_OFFSET_HOURS, 0, 0))
  // 23:59:59 Bogotá = 04:59:59 UTC del día siguiente
  const endUTC = new Date(Date.UTC(year, month, day + 1, BOGOTA_OFFSET_HOURS - 1, 59, 59))

  return {
    startISO: startUTC.toISOString(),
    endISO: endUTC.toISOString()
  }
}