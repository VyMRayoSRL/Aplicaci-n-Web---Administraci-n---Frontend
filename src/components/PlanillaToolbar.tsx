import React from 'react'

type Props = {
  zoom: number
  onZoomOut: () => void
  onZoomIn: () => void
  onZoomReset: () => void
  showWeeklyTotals: boolean
  onToggleWeeklyTotals: (val: boolean) => void
  canManage: boolean
  onAddVigilador: () => void
  onExport: () => void
}

const PlanillaToolbar: React.FC<Props> = ({ zoom, onZoomOut, onZoomIn, onZoomReset, showWeeklyTotals, onToggleWeeklyTotals, canManage, onAddVigilador, onExport }) => {
  return (
    <div className="flex items-center gap-3 text-sm flex-wrap">
      <span className="text-gray-600">Zoom</span>
      <button className="px-2 py-1 border rounded" onClick={onZoomOut}>−</button>
      <span className="w-12 text-center">{Math.round(zoom * 100)}%</span>
      <button className="px-2 py-1 border rounded" onClick={onZoomIn}>＋</button>
      <button className="ml-2 px-2 py-1 border rounded" onClick={onZoomReset}>Reset</button>
      <label className="inline-flex items-center gap-1">
        <input type="checkbox" checked={showWeeklyTotals} onChange={(e) => onToggleWeeklyTotals(e.target.checked)} />
        <span>Totales semanales</span>
      </label>
      <div className="ml-auto flex items-center gap-2">
        {canManage && (
          <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700" onClick={onAddVigilador}>
            Agregar vigilador
          </button>
        )}
        <button className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700" onClick={onExport}>
          Exportar Excel
        </button>
      </div>
    </div>
  )
}

export default PlanillaToolbar


