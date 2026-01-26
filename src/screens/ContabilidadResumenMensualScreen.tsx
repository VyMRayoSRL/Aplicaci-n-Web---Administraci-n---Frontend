import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import contabilidadService from '../services/contabilidad'
import { serviciosService } from '../services/servicios'
import { puestosService } from '../services/puestos'

const ContabilidadResumenMensualScreen: React.FC = () => {
  const hoy = new Date()
  const [mes, setMes] = useState<number>(hoy.getMonth() + 1)
  const [anio, setAnio] = useState<number>(hoy.getFullYear())
  const [idServicio, setIdServicio] = useState<number | ''>('')
  const [idPuesto, setIdPuesto] = useState<number | ''>('')

  const { data: servicios = [] } = useQuery({
    queryKey: ['servicios-all'],
    queryFn: () => serviciosService.getServicios({ incluirInactivos: true } as any),
    staleTime: 5 * 60 * 1000,
  })

  const { data: puestos = [] } = useQuery({
    enabled: !!idServicio,
    queryKey: ['puestos-by-serv', idServicio],
    queryFn: () => puestosService.getPuestosByServicio(Number(idServicio)),
    staleTime: 5 * 60 * 1000,
  })

  const { data = [], isFetching } = useQuery({
    queryKey: ['conta-resumen-mensual', mes, anio, idServicio || null, idPuesto || null],
    queryFn: () => contabilidadService.getResumenMensualTodos(mes, anio, {
      id_servicio: idServicio ? Number(idServicio) : undefined,
      id_puesto: idPuesto ? Number(idPuesto) : undefined,
    }),
    keepPreviousData: true,
    staleTime: 60 * 1000,
  })

  const totales = useMemo(() => data.reduce((acc: any, r: any) => ({
    horas_diurnas: acc.horas_diurnas + (r.horas_diurnas || 0),
    horas_nocturnas: acc.horas_nocturnas + (r.horas_nocturnas || 0),
    horas_totales: acc.horas_totales + (r.horas_totales || 0),
    dias_trabajados: acc.dias_trabajados + (r.dias_trabajados || 0),
  }), { horas_diurnas: 0, horas_nocturnas: 0, horas_totales: 0, dias_trabajados: 0 }), [data])

  const exportar = async () => {
    const rows = data.map((r: any) => ({
      legajo: r.legajo,
      apellido: r.apellido,
      nombre: r.nombre,
      horas_diurnas: r.horas_diurnas,
      horas_nocturnas: r.horas_nocturnas,
      horas_totales: r.horas_totales,
      dias_trabajados: r.dias_trabajados,
    }))
    const blob = await contabilidadService.exportResumenMensualTodos(rows, mes, anio)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resumen-${anio}-${String(mes).padStart(2,'0')}.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white shadow rounded p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <label className="text-sm">Mes
            <select className="mt-1 w-full border rounded px-2 py-1" value={mes} onChange={e => setMes(Number(e.target.value))}>
              {Array.from({ length: 12 }).map((_, i) => <option key={i+1} value={i+1}>{new Date(2000, i, 1).toLocaleString('es-AR', { month: 'long' })}</option>)}
            </select>
          </label>
          <label className="text-sm">Año
            <input className="mt-1 w-full border rounded px-2 py-1" type="number" value={anio} onChange={e => setAnio(Math.max(2000, Number(e.target.value)))} />
          </label>
          <label className="text-sm">Servicio
            <select className="mt-1 w-full border rounded px-2 py-1" value={idServicio} onChange={e => { setIdServicio(e.target.value ? Number(e.target.value) : ''); setIdPuesto('') }}>
              <option value="">Todos</option>
              {servicios.map((s: any) => <option key={s.id_servicio} value={s.id_servicio}>{s.nombre}</option>)}
            </select>
          </label>
          <label className="text-sm">Puesto
            <select className="mt-1 w-full border rounded px-2 py-1" value={idPuesto} onChange={e => setIdPuesto(e.target.value ? Number(e.target.value) : '')} disabled={!idServicio}>
              <option value="">Todos</option>
              {puestos.map((p: any) => <option key={p.id_puesto} value={p.id_puesto}>{p.nombre}</option>)}
            </select>
          </label>
          <div className="flex gap-2">
            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={exportar}>Exportar Excel</button>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded overflow-hidden">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="font-medium">Resumen mensual por vigilador</div>
          <div className="text-sm text-gray-500">{isFetching ? 'Actualizando…' : `${data.length} registros`}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">Legajo</th>
                <th className="text-left px-3 py-2">Apellido</th>
                <th className="text-left px-3 py-2">Nombre</th>
                <th className="text-right px-3 py-2">Horas diurnas</th>
                <th className="text-right px-3 py-2">Horas nocturnas</th>
                <th className="text-right px-3 py-2">Horas totales</th>
                <th className="text-right px-3 py-2">Días trabajados</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r: any) => (
                <tr key={r.id_vigilador} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{r.legajo}</td>
                  <td className="px-3 py-2">{r.apellido}</td>
                  <td className="px-3 py-2">{r.nombre}</td>
                  <td className="px-3 py-2 text-right">{r.horas_diurnas.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{r.horas_nocturnas.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{r.horas_totales.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{r.dias_trabajados}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-medium">
                <td className="px-3 py-2 text-right" colSpan={3}>Totales</td>
                <td className="px-3 py-2 text-right">{totales.horas_diurnas.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{totales.horas_nocturnas.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{totales.horas_totales.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{totales.dias_trabajados}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ContabilidadResumenMensualScreen


