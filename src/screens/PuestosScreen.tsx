import React, { useMemo, useState } from 'react'
import { Plus, Search, Calendar, Trash } from 'lucide-react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { usePuestosByServicio, useCreatePuesto, useCreatePuestoConDiasTipo, useDeletePuesto } from '../hooks/usePuestos'
import { usePermissions } from '../hooks/usePermissions'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

type FormData = { nombre: string; cant_horas: number; withDPT?: boolean }

const PuestosScreen: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const location = useLocation()
  const servicioNombreFromNav = (location.state as any)?.servicioNombre as string | undefined

  const servicioIdParam = searchParams.get('servicioId')
  const servicioId = useMemo(() => Number(servicioIdParam || 0), [servicioIdParam])

  const { data: puestos = [], isLoading } = usePuestosByServicio(servicioId)
  const createPuesto = useCreatePuesto()
  const createPuestoConDPT = useCreatePuestoConDiasTipo()
  const deletePuesto = useDeletePuesto()
  const perms = usePermissions()

  const { register, handleSubmit, reset, watch } = useForm<FormData>()
  const withDPT = watch('withDPT')

  const [dptList, setDptList] = useState<any[]>([])
  const [dptErrors, setDptErrors] = useState<string[][]>([])

  const isValidTime = (t?: string | null) => {
    if (!t) return false
    const m = /^(?:[01]\d|2[0-4]):[0-5]\d$/.exec(t)
    if (!m) return false
    // permitir 24:00 solo como cierre
    return true
  }

  const validateDpt = (d: any): string[] => {
    const errs: string[] = []
    if (d.dia_semana === undefined || d.dia_semana === null || isNaN(Number(d.dia_semana)) || Number(d.dia_semana) < 0 || Number(d.dia_semana) > 6) {
      errs.push('El día de semana debe estar entre 0 (Dom) y 6 (Sáb)')
    }
    if (d.fecha_especial) {
      const ok = /^\d{4}-\d{2}-\d{2}$/.test(d.fecha_especial)
      if (!ok) errs.push('La fecha especial debe tener formato AAAA-MM-DD')
    }
    if (d.es_laborable) {
      if (!isValidTime(d.horario_entrada) || !isValidTime(d.horario_salida)) {
        errs.push('Debés ingresar horario de entrada y salida válidos (HH:mm)')
      }
      // si se usa 24:00, solo permitirlo como hora de salida
      if (d.horario_entrada === '24:00') errs.push('24:00 solo puede usarse como hora final')
      if (d.jornada_horario_partido) {
        if (!isValidTime(d.horario_entrada_2) || !isValidTime(d.horario_salida_2)) {
          errs.push('Completá ambos horarios del segundo tramo (HH:mm)')
        }
        if (d.horario_entrada_2 === '24:00') errs.push('24:00 solo puede usarse como hora final')
      }
    }
    return errs
  }

  const addEmptyDpt = () => {
    setDptList((prev) => ([...prev, { dia_semana: 0, es_laborable: true, jornada_horario_partido: false, horario_entrada: '08:00', horario_salida: '16:00', horario_entrada_2: null, horario_salida_2: null }]))
    setDptErrors((prev) => ([...prev, []]))
  }

  const updateDpt = (idx: number, field: string, value: any) => {
    setDptList((prev) => prev.map((d, i) => {
      if (i !== idx) return d
      let next = { ...d, [field]: value }
      if (field === 'es_laborable' && !value) {
        next = {
          ...next,
          jornada_horario_partido: false,
          horario_entrada: null,
          horario_salida: null,
          horario_entrada_2: null,
          horario_salida_2: null,
        }
      }
      if (field === 'jornada_horario_partido' && !value) {
        next = { ...next, horario_entrada_2: null, horario_salida_2: null }
      }
      return next
    }))
    setDptErrors((prev) => prev.map((errs, i) => i === idx ? validateDpt({ ...dptList[idx], [field]: value }) : errs))
  }

  const removeDpt = (idx: number) => {
    setDptList((prev) => prev.filter((_, i) => i !== idx))
    setDptErrors((prev) => prev.filter((_, i) => i !== idx))
  }

  const onSubmit = async (data: FormData) => {
    if (!servicioId) return
    if (data.withDPT && dptList.length > 0) {
      // Validar todos los DPT antes de enviar
      const errs = dptList.map(validateDpt)
      setDptErrors(errs)
      const hasErrors = errs.some(e => e.length > 0)
      if (hasErrors) {
        toast.error('Revisá los días tipo: hay errores por corregir')
        return
      }
      await createPuestoConDPT.mutateAsync({
        datosPuesto: { id_servicio: servicioId, nombre: data.nombre, cant_horas: Number(data.cant_horas) },
        dptList: dptList.map((d) => ({
          dia_semana: d.fecha_especial ? 0 : Number(d.dia_semana),
          fecha_especial: d.fecha_especial || null,
          horario_entrada: d.horario_entrada,
          horario_salida: d.horario_salida,
          horario_entrada_2: d.jornada_horario_partido ? (d.horario_entrada_2 || null) : null,
          horario_salida_2: d.jornada_horario_partido ? (d.horario_salida_2 || null) : null,
          es_laborable: !!d.es_laborable,
          jornada_horario_partido: !!d.jornada_horario_partido,
        }))
      })
    } else {
      await createPuesto.mutateAsync({ id_servicio: servicioId, nombre: data.nombre, cant_horas: Number(data.cant_horas) })
    }
    reset()
    setIsModalOpen(false)
    setDptList([])
    setDptErrors([])
  }

  if (!servicioId) {
  return (
      <div className="text-center py-12">
        <p className="text-gray-600">Seleccioná un servicio desde la pantalla de Servicios para ver sus puestos.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Puestos del Servicio #{servicioId}</h1>
          <p className="mt-2 text-sm text-gray-700">Gestiona los puestos y accede a sus planillas mensuales</p>
        </div>
        {perms.canManagePuestos && (
          <button onClick={() => setIsModalOpen(true)} className="btn-primary mt-4 sm:mt-0">
            <Plus className="h-4 w-4 mr-2" /> Nuevo Puesto
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input type="text" placeholder="Buscar puestos..." className="input-field pl-10" />
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Nombre</th>
                <th className="table-header">Horas Mensuales</th>
                <th className="table-header">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr><td className="table-cell" colSpan={3}>Cargando...</td></tr>
              ) : (
                puestos.map((p: any) => (
                  <tr key={p.id_puesto} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{p.nombre}</td>
                    <td className="table-cell">{p.cant_horas}</td>
                    <td className="table-cell">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/planillas?puestoId=${p.id_puesto}`, { state: { servicioNombre: servicioNombreFromNav, puestoNombre: p.nombre } })}
                          className="btn-secondary inline-flex items-center"
                        >
                          <Calendar className="h-4 w-4 mr-2" /> Ver Planillas
                        </button>
                        <button
                          onClick={() => navigate(`/puestos/configurar-dpt?puestoId=${p.id_puesto}`)}
                          className="btn-secondary"
                        >
                          Configurar días tipo
                        </button>
                        {perms.canManagePuestos && (
                          <button
                            onClick={async () => {
                              const ok = window.confirm(`¿Seguro que querés eliminar el puesto "${p.nombre}"?`)
                              if (!ok) return
                              try {
                                await deletePuesto.mutateAsync(p.id_puesto)
                              } catch (e) {
                                // handled by hook toast
                              }
                            }}
                            className="btn-secondary text-red-600 inline-flex items-center"
                            disabled={deletePuesto.isPending}
                            title="Eliminar puesto"
                          >
                            <Trash className="h-4 w-4 mr-2" /> {deletePuesto.isPending ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Nuevo Puesto</h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input {...register('nombre', { required: true })} className="input-field" placeholder="Nombre del puesto" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Horas mensuales *</label>
                  <input type="number" {...register('cant_horas', { required: true, valueAsNumber: true })} className="input-field" placeholder="Ej: 192" />
                </div>
                <div className="flex items-center space-x-2">
                  <input id="withDPT" type="checkbox" {...register('withDPT')} />
                  <label htmlFor="withDPT" className="text-sm text-gray-700">Configurar días tipo ahora</label>
                </div>

                {/* Editor de DPT condicional */}
                {withDPT && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">Días tipo</h4>
                    <button type="button" className="btn-secondary" onClick={addEmptyDpt}>Agregar día</button>
                  </div>
                  {dptList.length === 0 ? (
                    <p className="text-sm text-gray-500">No hay días configurados.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-auto pr-1">
                      {dptList.map((d, idx) => (
                        <div key={idx} className="border rounded p-3 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Día semana</label>
                              <select value={d.dia_semana} onChange={(e) => updateDpt(idx, 'dia_semana', Number(e.target.value))} className="input-field">
                                <option value={0}>Domingo (0)</option>
                                <option value={1}>Lunes (1)</option>
                                <option value={2}>Martes (2)</option>
                                <option value={3}>Miércoles (3)</option>
                                <option value={4}>Jueves (4)</option>
                                <option value={5}>Viernes (5)</option>
                                <option value={6}>Sábado (6)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Fecha especial (opcional)</label>
                              <input type="date" value={d.fecha_especial || ''} onChange={(e) => updateDpt(idx, 'fecha_especial', e.target.value)} className="input-field" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Desde (00:00–24:00)</label>
                              <input type="text" inputMode="numeric" maxLength={5} placeholder="HH:mm" value={d.horario_entrada || ''} onChange={(e) => updateDpt(idx, 'horario_entrada', e.target.value)} className="input-field" disabled={!d.es_laborable} />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Hasta (00:00–24:00)</label>
                              <input type="text" inputMode="numeric" maxLength={5} placeholder="HH:mm" value={d.horario_salida || ''} onChange={(e) => updateDpt(idx, 'horario_salida', e.target.value)} className="input-field" disabled={!d.es_laborable} />
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <input type="checkbox" checked={!!d.jornada_horario_partido} onChange={(e) => updateDpt(idx, 'jornada_horario_partido', e.target.checked)} disabled={!d.es_laborable} />
                              <span className="text-xs text-gray-700">Jornada partida</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input type="checkbox" checked={!!d.es_laborable} onChange={(e) => updateDpt(idx, 'es_laborable', e.target.checked)} />
                              <span className="text-xs text-gray-700">Laborable</span>
                            </div>
                          </div>
                          {d.es_laborable && d.jornada_horario_partido && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Desde 2 (00:00–24:00)</label>
                                <input type="text" inputMode="numeric" maxLength={5} placeholder="HH:mm" value={d.horario_entrada_2 || ''} onChange={(e) => updateDpt(idx, 'horario_entrada_2', e.target.value)} className="input-field" disabled={!d.es_laborable || !d.jornada_horario_partido} />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Hasta 2 (00:00–24:00)</label>
                                <input type="text" inputMode="numeric" maxLength={5} placeholder="HH:mm" value={d.horario_salida_2 || ''} onChange={(e) => updateDpt(idx, 'horario_salida_2', e.target.value)} className="input-field" disabled={!d.es_laborable || !d.jornada_horario_partido} />
                              </div>
                            </div>
                          )}
                          {dptErrors[idx] && dptErrors[idx].length > 0 && (
                            <ul className="text-xs text-red-600 list-disc pl-5">
                              {dptErrors[idx].map((e, i) => (<li key={i}>{e}</li>))}
                            </ul>
                          )}
                          <div className="flex justify-end">
                            <button type="button" className="text-red-600 text-sm" onClick={() => removeDpt(idx)}>Quitar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )}
                <div className="flex justify-end space-x-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
                  <button type="submit" className="btn-primary" disabled={createPuesto.isPending || createPuestoConDPT.isPending}>
                    {(createPuesto.isPending || createPuestoConDPT.isPending) ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PuestosScreen
