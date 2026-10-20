import React, { useMemo, useState } from 'react'
import { Plus, Eye, Table2, Trash2 } from 'lucide-react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { usePlanillasByPuesto, useCreatePlanilla, useDeletePlanilla } from '../hooks/usePlanillas'
import { EstadoPlanillaBadge } from '../components/PlanillaEstado'
import type { Planilla } from '../types'
import { usePermissions } from '../hooks/usePermissions'

const months = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]

const PlanillasScreen: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const location = useLocation()
  const servicioNombreFromNav = (location.state as any)?.servicioNombre as string | undefined
  const puestoNombreFromNav = (location.state as any)?.puestoNombre as string | undefined

  const puestoIdParam = searchParams.get('puestoId')
  const puestoId = useMemo(() => Number(puestoIdParam || 0), [puestoIdParam])

  const { data: planillas = [], isLoading } = usePlanillasByPuesto(puestoId)
  const createPlanilla = useCreatePlanilla()
  const deletePlanilla = useDeletePlanilla()
  const perms = usePermissions()

  const currentYear = new Date().getFullYear()
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1)
  const [anio, setAnio] = useState<number>(currentYear)

  const onCreate = async () => {
    if (!puestoId) return
    await createPlanilla.mutateAsync({ id_puesto: puestoId, mes, anio })
    setIsModalOpen(false)
  }

  const onDelete = async (id: number) => {
    if (!confirm('¿Eliminar la planilla en borrador con todos sus turnos? Esta acción no se puede deshacer.')) return
    await deletePlanilla.mutateAsync(id)
  }

  if (!puestoId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Seleccioná un puesto desde la pantalla de Puestos para ver sus planillas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planillas · {puestoNombreFromNav || `Puesto #${puestoId}`}</h1>
          <p className="mt-1 text-sm text-gray-600">{servicioNombreFromNav ? `${servicioNombreFromNav} · ` : ''}Planillas mensuales del puesto</p>
        </div>
        {perms.canManagePlanillas && (
          <button onClick={() => setIsModalOpen(true)} className="btn-primary mt-4 sm:mt-0">
            <Plus className="h-4 w-4 mr-2" /> Nueva Planilla
          </button>
        )}
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Período</th>
                <th className="table-header">Estado</th>
                <th className="table-header text-right">Horas requeridas</th>
                <th className="table-header text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr><td className="table-cell text-gray-500" colSpan={4}>Cargando…</td></tr>
              ) : planillas.length === 0 ? (
                <tr><td className="table-cell text-gray-500" colSpan={4}>Todavía no hay planillas para este puesto.</td></tr>
              ) : (
                planillas.map((pl: Planilla) => (
                  <tr key={pl.id_planilla} className="hover:bg-gray-50">
                    <td className="table-cell font-medium text-gray-900">{months[(pl.mes || 1) - 1] || pl.mes} {pl.anio}</td>
                    <td className="table-cell"><EstadoPlanillaBadge estado={pl.estado} /></td>
                    <td className="table-cell text-right tabular-nums">{pl.horas_mensuales} h</td>
                    <td className="table-cell">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => navigate(`/planillas/${pl.id_planilla}`, { state: { servicioNombre: servicioNombreFromNav, puestoNombre: puestoNombreFromNav } })}
                          className="btn-secondary inline-flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-2" /> Abrir
                        </button>
                        <button
                          onClick={() => {
                            const sn = encodeURIComponent(servicioNombreFromNav || '');
                            const pn = encodeURIComponent(puestoNombreFromNav || '');
                            navigate(`/planillas/${pl.id_planilla}/excel?sn=${sn}&pn=${pn}`, { state: { servicioNombre: servicioNombreFromNav, puestoNombre: puestoNombreFromNav } })
                          }}
                          className="btn-secondary inline-flex items-center"
                          title="Ver grilla (vista Excel)"
                        >
                          <Table2 className="h-4 w-4 mr-2" /> Grilla
                        </button>
                        {perms.canDeletePlanillas && pl.estado === 'borrador' && (
                          <button
                            onClick={() => onDelete(pl.id_planilla)}
                            className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                            title="Eliminar planilla en borrador"
                          >
                            <Trash2 className="h-4 w-4 mr-1.5" /> Eliminar
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
              <h3 className="text-lg font-medium text-gray-900 mb-4">Nueva Planilla</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
                  <select className="input-field" value={mes} onChange={(e) => setMes(Number(e.target.value))}>
                    {months.map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                  <input type="number" className="input-field" value={anio} onChange={(e) => setAnio(Number(e.target.value))} />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
                  <button type="button" className="btn-primary" onClick={onCreate} disabled={createPlanilla.isPending}>
                    {createPlanilla.isPending ? 'Creando...' : 'Crear'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default PlanillasScreen
