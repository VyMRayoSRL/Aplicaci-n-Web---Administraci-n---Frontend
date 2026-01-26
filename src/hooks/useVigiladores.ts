import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vigiladoresService, VigiladorForm } from '../services/vigiladores';
import toast from 'react-hot-toast';

export const useVigiladores = (params?: { incluirInactivos?: boolean }) => {
  return useQuery({
    queryKey: ['vigiladores', params || {}],
    queryFn: () => vigiladoresService.getVigiladores(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateVigilador = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: vigiladoresService.createVigilador,
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: ['vigiladores'] });
      const previous = qc.getQueryData<any[]>(['vigiladores']) || [];
      const optimistic = { id_vigilador: Date.now() * -1, ...data, activo: true } as any;
      qc.setQueryData<any[]>(['vigiladores'], (old = []) => [optimistic, ...old]);
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(['vigiladores'], ctx.previous);
      toast.error('No se pudo crear');
    },
    onSuccess: () => { toast.success('Vigilador creado'); },
    onSettled: () => { qc.invalidateQueries({ queryKey: ['vigiladores'] }); },
  });
};

export const useUpdateVigilador = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<VigiladorForm> }) => vigiladoresService.updateVigilador(id, data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ['vigiladores'] });
      const previous = qc.getQueryData<any[]>(['vigiladores']) || [];
      qc.setQueryData<any[]>(['vigiladores'], (old = []) => old.map((v: any) => v.id_vigilador === id ? { ...v, ...data } : v));
      return { previous, id };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(['vigiladores'], ctx.previous);
      toast.error('No se pudo actualizar');
    },
    onSuccess: (_d, { id }) => { qc.invalidateQueries({ queryKey: ['vigilador', id] }); toast.success('Vigilador actualizado'); },
    onSettled: () => { qc.invalidateQueries({ queryKey: ['vigiladores'] }); },
  });
};

export const useDeleteVigilador = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: vigiladoresService.deleteVigilador,
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ['vigiladores'] });
      const previous = qc.getQueryData<any[]>(['vigiladores']) || [];
      qc.setQueryData<any[]>(['vigiladores'], (old = []) => old.filter((v: any) => v.id_vigilador !== id));
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(['vigiladores'], ctx.previous);
      toast.error('No se pudo eliminar');
    },
    onSuccess: () => { toast.success('Vigilador eliminado'); },
    onSettled: () => { qc.invalidateQueries({ queryKey: ['vigiladores'] }); },
  });
};


