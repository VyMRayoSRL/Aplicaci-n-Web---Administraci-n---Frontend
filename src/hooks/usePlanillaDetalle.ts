import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planillasService } from '../services/planillas';
import { turnosService } from '../services/turnos';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../services/api';
import type { Turno, TurnoForm } from '../types';

export const usePlanillaDias = (idPlanilla: number) => {
  return useQuery({
    queryKey: ['planilla', idPlanilla, 'dias'],
    queryFn: () => planillasService.getDias(idPlanilla),
    enabled: !!idPlanilla,
    staleTime: 60 * 1000,
  });
};

export const usePlanillaVigiladores = (idPlanilla: number) => {
  return useQuery({
    queryKey: ['planilla', idPlanilla, 'vigiladores'],
    queryFn: () => planillasService.getVigiladores(idPlanilla),
    enabled: !!idPlanilla,
    staleTime: 60 * 1000,
  });
};

export const useAddVigiladorToPlanilla = (idPlanilla: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (idVigilador: number) => planillasService.addVigilador(idPlanilla, idVigilador),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planilla', idPlanilla, 'vigiladores'] });
      qc.invalidateQueries({ queryKey: ['planilla', idPlanilla, 'dias'] });
      toast.success('Vigilador agregado');
    },
    onError: (e: any) => toast.error(getErrorMessage(e, 'No se pudo agregar el vigilador')),
  });
};

export const useRemoveVigiladorFromPlanilla = (idPlanilla: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (idVigilador: number) => planillasService.removeVigilador(idPlanilla, idVigilador),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planilla', idPlanilla, 'vigiladores'] });
      qc.invalidateQueries({ queryKey: ['planilla', idPlanilla, 'dias'] });
      qc.invalidateQueries({ queryKey: ['turnos'] });
      toast.success('Vigilador quitado de la planilla');
    },
    onError: (e: any) => toast.error(getErrorMessage(e, 'No se pudo quitar el vigilador')),
  });
};

// Después de cualquier cambio de turnos: la grilla, las horas del día y los turnos en otras planillas
const invalidarTurnos = (qc: ReturnType<typeof useQueryClient>, idPlanilla?: number) => {
  qc.invalidateQueries({ queryKey: ['turnos'] });
  if (idPlanilla) qc.invalidateQueries({ queryKey: ['planilla', idPlanilla, 'dias'] });
  qc.invalidateQueries({ queryKey: ['dias-vigilador'] });
};

// Las advertencias (más de 12 h, descanso corto) no impiden guardar: se avisan aparte
const avisarAdvertencias = (turno?: Turno) => {
  for (const a of turno?.advertencias || []) toast(a.mensaje, { icon: '⚠️', duration: 6000 });
};

export const useCreateTurno = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TurnoForm) => turnosService.createTurno(payload),
    onSuccess: (turno, vars) => {
      invalidarTurnos(qc, vars.id_planilla);
      toast.success('Turno creado');
      avisarAdvertencias(turno);
    },
    onError: (e: any) => toast.error(getErrorMessage(e, 'No se pudo crear el turno')),
  });
};

export const useDeleteTurno = (idPlanilla?: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => turnosService.deleteTurno(id),
    onSuccess: () => {
      invalidarTurnos(qc, idPlanilla);
      toast.success('Turno eliminado');
    },
    onError: (e: any) => toast.error(getErrorMessage(e, 'No se pudo eliminar el turno')),
  });
};

export const useUpdateTurno = (idPlanilla?: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Pick<TurnoForm, 'inicio' | 'fin'>> }) => turnosService.updateTurno(id, data),
    onSuccess: (turno) => {
      invalidarTurnos(qc, idPlanilla);
      toast.success('Turno actualizado');
      avisarAdvertencias(turno);
    },
    onError: (e: any) => toast.error(getErrorMessage(e, 'No se pudo actualizar el turno')),
  });
};
