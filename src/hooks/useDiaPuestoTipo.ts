import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { diaPuestoTipoService } from '../services/diaPuestoTipo';
import { DiaPuestoTipoForm } from '../types';
import toast from 'react-hot-toast';

export const useDptByPuesto = (idPuesto: number) => {
  return useQuery({
    queryKey: ['dpt', 'puesto', idPuesto],
    queryFn: () => diaPuestoTipoService.getByPuesto(idPuesto),
    enabled: !!idPuesto,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateDpt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: diaPuestoTipoService.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dpt'] });
      if ((data as any)?.id_puesto) {
        queryClient.invalidateQueries({ queryKey: ['dpt', 'puesto', (data as any).id_puesto] });
      }
      toast.success('Día tipo creado');
    },
    onError: () => toast.error('No se pudo crear el día tipo'),
  });
};

export const useUpdateDpt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DiaPuestoTipoForm> }) => diaPuestoTipoService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dpt'] });
      toast.success('Día tipo actualizado');
    },
    onError: () => toast.error('No se pudo actualizar el día tipo'),
  });
};

export const useDeleteDpt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: diaPuestoTipoService.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dpt'] });
      toast.success('Día tipo eliminado');
    },
    onError: () => toast.error('No se pudo eliminar el día tipo'),
  });
};


