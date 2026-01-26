import React, { useMemo, useState } from 'react'
import { Plus, Eye, Copy, Trash2 } from 'lucide-react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { usePlanillasByPuesto, useCreatePlanilla, useDeletePlanilla, useDuplicatePlanilla } from '../hooks/usePlanillas'
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
  const duplicatePlanilla = useDuplicatePlanilla()
  const perms = usePermissions()

  const currentYear = new Date().getFullYear()
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1)
  const [anio, setAnio] = useState<number>(currentYear)
  const [dupMesOrigen, setDupMesOrigen] = useState<number>(new Date().getMonth())
  const [dupAnioOrigen, setDupAnioOrigen] = useState<number>(currentYear)
  const [dupMesDestino, setDupMesDestino] = useState<number>(new Date().getMonth() + 1)
  const [dupAnioDestino, setDupAnioDestino] = useState<number>(currentYear)

  const onCreate = async () => {
    if (!puestoId) return
    await createPlanilla.mutateAsync({ id_puesto: puestoId, mes, anio })
    setIsModalOpen(false)
  }

  const onDuplicate = async () => {
    if (!puestoId) return
    await duplicatePlanilla.mutateAsync({
      id_puesto: puestoId,
      mes_origen: dupMesOrigen,
      anio_origen: dupAnioOrigen,
      mes_destino: dupMesDestino,
      anio_destino: dupAnioDestino,
    })
  }

  const onDelete = async (id: number) => {
    if (!confirm('¿Eliminar planilla? Esta acción no se puede deshacer.')) return
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
          <h1 className="text-2xl font-bold text-gray-900">Planillas del Puesto #{puestoId}</h1>
          <p className="mt-2 text-sm text-gray-700">Planillas mensuales creadas para este puesto</p>
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
                <th className="table-header">Mes</th>
                <th className="table-header">Año</th>
                <th className="table-header">Horas</th>
                <th className="table-header">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr><td className="table-cell" colSpan={4}>Cargando...</td></tr>
              ) : (
                planillas.map((pl: any) => (
                  <tr key={pl.id_planilla} className="hover:bg-gray-50">
                    <td className="table-cell">{months[(pl.mes || 1) - 1] || pl.mes}</td>
                    <td className="table-cell">{pl.anio}</td>
                    <td className="table-cell">{pl.horas_mensuales}</td>
                    <td className="table-cell">
                      <div className="flex gap-2">
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
                          Ver grilla
                        </button>
                        {perms.canManagePlanillas && (
                          <>
                            <button
                              onClick={onDuplicate}
                              className="btn-secondary inline-flex items-center"
                              title="Duplicar planilla"
                            >
                              <Copy className="h-4 w-4 mr-2" /> Duplicar
                            </button>
                            <button
                              onClick={() => onDelete(pl.id_planilla)}
                              className="text-red-600 inline-flex items-center"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                            </button>
                          </>
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

      {/* Panel de configuración para duplicar */}
      <div className="card p-4 space-y-3">
        <h3 className="font-semibold">Duplicar planilla</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Mes origen</label>
            <select className="input-field" value={dupMesOrigen} onChange={(e) => setDupMesOrigen(Number(e.target.value))}>
              {months.map((m, idx) => (
                <option key={`o-${m}`} value={idx + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Año origen</label>
            <input type="number" className="input-field" value={dupAnioOrigen} onChange={(e) => setDupAnioOrigen(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Mes destino</label>
            <select className="input-field" value={dupMesDestino} onChange={(e) => setDupMesDestino(Number(e.target.value))}>
              {months.map((m, idx) => (
                <option key={`d-${m}`} value={idx + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Año destino</label>
            <input type="number" className="input-field" value={dupAnioDestino} onChange={(e) => setDupAnioDestino(Number(e.target.value))} />
          </div>
        </div>
        <p className="text-xs text-gray-600">Se copiarán solo los turnos que coincidan con las horas requeridas del día destino, de lo contrario ese día queda sin turnos y se informará advertencia.</p>
      </div>
    </div>
  )
}

export default PlanillasScreen
