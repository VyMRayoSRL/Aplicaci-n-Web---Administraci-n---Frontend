import api from './api';

export const diaVigiladorService = {
  async getByVigiladorYFecha(id_vigilador: number, fecha: string) {
    const resp = await api.get(`/dia-vigilador/buscar/por-fecha`, { params: { id_vigilador, fecha } });
    return resp.data; // null o objeto
  },

  async createDia(payload: { id_vigilador: number; fecha: string; estado: string }) {
    const resp = await api.post('/dia-vigilador', payload);
    return resp.data;
  },

  async listarDiasMes(id_vigilador: number, mes: number, anio: number) {
    const resp = await api.get('/dia-vigilador', { params: { id_vigilador, mes, anio } });
    return resp.data; // array de días del vigilador
  },

  async listarDiasMesLote(ids_vigilador: number[], mes: number, anio: number) {
    const resp = await api.post('/dia-vigilador/mes/lote', { ids_vigilador, mes, anio });
    return resp.data as Record<number, Array<{ id_dia_vigilador: number; fecha: string; estado: string }>>;
  },

  async updateDia(id_dia_vigilador: number, data: Partial<{ estado: string; fecha: string }>) {
    const resp = await api.put(`/dia-vigilador/${id_dia_vigilador}`, data);
    return resp.data;
  },
};


