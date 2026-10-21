import React from 'react'
import { CheckCircle2, Lock, Unlock, PencilLine } from 'lucide-react'
import type { Planilla, PlanillaEstado } from '../types'
import { usePermissions } from '../hooks/usePermissions'
import { useCambiarEstadoPlanilla } from '../hooks/usePlanillas'

const ESTILOS: Record<PlanillaEstado, { texto: string; clase: string; icono: React.ReactNode; ayuda: string }> = {
  borrador: {
    texto: 'Borrador',
    clase: 'bg-gray-100 text-gray-700 ring-gray-300',
    icono: <PencilLine className="h-3.5 w-3.5" />,
    ayuda: 'Se está armando. Un administrador puede eliminarla.',
  },
  vigente: {
    texto: 'Vigente',
    clase: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    icono: <CheckCircle2 className="h-3.5 w-3.5" />,
    ayuda: 'Confirmada: se sigue editando durante el mes y queda como historial.',
  },
  cerrada: {
    texto: 'Cerrada',
    clase: 'bg-slate-800 text-white ring-slate-800',
    icono: <Lock className="h-3.5 w-3.5" />,
    ayuda: 'Mes liquidado: no admite cambios hasta que admin o contabilidad la reabran.',
  },
}

export const EstadoPlanillaBadge: React.FC<{ estado?: PlanillaEstado }> = ({ estado = 'borrador' }) => {
  const e = ESTILOS[estado]
  return (
    <span title={e.ayuda} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${e.clase}`}>
      {e.icono}
      {e.texto}
    </span>
  )
}

// Insignia del estado más la acción que corresponde según estado y rol
// permisos (de la grilla): si vienen, mandan sobre el rol (el supervisor solo confirma sus planillas)
export const EstadoPlanillaControl: React.FC<{ planilla?: Planilla; permisos?: { cambiarEstado: boolean; cerrar: boolean } }> = ({ planilla, permisos }) => {
  const perms = usePermissions()
  const cambiar = useCambiarEstadoPlanilla(planilla?.id_planilla || 0)
  if (!planilla) return null

  const confirmarYCambiar = (estado: PlanillaEstado, pregunta: string) => {
    if (window.confirm(pregunta)) cambiar.mutate(estado)
  }

  let accion: React.ReactNode = null
  const puedeConfirmar = permisos ? permisos.cambiarEstado : perms.canManagePlanillas
  const puedeCerrar = permisos ? permisos.cerrar : perms.canClosePlanillas
  if (planilla.estado === 'borrador' && puedeConfirmar) {
    accion = (
      <button className="btn-primary text-sm inline-flex items-center" disabled={cambiar.isPending}
        onClick={() => confirmarYCambiar('vigente', 'Al confirmarla, la planilla queda vigente y ya no se puede eliminar. ¿Continuar?')}>
        <CheckCircle2 className="h-4 w-4 mr-1.5" /> Confirmar planilla
      </button>
    )
  } else if (planilla.estado === 'vigente' && puedeCerrar) {
    accion = (
      <button className="btn-secondary text-sm inline-flex items-center" disabled={cambiar.isPending}
        onClick={() => confirmarYCambiar('cerrada', 'Al cerrarla no se podrán modificar turnos ni vigiladores hasta reabrirla. ¿Cerrar la planilla?')}>
        <Lock className="h-4 w-4 mr-1.5" /> Cerrar mes
      </button>
    )
  } else if (planilla.estado === 'cerrada' && puedeCerrar) {
    accion = (
      <button className="btn-secondary text-sm inline-flex items-center" disabled={cambiar.isPending}
        onClick={() => confirmarYCambiar('vigente', 'La reapertura queda registrada. ¿Reabrir la planilla?')}>
        <Unlock className="h-4 w-4 mr-1.5" /> Reabrir
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <EstadoPlanillaBadge estado={planilla.estado} />
      {accion}
    </div>
  )
}
