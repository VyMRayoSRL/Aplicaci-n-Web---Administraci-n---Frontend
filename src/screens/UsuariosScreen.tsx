import React, { useMemo, useState } from 'react';
import { useUsuarios, useCreateUsuario, useCambiarRolUsuario, useCambiarEstadoUsuario } from '../hooks/useUsuarios';
import { usePermissions } from '../hooks/usePermissions';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const usuarioSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  apellido: z.string().min(1, 'Apellido requerido'),
  email: z.string().email('Email inválido'),
  contraseña: z.string().min(6, 'Mínimo 6 caracteres'),
  rol: z.enum(['admin', 'contabilidad', 'supervisor']).optional(),
});

type UsuarioFormData = z.infer<typeof usuarioSchema>;

const UsuariosScreen: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const { data: usuarios = [], isLoading } = useUsuarios();
  const createUsuario = useCreateUsuario();
  const cambiarRol = useCambiarRolUsuario();
  const cambiarEstado = useCambiarEstadoUsuario();
  const perms = usePermissions();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UsuarioFormData>({
    resolver: zodResolver(usuarioSchema),
  });

  const onSubmit = async (data: UsuarioFormData) => {
    await createUsuario.mutateAsync(data);
    reset();
    setShowForm(false);
  };

  const usuariosOrdenados = useMemo(() => {
    return [...usuarios].sort((a: any, b: any) => (a.apellido || '').localeCompare(b.apellido || ''));
  }, [usuarios]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="mt-2 text-sm text-gray-700">Gestión de usuarios del sistema</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cerrar' : 'Nuevo Usuario'}
        </button>
      </div>

      {showForm && perms.canManageUsers && (
        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input className="input-field" {...register('nombre')} />
              {errors.nombre && <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
              <input className="input-field" {...register('apellido')} />
              {errors.apellido && <p className="mt-1 text-sm text-red-600">{errors.apellido.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="input-field" {...register('email')} />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input type="password" className="input-field" {...register('contraseña')} />
              {errors.contraseña && <p className="mt-1 text-sm text-red-600">{errors.contraseña.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select className="input-field" defaultValue="supervisor" {...register('rol')}>
                <option value="admin">Admin</option>
                <option value="contabilidad">Contabilidad</option>
                <option value="supervisor">Supervisor</option>
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button className="btn-primary" type="submit" disabled={createUsuario.isPending}>
                {createUsuario.isPending ? 'Guardando...' : 'Guardar Usuario'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {isLoading ? (
          <div className="p-6">Cargando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Nombre</th>
                  <th className="table-header">Apellido</th>
                  <th className="table-header">Email</th>
                  <th className="table-header">Rol</th>
                  <th className="table-header">Estado</th>
                  {/* Sin acciones de eliminación: soft delete vía estado */}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usuariosOrdenados.map((u: any) => (
                  <tr key={u.id_usuario}>
                    <td className="table-cell">{u.nombre}</td>
                    <td className="table-cell">{u.apellido}</td>
                    <td className="table-cell">{u.email}</td>
                    <td className="table-cell">
                      {perms.canManageUsers ? (
                        <select
                          className="input-field"
                          value={u.rol}
                          onChange={(e) => cambiarRol.mutate({ id: u.id_usuario, nuevoRol: e.target.value as any })}
                        >
                          <option value="admin">Admin</option>
                          <option value="contabilidad">Contabilidad</option>
                          <option value="supervisor">Supervisor</option>
                        </select>
                      ) : (
                        u.rol
                      )}
                    </td>
                    <td className="table-cell">
                      {perms.canManageUsers ? (
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={!!u.activo}
                            onChange={(e) => cambiarEstado.mutate({ id: u.id_usuario, activo: e.target.checked })}
                          />
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </label>
                      ) : (
                        u.activo ? 'Activo' : 'Inactivo'
                      )}
                    </td>
                    {/* Eliminar deshabilitado: se usa activar/desactivar */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsuariosScreen;


