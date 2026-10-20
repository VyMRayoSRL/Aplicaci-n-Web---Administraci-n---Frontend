import api from './api';
import { Planilla, PlanillaEstado, PlanillaForm } from '../types';

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
    const response = await api.post('/planillas', data,{timeout: 120000});
    return response.data;
  },

  async deletePlanilla(id: number): Promise<{ mensaje?: string; message?: string }> {
    const response = await api.delete(`/planillas/${id}`);
    return response.data;
  },

  async cambiarEstado(id: number, estado: PlanillaEstado): Promise<Planilla> {
    const response = await api.patch(`/planillas/${id}/estado`, { estado });
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
    const response = await api.post(`/planillas/${idPlanilla}/vigiladores`, { id_vigilador: idVigilador });
    return response.data;
  },

  // Cuántos turnos se borran si se quita al vigilador (para pedir confirmación)
  async contarTurnosVigilador(idPlanilla: number, idVigilador: number): Promise<number> {
    const response = await api.get(`/planillas/${idPlanilla}/vigiladores/${idVigilador}/turnos/cantidad`);
    return response.data.cantidad;
  },

  async removeVigilador(idPlanilla: number, idVigilador: number) {
    const response = await api.delete(`/planillas/${idPlanilla}/vigiladores`, { data: { id_vigilador: idVigilador } });
    return response.data;
  },
};


