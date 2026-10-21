import React, { useEffect, useMemo, useState } from 'react'
import Modal from '../Modal'
import type { DiaPlanilla, Grilla, Turno } from '../../types'
import { weekdayLabelES } from '../../utils/dateUtils'
import { getWeekdayIndex } from '../../utils/dateUtils'
import { intervaloDesde } from '../../utils/turnoUtils'
import { useTurnoMutations } from '../../hooks/usePlanillaGrilla'
import { esFinDeSemana, esLunes } from './estilos'

type Props = {
  grilla: Grilla
  turno: Turno | null
  onClose: () => void
}

// Copia un turno (misma hora y duración) a otros días del mes para el mismo vigilador
const RepetirTurnoModal: React.FC<Props> = ({ grilla, turno, onClose }) => {
  const { lote } = useTurnoMutations()
  const [elegidos, setElegidos] = useState<Set<string>>(new Set())
  useEffect(() => setElegidos(new Set()), [turno])

  const semanas = useMemo(() => {
    const g: DiaPlanilla[][] = []
    for (const d of grilla.dias) {
      if (!g.length || esLunes(d.fecha)) g.push([])
      g[g.length - 1].push(d)
    }
    return g
  }, [grilla.dias])

  if (!turno) return null
  const yaTiene = (fecha: string) => grilla.turnos.some(t => t.id_vigilador === turno.id_vigilador && t.fecha === fecha && t.hora_inicio === turno.hora_inicio)
  const disponibles = grilla.dias.filter(d => d.fecha !== turno.fecha && !yaTiene(d.fecha))

  const alternar = (fechas: string[], valor?: boolean) => setElegidos(prev => {
    const s = new Set(prev)
    for (const f of fechas) {
      const poner = valor ?? !s.has(f)
      if (poner) s.add(f); else s.delete(f)
    }
    return s
  })
  // Atajos: mismo día de la semana, días hábiles, todos
  const atajos = [
    { texto: `Todos los ${weekdayLabelES(turno.fecha).toLowerCase()}`, fechas: disponibles.filter(d => getWeekdayIndex(d.fecha) === getWeekdayIndex(turno.fecha)) },
    { texto: 'Lunes a viernes', fechas: disponibles.filter(d => !esFinDeSemana(d.fecha)) },
    { texto: 'Todo el mes', fechas: disponibles },
  ]

  const confirmar = () => {
    const turnos = [...elegidos].sort().map(fecha => ({ id_vigilador: turno.id_vigilador, ...intervaloDesde(fecha, turno.hora_inicio, Number(turno.cantidad_horas)) }))
    lote.mutate({ id_planilla: grilla.planilla.id_planilla, turnos }, { onSuccess: onClose })
  }

  return (
    <Modal
      open
      ancho="max-w-2xl"
      title={`Repetir ${turno.hora_inicio}–${turno.hora_fin} (${turno.cantidad_horas} h)`}
      onClose={onClose}
      footer={(
        <>
          <span className="mr-auto text-sm text-gray-500">{elegidos.size} día{elegidos.size === 1 ? '' : 's'} elegido{elegidos.size === 1 ? '' : 's'}</span>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={!elegidos.size || lote.isPending} onClick={confirmar}>
            {lote.isPending ? 'Cargando…' : 'Repetir'}
          </button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {atajos.map(a => (
            <button key={a.texto} type="button" className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
              onClick={() => alternar(a.fechas.map(d => d.fecha), true)}>
              {a.texto}
            </button>
          ))}
          {elegidos.size > 0 && (
            <button type="button" className="rounded-full px-3 py-1 text-xs text-gray-500 hover:bg-gray-100" onClick={() => setElegidos(new Set())}>Limpiar</button>
          )}
        </div>
        <div className="space-y-2">
          {semanas.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-8 text-[11px] text-gray-400">S{i + 1}</span>
              {s.map(d => {
                const habilitado = disponibles.some(x => x.fecha === d.fecha)
                const marcado = elegidos.has(d.fecha)
                return (
                  <button
                    key={d.fecha}
                    type="button"
                    disabled={!habilitado}
                    onClick={() => alternar([d.fecha])}
                    className={`flex h-12 w-12 flex-col items-center justify-center rounded-lg text-xs ring-1 ring-inset transition
                      ${marcado ? 'bg-primary-600 text-white ring-primary-600' : habilitado ? 'bg-white text-gray-700 ring-gray-200 hover:bg-primary-50' : 'bg-gray-50 text-gray-300 ring-gray-100'}`}
                    title={d.fecha === turno.fecha ? 'Día de origen' : !habilitado ? 'Ya tiene ese turno' : undefined}
                  >
                    <span className="text-[10px] uppercase">{weekdayLabelES(d.fecha)}</span>
                    <span className="font-semibold">{Number(d.fecha.slice(8))}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">Los días donde el turno se superpone con otro del vigilador se informan y no se cargan.</p>
      </div>
    </Modal>
  )
}

export default RepetirTurnoModal
