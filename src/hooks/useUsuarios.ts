import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usuariosService, CreateUserPayload } from '../services/usuarios';
import toast from 'react-hot-toast';

export const useUsuarios = (filters?: { rol?: string; activo?: boolean }) => {
  return useQuery({
    queryKey: ['usuarios', filters || {}],
    queryFn: () => usuariosService.listar(filters),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateUsuario = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserPayload) => usuariosService.crear(data),
    // Optimistic update
    onMutate: async (newUser) => {
      await queryClient.cancelQueries({ queryKey: ['usuarios'] });
      const previous = queryClient.getQueryData<any[]>(['usuarios']) || [];
      const optimistic = {
        id_usuario: Math.floor(Math.random() * 1_000_000) * -1, // temporal negativo
        nombre: newUser.nombre,
        apellido: newUser.apellido,
        email: newUser.email,
        rol: newUser.rol || 'supervisor',
        activo: true,
      };
      queryClient.setQueryData<any[]>(['usuarios'], (old = []) => [optimistic, ...old]);
      return { previous };
    },
    onError: (err, _newUser, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['usuarios'], context.previous);
      }
      toast.error('No se pudo crear el usuario');
      console.error('Error creando usuario:', err);
    },
    onSuccess: () => {
      toast.success('Usuario creado correctamente');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
};

export const useUpdateUsuario = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateUserPayload> }) => usuariosService.actualizar(id, data),
    onSuccess: () => {
      toast.success('Usuario actualizado');
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
    onError: () => toast.error('No se pudo actualizar el usuario'),
  });
};

export const useCambiarRolUsuario = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, nuevoRol }: { id: number; nuevoRol: 'admin' | 'contabilidad' | 'supervisor' }) => usuariosService.cambiarRol(id, nuevoRol),
    onMutate: async ({ id, nuevoRol }) => {
      await queryClient.cancelQueries({ queryKey: ['usuarios'] });
      const previous = queryClient.getQueryData<any[]>(['usuarios']) || [];
      queryClient.setQueryData<any[]>(['usuarios'], (old = []) => old.map((u: any) => u.id_usuario === id ? { ...u, rol: nuevoRol } : u));
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['usuarios'], ctx.previous);
      toast.error('No se pudo cambiar el rol');
    },
    onSuccess: () => {
      toast.success('Rol actualizado');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
};

export const useCambiarEstadoUsuario = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) => usuariosService.cambiarEstado(id, activo),
    onMutate: async ({ id, activo }) => {
      await queryClient.cancelQueries({ queryKey: ['usuarios'] });
      const previous = queryClient.getQueryData<any[]>(['usuarios']) || [];
      queryClient.setQueryData<any[]>(['usuarios'], (old = []) => old.map((u: any) => u.id_usuario === id ? { ...u, activo } : u));
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['usuarios'], ctx.previous);
      toast.error('No se pudo cambiar el estado');
    },
    onSuccess: () => {
      toast.success('Estado actualizado');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
};

export const useDeleteUsuario = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => usuariosService.eliminar(id),
    onSuccess: () => {
      toast.success('Usuario eliminado');
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
    onError: () => toast.error('No se pudo eliminar el usuario'),
  });
};


