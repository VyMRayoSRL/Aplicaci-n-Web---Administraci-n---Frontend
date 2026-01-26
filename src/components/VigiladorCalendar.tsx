import React, { useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { AsistenciaEstado, ResumenMensual } from '../types'
import { useImportarAsistencias } from '../hooks/useContabilidad'
import toast from 'react-hot-toast'

type DiaVig = {
  fecha: string // YYYY-MM-DD
  estado?: string
  turnos: Array<{ hora_inicio: string; hora_fin: string; cantidad_horas?: number; horas_totales?: number }>
}

interface Props {
  dias: DiaVig[]
  mes: number // 1..12
  anio: number
  idVigilador: number
  legajo?: number | string
  toleranciaMin?: number
}

// Retorna 1..7 con 1=Lunes, 7=Domingo
const getIsoWeekday = (date: Date) => {
  const wd = date.getDay() // 0..6 con 0=Domingo
  return wd === 0 ? 7 : wd
}

const pad2 = (n: number) => String(n).padStart(2, '0')

const buildMonthMatrix = (mes: number, anio: number) => {
  const first = new Date(anio, mes - 1, 1)
  const daysInMonth = new Date(anio, mes, 0).getDate()
  const startIso = getIsoWeekday(first) // 1..7
  const cells: Array<{ inMonth: boolean; date: string | null; dayNum: number | null }> = []
  // leading blanks: startIso - 1 (si lunes=1 y cae lunes, 0 blanks)
  for (let i = 0; i < startIso - 1; i++) cells.push({ inMonth: false, date: null, dayNum: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${anio}-${pad2(mes)}-${pad2(d)}`
    cells.push({ inMonth: true, date: ds, dayNum: d })
  }
  // completar hasta múltiplo de 7
  while (cells.length % 7 !== 0) cells.push({ inMonth: false, date: null, dayNum: null })
  // chunk en semanas
  const weeks: typeof cells[] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

const estadoBadgeClass = (estado?: string) => {
  switch ((estado || '').toLowerCase()) {
    case 'trabaja':
      return 'bg-green-100 text-green-800'
    case 'feriado':
      return 'bg-amber-100 text-amber-800'
    case 'enfermo':
      return 'bg-rose-100 text-rose-800'
    case 'no asignado':
    case 'no_asignado':
      return 'bg-gray-100 text-gray-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const VigiladorCalendar: React.FC<Props> = ({ dias, mes, anio, idVigilador: _idVigilador, legajo, toleranciaMin = 20 }) => {
  const byDate = useMemo(() => {
    const map = new Map<string, DiaVig>()
    for (const d of dias || []) map.set(d.fecha, d)
    return map
  }, [dias])

  const weeks = useMemo(() => buildMonthMatrix(mes, anio), [mes, anio])

  const importar = useImportarAsistencias()
  const [statusByDate, setStatusByDate] = useState<Record<string, 'ok' | 'warning' | 'error' | 'loading'>>({})
  const [infoByDate, setInfoByDate] = useState<Record<string, string | null>>({})
  const [bulkLoading, setBulkLoading] = useState<boolean>(false)
  const [monthlySummary, setMonthlySummary] = useState<ResumenMensual | null>(null)
  const [tol, setTol] = useState<number>(toleranciaMin)

  const handleUploadMonth = async (file: File | null) => {
    if (!file) return
    if (!legajo) { toast.error('No se encontró legajo del vigilador seleccionado'); return }
    setBulkLoading(true)
    setMonthlySummary(null)
    try {
      const { asistencias, resumen } = await importar.mutateAsync({ file, toleranciaMin: tol, anio })
      const porFecha: Record<string, any> = {}
      for (const a of asistencias || []) {
        if (String(a.legajo) === String(legajo)) porFecha[String(a.fecha)] = a
      }
      const resumenVig = Array.isArray(resumen) ? resumen.find((r: any) => String(r.legajo) === String(legajo)) : null
      setMonthlySummary(resumenVig || null)
      let okCount = 0, errCount = 0, noRegCount = 0
      const next: Record<string, 'ok' | 'warning' | 'error'> = {}
      const nextInfo: Record<string, string | null> = {}
      for (const d of dias || []) {
        const dateStr = d.fecha
        const match = porFecha[dateStr]
        if (!match) {
          next[dateStr] = 'error'
          nextInfo[dateStr] = 'Sin registro en Excel para este día'
          noRegCount++
          continue
        }
        const estado = match.estado
        const ok = estado === AsistenciaEstado.OK
        next[dateStr] = ok ? 'ok' : 'error'
        if (ok) {
          nextInfo[dateStr] = null
          okCount++
        } else {
          errCount++
          // Mensaje amigable según estado
          if (estado === AsistenciaEstado.DESVIO) {
            const totalDelta = Number(match.delta_total_min ?? 0)
            // Si hay comparaciones, tomar la peor
            let detalle = ''
            if (Array.isArray(match.comparaciones) && match.comparaciones.length > 0) {
              const worst = match.comparaciones.reduce((a: any, b: any) => (a.delta_total_min ?? 0) >= (b.delta_total_min ?? 0) ? a : b)
              const di = worst.delta_inicio_min ?? 0
              const df = worst.delta_fin_min ?? 0
              detalle = `Δ inicio ${di}m · Δ fin ${df}m`
            }
            nextInfo[dateStr] = `Desvío fuera de tolerancia (${totalDelta}m). ${detalle}`.trim()
          } else if (estado === AsistenciaEstado.NO_ASIGNADO) {
            next[dateStr] = 'warning'
            nextInfo[dateStr] = 'El estado del vigilador no debería quedar como "No Asignado"'
          } else if (estado === AsistenciaEstado.ASISTENCIAS_SIN_TURNOS) {
            //Deberíamos poder mostrar las entradas y salidas que se registraron pero que no hubo turnos para las mismas
            const entradas = match.pares.map((p: any) => p.entrada)
            const salidas = match.pares.map((p: any) => p.salida)
            const entradasStr = entradas.map((e: any) => `${e}`).join(', ')
            const salidasStr = salidas.map((s: any) => `${s}`).join(', ') 
            nextInfo[dateStr] = `Entradas: ${entradasStr} · Salidas: ${salidasStr} · Estado: ${match.estado}`
          } else {
          nextInfo[dateStr] = `Estado: ${match.estado}`
          console.log('Estado:', match.estado)
          }
        }
      }
      setStatusByDate(s => ({ ...s, ...next }))
      setInfoByDate(s => ({ ...s, ...nextInfo }))
      toast[errCount + noRegCount > 0 ? 'error' : 'success'](`Validación mes: OK ${okCount}, Errores ${errCount}, Sin registro ${noRegCount}`)
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Error al validar asistencias del mes'
      toast.error(msg)
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div className="bg-white shadow rounded">
      <div className="p-4 border-b flex items-center justify-between gap-2">
        <div className="font-medium">Calendario mensual</div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-sm text-gray-700">
            <span>Tolerancia (min)</span>
            <input
              type="number"
              min={0}
              value={tol}
              onChange={(e) => setTol(Math.max(0, Number(e.target.value)))}
              className="w-20 border rounded px-2 py-1 text-sm"
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-blue-700 cursor-pointer">
            <input type="file" accept=".xls,.xlsx" className="hidden" onChange={(e) => handleUploadMonth(e.target.files?.[0] || null)} />
            <span className={`px-2 py-1 rounded ${bulkLoading ? 'bg-gray-100 text-gray-600' : 'bg-blue-50'}`}>{bulkLoading ? 'Validando…' : 'Validar mes'}</span>
          </label>
        </div>
      </div>
      {monthlySummary && (
        <div className="px-4 pt-3 pb-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <div className="rounded border bg-emerald-50 text-emerald-800 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-emerald-700">Horas diurnas</div>
              <div className="text-lg font-semibold">{monthlySummary.horas_diurnas.toFixed(2)}h</div>
            </div>
            <div className="rounded border bg-sky-50 text-sky-800 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-sky-700">Horas nocturnas</div>
              <div className="text-lg font-semibold">{monthlySummary.horas_nocturnas.toFixed(2)}h</div>
            </div>
            <div className="rounded border bg-indigo-50 text-indigo-800 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-indigo-700">Horas totales</div>
              <div className="text-lg font-semibold">{monthlySummary.horas_totales.toFixed(2)}h</div>
            </div>
            <div className="rounded border bg-amber-50 text-amber-800 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-amber-700">Días trabajados</div>
              <div className="text-lg font-semibold">{monthlySummary.dias_trabajado}</div>
            </div>
            <div className="rounded border bg-rose-50 text-rose-800 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-rose-700">Ausencias</div>
              <div className="text-lg font-semibold">{monthlySummary.ausencias}</div>
            </div>
          </div>
        </div>
      )}
      <div className="p-2 overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map((d) => (
                <th key={d} className="border px-3 py-2 text-xs text-gray-600 bg-gray-50">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => {
                  if (!cell.inMonth) return <td key={`${i}-${j}`} className="border px-2 py-2 bg-gray-50/40" />
                  const diaData = cell.date ? byDate.get(cell.date) : undefined
                  const turnos = diaData?.turnos || []
                  const estado = diaData?.estado
                  const st = cell.date ? statusByDate[cell.date] : undefined
                  const msg = cell.date ? infoByDate[cell.date] : undefined
                  const bgClass = st === 'ok' ? 'bg-green-50' : st === 'warning' ? 'bg-amber-50' : st === 'error' ? 'bg-rose-50' : ''
                  return (
                    <td key={`${i}-${j}`} className={`align-top border p-2 min-w-[160px] ${bgClass}`}>
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <div className="text-xs text-gray-500">{cell.dayNum}</div>
                        {estado && (
                          <span className={`text-[10px] px-1 py-0.5 rounded ${estadoBadgeClass(estado)}`}>{estado}</span>
                        )}
                        {(st === 'error' || st === 'warning') && msg && (
                          <div className="relative group">
                            <AlertTriangle className={`w-4 h-4 ${st === 'warning' ? 'text-amber-600' : 'text-rose-600'}`} />
                            <div className="hidden group-hover:block absolute z-10 right-0 mt-1 w-56 text-[11px] bg-white border border-gray-200 shadow-lg rounded p-2 text-gray-700">
                              {msg}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {turnos.length === 0 ? (
                        <div className="text-[11px] text-gray-400">—</div>
                      ) : (
                        <ul className="space-y-1">
                          {turnos.map((t, idx) => (
                            <li key={idx} className="text-[11px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded inline-block">
                              {t.hora_inicio} · {(t.cantidad_horas || t.horas_totales || 0)}h
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default VigiladorCalendar


