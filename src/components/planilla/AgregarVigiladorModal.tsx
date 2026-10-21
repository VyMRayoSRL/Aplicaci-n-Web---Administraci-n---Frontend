import React, { useMemo, useState } from 'react'
import { Search, UserPlus } from 'lucide-react'
import Modal from '../Modal'
import type { Vigilador } from '../../types'
import { useVigiladores } from '../../hooks/useVigiladores'
import { useVigiladoresPlanilla } from '../../hooks/usePlanillaGrilla'

type Props = {
  idPlanilla: number
  asignados: Vigilador[]
  open: boolean
  onClose: () => void
}

const AgregarVigiladorModal: React.FC<Props> = ({ idPlanilla, asignados, open, onClose }) => {
  const { data: todos = [] } = useVigiladores()
  const { agregar } = useVigiladoresPlanilla(idPlanilla)
  const [filtro, setFiltro] = useState('')

  const candidatos = useMemo(() => {
    const ya = new Set(asignados.map(v => v.id_vigilador))
    const q = filtro.trim().toLowerCase()
    return (todos as Vigilador[])
      .filter(v => !ya.has(v.id_vigilador))
      .filter(v => !q || String(v.legajo).includes(q) || `${v.apellido} ${v.nombre}`.toLowerCase().includes(q))
      .slice(0, 50)
  }, [todos, asignados, filtro])

  return (
    <Modal open={open} title="Agregar vigilador a la planilla" onClose={onClose}>
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input autoFocus className="input-field pl-9" placeholder="Buscar por legajo, apellido o nombre" value={filtro} onChange={e => setFiltro(e.target.value)} />
        </div>
        <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
          {candidatos.length === 0 && <li className="px-4 py-6 text-center text-sm text-gray-500">No hay vigiladores para agregar.</li>}
          {candidatos.map(v => (
            <li key={v.id_vigilador} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50">
              <div>
                <div className="text-sm font-medium text-gray-900">{v.apellido}, {v.nombre}</div>
                <div className="text-xs text-gray-500">Legajo {v.legajo}</div>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-50"
                disabled={agregar.isPending}
                onClick={() => agregar.mutate(v.id_vigilador)}
              >
                <UserPlus className="h-4 w-4" /> Agregar
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  )
}

export default AgregarVigiladorModal
