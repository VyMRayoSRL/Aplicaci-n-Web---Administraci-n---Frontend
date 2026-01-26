import api from './api';

export const turnosService = {
  async getByDiaPlanilla(idDiaPlanilla: number) {
    const response = await api.get(`/turnos/dia-planilla/${idDiaPlanilla}`);
    return response.data;
  },

  async listByDias(idsDiasPlanilla: number[]) {
    const response = await api.post('/turnos/listar-por-dias', { idsDiasPlanilla });
    return response.data;
  },

  async getByPlanilla(idPlanilla: number) {
    const response = await api.get(`/turnos/planilla/${idPlanilla}`);
    return response.data;
  },

  async getByDiaVigilador(idDiaVigilador: number) {
    const response = await api.get(`/turnos/dia-vigilador/${idDiaVigilador}`);
    return response.data;
  },

  async createTurno(payload: { id_dia_vigilador: number; id_dia_planilla: number; hora_inicio: string; cantidad_horas: number; turno_compartido?: boolean }) {
    const response = await api.post('/turnos', payload);
    return response.data;
  },

  async createTurnosEnLote(payload: {
    vigiladores: Array<{
      id_vigilador: number;
      dias_vigilador: Array<{ id_dia_vigilador: number; fecha: string; id_dia_planilla: number }>;
    }>;
    turnosOrganizadosPorDia: Array<{
      id_dia_planilla: number;
      vigiladores: Array<{
        id_vigilador: number;
        id_dia_vigilador: number;
        turnos: Array<{ hora_inicio: string; cantidad_horas: number }>;
      }>;
    }>;
  }) {
    const response = await api.post('/turnos/lote', payload);
    return response.data;
  },

  async updateTurno(id: number, data: Partial<{ hora_inicio: string; cantidad_horas: number; turno_compartido?: boolean }>) {
    const response = await api.put(`/turnos/${id}`, data);
    return response.data;
  },

  async deleteTurno(id: number) {
    const response = await api.delete(`/turnos/${id}`);
    return response.data;
  },

  async getBusyMapConflictos(payload: { vigiladorIds: number[]; from: string; to: string; excludePlanillaId?: number }) {
    const response = await api.post('/turnos/conflictos/busy-map', payload);
    return response.data as Record<number, Record<string, { hasConflict: boolean; detalles?: Array<{ servicio_nombre?: string; puesto_nombre?: string; hora_inicio: string; cantidad_horas: number }> }>>;
  },
};


