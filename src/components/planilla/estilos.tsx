import React from 'react'
import type { Novedad, NovedadTipo, Turno } from '../../types'
import { getWeekdayIndex } from '../../utils/dateUtils'

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export const NOVEDADES: Record<NovedadTipo, { texto: string; corto: string; clase: string }> = {
  ausente: { texto: 'Ausente', corto: 'AUS', clase: 'bg-red-100 text-red-800 ring-red-200' },
  enfermo: { texto: 'Enfermo', corto: 'ENF', clase: 'bg-orange-100 text-orange-800 ring-orange-200' },
  licencia: { texto: 'Licencia', corto: 'LIC', clase: 'bg-violet-100 text-violet-800 ring-violet-200' },
  vacaciones: { texto: 'Vacaciones', corto: 'VAC', clase: 'bg-sky-100 text-sky-800 ring-sky-200' },
  franco: { texto: 'Franco', corto: 'FRA', clase: 'bg-gray-100 text-gray-700 ring-gray-200' },
  suspension: { texto: 'Suspensión', corto: 'SUS', clase: 'bg-zinc-200 text-zinc-800 ring-zinc-300' },
}

export const JUSTIFICACION: Record<Novedad['justificacion'], { texto: string; clase: string }> = {
  justificada: { texto: 'Justificada', clase: 'text-emerald-700' },
  pendiente: { texto: 'Falta el certificado', clase: 'text-amber-700' },
  injustificada: { texto: 'No justifica la ausencia', clase: 'text-gray-500' },
}

export const NovedadChip: React.FC<{ novedad: Novedad; corto?: boolean }> = ({ novedad, corto }) => {
  const e = NOVEDADES[novedad.tipo]
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${e.clase}`}>
      {corto ? e.corto : e.texto}
      {novedad.justificacion === 'pendiente' && <span className="ml-0.5" title="Falta el certificado">!</span>}
    </span>
  )
}

// Color del turno según la franja en que empieza: mañana, tarde o noche
export function claseTurno(t: Pick<Turno, 'hora_inicio'>): string {
  const h = Number(t.hora_inicio.slice(0, 2))
  if (h >= 5 && h < 13) return 'bg-amber-50 text-amber-900 ring-amber-200'
  if (h >= 13 && h < 20) return 'bg-blue-50 text-blue-900 ring-blue-200'
  return 'bg-indigo-100 text-indigo-900 ring-indigo-300'
}

export const TurnoChip: React.FC<{ turno: Turno }> = ({ turno }) => (
  <span className={`block whitespace-nowrap rounded px-1 py-0.5 text-[11px] font-medium tabular-nums ring-1 ring-inset ${claseTurno(turno)}`}>
    {turno.hora_inicio.slice(0, 2)}–{turno.hora_fin.slice(0, 2)}
  </span>
)

export const esFinDeSemana = (fecha: string) => [0, 6].includes(getWeekdayIndex(fecha))
export const esLunes = (fecha: string) => getWeekdayIndex(fecha) === 1

// Fecha legible: "lun 2 de marzo"
export function fechaLarga(fecha: string): string {
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const [, m, d] = fecha.split('-').map(Number)
  return `${dias[getWeekdayIndex(fecha)]} ${d} de ${MESES[m - 1].toLowerCase()}`
}

export const horas = (n: number) => `${Math.round(n * 100) / 100} h`
