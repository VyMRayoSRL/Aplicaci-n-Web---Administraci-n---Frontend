import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { puestosService } from '../services/puestos';
import { PuestoForm, PuestoFilters } from '../types';
import toast from 'react-hot-toast';

// Hook para obtener lista de puestos
export const usePuestos = (filters?: Partial<PuestoFilters>) => {
  return useQuery({
    queryKey: ['puestos', filters || {}],
    queryFn: () => puestosService.getPuestos(filters),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook para obtener un puesto específico
export const usePuesto = (id: number) => {
  return useQuery({
    queryKey: ['puesto', id],
    queryFn: () => puestosService.getPuesto(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

// Hook para obtener puestos por servicio
export const usePuestosByServicio = (idServicio: number) => {
  return useQuery({
    queryKey: ['puestos', 'servicio', idServicio],
    queryFn: () => puestosService.getPuestosByServicio(idServicio),
    enabled: !!idServicio,
    staleTime: 5 * 60 * 1000,
  });
};

// Hook para crear puesto
export const useCreatePuesto = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: puestosService.createPuesto,
    onMutate: async (data: PuestoForm) => {
      await queryClient.cancelQueries({ queryKey: ['puestos'] });
      const previous = queryClient.getQueryData<any[]>(['puestos']) || [];
      const optimistic = { id_puesto: Date.now() * -1, ...data, activo: true } as any;
      queryClient.setQueryData<any[]>(['puestos'], (old = []) => [optimistic, ...old]);
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['puestos'], ctx.previous);
      toast.error('No se pudo crear el puesto');
    },
    onSuccess: () => {
      toast.success('Puesto creado correctamente');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['puestos'] });
    },
  });
};

// Hook para crear puesto junto con días tipo
export const useCreatePuestoConDiasTipo = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: puestosService.createPuestoConDiasTipo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['puestos'] });
      toast.success('Puesto y días tipo creados correctamente');
    },
    onError: (error) => {
      toast.error('No se pudo crear el puesto con días tipo');
      console.error('Error creating puesto con DPT:', error);
    },
  });
};

// Hook para actualizar puesto
export const useUpdatePuesto = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PuestoForm }) =>
      puestosService.updatePuesto(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['puestos'] });
      const previous = queryClient.getQueryData<any[]>(['puestos']) || [];
      queryClient.setQueryData<any[]>(['puestos'], (old = []) => old.map((p: any) => p.id_puesto === id ? { ...p, ...data } : p));
      return { previous, id };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['puestos'], ctx.previous);
      toast.error('No se pudo actualizar el puesto');
    },
    onSuccess: (_d, { id }) => {
      toast.success('Puesto actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: ['puesto', id] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['puestos'] });
    },
  });
};

// Hook para eliminar puesto
export const useDeletePuesto = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: puestosService.deletePuesto,
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['puestos'] });
      const previous = queryClient.getQueryData<any[]>(['puestos']) || [];
      queryClient.setQueryData<any[]>(['puestos'], (old = []) => old.filter((p: any) => p.id_puesto !== id));
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['puestos'], ctx.previous);
      toast.error('No se pudo eliminar el puesto');
    },
    onSuccess: () => {
      toast.success('Puesto eliminado correctamente');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['puestos'] });
    },
  });
};

// Hook para activar/desactivar puesto
export const useTogglePuesto = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      puestosService.togglePuesto(id, activo),
    onMutate: async ({ id, activo }) => {
      await queryClient.cancelQueries({ queryKey: ['puestos'] });
      const previous = queryClient.getQueryData<any[]>(['puestos']) || [];
      queryClient.setQueryData<any[]>(['puestos'], (old = []) => old.map((p: any) => p.id_puesto === id ? { ...p, activo } : p));
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['puestos'], ctx.previous);
      toast.error('No se pudo cambiar el estado');
    },
    onSuccess: () => {
      toast.success('Estado del puesto actualizado');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['puestos'] });
    },
  });
};
