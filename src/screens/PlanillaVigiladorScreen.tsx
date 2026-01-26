import React, { useEffect, useMemo, useState } from 'react'
import { useVigiladores } from '../hooks/useVigiladores'
import { usePlanillaVigilador } from '../hooks/useContabilidad'
import VigiladorCalendar from '../components/VigiladorCalendar'

const PlanillaVigiladorScreen: React.FC = () => {
  const hoy = new Date()
  const [mes, setMes] = useState<number>(hoy.getMonth() + 1)
  const [anio, setAnio] = useState<number>(hoy.getFullYear())
  const { data: vigiladores = [] } = useVigiladores()
  const [idVigilador, setIdVigilador] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (!idVigilador && vigiladores.length > 0) setIdVigilador(vigiladores[0].id_vigilador)
  }, [vigiladores, idVigilador])

  const { data = [], isFetching } = usePlanillaVigilador(idVigilador, mes, anio)
  const selectedVig = useMemo(() => vigiladores.find((v: any) => Number(v.id_vigilador) === Number(idVigilador)), [vigiladores, idVigilador])
  const [vista, setVista] = useState<'tabla' | 'calendario'>('calendario')

  const totales = useMemo(() => data.reduce((acc, d) => ({
    diurnas: acc.diurnas + (d.horas_diurnas || 0),
    nocturnas: acc.nocturnas + (d.horas_nocturnas || 0),
    totales: acc.totales + (d.horas_totales || 0),
  }), { diurnas: 0, nocturnas: 0, totales: 0 }), [data])

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4 flex-wrap">
        <div>
          <label className="block text-sm text-gray-600">Vigilador</label>
          <select value={idVigilador} onChange={(e) => setIdVigilador(Number(e.target.value))} className="border rounded px-3 py-2 text-sm min-w-[240px]">
            {vigiladores.map(v => (
              <option key={v.id_vigilador} value={v.id_vigilador}>{v.legajo} - {v.apellido} {v.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600">Mes</label>
          <input type="number" min={1} max={12} value={mes} onChange={(e) => setMes(Number(e.target.value))} className="border rounded px-3 py-2 text-sm w-24" />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Año</label>
          <input type="number" min={2000} value={anio} onChange={(e) => setAnio(Number(e.target.value))} className="border rounded px-3 py-2 text-sm w-28" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded p-4">
          <div className="text-sm text-gray-500">Horas diurnas</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">{totales.diurnas.toFixed(2)}</div>
        </div>
        <div className="bg-white shadow rounded p-4">
          <div className="text-sm text-gray-500">Horas nocturnas</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">{totales.nocturnas.toFixed(2)}</div>
        </div>
        <div className="bg-white shadow rounded p-4">
          <div className="text-sm text-gray-500">Horas totales</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">{totales.totales.toFixed(2)}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className={`btn-secondary ${vista === 'calendario' ? 'bg-blue-600 text-white' : ''}`} onClick={() => setVista('calendario')}>Calendario</button>
        <button className={`btn-secondary ${vista === 'tabla' ? 'bg-blue-600 text-white' : ''}`} onClick={() => setVista('tabla')}>Tabla</button>
      </div>

      {vista === 'calendario' ? (
        <VigiladorCalendar dias={data as any} mes={mes} anio={anio} idVigilador={idVigilador as number} legajo={selectedVig?.legajo} />
      ) : (
        <div className="bg-white shadow rounded">
          <div className="p-4 border-b font-medium">Planilla diaria</div>
          <div className="p-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2">Fecha</th>
                  <th className="text-left px-3 py-2">Estado</th>
                  <th className="text-left px-3 py-2">Turnos</th>
                  <th className="text-right px-3 py-2">Horas (D/N/T)</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.fecha} className="border-t align-top">
                    <td className="px-3 py-2">{d.fecha}</td>
                    <td className="px-3 py-2">{d.estado}</td>
                    <td className="px-3 py-2">
                      {d.turnos.length === 0 ? <span className="text-gray-400">—</span> : (
                        <div className="space-y-1">
                          {d.turnos.map((t, i) => (
                            <div key={i} className="text-xs text-gray-700">{t.hora_inicio} → {t.hora_fin} (D {t.horas_diurnas.toFixed(2)} / N {t.horas_nocturnas.toFixed(2)} / T {t.horas_totales.toFixed(2)})</div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">{d.horas_diurnas.toFixed(2)} / {d.horas_nocturnas.toFixed(2)} / {d.horas_totales.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-sm text-gray-500 mt-2">{isFetching ? 'Actualizando...' : ' '}</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlanillaVigiladorScreen
