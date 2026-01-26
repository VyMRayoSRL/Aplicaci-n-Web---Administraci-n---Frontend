import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planillasService } from '../services/planillas';
// import { PlanillaForm } from '../types';
import toast from 'react-hot-toast';

export const usePlanillasByPuesto = (idPuesto: number) => {
  return useQuery({
    queryKey: ['planillas', 'puesto', idPuesto],
    queryFn: () => planillasService.getByPuesto(idPuesto),
    enabled: !!idPuesto,
    staleTime: 5 * 60 * 1000,
  });
};

export const usePlanilla = (id: number) => {
  return useQuery({
    queryKey: ['planilla', id],
    queryFn: () => planillasService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreatePlanilla = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: planillasService.createPlanilla,
    onMutate: async (data: { id_puesto: number; mes: number; anio: number }) => {
      await queryClient.cancelQueries({ queryKey: ['planillas'] });
      const previous = queryClient.getQueryData<any[]>(['planillas']) || [];
      const optimistic = { id_planilla: Date.now() * -1, id_puesto: data.id_puesto, mes: data.mes, anio: data.anio, horas_mensuales: 0 } as any;
      queryClient.setQueryData<any[]>(['planillas'], (old = []) => [optimistic, ...old]);
      return { previous, id_puesto: data.id_puesto };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['planillas'], ctx.previous);
      toast.error('No se pudo crear la planilla');
    },
    onSuccess: (data, _vars, ctx) => {
      toast.success('Planilla creada correctamente');
      if ((data as any)?.id_puesto) {
        queryClient.invalidateQueries({ queryKey: ['planillas', 'puesto', (data as any).id_puesto] });
      } else if (ctx?.id_puesto) {
        queryClient.invalidateQueries({ queryKey: ['planillas', 'puesto', ctx.id_puesto] });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planillas'] });
    },
  });
};

export const useDeletePlanilla = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: planillasService.deletePlanilla,
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['planillas'] });
      const previous = queryClient.getQueryData<any[]>(['planillas']) || [];
      queryClient.setQueryData<any[]>(['planillas'], (old = []) => old.filter((pl: any) => pl.id_planilla !== id));
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['planillas'], ctx.previous);
      toast.error('No se pudo eliminar la planilla');
    },
    onSuccess: () => {
      toast.success('Planilla eliminada');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planillas'] });
    },
  });
};

export const useDuplicatePlanilla = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { id_puesto: number; mes_origen: number; anio_origen: number; mes_destino: number; anio_destino: number }) => planillasService.duplicatePlanilla(data),
    onSuccess: (_resp, variables) => {
      queryClient.invalidateQueries({ queryKey: ['planillas'] });
      queryClient.invalidateQueries({ queryKey: ['planillas', 'puesto', variables.id_puesto] });
      toast.success('Planilla duplicada');
    },
    onError: () => {
      toast.error('No se pudo duplicar la planilla');
    },
  });
};


