import api from './api'
import { ComparacionAsistencia, ResumenMensual, ContabilidadResumen, ContabilidadPlanilla, ResumenPorPuesto, ResumenPorServicio } from '../types'

export interface ImportacionResponse {
  asistencias: ComparacionAsistencia[]
  resumen: ResumenMensual[]
  resumen_puesto?: ResumenPorPuesto[]
  resumen_servicio?: ResumenPorServicio[]
  catalogos?: { puestos: Record<number, { nombre: string }>; servicios: Record<number, { nombre: string }> }
}

export const contabilidadService = {
  importarAsistencias: async (file: File, toleranciaMin: number = 20, anio?: number, filtros?: { id_planilla?: number; id_servicio?: number }): Promise<ImportacionResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    const params = new URLSearchParams()
    params.set('toleranciaMin', String(toleranciaMin))
    if (anio) params.set('anio', String(anio))
    if (filtros?.id_planilla) params.set('id_planilla', String(filtros.id_planilla))
    if (filtros?.id_servicio) params.set('id_servicio', String(filtros.id_servicio))
    const { data } = await api.post(`/contabilidad/asistencias/importar?${params.toString()}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  getResumenVigilador: async (id: number, mes: number, anio: number): Promise<ContabilidadResumen> => {
    const { data } = await api.get(`/contabilidad/vigiladores/${id}/resumen`, { params: { mes, anio } })
    return data
  },

  getPlanillaVigilador: async (id: number, mes: number, anio: number): Promise<ContabilidadPlanilla[]> => {
    const { data } = await api.get(`/contabilidad/vigiladores/${id}/planilla`, { params: { mes, anio } })
    return data
  },

  getResumenMensualTodos: async (mes: number, anio: number, filtros?: { id_servicio?: number; id_puesto?: number }) => {
    const params: any = { mes, anio }
    if (filtros?.id_servicio) params.id_servicio = filtros.id_servicio
    if (filtros?.id_puesto) params.id_puesto = filtros.id_puesto
    const { data } = await api.get(`/contabilidad/resumen-mensual`, { params })
    return data as Array<{ id_vigilador: number; legajo: string | number; apellido: string; nombre: string; horas_diurnas: number; horas_nocturnas: number; horas_totales: number; dias_trabajados: number }>
  },

  exportResumenMensualTodos: async (rows: Array<{ legajo: any; apellido: string; nombre: string; horas_diurnas: number; horas_nocturnas: number; horas_totales: number; dias_trabajados: number }>, mes: number, anio: number) => {
    const { data } = await api.post(`/contabilidad/resumen-mensual/export`, { rows, mes, anio }, { responseType: 'blob' as any })
    return data as Blob
  },
}

export default contabilidadService


