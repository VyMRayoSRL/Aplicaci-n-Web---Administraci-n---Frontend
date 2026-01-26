import React, { useMemo } from 'react'

type DiaVig = {
  fecha: string // YYYY-MM-DD
  estado?: string
  turnos: Array<{ hora_inicio: string; hora_fin: string; cantidad_horas?: number; horas_totales?: number }>
}

interface Props {
  dias: DiaVig[]
  mes: number // 1..12
  anio: number
  onDayClick?: (dateStr: string, info: DiaVig | undefined) => void
}

const getIsoWeekday = (date: Date) => {
  const wd = date.getDay()
  return wd === 0 ? 7 : wd
}

const pad2 = (n: number) => String(n).padStart(2, '0')

const buildMonthMatrix = (mes: number, anio: number) => {
  const first = new Date(anio, mes - 1, 1)
  const daysInMonth = new Date(anio, mes, 0).getDate()
  const startIso = getIsoWeekday(first)
  const cells: Array<{ inMonth: boolean; date: string | null; dayNum: number | null }> = []
  for (let i = 0; i < startIso - 1; i++) cells.push({ inMonth: false, date: null, dayNum: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${anio}-${pad2(mes)}-${pad2(d)}`
    cells.push({ inMonth: true, date: ds, dayNum: d })
  }
  while (cells.length % 7 !== 0) cells.push({ inMonth: false, date: null, dayNum: null })
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

const EditableVigiladorCalendar: React.FC<Props> = ({ dias, mes, anio, onDayClick }) => {
  const byDate = useMemo(() => {
    const map = new Map<string, DiaVig>()
    for (const d of dias || []) map.set(d.fecha, d)
    return map
  }, [dias])

  const weeks = useMemo(() => buildMonthMatrix(mes, anio), [mes, anio])

  return (
    <div className="bg-white shadow rounded">
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
                  return (
                    <td
                      key={`${i}-${j}`}
                      className={`align-top border p-2 min-w-[160px] ${cell.date ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => { if (cell.date && onDayClick) onDayClick(cell.date, diaData) }}
                    >
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <div className="text-xs text-gray-500">{cell.dayNum}</div>
                        {estado && (
                          <span className={`text-[10px] px-1 py-0.5 rounded ${estadoBadgeClass(estado)}`}>{estado}</span>
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

export default EditableVigiladorCalendar


