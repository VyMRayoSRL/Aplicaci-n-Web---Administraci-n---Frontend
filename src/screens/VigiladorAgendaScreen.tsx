import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, ExternalLink, Search, X } from 'lucide-react'
import { useVigiladores } from '../hooks/useVigiladores'
import { usePermissions } from '../hooks/usePermissions'
import { turnosService } from '../services/turnos'
import { novedadesService } from '../services/novedades'
import { getWeekdayIndex } from '../utils/dateUtils'
import type { Novedad, Turno, Vigilador } from '../types'
import NovedadEditor from '../components/planilla/NovedadEditor'
import { MESES, NovedadChip, claseTurno, fechaLarga, horas } from '../components/planilla/estilos'

const pad = (n: number) => String(n).padStart(2, '0')
const diasDelMes = (anio: number, mes: number) => Array.from({ length: new Date(anio, mes, 0).getDate() }, (_, i) => `${anio}-${pad(mes)}-${pad(i + 1)}`)

// Agenda mensual de un vigilador en todos los servicios: turnos y novedades
const VigiladorAgendaScreen: React.FC = () => {
  const params = useParams()
  const navigate = useNavigate()
  const perms = usePermissions()
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [filtro, setFiltro] = useState('')
  const [fechaSel, setFechaSel] = useState<string | null>(null)

  const { data: vigiladores = [] } = useVigiladores()
  const idVigilador = Number(params.id || 0)
  const vigilador = (vigiladores as Vigilador[]).find(v => v.id_vigilador === idVigilador) || null

  const dias = useMemo(() => diasDelMes(anio, mes), [anio, mes])
  const desde = dias[0]
  const hasta = dias[dias.length - 1]
  const { data, isFetching } = useQuery({
    queryKey: ['agenda', idVigilador, anio, mes],
    enabled: !!idVigilador,
    queryFn: async () => {
      const [turnos, novedades] = await Promise.all([
        turnosService.getByVigilador(idVigilador, desde, hasta),
        novedadesService.listar([idVigilador], desde, hasta),
      ])
      return { turnos, novedades }
    },
  })
  const turnos = (data?.turnos || []).filter(t => t.fecha >= desde && t.fecha <= hasta)
  const novedades = data?.novedades || []

  useEffect(() => setFechaSel(null), [idVigilador, mes, anio])

  const turnosDe = (fecha: string): Turno[] => turnos.filter(t => t.fecha === fecha)
  const novedadDe = (fecha: string): Novedad | null => novedades.find(n => n.desde <= fecha && fecha <= n.hasta) || null

  const cambiarMes = (delta: number) => {
    const m = mes + delta
    if (m < 1) { setMes(12); setAnio(anio - 1) } else if (m > 12) { setMes(1); setAnio(anio + 1) } else setMes(m)
  }

  const candidatos = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    if (!q) return []
    return (vigiladores as Vigilador[]).filter(v => String(v.legajo).includes(q) || `${v.apellido} ${v.nombre}`.toLowerCase().includes(q)).slice(0, 8)
  }, [vigiladores, filtro])

  // Calendario de lunes a domingo: huecos al principio para alinear el primer día
  const huecos = (getWeekdayIndex(desde) + 6) % 7
  const totalHoras = turnos.reduce((a, t) => a + Number(t.cantidad_horas), 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda del vigilador</h1>
          <p className="text-sm text-gray-600">Turnos en todos los servicios y novedades del mes.</p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input className="input-field pl-9" placeholder="Buscar por legajo o apellido" value={filtro} onChange={e => setFiltro(e.target.value)} />
          {candidatos.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
              {candidatos.map(v => (
                <li key={v.id_vigilador}>
                  <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    onClick={() => { setFiltro(''); navigate(`/vigiladores/${v.id_vigilador}/agenda`) }}>
                    <span className="font-medium">{v.apellido}, {v.nombre}</span> <span className="text-gray-500">· Legajo {v.legajo}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {!idVigilador ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center text-gray-500">
          Buscá un vigilador para ver su agenda.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div>
              <div className="text-lg font-semibold text-gray-900">{vigilador ? `${vigilador.apellido}, ${vigilador.nombre}` : `Vigilador #${idVigilador}`}</div>
              {vigilador && <div className="text-xs text-gray-500">Legajo {vigilador.legajo}</div>}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="rounded-lg p-1.5 hover:bg-gray-100" onClick={() => cambiarMes(-1)} aria-label="Mes anterior"><ChevronLeft className="h-5 w-5" /></button>
              <span className="w-36 text-center font-medium">{MESES[mes - 1]} {anio}</span>
              <button type="button" className="rounded-lg p-1.5 hover:bg-gray-100" onClick={() => cambiarMes(1)} aria-label="Mes siguiente"><ChevronRight className="h-5 w-5" /></button>
            </div>
            <div className="flex gap-6 text-sm">
              <div><div className="text-xs text-gray-500">Horas planificadas</div><div className="font-semibold tabular-nums">{horas(totalHoras)}</div></div>
              <div><div className="text-xs text-gray-500">Días con turnos</div><div className="font-semibold tabular-nums">{new Set(turnos.map(t => t.fecha)).size}</div></div>
              <div><div className="text-xs text-gray-500">Novedades</div><div className="font-semibold tabular-nums">{novedades.length}</div></div>
            </div>
          </div>

          <div className={`grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200 ${isFetching ? 'opacity-70' : ''}`}>
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
              <div key={d} className="bg-gray-50 px-2 py-1.5 text-center text-xs font-semibold uppercase text-gray-500">{d}</div>
            ))}
            {Array.from({ length: huecos }).map((_, i) => <div key={`h${i}`} className="bg-gray-50" />)}
            {dias.map(f => {
              const ts = turnosDe(f)
              const n = novedadDe(f)
              return (
                <button key={f} type="button" onClick={() => setFechaSel(f)}
                  className={`min-h-[96px] bg-white p-1.5 text-left align-top transition hover:bg-primary-50 ${fechaSel === f ? 'outline outline-2 -outline-offset-2 outline-primary-500' : ''}`}>
                  <div className="mb-1 text-sm font-semibold text-gray-700">{Number(f.slice(8))}</div>
                  <div className="space-y-0.5">
                    {n && <NovedadChip novedad={n} />}
                    {ts.map(t => (
                      <div key={t.id_turno} className={`truncate rounded px-1 py-0.5 text-[11px] ring-1 ring-inset ${claseTurno(t)}`} title={`${t.servicio_nombre} · ${t.puesto_nombre}`}>
                        <span className="font-medium tabular-nums">{t.hora_inicio}–{t.hora_fin}</span> {t.puesto_nombre}
                      </div>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {fechaSel && idVigilador > 0 && (
        <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl">
          <header className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{fechaLarga(fechaSel)}</div>
              <h2 className="text-lg font-semibold text-gray-900">{vigilador ? `${vigilador.apellido}, ${vigilador.nombre}` : ''}</h2>
            </div>
            <button type="button" className="rounded p-1 text-gray-400 hover:bg-gray-100" onClick={() => setFechaSel(null)} aria-label="Cerrar"><X className="h-5 w-5" /></button>
          </header>
          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">Turnos</h3>
              {turnosDe(fechaSel).length === 0 && <p className="text-sm text-gray-500">Sin turnos este día.</p>}
              {turnosDe(fechaSel).map(t => (
                <div key={t.id_turno} className={`flex items-center justify-between rounded-lg px-3 py-2 ring-1 ring-inset ${claseTurno(t)}`}>
                  <div>
                    <div className="text-sm font-medium tabular-nums">{t.hora_inicio}–{t.hora_fin} · {t.cantidad_horas} h</div>
                    <div className="text-xs opacity-80">{t.servicio_nombre} · {t.puesto_nombre}</div>
                  </div>
                  <Link to={`/planillas/${t.id_planilla}`} className="inline-flex items-center gap-1 text-xs font-medium hover:underline">
                    Planilla <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))}
              <p className="text-[11px] text-gray-500">Los turnos se cargan y editan desde la planilla de cada puesto.</p>
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">Novedad</h3>
              <NovedadEditor idVigilador={idVigilador} fecha={fechaSel} novedad={novedadDe(fechaSel)} puedeEditar={perms.canManagePlanillas} />
            </section>
          </div>
        </aside>
      )}
    </div>
  )
}

export default VigiladorAgendaScreen
