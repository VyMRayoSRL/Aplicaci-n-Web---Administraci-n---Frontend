import api from './api';
import type { Turno, TurnoForm } from '../types';

export type TurnosPorVigiladorYFecha = Record<number, Record<string, Turno[]>>;

export const turnosService = {
  async getByPlanilla(idPlanilla: number): Promise<Turno[]> {
    const response = await api.get(`/turnos/planilla/${idPlanilla}`);
    return response.data;
  },

  // Agenda del vigilador en todos los servicios (fechas YYYY-MM-DD, ambas incluidas)
  async getByVigilador(idVigilador: number, desde: string, hasta: string): Promise<Turno[]> {
    const response = await api.get(`/turnos/vigilador/${idVigilador}`, { params: { desde, hasta } });
    return response.data;
  },

  async createTurno(payload: TurnoForm): Promise<Turno> {
    const response = await api.post('/turnos', payload);
    return response.data;
  },

  // Los inválidos no frenan al resto: vuelven en "fallidos" con el motivo
  async createTurnosEnLote(payload: { id_planilla: number; turnos: Array<Omit<TurnoForm, 'id_planilla'>> }): Promise<{
    creados: Turno[];
    fallidos: Array<{ turno: Omit<TurnoForm, 'id_planilla'>; motivo: string }>;
  }> {
    const response = await api.post('/turnos/lote', payload);
    return response.data;
  },

  async updateTurno(id: number, data: Partial<Pick<TurnoForm, 'inicio' | 'fin'>>): Promise<Turno> {
    const response = await api.put(`/turnos/${id}`, data);
    return response.data;
  },

  async deleteTurno(id: number) {
    const response = await api.delete(`/turnos/${id}`);
    return response.data;
  },

  // Turnos de los vigiladores en otros puestos: información, no bloquean (R18)
  async getEnOtrasPlanillas(payload: { vigiladorIds: number[]; desde: string; hasta: string; excluirPlanilla?: number }): Promise<TurnosPorVigiladorYFecha> {
    const response = await api.post('/turnos/otras-planillas', payload);
    return response.data;
  },
};
