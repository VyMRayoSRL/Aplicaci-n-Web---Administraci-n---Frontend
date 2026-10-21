import React, { useEffect, useState } from 'react'
import { Copy, Moon, Trash2, X } from 'lucide-react'
import type { DiaPlanilla, Grilla, Novedad, Turno, Vigilador } from '../../types'
import { useTurnoMutations } from '../../hooks/usePlanillaGrilla'
import { cruzaMedianoche, intervaloDesde } from '../../utils/turnoUtils'
import NovedadEditor from './NovedadEditor'
import { claseTurno, fechaLarga } from './estilos'

type Props = {
  grilla: Grilla
  vigilador: Vigilador
  dia: DiaPlanilla
  puedeEditarTurnos: boolean
  puedeEditarNovedades: boolean
  onRepetir: (turno: Turno) => void
  onClose: () => void
}

const HORA = /^\d{2}:\d{2}$/
const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : '')

// Duración en horas entre dos horas del día (si la salida es menor, termina al día siguiente)
function duracion(entrada: string, salida: string) {
  const a = Number(entrada.slice(0, 2)) * 60 + Number(entrada.slice(3, 5))
  let b = Number(salida.slice(0, 2)) * 60 + Number(salida.slice(3, 5))
  if (b <= a) b += 24 * 60
  return (b - a) / 60
}

const FilaTurno: React.FC<{ turno: Turno; puedeEditar: boolean; onRepetir: () => void }> = ({ turno, puedeEditar, onRepetir }) => {
  const { editar, borrar } = useTurnoMutations()
  const [hora, setHora] = useState(turno.hora_inicio)
  const [cant, setCant] = useState(String(turno.cantidad_horas))
  useEffect(() => { setHora(turno.hora_inicio); setCant(String(turno.cantidad_horas)) }, [turno])

  const guardar = () => {
    const h = Number(cant)
    if (!HORA.test(hora) || !(h > 0) || (hora === turno.hora_inicio && h === Number(turno.cantidad_horas))) return
    editar.mutate({ id: turno.id_turno, data: intervaloDesde(turno.fecha, hora, h) })
  }

  return (
    <li className={`rounded-lg px-3 py-2 ring-1 ring-inset ${claseTurno(turno)}`}>
      <div className="flex items-center gap-2">
        {puedeEditar ? (
          <>
            <input type="time" step={1800} aria-label="Hora de inicio" className="w-[6.5rem] rounded border border-gray-300 bg-white px-2 py-1 text-sm"
              value={hora} onChange={e => setHora(e.target.value)} onBlur={guardar} />
            <input type="number" step={0.5} min={0.5} max={24} aria-label="Horas" className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-sm"
              value={cant} onChange={e => setCant(e.target.value)} onBlur={guardar} />
            <span className="text-sm">h → {turno.hora_fin}</span>
          </>
        ) : (
          <span className="text-sm font-medium">{turno.hora_inicio} → {turno.hora_fin} · {turno.cantidad_horas} h</span>
        )}
        {cruzaMedianoche(turno) && <Moon className="h-3.5 w-3.5 opacity-70" aria-label="Termina al día siguiente" />}
        {puedeEditar && (
          <div className="ml-auto flex gap-1">
            <button type="button" className="rounded p-1 hover:bg-white/70" title="Repetir en otros días" onClick={onRepetir}>
              <Copy className="h-4 w-4" />
            </button>
            <button type="button" className="rounded p-1 hover:bg-white/70 hover:text-red-600" title="Eliminar turno"
              onClick={() => { if (window.confirm(`¿Eliminar el turno ${turno.hora_inicio}–${turno.hora_fin}?`)) borrar.mutate(turno.id_turno) }}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <div className="mt-1 text-[11px] opacity-75">
        {turno.horas_diurnas} h diurnas · {turno.horas_nocturnas} h nocturnas
      </div>
    </li>
  )
}

const PanelDia: React.FC<Props> = ({ grilla, vigilador, dia, puedeEditarTurnos, puedeEditarNovedades, onRepetir, onClose }) => {
  const { crear } = useTurnoMutations()
  const [hora, setHora] = useState('')
  const [cant, setCant] = useState('')

  const turnos = grilla.turnos.filter(t => t.id_vigilador === vigilador.id_vigilador && t.fecha === dia.fecha)
  const otros = grilla.otrasPlanillas[vigilador.id_vigilador]?.[dia.fecha] || []
  const novedad: Novedad | null = grilla.novedades.find(n => n.id_vigilador === vigilador.id_vigilador && n.desde <= dia.fecha && dia.fecha <= n.hasta) || null

  // Atajos con el horario requerido del puesto ese día
  const tramos = [[dia.horario_entrada, dia.horario_salida], [dia.jornada_partida ? dia.horario_entrada_2 : null, dia.horario_salida_2]]
    .filter(([a, b]) => a && b)
    .map(([a, b]) => ({ hora: hhmm(a), horas: duracion(hhmm(a), hhmm(b)), texto: `${hhmm(a)}–${hhmm(b)}` }))

  useEffect(() => { setHora(''); setCant('') }, [vigilador.id_vigilador, dia.fecha])
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  const cargar = (h: string, horas: number) => {
    crear.mutate(
      { id_planilla: grilla.planilla.id_planilla, id_vigilador: vigilador.id_vigilador, ...intervaloDesde(dia.fecha, h, horas) },
      { onSuccess: () => { setHora(''); setCant('') } },
    )
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl" aria-label="Detalle del día">
      <header className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{fechaLarga(dia.fecha)}</div>
          <h2 className="text-lg font-semibold text-gray-900">{vigilador.apellido}, {vigilador.nombre}</h2>
          <div className="text-xs text-gray-500">
            Legajo {vigilador.legajo} · {dia.es_laborable && tramos.length ? `Horario del puesto: ${tramos.map(t => t.texto).join(' y ')}` : 'Día no laborable para el puesto'}
          </div>
        </div>
        <button type="button" className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" onClick={onClose} aria-label="Cerrar">
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">Turnos</h3>
          {turnos.length === 0
            ? <p className="text-sm text-gray-500">Sin turnos este día.</p>
            : <ul className="space-y-2">{turnos.map(t => <FilaTurno key={t.id_turno} turno={t} puedeEditar={puedeEditarTurnos} onRepetir={() => onRepetir(t)} />)}</ul>}

          {puedeEditarTurnos && (
            <div className="space-y-2 rounded-lg bg-gray-50 p-3">
              {tramos.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-500">Horario del puesto:</span>
                  {tramos.map(t => (
                    <button key={t.texto} type="button" disabled={crear.isPending}
                      className="rounded-full bg-white px-3 py-1 text-xs font-medium text-primary-700 ring-1 ring-primary-200 hover:bg-primary-50"
                      onClick={() => cargar(t.hora, t.horas)}>
                      + {t.texto}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <label className="text-xs text-gray-600">Entrada
                  <input type="time" step={1800} className="input-field mt-0.5 py-1.5 text-sm" value={hora} onChange={e => setHora(e.target.value)} />
                </label>
                <label className="text-xs text-gray-600">Horas
                  <input type="number" step={0.5} min={0.5} max={24} placeholder="8" className="input-field mt-0.5 w-20 py-1.5 text-sm" value={cant} onChange={e => setCant(e.target.value)} />
                </label>
                <button type="button" className="btn-primary px-3 py-1.5 text-sm" disabled={crear.isPending || !HORA.test(hora) || !(Number(cant) > 0)}
                  onClick={() => cargar(hora, Number(cant))}>
                  Agregar
                </button>
              </div>
              <p className="text-[11px] text-gray-500">Si termina después de medianoche, sigue al día siguiente y se liquida en este día.</p>
            </div>
          )}
        </section>

        {otros.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">En otros servicios ese día</h3>
            <ul className="space-y-1">
              {otros.map(t => (
                <li key={t.id_turno} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-900">
                  <span>{t.servicio_nombre} · {t.puesto_nombre}</span>
                  <span className="tabular-nums">{t.hora_inicio}–{t.hora_fin}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">Novedad</h3>
          <NovedadEditor idVigilador={vigilador.id_vigilador} fecha={dia.fecha} novedad={novedad} puedeEditar={puedeEditarNovedades} />
        </section>
      </div>
    </aside>
  )
}

export default PanelDia
