import type { Turno } from '../types'

export const sumHoras = (ts: Pick<Turno, 'cantidad_horas'>[]) =>
  ts.reduce((a, t) => a + Number(t.cantidad_horas || 0), 0)

export const sumDiurnas = (ts: Pick<Turno, 'horas_diurnas'>[]) =>
  ts.reduce((a, t) => a + Number(t.horas_diurnas || 0), 0)

export const sumNocturnas = (ts: Pick<Turno, 'horas_nocturnas'>[]) =>
  ts.reduce((a, t) => a + Number(t.horas_nocturnas || 0), 0)

// Intervalo del turno a partir de lo que carga la pantalla: fecha, hora de entrada y duración.
// Se calcula en UTC sobre la hora local escrita, así no lo afecta la zona horaria del navegador.
export const intervaloDesde = (fecha: string, horaInicio: string, horas: number): { inicio: string; fin: string } => {
  const [y, m, d] = fecha.split('-').map(Number)
  const [hh, mm] = horaInicio.split(':').map(Number)
  const inicioMs = Date.UTC(y, m - 1, d, hh, mm)
  const finMs = inicioMs + Math.round(Number(horas) * 60) * 60000
  const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 16)
  return { inicio: fmt(inicioMs), fin: fmt(finMs) }
}

// El turno termina otro día (cruza medianoche)
export const cruzaMedianoche = (t: Pick<Turno, 'inicio' | 'fin'>) => t.fin.slice(0, 10) !== t.inicio.slice(0, 10)
