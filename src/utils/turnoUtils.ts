import type { Turno } from '../types'

export const sumHoras = (ts: Pick<Turno, 'cantidad_horas'>[]) =>
  ts.reduce((a, t) => a + Number(t.cantidad_horas || 0), 0)

export const sumDiurnas = (ts: Pick<Turno, 'horas_diurnas'>[]) =>
  ts.reduce((a, t) => a + Number(t.horas_diurnas || 0), 0)

export const sumNocturnas = (ts: Pick<Turno, 'horas_nocturnas'>[]) =>
  ts.reduce((a, t) => a + Number(t.horas_nocturnas || 0), 0)


