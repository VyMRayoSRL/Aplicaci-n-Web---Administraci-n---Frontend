import { useQuery } from '@tanstack/react-query';
import { turnosService, type TurnosPorVigiladorYFecha } from '../services/turnos';

// Turnos de los vigiladores de la planilla en otros puestos, por vigilador y fecha.
export const useTurnosEnOtrasPlanillas = ({ planillaId, vigiladorIds, from, to }: {
  planillaId: number;
  vigiladorIds: number[];
  from: string;
  to: string;
}) => {
  return useQuery<TurnosPorVigiladorYFecha>({
    queryKey: ['turnos', 'otras-planillas', planillaId, from, to, vigiladorIds],
    queryFn: () => turnosService.getEnOtrasPlanillas({ vigiladorIds, desde: from, hasta: to, excluirPlanilla: planillaId }),
    enabled: !!planillaId && vigiladorIds.length > 0 && !!from && !!to,
    staleTime: 60 * 1000,
  });
};
