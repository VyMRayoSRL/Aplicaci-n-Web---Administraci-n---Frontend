import { useMutation, useQuery } from '@tanstack/react-query'
import contabilidadService from '../services/contabilidad'
import toast from 'react-hot-toast'

export const useImportarAsistencias = () => {
  return useMutation({
    mutationFn: ({ file, toleranciaMin, anio, filtros }: { file: File; toleranciaMin?: number; anio?: number; filtros?: { id_planilla?: number; id_servicio?: number } }) =>
      contabilidadService.importarAsistencias(file, toleranciaMin, anio, filtros),
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.message || 'Error al importar asistencias'
      toast.error(msg)
    },
  })
}

export const useResumenVigilador = (id?: number, mes?: number, anio?: number) => {
  const enabled = Boolean(id && mes && anio)
  return useQuery({
    queryKey: ['conta-resumen', id, mes, anio],
    queryFn: () => contabilidadService.getResumenVigilador(id as number, mes as number, anio as number),
    enabled,
    staleTime: 60 * 1000,
  })
}

export const usePlanillaVigilador = (id?: number, mes?: number, anio?: number) => {
  const enabled = Boolean(id && mes && anio)
  return useQuery({
    queryKey: ['conta-planilla', id, mes, anio],
    queryFn: () => contabilidadService.getPlanillaVigilador(id as number, mes as number, anio as number),
    enabled,
    staleTime: 60 * 1000,
  })
}


