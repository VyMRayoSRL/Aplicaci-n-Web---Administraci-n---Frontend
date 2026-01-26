import React, { useMemo, useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import EditableVigiladorCalendar from '../components/EditableVigiladorCalendar'
import { DiaVigilador, DiaVigiladorEstado, Vigilador } from '../types'
import { vigiladoresService } from '../services/vigiladores'
import { diaVigiladorService } from '../services/diaVigilador'
import { serviciosService } from '../services/servicios'
import { puestosService } from '../services/puestos'
import { planillasService } from '../services/planillas'
import { turnosService } from '../services/turnos'
import Modal from '../components/Modal'

const monthOptions = Array.from({ length: 12 }).map((_, i) => ({ value: i + 1, label: new Date(2000, i, 1).toLocaleString('es-AR', { month: 'long' }) }))

const useVigiladoresBusqueda = (q: { nombre?: string; dni?: string; legajo?: string }) => {
  return useQuery({
    queryKey: ['vigiladores', q],
    queryFn: () => vigiladoresService.getVigiladores({ incluirInactivos: false }).then(list => {
      const term = (q.nombre || '').toLowerCase()
      const dni = (q.dni || '').toLowerCase()
      const leg = (q.legajo || '').toLowerCase()
      return list.filter(v =>
        (!term || `${v.nombre} ${v.apellido}`.toLowerCase().includes(term)) &&
        (!dni || String(v.dni).toLowerCase().includes(dni)) &&
        (!leg || String(v.legajo).toLowerCase().includes(leg))
      )
    }),
    staleTime: 5 * 60 * 1000,
  })
}

const GestionPlanillaVigiladorScreen: React.FC = () => {
  const today = new Date()
  const [mes, setMes] = useState<number>(today.getMonth() + 1)
  const [anio, setAnio] = useState<number>(today.getFullYear())
  const [query, setQuery] = useState<{ nombre?: string; dni?: string; legajo?: string }>({})
  const [selected, setSelected] = useState<Vigilador | null>(null)
  const [turnosByDate, setTurnosByDate] = useState<Record<string, Array<{ hora_inicio: string; hora_fin: string; cantidad_horas?: number; horas_totales?: number }>>>({})

  const { data: vigiladores = [], isLoading: loadingVigs } = useVigiladoresBusqueda(query)

  const { data: dias = [], refetch: refetchDias, isFetching: fetchingDias } = useQuery<{ fecha: string; estado?: string; turnos: any[] }[]>({
    enabled: !!selected,
    queryKey: ['dias-vigilador', selected?.id_vigilador, mes, anio],
    queryFn: async () => {
      if (!selected) return []
      const list: DiaVigilador[] = await diaVigiladorService.listarDiasMes(selected.id_vigilador, mes, anio)
      const enriched = list.map(d => ({ fecha: d.fecha, estado: d.estado, turnos: [] as any[] }))
      return enriched
    },
  })

  const updateEstado = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) => diaVigiladorService.updateDia(id, { estado }),
    onSuccess: () => { toast.success('Estado actualizado'); refetchDias() },
    onError: (e: any) => toast.error(e?.response?.data?.error || e?.message || 'Error al actualizar el estado'),
  })

  const [estadoModal, setEstadoModal] = useState<{ open: boolean; fecha?: string; idDia?: number; estado?: string }>({ open: false })
  const [turnosModal, setTurnosModal] = useState<{ open: boolean; fecha?: string; idDia?: number }>({ open: false })
  const [turnosList, setTurnosList] = useState<any[]>([])
  const [loadingTurnos, setLoadingTurnos] = useState<boolean>(false)

  const handleOpenEstado = async (fecha: string) => {
    if (!selected) return
    try {
      const dia = await diaVigiladorService.getByVigiladorYFecha(selected.id_vigilador, fecha)
      setEstadoModal({ open: true, fecha, idDia: dia?.id_dia_vigilador, estado: dia?.estado || DiaVigiladorEstado.NO_ASIGNADO })
    } catch (e) {
      setEstadoModal({ open: true, fecha, idDia: undefined, estado: DiaVigiladorEstado.NO_ASIGNADO })
    }
  }

  const diasConTurnos = useMemo(() => {
    const byDate = dias.reduce((acc, d) => { acc[d.fecha] = d; return acc }, {} as Record<string, any>)
    const result = Object.keys(byDate).map(k => ({ ...byDate[k], turnos: turnosByDate[k] || [] }))
    return result
  }, [dias, turnosByDate])

  // Selects encadenados para crear turno
  const { data: servicios = [] } = useQuery({
    queryKey: ['servicios'],
    queryFn: () => serviciosService.getServicios(),
    staleTime: 5 * 60 * 1000,
  })
  const [servSel, setServSel] = useState<number | ''>('')
  const { data: puestos = [] } = useQuery({
    enabled: !!servSel,
    queryKey: ['puestos-por-servicio', servSel],
    queryFn: () => puestosService.getPuestosByServicio(Number(servSel)),
  })
  const [puestoSel, setPuestoSel] = useState<number | ''>('')
  const { data: planillas = [] } = useQuery({
    enabled: !!puestoSel,
    queryKey: ['planillas-por-puesto', puestoSel],
    queryFn: () => planillasService.getByPuesto(Number(puestoSel)),
  })
  const [planillaSel, setPlanillaSel] = useState<number | ''>('')
  const { data: diasPlanilla = [] } = useQuery<any[]>({
    enabled: !!planillaSel,
    queryKey: ['dias-por-planilla', planillaSel],
    queryFn: () => planillasService.getDias(Number(planillaSel)),
  })
  const [diaPlanillaSel, setDiaPlanillaSel] = useState<number | ''>('')
  const [horaInicio, setHoraInicio] = useState<string>('08:00')
  const [cantHoras, setCantHoras] = useState<number>(8)

  const loadTurnos = async (idDia: number, fecha: string) => {
    setLoadingTurnos(true)
    try {
      const list = await turnosService.getByDiaVigilador(idDia)
      const norm = Array.isArray(list) ? list : []
      setTurnosList(norm)
      setTurnosByDate(prev => ({
        ...prev,
        [fecha]: norm.map((t: any) => ({
          hora_inicio: t.hora_inicio,
          hora_fin: t.hora_fin,
          cantidad_horas: t.cantidad_horas,
          horas_totales: t.horas_totales,
          puesto_nombre: t.puesto?.nombre,
          id_puesto: t.puesto?.id_puesto,
        }))
      }))
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Error al cargar turnos')
    } finally {
      setLoadingTurnos(false)
    }
  }

  const openTurnos = async (fecha: string) => {
    if (!selected) return
    try {
      const dia = await diaVigiladorService.getByVigiladorYFecha(selected.id_vigilador, fecha)
      if (!dia?.id_dia_vigilador) {
        const created = await diaVigiladorService.createDia({ id_vigilador: selected.id_vigilador, fecha, estado: DiaVigiladorEstado.NO_ASIGNADO })
        setTurnosModal({ open: true, fecha, idDia: created.id_dia_vigilador })
        await loadTurnos(created.id_dia_vigilador, fecha)
      } else {
        setTurnosModal({ open: true, fecha, idDia: dia.id_dia_vigilador })
        await loadTurnos(dia.id_dia_vigilador, fecha)
      }
      setServSel('')
      setPuestoSel('')
      setPlanillaSel('')
      setDiaPlanillaSel('')
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'No se pudo abrir gestión de turnos')
    }
  }

  const createTurno = useMutation({
    mutationFn: (payload: { id_dia_vigilador: number; id_dia_planilla: number; hora_inicio: string; cantidad_horas: number }) => turnosService.createTurno(payload as any),
    onSuccess: async () => {
      toast.success('Turno creado')
      if (turnosModal.idDia && turnosModal.fecha) await loadTurnos(turnosModal.idDia, turnosModal.fecha)
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || e?.message || 'Error al crear turno'),
  })

  const updateTurno = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{ hora_inicio: string; cantidad_horas: number }> }) => turnosService.updateTurno(id, data as any),
    onSuccess: async () => {
      toast.success('Turno actualizado')
      if (turnosModal.idDia && turnosModal.fecha) await loadTurnos(turnosModal.idDia, turnosModal.fecha)
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || e?.message || 'Error al actualizar turno'),
  })

  const deleteTurno = useMutation({
    mutationFn: (id: number) => turnosService.deleteTurno(id),
    onSuccess: async () => {
      toast.success('Turno eliminado')
      if (turnosModal.idDia && turnosModal.fecha) await loadTurnos(turnosModal.idDia, turnosModal.fecha)
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || e?.message || 'Error al eliminar turno'),
  })

  // Auto-preselección "obvia" y no intrusiva
  // 1) Si hay un solo servicio, preseleccionarlo al abrir el modal
  useEffect(() => {
    if (!turnosModal.open) return
    if (!servSel && Array.isArray(servicios) && servicios.length === 1) {
      setServSel(servicios[0].id_servicio)
    }
  }, [turnosModal.open, servicios])

  // 2) Si hay un solo puesto para el servicio, preseleccionarlo
  useEffect(() => {
    if (!turnosModal.open) return
    if (servSel && Array.isArray(puestos) && puestos.length === 1) {
      setPuestoSel(puestos[0].id_puesto)
    }
  }, [turnosModal.open, servSel, puestos])

  // 3) Preseleccionar planilla del mismo mes/año; si no hay, y solo hay una, elegirla
  useEffect(() => {
    if (!turnosModal.open) return
    if (!puestoSel || !Array.isArray(planillas) || planillas.length === 0) return
    const match = planillas.find((pl: any) => Number(pl.mes) === Number(mes) && Number(pl.anio) === Number(anio))
    if (match) {
      if (planillaSel !== match.id_planilla) setPlanillaSel(match.id_planilla)
      return
    }
    if (!planillaSel && planillas.length === 1) {
      setPlanillaSel(planillas[0].id_planilla)
    }
  }, [turnosModal.open, puestoSel, planillas, mes, anio])

  // 4) Preseleccionar día de planilla que coincida con la fecha del modal
  useEffect(() => {
    if (!turnosModal.open) return
    if (!planillaSel || !turnosModal.fecha) return
    if (!Array.isArray(diasPlanilla) || diasPlanilla.length === 0) return
    const day = diasPlanilla.find((d: any) => String(d.fecha) === String(turnosModal.fecha))
    if (day && diaPlanillaSel !== day.id_dia_planilla) setDiaPlanillaSel(day.id_dia_planilla)
  }, [turnosModal.open, planillaSel, diasPlanilla, turnosModal.fecha])

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white shadow rounded p-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input className="border rounded px-2 py-1" placeholder="Buscar por nombre y apellido" value={query.nombre || ''} onChange={e => setQuery(q => ({ ...q, nombre: e.target.value }))} />
          <input className="border rounded px-2 py-1" placeholder="DNI" value={query.dni || ''} onChange={e => setQuery(q => ({ ...q, dni: e.target.value }))} />
          <input className="border rounded px-2 py-1" placeholder="Legajo" value={query.legajo || ''} onChange={e => setQuery(q => ({ ...q, legajo: e.target.value }))} />
          <select className="border rounded px-2 py-1" value={mes} onChange={e => setMes(Number(e.target.value))}>
            {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <input className="border rounded px-2 py-1" type="number" value={anio} onChange={e => setAnio(Math.max(2000, Number(e.target.value)))} />
        </div>
        <div className="mt-2 overflow-x-auto">
          {loadingVigs ? (
            <div className="text-sm text-gray-500">Cargando vigiladores…</div>
          ) : (
            <div className="flex gap-2 overflow-x-auto py-1">
              {vigiladores.map(v => (
                <button
                  key={v.id_vigilador}
                  className={`px-2 py-1 text-sm rounded border ${selected?.id_vigilador === v.id_vigilador ? 'bg-blue-600 text-white' : 'bg-white'}`}
                  onClick={() => setSelected(v)}
                >
                  {v.legajo} · {v.apellido}, {v.nombre}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-semibold">{selected.apellido}, {selected.nombre} · Legajo {selected.legajo}</div>
            <div className="text-sm text-gray-500">{fetchingDias ? 'Actualizando…' : ''}</div>
          </div>
          <div className="text-sm text-gray-500">Click en un día para editar el estado o gestionar turnos</div>
          <EditableVigiladorCalendar
            dias={diasConTurnos}
            mes={mes}
            anio={anio}
            onDayClick={(dateStr) => handleOpenEstado(dateStr)}
          />
          <div className="text-xs text-gray-500">Nota: si hay turnos, el estado debe ser "trabaja" y no puede estar en "franco".</div>
        </div>
      ) : (
        <div className="text-sm text-gray-500">Seleccione un vigilador para ver el calendario</div>
      )}

      <Modal open={estadoModal.open} title={`Editar estado · ${estadoModal.fecha || ''}`} onClose={() => setEstadoModal({ open: false })}
        footer={
          <>
            <button className="px-3 py-1 border rounded" onClick={() => setEstadoModal({ open: false })}>Cancelar</button>
            {estadoModal.fecha && (
              <button className="px-3 py-1 border rounded" onClick={async () => {
                setEstadoModal(s => ({ ...s, open: false }))
                await openTurnos(estadoModal.fecha!)
              }}>Gestionar turnos…</button>
            )}
            <button
              className="px-3 py-1 bg-blue-600 text-white rounded"
              onClick={async () => {
                if (!selected || !estadoModal.fecha) return
                try {
                  const dia = await diaVigiladorService.getByVigiladorYFecha(selected.id_vigilador, estadoModal.fecha)
                  const hasTurnos = (turnosByDate[estadoModal.fecha] || []).length > 0
                  const estadoElegido = estadoModal.estado || DiaVigiladorEstado.NO_ASIGNADO
                  if (hasTurnos && estadoElegido !== DiaVigiladorEstado.TRABAJA) {
                    toast.error('Si hay turnos, el estado debe ser "trabaja"')
                    return
                  }
                  if (dia?.id_dia_vigilador) {
                    await updateEstado.mutateAsync({ id: dia.id_dia_vigilador, estado: estadoElegido })
                  } else {
                    await diaVigiladorService.createDia({ id_vigilador: selected.id_vigilador, fecha: estadoModal.fecha, estado: estadoElegido })
                    toast.success('Día creado')
                    await refetchDias()
                  }
                  setEstadoModal({ open: false })
                } catch (e: any) {
                  toast.error(e?.response?.data?.error || e?.message || 'Error al guardar')
                }
              }}
            >Guardar</button>
          </>
        }
      >
        <div className="space-y-2">
          <select className="border rounded px-2 py-1 w-full" value={estadoModal.estado || ''} onChange={e => setEstadoModal(s => ({ ...s, estado: e.target.value }))}>
            {Object.values(DiaVigiladorEstado).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </Modal>

      {/* Modal turnos */}
      <Modal open={turnosModal.open} title={`Turnos · ${turnosModal.fecha || ''}`} onClose={() => setTurnosModal({ open: false })}
        footer={
          <>
            <button className="px-3 py-1 border rounded" onClick={() => setTurnosModal({ open: false })}>Cerrar</button>
            <button
              className="px-3 py-1 bg-blue-600 text-white rounded"
              onClick={async () => {
                if (!turnosModal.idDia || !diaPlanillaSel) { toast.error('Seleccione servicio/puesto/planilla/día'); return }
                try {
                  await createTurno.mutateAsync({
                    id_dia_vigilador: turnosModal.idDia,
                    id_dia_planilla: Number(diaPlanillaSel),
                    hora_inicio: horaInicio,
                    cantidad_horas: Number(cantHoras),
                  })
                } catch {}
              }}
            >Agregar turno</button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm text-gray-700">Servicio
              <select className="mt-1 w-full border rounded px-2 py-1" value={servSel} onChange={e => { setServSel(e.target.value ? Number(e.target.value) : ''); setPuestoSel(''); setPlanillaSel(''); setDiaPlanillaSel('') }}>
                <option value="">Seleccionar</option>
                {servicios.map((s: any) => <option key={s.id_servicio} value={s.id_servicio}>{s.nombre}</option>)}
              </select>
            </label>
            <label className="text-sm text-gray-700">Puesto
              <select className="mt-1 w-full border rounded px-2 py-1" value={puestoSel} onChange={e => { setPuestoSel(e.target.value ? Number(e.target.value) : ''); setPlanillaSel(''); setDiaPlanillaSel('') }} disabled={!servSel}>
                <option value="">Seleccionar</option>
                {puestos.map((p: any) => <option key={p.id_puesto} value={p.id_puesto}>{p.nombre}</option>)}
              </select>
            </label>
            <label className="text-sm text-gray-700">Planilla
              <select className="mt-1 w-full border rounded px-2 py-1" value={planillaSel} onChange={e => { setPlanillaSel(e.target.value ? Number(e.target.value) : ''); setDiaPlanillaSel('') }} disabled={!puestoSel}>
                <option value="">Seleccionar</option>
                {planillas.map((pl: any) => <option key={pl.id_planilla} value={pl.id_planilla}>{pl.mes}/{pl.anio}</option>)}
              </select>
            </label>
            <label className="text-sm text-gray-700">Día de planilla
              <select className="mt-1 w-full border rounded px-2 py-1" value={diaPlanillaSel} onChange={e => setDiaPlanillaSel(e.target.value ? Number(e.target.value) : '')} disabled={!planillaSel}>
                <option value="">Seleccionar</option>
                {diasPlanilla.map((dp: any) => <option key={dp.id_dia_planilla} value={dp.id_dia_planilla}>{dp.fecha}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm text-gray-700">Hora inicio
              <input type="time" className="mt-1 w-full border rounded px-2 py-1" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
            </label>
            <label className="text-sm text-gray-700">Horas
              <input type="number" step={0.25} min={0.25} className="mt-1 w-full border rounded px-2 py-1" value={cantHoras} onChange={e => setCantHoras(Math.max(0.25, Number(e.target.value)))} />
            </label>
          </div>

          <div>
            <div className="text-sm font-medium mb-1">Turnos del día</div>
            {loadingTurnos ? (
              <div className="text-sm text-gray-500">Cargando…</div>
            ) : turnosList.length === 0 ? (
              <div className="text-sm text-gray-500">Sin turnos</div>
            ) : (
              <ul className="space-y-1">
                {turnosList.map((t: any) => (
                  <li key={t.id_turno} className="flex items-center justify-between text-sm bg-gray-50 border rounded px-2 py-1">
                    <span>{t.hora_inicio} → {t.hora_fin} · {t.cantidad_horas}h{t.puesto?.nombre ? ` · ${t.puesto.nombre}` : ''}</span>
                    <div className="flex gap-2">
                      <button className="px-2 py-0.5 border rounded" onClick={async () => {
                        const ni = prompt('Nueva hora inicio (HH:mm)', t.hora_inicio) || t.hora_inicio
                        const nh = Number(prompt('Horas', String(t.cantidad_horas)) || t.cantidad_horas)
                        try { await updateTurno.mutateAsync({ id: t.id_turno, data: { hora_inicio: ni, cantidad_horas: nh } }) } catch {}
                      }}>Editar</button>
                      <button className="px-2 py-0.5 border rounded text-red-600" onClick={async () => {
                        if (!confirm('¿Eliminar turno?')) return
                        try { await deleteTurno.mutateAsync(t.id_turno) } catch {}
                      }}>Eliminar</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default GestionPlanillaVigiladorScreen


