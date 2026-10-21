import api from './api';
import type { Novedad, NovedadForm } from '../types';

export const novedadesService = {
  async listar(vigiladorIds: number[], desde: string, hasta: string): Promise<Novedad[]> {
    if (!vigiladorIds.length) return [];
    const response = await api.get('/novedades', { params: { vigiladores: vigiladorIds.join(','), desde, hasta } });
    return response.data;
  },

  async crear(data: NovedadForm): Promise<Novedad> {
    const response = await api.post('/novedades', data);
    return response.data;
  },

  async actualizar(id: number, data: Partial<Omit<NovedadForm, 'id_vigilador'>>): Promise<Novedad> {
    const response = await api.put(`/novedades/${id}`, data);
    return response.data;
  },

  async eliminar(id: number) {
    const response = await api.delete(`/novedades/${id}`);
    return response.data;
  },

  async adjuntar(id: number, archivo: File): Promise<Novedad> {
    const form = new FormData();
    form.append('archivo', archivo);
    const response = await api.post(`/novedades/${id}/adjuntos`, form, { timeout: 60000, headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  },

  async quitarAdjunto(idAdjunto: number): Promise<Novedad> {
    const response = await api.delete(`/novedades/adjuntos/${idAdjunto}`);
    return response.data;
  },

  // Se pide con el token (la URL directa no lo lleva) y se abre en otra pestaña
  async abrirAdjunto(idAdjunto: number) {
    const response = await api.get(`/novedades/adjuntos/${idAdjunto}`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },
};
