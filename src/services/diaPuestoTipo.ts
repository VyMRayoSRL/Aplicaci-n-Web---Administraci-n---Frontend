import api from './api';
import { DiaPuestoTipo, DiaPuestoTipoForm } from '../types';

export const diaPuestoTipoService = {
  async getByPuesto(idPuesto: number): Promise<DiaPuestoTipo[]> {
    const resp = await api.get(`/dia-puesto-tipo/puesto/${idPuesto}`);
    return resp.data;
  },

  async create(data: DiaPuestoTipoForm): Promise<DiaPuestoTipo> {
    const resp = await api.post('/dia-puesto-tipo', data);
    if (!resp) throw new Error('No se pudo crear el día tipo');
    return resp.data;
  },

  async update(id: number, data: Partial<DiaPuestoTipoForm>): Promise<DiaPuestoTipo> {
    const resp = await api.put(`/dia-puesto-tipo/${id}`, data);
    return resp.data;
  },

  async remove(id: number): Promise<{ mensaje?: string; message?: string }> {
    const resp = await api.delete(`/dia-puesto-tipo/${id}`);
    return resp.data;
  },
};


