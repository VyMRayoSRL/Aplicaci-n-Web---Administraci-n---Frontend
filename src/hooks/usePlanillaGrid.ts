import { useMemo } from 'react';
import { usePlanillaDias, usePlanillaVigiladores } from './usePlanillaDetalle';
import { useQuery } from '@tanstack/react-query';
import { turnosService } from '../services/turnos';
import type { Turno, DiaVigiladorIndexMap, DiaPlanilla, Vigilador } from '../types';
import { useDiasVigiladorIndex } from './useDiasVigiladorIndex';

export const usePlanillaGrid = (idPlanilla: number) => {
  const { data: dias = [] as DiaPlanilla[], isLoading: loadingDias } = usePlanillaDias(idPlanilla) as unknown as { data: DiaPlanilla[]; isLoading: boolean };
  const { data: vigiladores = [] as Vigilador[], isLoading: loadingVigs } = usePlanillaVigiladores(idPlanilla) as unknown as { data: Vigilador[]; isLoading: boolean };

  const { data: diasVigiladorIndex = {} as DiaVigiladorIndexMap } = useDiasVigiladorIndex(idPlanilla, dias, vigiladores);

  // const idsDias = useMemo(() => dias.map((d: any) => d.id_dia_planilla), [dias]);
  const { data: turnos = [], isLoading: loadingTurnos } = useQuery({
    queryKey: ['turnos', 'planilla', idPlanilla],
    queryFn: () => turnosService.getByPlanilla(idPlanilla),
    enabled: !!idPlanilla,
    staleTime: 30 * 1000,
  });

  // indexar turnos por (id_vigilador, id_dia_planilla)
  const idDiaPlanillaToFecha = useMemo(() => {
    const m: Record<number, string> = {} as any;
    for (const d of dias) m[d.id_dia_planilla] = d.fecha;
    return m;
  }, [dias]);

  const grid = useMemo(() => {
    const map = new Map<string, Turno[]>();
    for (const t of (turnos as Turno[]) || []) {
      const vigiladorId = (t as any).id_vigilador as number;
      if (!vigiladorId) continue;
      const key = `${t.id_dia_planilla}:${vigiladorId}`;
      const arr = map.get(key) || [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [turnos, idDiaPlanillaToFecha]);

  return {
    dias,
    vigiladores,
    turnos,
    grid,
    diasVigiladorIndex,
    loading: loadingDias || loadingVigs || loadingTurnos,
  };
};


