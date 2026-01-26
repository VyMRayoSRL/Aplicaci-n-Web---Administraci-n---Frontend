import { useMutation, useQueryClient } from '@tanstack/react-query';
import { diaVigiladorService } from '../services/diaVigilador';
import toast from 'react-hot-toast';

export const useUpdateDiaVigiladorEstado = (idPlanilla?: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id_dia_vigilador, estado }: { id_dia_vigilador: number; estado: string }) =>
      diaVigiladorService.updateDia(id_dia_vigilador, { estado }),
    onSuccess: () => {
      if (idPlanilla) {
        qc.invalidateQueries({ queryKey: ['planilla', idPlanilla, 'dias'] });
        qc.invalidateQueries({ queryKey: ['turnos', 'planilla', idPlanilla] });
        qc.invalidateQueries({ queryKey: ['diasVigiladorIndex'] });
      }
      toast.success('Estado del día actualizado');
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || e?.response?.data?.error || 'No se pudo actualizar el estado';
      toast.error(msg);
    },
  });
};


