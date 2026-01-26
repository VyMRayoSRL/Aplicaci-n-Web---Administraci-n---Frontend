import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serviciosService } from '../services/servicios';
import { ServicioForm, ServicioFilters } from '../types';
import toast from 'react-hot-toast';

// Hook para obtener lista de servicios
export const useServicios = (filters?: Partial<ServicioFilters>) => {
  return useQuery({
    queryKey: ['servicios', filters || {}],
    queryFn: () => serviciosService.getServicios(filters),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook para obtener un servicio específico
export const useServicio = (id: number) => {
  return useQuery({
    queryKey: ['servicio', id],
    queryFn: () => serviciosService.getServicio(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

// Hook para crear servicio
export const useCreateServicio = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: serviciosService.createServicio,
    onMutate: async (data: ServicioForm) => {
      await queryClient.cancelQueries({ queryKey: ['servicios'] });
      const previous = queryClient.getQueryData<any[]>(['servicios']) || [];
      const optimistic = { id_servicio: Date.now() * -1, nombre: data.nombre, descripcion: (data as any).descripcion, activo: true };
      queryClient.setQueryData<any[]>(['servicios'], (old = []) => [optimistic, ...old]);
      return { previous };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['servicios'], ctx.previous);
      toast.error('No se pudo crear el servicio');
    },
    onSuccess: () => {
      toast.success('Servicio creado correctamente');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['servicios'] });
    },
  });
};

// Hook para actualizar servicio
export const useUpdateServicio = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ServicioForm }) =>
      serviciosService.updateServicio(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['servicios'] });
      const previous = queryClient.getQueryData<any[]>(['servicios']) || [];
      queryClient.setQueryData<any[]>(['servicios'], (old = []) => old.map((s: any) => s.id_servicio === id ? { ...s, ...data } : s));
      return { previous, id };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['servicios'], ctx.previous);
      toast.error('No se pudo actualizar el servicio');
    },
    onSuccess: (_d, { id }) => {
      toast.success('Servicio actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: ['servicio', id] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['servicios'] });
    },
  });
};

// Hook para eliminar servicio
export const useDeleteServicio = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: serviciosService.deleteServicio,
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['servicios'] });
      const previous = queryClient.getQueryData<any[]>(['servicios']) || [];
      queryClient.setQueryData<any[]>(['servicios'], (old = []) => old.filter((s: any) => s.id_servicio !== id));
      return { previous };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['servicios'], ctx.previous);
      toast.error('No se pudo eliminar el servicio');
    },
    onSuccess: () => {
      toast.success('Servicio eliminado correctamente');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['servicios'] });
    },
  });
};

// Hook para activar/desactivar servicio
// No hay toggle en backend; si se necesitara, se debe implementar en backend primero.

// Hook para transferir responsable de un servicio (solo admin)
export const useTransferirResponsableServicio = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, id_usuario }: { id: number; id_usuario: number }) =>
      serviciosService.transferirResponsable(id, id_usuario),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['servicios'] });
      const previous = queryClient.getQueryData<any[]>(['servicios']) || [];
      return { previous, id };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['servicios'], ctx.previous);
      toast.error('No se pudo transferir el responsable');
    },
    onSuccess: (_data, { id }) => {
      toast.success('Responsable transferido');
      queryClient.invalidateQueries({ queryKey: ['servicio', id] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['servicios'] });
    },
  });
};