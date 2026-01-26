import api from './api';
import { User } from '../types';

export interface CreateUserPayload {
  nombre: string;
  apellido: string;
  email: string;
  contraseña: string;
  rol?: 'admin' | 'contabilidad' | 'supervisor';
}

export const usuariosService = {
  async listar(params?: { rol?: string; activo?: boolean }): Promise<User[]> {
    const search = new URLSearchParams();
    if (params?.rol) search.append('rol', params.rol);
    if (params?.activo !== undefined) search.append('activo', String(params.activo));
    const qs = search.toString();
    const res = await api.get(`/usuarios${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  async crear(data: CreateUserPayload): Promise<User> {
    const res = await api.post('/usuarios', data);
    return res.data;
  },

  async actualizar(id: number, data: Partial<CreateUserPayload>): Promise<User> {
    const res = await api.put(`/usuarios/${id}`, data);
    return res.data;
  },

  async cambiarRol(id: number, nuevoRol: 'admin' | 'contabilidad' | 'supervisor'): Promise<User> {
    const res = await api.put(`/usuarios/${id}/rol`, { nuevoRol });
    return res.data;
  },

  async cambiarEstado(id: number, activo: boolean): Promise<User> {
    const res = await api.put(`/usuarios/${id}/estado`, { activo });
    return res.data;
  },

  async eliminar(id: number): Promise<{ mensaje: string }> {
    const res = await api.delete(`/usuarios/${id}`);
    return res.data;
  },
};


