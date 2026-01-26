import api, { buildQueryParams } from './api';
import { Vigilador } from '../types';

export interface VigiladorForm {
  nombre: string;
  apellido: string;
  dni: string | number;
  legajo: number;
}

export const vigiladoresService = {
  async getVigiladores(params?: { incluirInactivos?: boolean }): Promise<Vigilador[]> {
    const query = buildQueryParams(params || {});
    const resp = await api.get(`/vigiladores${query ? `?${query}` : ''}`);
    return resp.data;
  },

  async getVigilador(id: number): Promise<Vigilador> {
    const resp = await api.get(`/vigiladores/${id}`);
    return resp.data;
  },

  async createVigilador(data: VigiladorForm): Promise<Vigilador> {
    const payload = { ...data, dni: Number(data.dni) };
    const resp = await api.post('/vigiladores', payload).catch(err => {
      console.log(err.response?.data);
      console.log(err.response?.status);
    });
    if (!resp) throw new Error('No se pudo crear el vigilador');
    return resp.data;
  },

  async updateVigilador(id: number, data: Partial<VigiladorForm>): Promise<Vigilador> {
    const resp = await api.put(`/vigiladores/${id}`, data);
    return resp.data;
  },

  async deleteVigilador(id: number): Promise<{ mensaje?: string; message?: string }> {
    const resp = await api.delete(`/vigiladores/${id}`);
    return resp.data;
  },
};


