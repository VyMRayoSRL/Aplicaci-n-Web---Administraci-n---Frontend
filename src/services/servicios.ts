import api, { buildQueryParams } from './api';
import { Servicio, ServicioForm, ServicioFilters } from '../types';

export const serviciosService = {
  // Obtener lista de servicios con filtros y paginación
  async getServicios(filters?: Partial<ServicioFilters>): Promise<Servicio[]> {
    const queryParams = buildQueryParams(filters || {});
    const response = await api.get(`/servicios${queryParams ? `?${queryParams}` : ''}`);
    const list = response.data as any[];
    return list.map((s) => ({ ...s, descripcion: s.descripcion ?? s.ubicacion }));
  },

  // Obtener un servicio por ID
  async getServicio(id: number): Promise<Servicio> {
    const response = await api.get(`/servicios/${id}`);
    const s = response.data as any;
    return { ...s, descripcion: s.descripcion ?? s.ubicacion };
  },

  // Crear nuevo servicio
  async createServicio(data: ServicioForm): Promise<Servicio> {
    const payload = { nombre: data.nombre, ubicacion: data.descripcion };
    const response = await api.post('/servicios', payload);
    const s = response.data as any;
    return { ...s, descripcion: s.descripcion ?? s.ubicacion };
  },

  // Actualizar servicio existente
  async updateServicio(id: number, data: ServicioForm): Promise<Servicio> {
    const payload = { nombre: data.nombre, ubicacion: data.descripcion };
    const response = await api.put(`/servicios/${id}`, payload);
    const s = response.data as any;
    return { ...s, descripcion: s.descripcion ?? s.ubicacion };
  },

  // Eliminar servicio (soft delete)
  async deleteServicio(id: number): Promise<{ mensaje: string } | { message: string }> {
    const response = await api.delete(`/servicios/${id}`);
    return response.data;
  },

  // Transferir responsable del servicio
  async transferirResponsable(id: number, id_usuario: number): Promise<Servicio> {
    const response = await api.patch(`/servicios/${id}/transferir`, { id_usuario });
    const s = response.data as any;
    return { ...s, descripcion: s.descripcion ?? s.ubicacion };
  },

  // Nota: El backend no expone PATCH /servicios/:id para toggle.
};
