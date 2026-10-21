import React, { memo, useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import type { DiaPlanilla, Grilla, Novedad, Turno, Vigilador } from '../../types'
import { weekdayLabelES } from '../../utils/dateUtils'
import { sumDiurnas, sumHoras, sumNocturnas } from '../../utils/turnoUtils'
import { NovedadChip, TurnoChip, esFinDeSemana, esLunes } from './estilos'

export type Densidad = 'compacta' | 'normal'
export type CeldaSeleccionada = { id_vigilador: number; fecha: string } | null

type Props = {
  grilla: Grilla
  densidad: Densidad
  totalesSemanales: boolean
  puedeEditar: boolean
  seleccion: CeldaSeleccionada
  onCelda: (vigilador: Vigilador, dia: DiaPlanilla) => void
  onQuitarVigilador: (vigilador: Vigilador) => void
}

const clave = (id_vigilador: number, fecha: string) => `${id_vigilador}|${fecha}`
// Referencias fijas para las celdas vacías (así memo no las vuelve a dibujar)
const SIN_TURNOS: Turno[] = []
const r = (n: number) => Math.round(n * 100) / 100

// Semanas de lunes a domingo dentro del mes
function semanas(dias: DiaPlanilla[]) {
  const grupos: DiaPlanilla[][] = []
  for (const d of dias) {
    if (!grupos.length || esLunes(d.fecha)) grupos.push([])
    grupos[grupos.length - 1].push(d)
  }
  return grupos
}

type CeldaProps = {
  vigilador: Vigilador
  dia: DiaPlanilla
  turnos: Turno[]
  novedad: Novedad | null
  otros: Turno[]
  finDeSemana: boolean
  inicioSemana: boolean
  seleccionada: boolean
  compacta: boolean
  onCelda: (vigilador: Vigilador, dia: DiaPlanilla) => void
}

const Celda = memo(function Celda({ vigilador, dia, turnos, novedad, otros, finDeSemana, inicioSemana, seleccionada, compacta, onCelda }: CeldaProps) {
  const titulo = [
    ...turnos.map(t => `${t.hora_inicio}–${t.hora_fin} (${t.cantidad_horas} h)`),
    novedad ? `Novedad: ${novedad.tipo}${novedad.observacion ? ` · ${novedad.observacion}` : ''}` : '',
    ...otros.map(t => `También en ${t.servicio_nombre} · ${t.puesto_nombre}: ${t.hora_inicio}–${t.hora_fin}`),
  ].filter(Boolean).join('\n')
  return (
    <td
      onClick={() => onCelda(vigilador, dia)}
      title={titulo || undefined}
      className={`relative cursor-pointer border-b border-r border-gray-200 align-top transition-colors hover:bg-primary-50
        ${compacta ? 'h-10 min-w-[46px] p-0.5' : 'h-14 min-w-[64px] p-1'}
        ${finDeSemana ? 'bg-gray-50' : 'bg-white'}
        ${inicioSemana ? 'border-l-2 border-l-gray-300' : ''}
        ${seleccionada ? 'outline outline-2 -outline-offset-2 outline-primary-500' : ''}`}
    >
      <div className="flex flex-col gap-0.5">
        {novedad && <NovedadChip novedad={novedad} corto />}
        {turnos.slice(0, compacta ? 1 : 2).map(t => <TurnoChip key={t.id_turno} turno={t} />)}
        {turnos.length > (compacta ? 1 : 2) && <span className="text-[10px] text-gray-500">+{turnos.length - (compacta ? 1 : 2)}</span>}
      </div>
      {otros.length > 0 && (
        <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" aria-label="Trabaja en otro servicio ese día" />
      )}
    </td>
  )
})

const GrillaPlanilla: React.FC<Props> = ({ grilla, densidad, totalesSemanales, puedeEditar, seleccion, onCelda, onQuitarVigilador }) => {
  const { dias, vigiladores, turnos, novedades, otrasPlanillas } = grilla
  const compacta = densidad === 'compacta'
  const grupos = useMemo(() => semanas(dias), [dias])

  const turnosPorCelda = useMemo(() => {
    const m = new Map<string, Turno[]>()
    for (const t of turnos) {
      const k = clave(t.id_vigilador, t.fecha)
      m.set(k, [...(m.get(k) || []), t])
    }
    return m
  }, [turnos])

  const novedadPorCelda = useMemo(() => {
    const m = new Map<string, Novedad>()
    for (const n of novedades) {
      for (const d of dias) if (n.desde <= d.fecha && d.fecha <= n.hasta) m.set(clave(n.id_vigilador, d.fecha), n)
    }
    return m
  }, [novedades, dias])

  const totalesVigilador = (id: number, lista: DiaPlanilla[]) => {
    const ts = lista.flatMap(d => turnosPorCelda.get(clave(id, d.fecha)) || [])
    return { total: r(sumHoras(ts)), diurnas: r(sumDiurnas(ts)), nocturnas: r(sumNocturnas(ts)) }
  }
  const suma = (lista: DiaPlanilla[], campo: 'horas_requeridas' | 'horas_cumplidas' | 'horas_totales_trabajadas') =>
    r(lista.reduce((a, d) => a + Number(d[campo] || 0), 0))

  const celdaResumen = 'border-b border-r border-gray-200 px-2 text-right text-xs tabular-nums'
  const sinVigiladores = vigiladores.length === 0

  // Fila de totales del puesto por día (requeridas, cubiertas, horas-hombre)
  const filaTotales = (titulo: string, campo: 'horas_requeridas' | 'horas_cumplidas' | 'horas_totales_trabajadas', ayuda: string) => (
    <tr className="bg-gray-50">
      <th scope="row" title={ayuda} className="sticky left-0 z-10 border-b border-r border-gray-200 bg-gray-50 px-3 py-1.5 text-left text-xs font-semibold text-gray-700">
        {titulo}
      </th>
      {grupos.map((g, i) => (
        <React.Fragment key={i}>
          {g.map(d => {
            const valor = Number(d[campo] || 0)
            // Cubiertas: verde si completa el requerido, ámbar si queda corto
            const color = campo === 'horas_cumplidas' && d.horas_requeridas > 0
              ? (valor >= d.horas_requeridas ? 'text-emerald-700' : valor > 0 ? 'text-amber-700 font-semibold' : 'text-red-600 font-semibold')
              : 'text-gray-700'
            return (
              <td key={d.fecha} className={`${celdaResumen} py-1.5 ${color} ${esLunes(d.fecha) ? 'border-l-2 border-l-gray-300' : ''}`}>
                {valor ? r(valor) : '·'}
              </td>
            )
          })}
          {totalesSemanales && <td className={`${celdaResumen} bg-primary-50 font-semibold text-primary-800`}>{suma(g, campo)}</td>}
        </React.Fragment>
      ))}
      <td className={`${celdaResumen} bg-gray-100 font-semibold`}>{suma(dias, campo)}</td>
      <td className={`${celdaResumen} bg-gray-100`} colSpan={2} />
    </tr>
  )

  return (
    <div className="overflow-auto rounded-xl border border-gray-200 bg-white shadow-sm" style={{ maxHeight: 'calc(100vh - 260px)' }}>
      <table className="border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-20">
          <tr>
            <th className="sticky left-0 z-30 min-w-[220px] border-b border-r border-gray-200 bg-white px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Vigilador
            </th>
            {grupos.map((g, i) => (
              <React.Fragment key={i}>
                {g.map(d => (
                  <th key={d.fecha} className={`border-b border-r border-gray-200 px-1 py-1.5 text-center font-normal
                    ${esFinDeSemana(d.fecha) ? 'bg-gray-100 text-gray-700' : 'bg-white text-gray-600'}
                    ${esLunes(d.fecha) ? 'border-l-2 border-l-gray-300' : ''}`}>
                    <div className="text-[10px] uppercase leading-none">{weekdayLabelES(d.fecha)}</div>
                    <div className="text-sm font-semibold leading-tight text-gray-900">{Number(d.fecha.slice(8))}</div>
                  </th>
                ))}
                {totalesSemanales && (
                  <th className="border-b border-r border-gray-200 bg-primary-50 px-2 text-[11px] font-semibold text-primary-800" title={`Total semana ${i + 1}`}>
                    S{i + 1}
                  </th>
                )}
              </React.Fragment>
            ))}
            <th className="border-b border-r border-gray-200 bg-gray-100 px-2 text-xs font-semibold text-gray-700">Total</th>
            <th className="border-b border-r border-gray-200 bg-gray-100 px-2 text-xs font-semibold text-gray-700" title="Horas diurnas (06 a 21)">Diur.</th>
            <th className="border-b border-r border-gray-200 bg-gray-100 px-2 text-xs font-semibold text-gray-700" title="Horas nocturnas (21 a 06)">Noct.</th>
          </tr>
        </thead>
        <tbody>
          {sinVigiladores && (
            <tr>
              <td colSpan={999} className="px-6 py-10 text-center text-sm text-gray-500">
                Todavía no hay vigiladores en esta planilla.{puedeEditar ? ' Agregá uno para empezar a cargar turnos.' : ''}
              </td>
            </tr>
          )}
          {vigiladores.map(v => {
            const t = totalesVigilador(v.id_vigilador, dias)
            return (
              <tr key={v.id_vigilador} className="group">
                <th scope="row" className="sticky left-0 z-10 border-b border-r border-gray-200 bg-white px-3 py-1 text-left font-normal group-hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-gray-900">{v.apellido}, {v.nombre}</div>
                      <div className="text-[11px] text-gray-500">Legajo {v.legajo}</div>
                    </div>
                    {puedeEditar && (
                      <button
                        type="button"
                        onClick={() => onQuitarVigilador(v)}
                        className="rounded p-1 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                        title="Quitar de la planilla"
                        aria-label={`Quitar a ${v.apellido}, ${v.nombre}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </th>
                {grupos.map((g, i) => (
                  <React.Fragment key={i}>
                    {g.map(d => {
                      const k = clave(v.id_vigilador, d.fecha)
                      return (
                        <Celda
                          key={d.fecha}
                          vigilador={v}
                          dia={d}
                          turnos={turnosPorCelda.get(k) || SIN_TURNOS}
                          novedad={novedadPorCelda.get(k) || null}
                          otros={otrasPlanillas[v.id_vigilador]?.[d.fecha] || SIN_TURNOS}
                          finDeSemana={esFinDeSemana(d.fecha)}
                          inicioSemana={esLunes(d.fecha)}
                          seleccionada={seleccion?.id_vigilador === v.id_vigilador && seleccion.fecha === d.fecha}
                          compacta={compacta}
                          onCelda={onCelda}
                        />
                      )
                    })}
                    {totalesSemanales && (
                      <td className={`${celdaResumen} bg-primary-50 font-semibold text-primary-800`}>{totalesVigilador(v.id_vigilador, g).total || ''}</td>
                    )}
                  </React.Fragment>
                ))}
                <td className={`${celdaResumen} bg-gray-50 font-semibold text-gray-900`}>{t.total}</td>
                <td className={`${celdaResumen} bg-gray-50 text-gray-600`}>{t.diurnas}</td>
                <td className={`${celdaResumen} bg-gray-50 text-gray-600`}>{t.nocturnas}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          {filaTotales('Requeridas', 'horas_requeridas', 'Horas que exige el horario del puesto')}
          {filaTotales('Cubiertas', 'horas_cumplidas', 'Parte del horario requerido con al menos un vigilador')}
          {filaTotales('Horas-hombre', 'horas_totales_trabajadas', 'Suma de las horas de todos los turnos que empiezan ese día')}
        </tfoot>
      </table>
    </div>
  )
}

export default GrillaPlanilla
