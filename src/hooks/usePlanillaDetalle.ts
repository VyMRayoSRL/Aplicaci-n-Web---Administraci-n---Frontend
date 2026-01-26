import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planillasService } from '../services/planillas';
import { turnosService } from '../services/turnos';
import toast from 'react-hot-toast';
// import { diaVigiladorService } from '../services/diaVigilador';

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
    onError: (e: any) => toast.error(e?.response?.data?.message || 'No se pudo agregar el vigilador'),
  });
};

export const useRemoveVigiladorFromPlanilla = (idPlanilla: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (idVigilador: number) => planillasService.removeVigilador(idPlanilla, idVigilador),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planilla', idPlanilla, 'vigiladores'] });
      qc.invalidateQueries({ queryKey: ['planilla', idPlanilla, 'dias'] });
      toast.success('Vigilador eliminado');
    },
    onError: () => toast.error('No se pudo eliminar el vigilador'),
  });
};

export const useTurnosByDiaPlanilla = (idDiaPlanilla: number) => {
  return useQuery({
    queryKey: ['turnos', 'diaPlanilla', idDiaPlanilla],
    queryFn: () => turnosService.getByDiaPlanilla(idDiaPlanilla),
    enabled: !!idDiaPlanilla,
    staleTime: 30 * 1000,
  });
};

export const useCreateTurno = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: turnosService.createTurno,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['turnos', 'diaPlanilla', (vars as any).id_dia_planilla] });
      // Invalida también la grilla de planilla completa para reflejar el nuevo turno
      if ((vars as any).id_planilla) {
        qc.invalidateQueries({ queryKey: ['turnos', 'planilla', (vars as any).id_planilla] });
      }
      // También refrescamos los días de la planilla (horas trabajadas/cumplidas)
      if ((vars as any).id_planilla) {
        qc.invalidateQueries({ queryKey: ['planilla', (vars as any).id_planilla, 'dias'] });
      }
      toast.success('Turno creado');
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || e?.response?.data?.error || 'No se pudo crear el turno';
      toast.error(msg);
    },
  });
};

export const useDeleteTurno = (idPlanilla?: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: turnosService.deleteTurno,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['turnos'] });
      if (idPlanilla) {
        qc.invalidateQueries({ queryKey: ['turnos', 'planilla', idPlanilla] });
        qc.invalidateQueries({ queryKey: ['planilla', idPlanilla, 'dias'] });
      }
      toast.success('Turno eliminado');
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || e?.response?.data?.error || 'No se pudo eliminar el turno';
      toast.error(msg);
    },
  });
};

export const useUpdateTurno = (idPlanilla?: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{ hora_inicio: string; cantidad_horas: number }> }) =>
      turnosService.updateTurno(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['turnos'] });
      if (idPlanilla) {
        qc.invalidateQueries({ queryKey: ['turnos', 'planilla', idPlanilla] });
        qc.invalidateQueries({ queryKey: ['planilla', idPlanilla, 'dias'] });
      }
      toast.success('Turno actualizado');
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || e?.response?.data?.error || 'No se pudo actualizar el turno';
      toast.error(msg);
    },
  });
};


