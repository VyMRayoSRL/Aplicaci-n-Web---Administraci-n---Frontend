import React from 'react'
import { useNavigate } from 'react-router-dom'

const Card: React.FC<{ title: string; description: string; action: string; onClick: () => void }> = ({ title, description, action, onClick }) => {
  return (
    <div className="bg-white rounded shadow hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <div className="p-5">
        <div className="text-lg font-semibold text-gray-900">{title}</div>
        <div className="mt-1 text-sm text-gray-500">{description}</div>
      </div>
      <div className="px-5 py-3 border-t text-sm text-blue-700 font-medium">{action} →</div>
    </div>
  )
}

const ContabilidadScreen: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contabilidad</h1>
          <p className="mt-1 text-sm text-gray-500">Accedé rápidamente a las funciones clave del módulo.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card
          title="Resumen por vigilador"
          description="Horas diurnas, nocturnas, totales y días trabajados por mes."
          action="Ver resumen"
          onClick={() => navigate('/contabilidad/resumen')}
        />
        <Card
          title="Resumen mensual (todos)"
          description="Tabla mensual de todos los vigiladores, con filtros y exportación."
          action="Abrir tabla"
          onClick={() => navigate('/contabilidad/resumen-mensual')}
        />
        <Card
          title="Planilla del vigilador"
          description="Detalle diario del mes con turnos y horas por día."
          action="Ver planilla"
          onClick={() => navigate('/contabilidad/planilla')}
        />
        <Card
          title="Importar asistencias"
          description="Carga un Excel, compara con la planificación y analiza desvíos."
          action="Importar ahora"
          onClick={() => navigate('/importar-asistencias')}
        />
      </div>
    </div>
  )
}

export default ContabilidadScreen
