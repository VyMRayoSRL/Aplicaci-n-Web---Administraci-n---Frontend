import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { planillasService } from '../services/planillas';
import { turnosService } from '../services/turnos';
import { novedadesService } from '../services/novedades';
import { getErrorMessage } from '../services/api';
import type { NovedadForm, Turno, TurnoForm } from '../types';

// Toda la pantalla de planilla sale de un solo pedido
export const useGrilla = (idPlanilla: number) =>
  useQuery({
    queryKey: ['grilla', idPlanilla],
    queryFn: () => planillasService.getGrilla(idPlanilla),
    enabled: !!idPlanilla,
    staleTime: 30 * 1000,
  });

// Después de cualquier cambio: la grilla (abierta o en otra planilla del vigilador) y la agenda
const useRefrescar = () => {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['grilla'] });
    qc.invalidateQueries({ queryKey: ['agenda'] });
    qc.invalidateQueries({ queryKey: ['planillas'] });
  };
};

// Las advertencias (más de 12 h, descanso corto) no impiden guardar: se avisan aparte
export const avisarAdvertencias = (turnos: Array<Pick<Turno, 'advertencias' | 'fecha'>>) => {
  const avisos = turnos.flatMap(t => (t.advertencias || []).map(a => (turnos.length > 1 ? `${t.fecha}: ${a.mensaje}` : a.mensaje)));
  if (avisos.length) toast(avisos.join('\n'), { icon: '⚠️', duration: 7000 });
};

const conError = (fallback: string) => (e: unknown) => toast.error(getErrorMessage(e, fallback));

export const useTurnoMutations = () => {
  const refrescar = useRefrescar();
  const crear = useMutation({
    mutationFn: (data: TurnoForm) => turnosService.createTurno(data),
    onSuccess: (t) => { refrescar(); toast.success('Turno cargado'); avisarAdvertencias([t]); },
    onError: conError('No se pudo cargar el turno'),
  });
  const editar = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Pick<TurnoForm, 'inicio' | 'fin'> }) => turnosService.updateTurno(id, data),
    onSuccess: (t) => { refrescar(); toast.success('Turno actualizado'); avisarAdvertencias([t]); },
    onError: conError('No se pudo actualizar el turno'),
  });
  const borrar = useMutation({
    mutationFn: (id: number) => turnosService.deleteTurno(id),
    onSuccess: () => { refrescar(); toast.success('Turno eliminado'); },
    onError: conError('No se pudo eliminar el turno'),
  });
  const lote = useMutation({
    mutationFn: (data: { id_planilla: number; turnos: Array<Omit<TurnoForm, 'id_planilla'>> }) => turnosService.createTurnosEnLote(data),
    onSuccess: ({ creados, fallidos }) => {
      refrescar();
      if (creados.length) toast.success(`${creados.length} turno${creados.length === 1 ? '' : 's'} cargado${creados.length === 1 ? '' : 's'}`);
      for (const f of fallidos) toast.error(`${f.turno.inicio.slice(0, 10)}: ${f.motivo}`, { duration: 7000 });
      avisarAdvertencias(creados);
    },
    onError: conError('No se pudieron cargar los turnos'),
  });
  return { crear, editar, borrar, lote };
};

export const useNovedadMutations = () => {
  const refrescar = useRefrescar();
  const crear = useMutation({
    mutationFn: (data: NovedadForm) => novedadesService.crear(data),
    onSuccess: () => { refrescar(); toast.success('Novedad cargada'); },
    onError: conError('No se pudo cargar la novedad'),
  });
  const editar = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Omit<NovedadForm, 'id_vigilador'>> }) => novedadesService.actualizar(id, data),
    onSuccess: () => { refrescar(); toast.success('Novedad actualizada'); },
    onError: conError('No se pudo actualizar la novedad'),
  });
  const borrar = useMutation({
    mutationFn: (id: number) => novedadesService.eliminar(id),
    onSuccess: () => { refrescar(); toast.success('Novedad eliminada'); },
    onError: conError('No se pudo eliminar la novedad'),
  });
  const adjuntar = useMutation({
    mutationFn: ({ id, archivo }: { id: number; archivo: File }) => novedadesService.adjuntar(id, archivo),
    onSuccess: () => { refrescar(); toast.success('Archivo adjuntado'); },
    onError: conError('No se pudo adjuntar el archivo'),
  });
  const quitarAdjunto = useMutation({
    mutationFn: (idAdjunto: number) => novedadesService.quitarAdjunto(idAdjunto),
    onSuccess: () => { refrescar(); toast.success('Adjunto eliminado'); },
    onError: conError('No se pudo eliminar el adjunto'),
  });
  return { crear, editar, borrar, adjuntar, quitarAdjunto };
};

export const useVigiladoresPlanilla = (idPlanilla: number) => {
  const refrescar = useRefrescar();
  const agregar = useMutation({
    mutationFn: (idVigilador: number) => planillasService.addVigilador(idPlanilla, idVigilador),
    onSuccess: () => { refrescar(); toast.success('Vigilador agregado'); },
    onError: conError('No se pudo agregar el vigilador'),
  });
  const quitar = useMutation({
    mutationFn: (idVigilador: number) => planillasService.removeVigilador(idPlanilla, idVigilador),
    onSuccess: () => { refrescar(); toast.success('Vigilador quitado de la planilla'); },
    onError: conError('No se pudo quitar el vigilador'),
  });
  return { agregar, quitar };
};
