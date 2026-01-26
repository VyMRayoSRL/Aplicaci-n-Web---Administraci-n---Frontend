import api from './api';
import { Planilla, PlanillaForm } from '../types';

export const planillasService = {
  async getById(id: number): Promise<Planilla> {
    const response = await api.get(`/planillas/${id}`);
    return response.data;
  },

  async getByPuesto(idPuesto: number): Promise<Planilla[]> {
    const response = await api.get(`/planillas/puesto/${idPuesto}`);
    return response.data;
  },

  async createPlanilla(data: PlanillaForm): Promise<Planilla> {
    const response = await api.post('/planillas', data);
    return response.data;
  },

  async deletePlanilla(id: number): Promise<{ mensaje?: string; message?: string }> {
    const response = await api.delete(`/planillas/${id}`);
    return response.data;
  },

  async duplicatePlanilla(data: { id_puesto: number; mes_origen: number; anio_origen: number; mes_destino: number; anio_destino: number }): Promise<any> {
    const response = await api.post('/planillas/duplicar', data);
    return response.data;
  },

  // Días y vigiladores
  async getDias(idPlanilla: number) {
    const response = await api.get(`/planillas/${idPlanilla}/dias`);
    return response.data;
  },

  async getVigiladores(idPlanilla: number) {
    const response = await api.get(`/planillas/${idPlanilla}/vigiladores`);
    return response.data;
  },

  async addVigilador(idPlanilla: number, idVigilador: number) {
    const response = await api.post(`/planillas/${idPlanilla}/vigiladores`, { id_vigilador: idVigilador }).catch(err => {
      console.log(err.response?.data);
      console.log(err.response?.status);
    });
    if (!response) throw new Error('No se pudo agregar el vigilador');
    return response.data;
  },

  async removeVigilador(idPlanilla: number, idVigilador: number) {
    const response = await api.delete(`/planillas/${idPlanilla}/vigiladores`, { data: { id_vigilador: idVigilador } });
    return response.data;
  },
};


