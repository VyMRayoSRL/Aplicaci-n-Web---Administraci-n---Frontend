import { useQuery } from '@tanstack/react-query';
import { diaVigiladorService } from '../services/diaVigilador';

type DiaVigiladorIndexMap = Record<number, Record<string, any>>;

export const useDiasVigiladorIndex = (
  idPlanilla: number,
  dias: Array<{ fecha: string }> = [],
  vigiladores: Array<{ id_vigilador: number }> = []
) => {
  const mes = dias[0] ? Number(String(dias[0].fecha).split('-')[1]) : 0;
  const anio = dias[0] ? Number(String(dias[0].fecha).split('-')[0]) : 0;

  return useQuery<DiaVigiladorIndexMap>({
    queryKey: ['diasVigiladorIndex', idPlanilla, mes, anio, vigiladores.map(v => v.id_vigilador)],
    queryFn: async () => {
      if (!dias.length || !vigiladores.length || !mes || !anio) return {};
      const ids = vigiladores.map(v => Number(v.id_vigilador));
      const lote = await diaVigiladorService.listarDiasMesLote(ids, mes, anio);
      const index: DiaVigiladorIndexMap = {};
      for (const id of ids) {
        const arr = lote[id] || [];
        const map: Record<string, any> = {};
        for (const d of arr) map[d.fecha] = d;
        index[id] = map;
      }
      return index;
    },
    enabled: !!idPlanilla && !!mes && !!anio && vigiladores.length > 0 && dias.length > 0,
    staleTime: 30 * 1000,
  });
};


