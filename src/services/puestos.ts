import api, { buildQueryParams } from './api';
import { Puesto, PuestoForm, PuestoFilters } from '../types';

export const puestosService = {
  // Obtener lista de puestos con filtros y paginación
  async getPuestos(filters?: Partial<PuestoFilters>): Promise<Puesto[]> {
    const queryParams = buildQueryParams(filters || {});
    const response = await api.get(`/puestos${queryParams ? `?${queryParams}` : ''}`);
    return response.data;
  },

  // Obtener un puesto por ID
  async getPuesto(id: number): Promise<Puesto> {
    const response = await api.get(`/puestos/${id}`);
    return response.data;
  },

  // Crear nuevo puesto
  async createPuesto(data: PuestoForm): Promise<Puesto> {
    const response = await api.post('/puestos', data);
    return response.data;
  },

  // Crear nuevo puesto con días tipo asociados
  async createPuestoConDiasTipo(payload: { datosPuesto: PuestoForm; dptList: any[] }): Promise<Puesto> {
    const response = await api.post('/puestos/con-dias-tipo', payload);
    return response.data;
  },

  // Actualizar puesto existente
  async updatePuesto(id: number, data: PuestoForm): Promise<Puesto> {
    const response = await api.put(`/puestos/${id}`, data);
    return response.data;
  },

  // Eliminar puesto (soft delete)
  async deletePuesto(id: number): Promise<{ message: string }> {
    const response = await api.delete(`/puestos/${id}`);
    return response.data;
  },

  // Activar/desactivar puesto
  async togglePuesto(id: number, activo: boolean): Promise<Puesto> {
    const response = await api.patch(`/puestos/${id}`, { activo });
    return response.data;
  },

  // Obtener puestos por servicio
  async getPuestosByServicio(idServicio: number): Promise<Puesto[]> {
    const response = await api.get(`/puestos/servicio/${idServicio}`);
    return response.data;
  },
};
