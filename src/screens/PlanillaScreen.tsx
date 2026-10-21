import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlignJustify, ChevronLeft, Download, List, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useGrilla, useVigiladoresPlanilla } from '../hooks/usePlanillaGrilla'
import { usePermissions } from '../hooks/usePermissions'
import { planillasService } from '../services/planillas'
import { getErrorMessage } from '../services/api'
import { exportPlanillaExcel } from '../utils/exportPlanillaExcel'
import type { DiaPlanilla, Turno, Vigilador } from '../types'
import { EstadoPlanillaControl } from '../components/PlanillaEstado'
import GrillaPlanilla, { type CeldaSeleccionada, type Densidad } from '../components/planilla/GrillaPlanilla'
import PanelDia from '../components/planilla/PanelDia'
import RepetirTurnoModal from '../components/planilla/RepetirTurnoModal'
import AgregarVigiladorModal from '../components/planilla/AgregarVigiladorModal'
import { MESES, NOVEDADES, horas } from '../components/planilla/estilos'

// Preferencias de vista por usuario y navegador (si no hay storage, valores por defecto)
function usePreferencia<T extends string>(clave: string, porDefecto: T): [T, (v: T) => void] {
  const [valor, setValor] = useState<T>(() => {
    try { return (localStorage.getItem(clave) as T) || porDefecto } catch { return porDefecto }
  })
  const guardar = (v: T) => { setValor(v); try { localStorage.setItem(clave, v) } catch { /* sin storage */ } }
  return [valor, guardar]
}

const Indicador: React.FC<{ titulo: string; valor: string; detalle?: string; tono?: 'normal' | 'bien' | 'alerta' }> = ({ titulo, valor, detalle, tono = 'normal' }) => (
  <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
    <div className="text-xs font-medium text-gray-500">{titulo}</div>
    <div className={`text-xl font-semibold tabular-nums ${tono === 'bien' ? 'text-emerald-700' : tono === 'alerta' ? 'text-amber-700' : 'text-gray-900'}`}>{valor}</div>
    {detalle && <div className="text-xs text-gray-500">{detalle}</div>}
  </div>
)

const PlanillaScreen: React.FC = () => {
  const idPlanilla = Number(useParams().id || 0)
  const { data: grilla, isLoading, error } = useGrilla(idPlanilla)
  const perms = usePermissions()
  const { quitar } = useVigiladoresPlanilla(idPlanilla)

  const [densidad, setDensidad] = usePreferencia<Densidad>('planilla_densidad', 'normal')
  const [semanales, setSemanales] = usePreferencia<'si' | 'no'>('planilla_totales_semanales', 'si')
  const [seleccion, setSeleccion] = useState<CeldaSeleccionada>(null)
  const [repetir, setRepetir] = useState<Turno | null>(null)
  const [agregarAbierto, setAgregarAbierto] = useState(false)

  const onCelda = useCallback((v: Vigilador, d: DiaPlanilla) => setSeleccion({ id_vigilador: v.id_vigilador, fecha: d.fecha }), [])
  const cerrarPanel = useCallback(() => setSeleccion(null), [])

  useEffect(() => {
    if (grilla) document.title = `${grilla.planilla.puesto_nombre} · ${MESES[grilla.planilla.mes - 1]} ${grilla.planilla.anio} — Rayo`
    return () => { document.title = 'Rayo' }
  }, [grilla])

  const vigiladorSel = useMemo(() => grilla?.vigiladores.find(v => v.id_vigilador === seleccion?.id_vigilador) || null, [grilla, seleccion])
  const diaSel = useMemo(() => grilla?.dias.find(d => d.fecha === seleccion?.fecha) || null, [grilla, seleccion])

  if (!idPlanilla) return <p className="p-6 text-gray-600">Planilla no especificada.</p>
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[0, 1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200" />)}</div>
        <div className="h-96 animate-pulse rounded-xl bg-gray-200" />
      </div>
    )
  }
  if (error || !grilla) return <p className="p-6 text-red-600">{getErrorMessage(error, 'No se pudo cargar la planilla')}</p>

  const { planilla, permisos, totales } = grilla
  const puedeEditar = permisos.editar
  // Novedades: además de quien edita la planilla, admin y contabilidad (el back valida igual)
  const puedeNovedades = permisos.editar || perms.canClosePlanillas
  const cobertura = totales.requeridas ? Math.round((totales.cumplidas / totales.requeridas) * 100) : 100
  const difContrato = Math.round((totales.requeridas - totales.contratadas) * 100) / 100

  const quitarVigilador = async (v: Vigilador) => {
    try {
      const n = await planillasService.contarTurnosVigilador(idPlanilla, v.id_vigilador)
      const detalle = n > 0 ? ` Se van a borrar sus ${n} turno${n === 1 ? '' : 's'} de esta planilla.` : ''
      if (window.confirm(`¿Quitar a ${v.apellido}, ${v.nombre} de la planilla?${detalle}`)) quitar.mutate(v.id_vigilador)
    } catch (e) {
      toast.error(getErrorMessage(e, 'No se pudieron consultar sus turnos'))
    }
  }

  const exportar = async () => {
    const grid = new Map<string, Turno[]>()
    for (const t of grilla.turnos) {
      const k = `${t.id_dia_planilla}:${t.id_vigilador}`
      grid.set(k, [...(grid.get(k) || []), t])
    }
    try {
      await exportPlanillaExcel({
        dias: grilla.dias, vigiladores: grilla.vigiladores, grid,
        titulo: `${planilla.servicio_nombre} - ${planilla.puesto_nombre} - ${MESES[planilla.mes - 1]} ${planilla.anio}`,
      })
    } catch {
      toast.error('No se pudo exportar a Excel')
    }
  }

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={`/planillas?puestoId=${planilla.id_puesto}`} state={{ servicioNombre: planilla.servicio_nombre, puestoNombre: planilla.puesto_nombre }}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ChevronLeft className="h-4 w-4" /> {planilla.servicio_nombre} · {planilla.puesto_nombre}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{MESES[planilla.mes - 1]} {planilla.anio}</h1>
        </div>
        <EstadoPlanillaControl planilla={planilla} permisos={permisos} />
      </div>

      {planilla.estado === 'cerrada' && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
          Planilla cerrada: se puede consultar pero no modificar. Admin o contabilidad pueden reabrirla.
        </div>
      )}

      {/* Indicadores del mes */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Indicador titulo="Horas requeridas" valor={horas(totales.requeridas)} detalle="según el horario del puesto" />
        <Indicador titulo="Cubiertas" valor={`${cobertura}%`} detalle={`${horas(totales.cumplidas)} de ${horas(totales.requeridas)}`}
          tono={cobertura >= 100 ? 'bien' : 'alerta'} />
        <Indicador titulo="Horas-hombre" valor={horas(totales.trabajadas)} detalle="suma de todos los turnos" />
        <Indicador titulo="Contratadas con el cliente" valor={horas(totales.contratadas)}
          detalle={difContrato === 0 ? 'coincide con el horario' : `el horario ${difContrato > 0 ? 'pide' : 'deja'} ${horas(Math.abs(difContrato))} ${difContrato > 0 ? 'de más' : 'sin cubrir'}`}
          tono={difContrato === 0 ? 'normal' : 'alerta'} />
      </div>

      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center gap-2">
        {puedeEditar && (
          <button className="btn-primary inline-flex items-center px-3 py-1.5 text-sm" onClick={() => setAgregarAbierto(true)}>
            <UserPlus className="mr-1.5 h-4 w-4" /> Agregar vigilador
          </button>
        )}
        <button className="btn-secondary inline-flex items-center px-3 py-1.5 text-sm" onClick={exportar}>
          <Download className="mr-1.5 h-4 w-4" /> Excel
        </button>
        <div className="ml-auto flex items-center gap-3 text-sm text-gray-600">
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" className="rounded border-gray-300" checked={semanales === 'si'} onChange={e => setSemanales(e.target.checked ? 'si' : 'no')} />
            Totales por semana
          </label>
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-300">
            <button type="button" title="Vista normal" onClick={() => setDensidad('normal')}
              className={`px-2 py-1 ${densidad === 'normal' ? 'bg-gray-100 text-gray-900' : 'bg-white text-gray-500'}`}><List className="h-4 w-4" /></button>
            <button type="button" title="Vista compacta" onClick={() => setDensidad('compacta')}
              className={`border-l border-gray-300 px-2 py-1 ${densidad === 'compacta' ? 'bg-gray-100 text-gray-900' : 'bg-white text-gray-500'}`}><AlignJustify className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <GrillaPlanilla
        grilla={grilla}
        densidad={densidad}
        totalesSemanales={semanales === 'si'}
        puedeEditar={puedeEditar}
        seleccion={seleccion}
        onCelda={onCelda}
        onQuitarVigilador={quitarVigilador}
      />

      {/* Referencias */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-100 ring-1 ring-amber-200" /> Mañana</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-blue-100 ring-1 ring-blue-200" /> Tarde</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-indigo-200 ring-1 ring-indigo-300" /> Noche</span>
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Trabaja en otro servicio ese día</span>
        {Object.entries(NOVEDADES).map(([k, n]) => <span key={k}>{n.corto} = {n.texto}</span>)}
        <span>! = falta el certificado</span>
      </div>

      {vigiladorSel && diaSel && (
        <PanelDia
          grilla={grilla}
          vigilador={vigiladorSel}
          dia={diaSel}
          puedeEditarTurnos={puedeEditar}
          puedeEditarNovedades={puedeNovedades}
          onRepetir={setRepetir}
          onClose={cerrarPanel}
        />
      )}
      <RepetirTurnoModal grilla={grilla} turno={repetir} onClose={() => setRepetir(null)} />
      <AgregarVigiladorModal idPlanilla={idPlanilla} asignados={grilla.vigiladores} open={agregarAbierto} onClose={() => setAgregarAbierto(false)} />
    </div>
  )
}

export default PlanillaScreen
