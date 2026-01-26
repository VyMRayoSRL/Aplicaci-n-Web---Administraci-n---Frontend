import React, { useEffect, useMemo, useState } from 'react'
import { useVigiladores } from '../hooks/useVigiladores'
import { useResumenVigilador } from '../hooks/useContabilidad'

const ResumenVigiladorScreen: React.FC = () => {
  const hoy = new Date()
  const [mes, setMes] = useState<number>(hoy.getMonth() + 1)
  const [anio, setAnio] = useState<number>(hoy.getFullYear())
  const { data: vigiladores = [] } = useVigiladores()
  const [idVigilador, setIdVigilador] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (!idVigilador && vigiladores.length > 0) setIdVigilador(vigiladores[0].id_vigilador)
  }, [vigiladores, idVigilador])

  const { data, isFetching } = useResumenVigilador(idVigilador, mes, anio)

  const cards = useMemo(() => ([
    { label: 'Horas diurnas', value: data?.horas_diurnas ?? 0 },
    { label: 'Horas nocturnas', value: data?.horas_nocturnas ?? 0 },
    { label: 'Horas totales', value: data?.horas_totales ?? 0 },
    { label: 'Días trabajados', value: data?.dias_trabajados ?? 0 },
  ]), [data])

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white shadow rounded p-4">
            <div className="text-sm text-gray-500">{c.label}</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{Number(c.value).toFixed(2)}</div>
          </div>
        ))}
      </div>

      <div className="text-sm text-gray-500">{isFetching ? 'Actualizando...' : ' '}</div>
    </div>
  )
}

export default ResumenVigiladorScreen
