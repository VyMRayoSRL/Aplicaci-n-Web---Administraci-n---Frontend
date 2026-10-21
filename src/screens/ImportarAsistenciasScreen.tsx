import React, { useMemo, useState } from 'react'
import { useImportarAsistencias } from '../hooks/useContabilidad'
import { ComparacionAsistencia, ResumenMensual, AsistenciaEstado, ResumenPorPuesto, ResumenPorServicio } from '../types'
import { useServicios } from '../hooks/useServicios'
// import { usePuestos } from '../hooks/usePuestos'

const ImportarAsistenciasScreen: React.FC = () => {
  const [file, setFile] = useState<File | null>(null)
  const [tolerancia, setTolerancia] = useState<number>(15)
  const [asistencias, setAsistencias] = useState<ComparacionAsistencia[] | null>(null)
  const [resumen, setResumen] = useState<ResumenMensual[] | null>(null)
  const [resumenPuesto, setResumenPuesto] = useState<ResumenPorPuesto[] | null>(null)
  const [resumenServicio, setResumenServicio] = useState<ResumenPorServicio[] | null>(null)
  const [filtros, setFiltros] = useState<{ id_servicio?: number; id_planilla?: number }>({})
  const { data: servicios = [] } = useServicios()
  // const { data: puestos = [] } = usePuestos()
  const [catalogos, setCatalogos] = useState<{ puestos?: Record<number, { nombre: string }>; servicios?: Record<number, { nombre: string }> } | null>(null)

  const importar = useImportarAsistencias()

  const resumenTotales = useMemo(() => {
    if (!resumen) return null
    return resumen.reduce(
      (acc, r) => ({
        horas_diurnas: acc.horas_diurnas + r.horas_diurnas,
        horas_nocturnas: acc.horas_nocturnas + r.horas_nocturnas,
        horas_totales: acc.horas_totales + r.horas_totales,
        dias_trabajado: acc.dias_trabajado + r.dias_trabajado,
        ausencias: acc.ausencias + r.ausencias,
      }),
      { horas_diurnas: 0, horas_nocturnas: 0, horas_totales: 0, dias_trabajado: 0, ausencias: 0 }
    )
  }, [resumen])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    const { asistencias, resumen, resumen_puesto, resumen_servicio, catalogos } = await importar.mutateAsync({ file, toleranciaMin: tolerancia, filtros, anio: undefined })
    setAsistencias(asistencias)
    setResumen(resumen)
    setResumenPuesto(resumen_puesto || null)
    setResumenServicio(resumen_servicio || null)
    setCatalogos(catalogos || null)
  }

  const reset = () => {
    setFile(null)
    setAsistencias(null)
    setResumen(null)
    setResumenPuesto(null)
    setResumenServicio(null)
    setCatalogos(null)
  }

  const badge = (estado: string) => {
    const base = 'px-2 py-0.5 rounded text-xs font-medium '
    switch (String(estado)) {
      case AsistenciaEstado.OK: return base + 'bg-green-100 text-green-800'
      case AsistenciaEstado.AUSENCIA_JUSTIFICADA: return base + 'bg-emerald-100 text-emerald-800'
      case AsistenciaEstado.NOVEDAD_SIN_TURNOS: return base + 'bg-sky-100 text-sky-800'
      case AsistenciaEstado.CERTIFICADO_PENDIENTE: return base + 'bg-amber-100 text-amber-800'
      case AsistenciaEstado.TURNOS_SIN_ASISTENCIA: return base + 'bg-red-100 text-red-800'
      case AsistenciaEstado.DESVIO: return base + 'bg-yellow-100 text-yellow-800'
      case AsistenciaEstado.SIN_PLANIFICACION: return base + 'bg-orange-100 text-orange-800'
      case AsistenciaEstado.VIGILADOR_DESCONOCIDO: return base + 'bg-red-100 text-red-800'
      default: return base + 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Importar Asistencias</h3>
        <p className="mt-1 text-sm text-gray-500">Subí el Excel y compará con la planificación.</p>
      </div>

      <form onSubmit={onSubmit} className="bg-white shadow rounded p-4 space-y-4">
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".xls,.xlsx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-700"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Servicio</label>
            <select
              value={filtros.id_servicio ?? ''}
              onChange={(e) => setFiltros((f) => ({ ...f, id_servicio: e.target.value ? Number(e.target.value) : undefined }))}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">Todos</option>
              {servicios.map(s => (
                <option key={s.id_servicio} value={s.id_servicio}>{s.nombre}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Tolerancia (min)</label>
            <input
              type="number"
              min={0}
              value={tolerancia}
              onChange={(e) => setTolerancia(Number(e.target.value))}
              className="w-24 border rounded px-2 py-1 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={!file || importar.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {importar.isPending ? 'Procesando...' : 'Importar'}
          </button>
          {(asistencias || resumen) && (
            <button type="button" onClick={reset} className="px-3 py-2 bg-gray-100 rounded text-sm">Limpiar</button>
          )}
        </div>
      </form>

      {resumenPuesto && resumenPuesto.length > 0 && (
        <div className="bg-white shadow rounded p-4">
          <h4 className="font-medium mb-2">Totales por Puesto</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2">Legajo</th>
                  <th className="text-left px-3 py-2">Puesto</th>
                  <th className="text-left px-3 py-2">Servicio</th>
                  <th className="text-right px-3 py-2">Horas diurnas</th>
                  <th className="text-right px-3 py-2">Horas nocturnas</th>
                  <th className="text-right px-3 py-2">Horas totales</th>
                </tr>
              </thead>
              <tbody>
                {resumenPuesto.map((r, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2">{r.legajo}</td>
                    <td className="px-3 py-2">{catalogos?.puestos?.[r.id_puesto]?.nombre || r.id_puesto}</td>
                    <td className="px-3 py-2">{(r.id_servicio && (catalogos?.servicios?.[r.id_servicio]?.nombre || r.id_servicio)) || '—'}</td>
                    <td className="px-3 py-2 text-right">{r.horas_diurnas.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{r.horas_nocturnas.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{r.horas_totales.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {resumenServicio && resumenServicio.length > 0 && (
        <div className="bg-white shadow rounded p-4">
          <h4 className="font-medium mb-2">Totales por Servicio</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2">Legajo</th>
                  <th className="text-left px-3 py-2">Servicio</th>
                  <th className="text-right px-3 py-2">Horas diurnas</th>
                  <th className="text-right px-3 py-2">Horas nocturnas</th>
                  <th className="text-right px-3 py-2">Horas totales</th>
                </tr>
              </thead>
              <tbody>
                {resumenServicio.map((r, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2">{r.legajo}</td>
                    <td className="px-3 py-2">{catalogos?.servicios?.[r.id_servicio]?.nombre || r.id_servicio}</td>
                    <td className="px-3 py-2 text-right">{r.horas_diurnas.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{r.horas_nocturnas.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{r.horas_totales.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {resumen && (
        <div className="bg-white shadow rounded p-4">
          <h4 className="font-medium mb-2">Resumen mensual por legajo</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2">Legajo</th>
                  <th className="text-right px-3 py-2">Horas diurnas</th>
                  <th className="text-right px-3 py-2">Horas nocturnas</th>
                  <th className="text-right px-3 py-2">Horas totales</th>
                  <th className="text-right px-3 py-2">Días trabajados</th>
                  <th className="text-right px-3 py-2">Ausencias</th>
                </tr>
              </thead>
              <tbody>
                {resumen.map((r) => (
                  <tr key={String(r.legajo)} className="border-t">
                    <td className="px-3 py-2">{r.legajo}</td>
                    <td className="px-3 py-2 text-right">{r.horas_diurnas.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{r.horas_nocturnas.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{r.horas_totales.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{r.dias_trabajado}</td>
                    <td className="px-3 py-2 text-right">{r.ausencias}</td>
                  </tr>
                ))}
              </tbody>
              {resumenTotales && (
                <tfoot>
                  <tr className="bg-gray-50 font-medium">
                    <td className="px-3 py-2 text-right">Totales</td>
                    <td className="px-3 py-2 text-right">{resumenTotales.horas_diurnas.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{resumenTotales.horas_nocturnas.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{resumenTotales.horas_totales.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{resumenTotales.dias_trabajado}</td>
                    <td className="px-3 py-2 text-right">{resumenTotales.ausencias}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {asistencias && (
        <div className="bg-white shadow rounded p-4">
          <h4 className="font-medium mb-2">Detalle por registro</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2">Legajo</th>
                  <th className="text-left px-3 py-2">Fecha</th>
                  <th className="text-left px-3 py-2">Estado</th>
                  <th className="text-left px-3 py-2">Pares (Excel)</th>
                  <th className="text-right px-3 py-2">Horas (D/N/T)</th>
                  <th className="text-right px-3 py-2">Δ Total (min)</th>
                </tr>
              </thead>
              <tbody>
                {asistencias.map((a, idx) => (
                  <tr key={idx} className="border-t align-top">
                    <td className="px-3 py-2">{a.legajo}</td>
                    <td className="px-3 py-2">{a.fecha}</td>
                    <td className="px-3 py-2"><span className={badge(a.estado)}>{a.estado}</span></td>
                    <td className="px-3 py-2">
                      {(a.pares || []).length === 0 ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <div className="space-y-1">
                          {(a.pares || []).map((p, i) => (
                            <div key={i} className="text-xs text-gray-700">{p.entrada} → {p.salida}</div>
                          ))}
                        </div>
                      )}
                      {a.comparaciones && a.comparaciones.length > 0 && (
                        <div className="mt-2 border-t pt-2">
                          <div className="text-xs text-gray-500 mb-1">Comparación con planificación:</div>
                          <div className="space-y-1">
                            {a.comparaciones.map((c, i) => (
                              <div key={i} className="text-xs">
                                <div className="text-gray-700">Excel {c.excel.inicio}–{c.excel.fin} ({c.excel.dur_min}m) · Plan {c.plan.inicio}–{c.plan.fin} ({c.plan.dur_min}m)</div>
                                <div className={`mt-0.5 ${c.dentro_tolerancia ? 'text-green-700' : 'text-yellow-700'}`}>Δ {c.delta_total_min} min {c.dentro_tolerancia ? '(ok)' : '(fuera de tolerancia)'}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">{a.horas_diurnas.toFixed(2)} / {a.horas_nocturnas.toFixed(2)} / {a.horas_totales.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{a.delta_total_min ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImportarAsistenciasScreen
