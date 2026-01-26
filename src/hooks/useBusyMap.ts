import { useQuery } from '@tanstack/react-query';
import { turnosService } from '../services/turnos';

export type BusyMap = Record<number, Record<string, { hasConflict: boolean; detalles?: Array<{ servicio_nombre?: string; puesto_nombre?: string; hora_inicio: string; cantidad_horas: number }> }>>;

export const useBusyMap = ({planillaId,vigiladorIds,from,to,}: {
  planillaId: number;
  vigiladorIds: number[];
  from: string;
  to: string;
}) => {
  return useQuery<BusyMap>({
    queryKey: ['busyMap', planillaId, from, to, vigiladorIds],
    queryFn: () => turnosService.getBusyMapConflictos({ vigiladorIds, from, to, excludePlanillaId: planillaId }),
    enabled: !!planillaId && vigiladorIds.length > 0 && !!from && !!to,
    staleTime: 60 * 1000,
  });
};


