import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { exportPlanillaExcel } from '../utils/exportPlanillaExcel';
import { Trash2, AlertTriangle } from 'lucide-react';
import { useParams, useLocation, useSearchParams } from 'react-router-dom';
import { usePlanilla } from '../hooks/usePlanillas';
import { usePlanillaGrid } from '../hooks/usePlanillaGrid';
import { weekdayLabelES } from '../utils/dateUtils';
import { sumHoras, sumDiurnas, sumNocturnas } from '../utils/turnoUtils';
import { useCreateTurno, useDeleteTurno, useUpdateTurno, useAddVigiladorToPlanilla, useRemoveVigiladorFromPlanilla } from '../hooks/usePlanillaDetalle';
import { usePermissions } from '../hooks/usePermissions';
import { useVigiladores } from '../hooks/useVigiladores';
import Modal from '../components/Modal';
import PlanillaToolbar from '../components/PlanillaToolbar';
import type { DiaPlanilla, Turno, Vigilador } from '../types';
import { DiaVigiladorEstado } from '../types';
import { turnosService } from '../services/turnos';
import { useUpdateDiaVigiladorEstado } from '../hooks/useDiaVigilador';
import { useBusyMap } from '../hooks/useBusyMap';

const PlanillaExcelScreen: React.FC = () => {
  const params = useParams();
  const planillaId = useMemo(() => Number(params.id || 0), [params.id]);
  const { data: planilla } = usePlanilla(planillaId);
  const location = useLocation();
  const servicioNombreNav = (location.state as any)?.servicioNombre as string | undefined;
  const puestoNombreNav = (location.state as any)?.puestoNombre as string | undefined;
  const [searchParams] = useSearchParams();
  const servicioNombreQs = searchParams.get('sn') || undefined;
  const puestoNombreQs = searchParams.get('pn') || undefined;
  // Persist/export context to survive refreshes
  const [ctxNames, setCtxNames] = useState<{ sn?: string; pn?: string }>({});
  const { dias, vigiladores, diasVigiladorIndex, grid, loading } = usePlanillaGrid(planillaId) as unknown as {
    dias: DiaPlanilla[];
    vigiladores: Vigilador[];
    diasVigiladorIndex: Record<number, Record<string, any>>;
    grid: Map<string, Turno[]>;
    loading: boolean;
  };
  const createTurno = useCreateTurno();
  const deleteTurno = useDeleteTurno(planillaId);
  const updateTurno = useUpdateTurno(planillaId);
  const addVigilador = useAddVigiladorToPlanilla(planillaId);
  const removeVigilador = useRemoveVigiladorFromPlanilla(planillaId);
  const { data: allVigiladores = [] } = useVigiladores({ incluirInactivos: true });
  const perms = usePermissions();
  const [modal, setModal] = useState<{ open: boolean; id_vigilador?: number; id_dia_planilla?: number }>({ open: false });
  const [form, setForm] = useState<{ hora_inicio: string; cantidad_horas: string }>({ hora_inicio: '', cantidad_horas: '' });
  // Estado para clonar un turno a otras fechas (mismo vigilador)
  const [cloneModal, setCloneModal] = useState<{
    open: boolean;
    id_vigilador?: number;
    id_dia_planilla_origen?: number;
    turno?: { hora_inicio: string; cantidad_horas: number };
  }>({ open: false });
  const [cloneSelection, setCloneSelection] = useState<Record<number, boolean>>({});
  const qc = useQueryClient();
  const [zoom, setZoom] = useState(0.9);
  const zoomOut = () => setZoom(z => Math.max(0.6, Math.round((z - 0.05) * 100) / 100));
  const zoomIn = () => setZoom(z => Math.min(1.2, Math.round((z + 0.05) * 100) / 100));
  const zoomReset = () => setZoom(1);
  const [showWeeklyTotals, setShowWeeklyTotals] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [vigFilter, setVigFilter] = useState('');
  const updateDiaEstado = useUpdateDiaVigiladorEstado(planillaId);
  const [conflictMap, setConflictMap] = useState<Record<string, boolean>>({});
  const [conflictDetails, setConflictDetails] = useState<Record<string, any[]>>({});

  // Nota: ya no se utiliza directamente; mantenido por compatibilidad futura
  // const diasIdSet = useMemo(() => new Set((dias as DiaPlanilla[]).map(d => d.id_dia_planilla)), [dias]);

  // Busy map desde backend (batch)
  const vigiladorIds = useMemo(() => (vigiladores as Vigilador[]).map(v => Number(v.id_vigilador)), [vigiladores]);
  const range = useMemo(() => {
    const first = (dias as DiaPlanilla[])[0]?.fecha;
    const last = (dias as DiaPlanilla[])[(dias as DiaPlanilla[]).length - 1]?.fecha;
    return { from: first, to: last };
  }, [dias]);
  const { data: busyMap } = useBusyMap({ planillaId, vigiladorIds, from: range.from || '', to: range.to || '' });

  // Precargar conflictos para todas las celdas visibles al montar/actualizar datos
  // Mapear busyMap del backend a conflictMap/local para UI
  useEffect(() => {
    if (!busyMap) return;
    const newMap: Record<string, boolean> = {};
    const newDetails: Record<string, any[]> = {};
    for (const vigIdStr of Object.keys(busyMap)) {
      const vigId = Number(vigIdStr);
      const days = (busyMap as any)[vigIdStr] || {};
      for (const fecha of Object.keys(days)) {
        const entry = days[fecha];
        const key = `${vigId}:${fecha}`;
        if (entry?.hasConflict) newMap[key] = true; else newMap[key] = false;
        if (Array.isArray(entry?.detalles)) newDetails[key] = entry.detalles;
      }
    }
    setConflictMap(newMap);
    setConflictDetails(newDetails);
  }, [busyMap]);

  const handleCellClick = async (id_vigilador: number, d: DiaPlanilla) => {
    if (!perms.canManagePlanillas) return;
    const dv = diasVigiladorIndex[id_vigilador]?.[d.fecha];
    if (!dv) {
      const { toast } = await import('react-hot-toast');
      toast.error('No existe Día del Vigilador. Agregalo a la planilla para generar sus días.');
      return;
    }
    const key = `${id_vigilador}:${d.fecha}`;
    const has = !!conflictMap[key];
    if (has) {
      const { toast } = await import('react-hot-toast');
      toast.error('Conflicto: el vigilador ya tiene turnos en otro servicio este día');
      return;
    }
    openCell(id_vigilador, d.id_dia_planilla);
  };

  const exportToExcel = async () => {
    const titulo = `${(ctxNames.sn || 'Servicio')} - ${(ctxNames.pn || 'Puesto')} - ${planilla?.mes}/${planilla?.anio}`;
    try {
      await exportPlanillaExcel({ dias: dias as any[], vigiladores: vigiladores as any[], grid: grid as any, titulo });
    } catch {
      console.error('No se pudo exportar a Excel');
      // mantener UI consistente con toasts en el resto de la app
      // nota: importamos on-demand para no romper
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const toast = require('react-hot-toast');
      toast.error('No se pudo exportar a Excel');
    }
  };

  useEffect(() => {
    const z = Number(localStorage.getItem('planilla_zoom'));
    if (!Number.isNaN(z) && z >= 0.6 && z <= 1.5) setZoom(z);
    // Load/export title context from state/query/localStorage
    const storedRaw = localStorage.getItem('planilla_title_ctx');
    const stored = storedRaw ? (JSON.parse(storedRaw) as { sn?: string; pn?: string }) : {};
    const sn = servicioNombreNav || servicioNombreQs || stored.sn;
    const pn = puestoNombreNav || puestoNombreQs || stored.pn;
    setCtxNames({ sn, pn });
    // Persist if we have fresh values
    if (servicioNombreNav || servicioNombreQs || puestoNombreNav || puestoNombreQs) {
      localStorage.setItem('planilla_title_ctx', JSON.stringify({ sn: sn || '', pn: pn || '' }));
    }
  }, []);
  useEffect(() => {
    localStorage.setItem('planilla_zoom', String(zoom));
  }, [zoom]);

  // Utilidad: día de la semana sin depender del timezone del navegador
  // Retorna 0=Domingo, 1=Lunes, ... 6=Sábado
  const getWeekday = (dateStr: string) => {
    // Simple wrapper if needed elsewhere; reuse weekdayLabelES where possible
    const labels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return labels.indexOf(weekdayLabelES(dateStr));
  };
  const isMonday = (dateStr: string) => getWeekday(dateStr) === 1;
  const isWeekend = (dateStr: string) => [0, 6].includes(getWeekday(dateStr));
  const weekdayLabel = (dateStr: string) => weekdayLabelES(dateStr);

  // Agrupar columnas por semana visible (de Lunes a Domingo)
  const weekGroups = useMemo(() => {
    const groups: { startIndex: number; length: number; label: string }[] = [];
    if (!Array.isArray(dias) || dias.length === 0) return groups;
    let i = 0;
    let weekCount = 1;
    while (i < dias.length) {
      let len = 0;
      while (i + len < dias.length) {
        const current = dias[i + len] as DiaPlanilla;
        if (len > 0 && isMonday(current.fecha)) break;
        len++;
      }
      groups.push({ startIndex: i, length: len, label: `Semana ${weekCount++}` });
      i += len;
    }
    return groups;
  }, [dias]);

  const weeklyTotals = useMemo(() => {
    return weekGroups.map(g => {
      const slice = (dias as DiaPlanilla[]).slice(g.startIndex, g.startIndex + g.length);
      const req = slice.reduce((a, d) => a + Number(d.horas_requeridas || 0), 0);
      const trab = slice.reduce((a, d) => a + Number(d.horas_totales_trabajadas || 0), 0);
      const cumpl = slice.reduce((a, d) => a + Number(d.horas_cumplidas || 0), 0);
      return { req, trab, cumpl };
    });
  }, [weekGroups, dias]);

  const monthTotals = useMemo(() => {
    const req = (dias as DiaPlanilla[]).reduce((a, d) => a + Number(d.horas_requeridas || 0), 0);
    const trab = (dias as DiaPlanilla[]).reduce((a, d) => a + Number(d.horas_totales_trabajadas || 0), 0);
    const cumpl = (dias as DiaPlanilla[]).reduce((a, d) => a + Number(d.horas_cumplidas || 0), 0);
    return { req, trab, cumpl };
  }, [dias]);

  if (!planillaId) return <div className="p-4">Planilla no especificada</div>;
  if (loading) return <div className="p-4">Cargando...</div>;

  const openCell = (id_vigilador: number, id_dia_planilla: number) => {
    setModal({ open: true, id_vigilador, id_dia_planilla });
  };

  const submitTurno = async () => {
    if (!modal.id_dia_planilla || !modal.id_vigilador) return;
    const dia = dias.find((d: any) => d.id_dia_planilla === modal.id_dia_planilla);
    if (!dia) return;
    // Resolver dia_vigilador por índice precargado (no crear automáticamente)
    const dv = diasVigiladorIndex[modal.id_vigilador!]?.[dia.fecha];
    if (!dv) { 
      const { toast } = await import('react-hot-toast');
      toast.error('No existe Día del Vigilador para ese vigilador y fecha. Agregalo a la planilla para generar sus días.');
      return; 
    }
    createTurno.mutate({ id_dia_vigilador: dv.id_dia_vigilador, id_dia_planilla: modal.id_dia_planilla, hora_inicio: form.hora_inicio, cantidad_horas: Number(form.cantidad_horas), id_planilla: planillaId } as any);
    setModal({ open: false });
    setForm({ hora_inicio: '', cantidad_horas: '' });
  };

  // Abrir el modal de clonado desde un turno existente de la celda
  const openCloneFromTurno = (t: any) => {
    if (!modal.id_vigilador || !modal.id_dia_planilla) return;
    setCloneModal({
      open: true,
      id_vigilador: modal.id_vigilador,
      id_dia_planilla_origen: modal.id_dia_planilla,
      turno: { hora_inicio: t.hora_inicio, cantidad_horas: Number(t.cantidad_horas) },
    });
    setCloneSelection({});
  };

  // Fechas destino agrupadas por semana, donde exista dia_vigilador
  const cloneTargetsByWeek = (() => {
    if (!cloneModal.open || !cloneModal.id_vigilador) return [] as { label: string; days: DiaPlanilla[] }[];
    const weeks: { label: string; days: DiaPlanilla[] }[] = [];
    weekGroups.forEach(g => {
      const days: DiaPlanilla[] = [];
      for (let j = 0; j < g.length; j++) {
        const d = (dias as DiaPlanilla[])[g.startIndex + j];
        if (d.id_dia_planilla === cloneModal.id_dia_planilla_origen) continue;
        const dv = diasVigiladorIndex[cloneModal.id_vigilador!]?.[d.fecha];
        if (dv) days.push(d);
      }
      weeks.push({ label: g.label, days });
    });
    return weeks;
  })();

  const toggleSelectDay = (idDia: number, value?: boolean) => {
    setCloneSelection(prev => {
      const next = { ...prev } as Record<number, boolean>;
      const newVal = typeof value === 'boolean' ? value : !prev[idDia];
      if (newVal) next[idDia] = true; else delete next[idDia];
      return next;
    });
  };

  const selectAll = () => {
    const next: Record<number, boolean> = {};
    cloneTargetsByWeek.forEach(w => w.days.forEach(d => { next[d.id_dia_planilla] = true; }));
    setCloneSelection(next);
  };

  const clearAll = () => setCloneSelection({});

  const toggleWeek = (weekIdx: number, value: boolean) => {
    const week = cloneTargetsByWeek[weekIdx];
    if (!week) return;
    setCloneSelection(prev => {
      const next = { ...prev } as Record<number, boolean>;
      week.days.forEach(d => {
        if (value) next[d.id_dia_planilla] = true; else delete next[d.id_dia_planilla];
      });
      return next;
    });
  };

  const confirmClone = async () => {
    if (!cloneModal.turno || !cloneModal.id_vigilador) return;
    const { hora_inicio, cantidad_horas } = cloneModal.turno;
    const selectedIds = Object.keys(cloneSelection).map(k => Number(k));
    if (selectedIds.length === 0) { setCloneModal({ open: false }); return; }

    // Filtrar destinos: deben tener dia_vigilador y no ser duplicados exactos
    const filteredSet = new Set<number>();
    for (const idDia of selectedIds) {
      const d = (dias as DiaPlanilla[]).find(dd => dd.id_dia_planilla === idDia);
      if (!d) continue;
      const dv = diasVigiladorIndex[cloneModal.id_vigilador!]?.[d.fecha];
      if (!dv) continue;
      const key = `${idDia}:${cloneModal.id_vigilador}`;
      const existing = (grid.get(key) || []) as Turno[];
      const dup = existing.some(tt => tt.hora_inicio === hora_inicio && Number(tt.cantidad_horas) === Number(cantidad_horas));
      if (!dup) filteredSet.add(idDia);
    }
    if (filteredSet.size === 0) { setCloneModal({ open: false }); return; }

    // Armar payload para /turnos/lote
    const idVig = cloneModal.id_vigilador!;
    const diasVigiladorListado = (dias as DiaPlanilla[])
      .map(d => {
        const dv = diasVigiladorIndex[idVig]?.[d.fecha];
        return dv ? { id_dia_vigilador: dv.id_dia_vigilador as number, fecha: d.fecha as string, id_dia_planilla: d.id_dia_planilla as number } : null;
      })
      .filter(Boolean) as Array<{ id_dia_vigilador: number; fecha: string; id_dia_planilla: number }>;

    const turnosOrganizadosPorDia = (dias as DiaPlanilla[]).map(d => {
      if (!filteredSet.has(d.id_dia_planilla)) {
        return { id_dia_planilla: d.id_dia_planilla, vigiladores: [] as any[] };
      }
      const dv = diasVigiladorIndex[idVig]?.[d.fecha];
      if (!dv) return { id_dia_planilla: d.id_dia_planilla, vigiladores: [] as any[] };
      return {
        id_dia_planilla: d.id_dia_planilla,
        vigiladores: [
          {
            id_vigilador: idVig,
            id_dia_vigilador: dv.id_dia_vigilador as number,
            turnos: [{ hora_inicio, cantidad_horas: Number(cantidad_horas) }],
          },
        ],
      };
    });

    try {
      await turnosService.createTurnosEnLote({
        vigiladores: [
          {
            id_vigilador: idVig,
            dias_vigilador: diasVigiladorListado,
          },
        ],
        turnosOrganizadosPorDia,
      });
    } catch {
      // silencioso por preferencia actual
    }

    if (planillaId) {
      qc.invalidateQueries({ queryKey: ['turnos', 'planilla', planillaId] });
      qc.invalidateQueries({ queryKey: ['planilla', planillaId, 'dias'] });
    }
    setCloneModal({ open: false });
    setCloneSelection({});
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Planilla (vista Excel) #{planilla?.id_planilla}</h1>
        <p className="text-sm text-gray-600">Mes {planilla?.mes}/{planilla?.anio}</p>
      </div>

      <PlanillaToolbar
        zoom={zoom}
        onZoomOut={zoomOut}
        onZoomIn={zoomIn}
        onZoomReset={zoomReset}
        showWeeklyTotals={showWeeklyTotals}
        onToggleWeeklyTotals={setShowWeeklyTotals}
        canManage={perms.canManagePlanillas}
        onAddVigilador={() => setAddModalOpen(true)}
        onExport={exportToExcel}
      />

      <div className="overflow-auto">
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `${100/zoom}%` }}>
          <table className="min-w-max border-collapse">
          <thead>
            {/* Cabecera de semanas */}
            {weekGroups.length > 0 && (
              <tr>
                <th className="border px-3 py-1 sticky left-0 bg-white text-xs text-gray-600">&nbsp;</th>
                {weekGroups.map((g, idx) => (
                  <th key={`w-${idx}`} colSpan={g.length + (showWeeklyTotals ? 1 : 0)} className="border px-3 py-1 text-xs bg-gray-50">{g.label}</th>
                ))}
                <th className="border px-3 py-1 text-xs bg-gray-50">Total</th>
                <th className="border px-3 py-1 text-xs bg-gray-50">Diurnas</th>
                <th className="border px-3 py-1 text-xs bg-gray-50">Nocturnas</th>
              </tr>
            )}
            <tr>
              <th className="border px-3 py-2 sticky left-0 bg-white">Vigilador</th>
              {weekGroups.map((g, idx) => (
                <React.Fragment key={`dh-${idx}`}>
                  {Array.from({ length: g.length }).map((_, j) => {
                    const d: DiaPlanilla = (dias as DiaPlanilla[])[g.startIndex + j];
                    return (
                      <th
                        key={d.id_dia_planilla}
                        className={`border px-3 py-1 text-sm ${isMonday(d.fecha) ? 'border-l-2 border-gray-400' : ''} ${isWeekend(d.fecha) ? 'bg-rose-50' : ''}`}
                      >
                        <div className="flex flex-col items-center leading-tight">
                          <div className={`text-[10px] ${isWeekend(d.fecha) ? 'text-rose-700' : 'text-gray-500'}`}>{weekdayLabel(d.fecha)}</div>
                          <div className="text-sm">{Number(String(d.fecha).split('-')[2])}</div>
                        </div>
                      </th>
                    );
                  })}
                  {showWeeklyTotals && <th className="border px-2 py-1 text-[11px] bg-blue-50 text-blue-800">Σ</th>}
                </React.Fragment>
              ))}
              <th className="border px-3 py-2 text-sm">Total</th>
              <th className="border px-3 py-2 text-sm">Diurnas</th>
              <th className="border px-3 py-2 text-sm">Nocturnas</th>
            </tr>
          </thead>
          <tbody>
            {vigiladores.map((v: any) => (
              <tr key={v.id_vigilador}>
                <td className="border px-3 py-2 sticky left-0 bg-white text-sm font-medium">
                  <div className="flex items-center justify-between gap-2">
                    <span>Leg {v.legajo} - {v.apellido}, {v.nombre}</span>
                    {perms.canManagePlanillas && (
                      <button
                        title="Quitar vigilador"
                        aria-label={`Quitar vigilador ${v.apellido}, ${v.nombre}`}
                        className="p-1.5 rounded-full hover:bg-red-50 text-red-600 inline-flex"
                        onClick={() => removeVigilador.mutate(v.id_vigilador)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
                {weekGroups.map((g, idx) => {
                  // celdas de días de la semana
                  return (
                    <React.Fragment key={`rw-${v.id_vigilador}-${idx}`}>
                      {Array.from({ length: g.length }).map((_, j) => {
                        const d: DiaPlanilla = (dias as DiaPlanilla[])[g.startIndex + j];
                        const key = `${d.id_dia_planilla}:${v.id_vigilador}`;
                        const ts = (grid.get(key) || []) as Turno[];
                        return (
                          <td
                            key={`${d.id_dia_planilla}:${v.id_vigilador}`}
                            className={`border px-3 py-3 ${conflictMap[`${v.id_vigilador}:${d.fecha}`] ? 'bg-amber-50 cursor-not-allowed' : 'hover:bg-blue-50 cursor-pointer'} align-top ${isMonday(d.fecha) ? 'border-l-2 border-gray-400' : ''} ${!conflictMap[`${v.id_vigilador}:${d.fecha}`] && isWeekend(d.fecha) ? 'bg-rose-50' : ''}`}
                            title={(() => {
                              const cKey = `${v.id_vigilador}:${d.fecha}`;
                              const conflicts = conflictDetails[cKey];
                              if (Array.isArray(conflicts) && conflicts.length > 0) {
                                return conflicts.map((t: any) => {
                                  const servicioNombre = t?.servicio?.nombre || t?.puesto?.servicio?.nombre || t?.servicio_nombre || '';
                                  const puestoNombre = t?.puesto?.nombre || t?.puesto_nombre || '';
                                  const inicio = t?.hora_inicio || '';
                                  const horas = typeof t?.cantidad_horas !== 'undefined' ? `${t.cantidad_horas}h` : '';
                                  return `${[servicioNombre, puestoNombre].filter(Boolean).join(' · ')}${inicio ? ` · ${inicio}` : ''}${horas ? ` · ${horas}` : ''}`.trim();
                                }).join('\n');
                              }
                              return conflictMap[cKey] ? 'Conflicto con otro servicio' : undefined;
                            })()}
                            onMouseEnter={() => {/* no-op, ya viene del busy map */}}
                            onClick={() => handleCellClick(v.id_vigilador, d)}
                          >
                            {ts.length === 0 ? (
                              <div className="text-xs text-gray-400">—</div>
                            ) : ts.length === 1 ? (
                              <div className="text-[11px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded inline-block">
                                {ts[0].hora_inicio} · {ts[0].cantidad_horas as number}h
                              </div>
                            ) : (
                              <div className="text-[11px] bg-blue-100/60 text-blue-800 px-1 py-0.5 rounded inline-flex items-center gap-1">
                                <span>{ts.length} turnos</span>
                                <span className="w-1 h-1 bg-blue-700 rounded-full"></span>
                                <span>{ts[0].hora_inicio}</span>
                              </div>
                            )}
                            {(() => {
                              const dv = (diasVigiladorIndex as any)?.[v.id_vigilador]?.[d.fecha];
                              if (!dv) return null;
                              const est = String(dv.estado || '');
                              const cls =
                                est === DiaVigiladorEstado.FRANCO ? 'bg-gray-200 text-gray-800' :
                                est === DiaVigiladorEstado.LICENCIA ? 'bg-purple-100 text-purple-800' :
                                est === DiaVigiladorEstado.VACACIONES ? 'bg-amber-100 text-amber-800' :
                                est === DiaVigiladorEstado.AUSENTE ? 'bg-red-100 text-red-800' :
                                est === DiaVigiladorEstado.FERIADO ? 'bg-green-100 text-green-800' :
                                est === DiaVigiladorEstado.ENFERMO ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-700';
                              const cKey = `${v.id_vigilador}:${d.fecha}`;
                              const conflicts = conflictDetails[cKey];
                              const hasConflict = Array.isArray(conflicts) ? conflicts.length > 0 : !!conflictMap[cKey];
                              const title = Array.isArray(conflicts) && conflicts.length > 0
                                ? conflicts.map((t: any) => {
                                    const servicioNombre = t?.servicio?.nombre || t?.puesto?.servicio?.nombre || t?.servicio_nombre || '';
                                    const puestoNombre = t?.puesto?.nombre || t?.puesto_nombre || '';
                                    const inicio = t?.hora_inicio || '';
                                    const horas = typeof t?.cantidad_horas !== 'undefined' ? `${t.cantidad_horas}h` : '';
                                    return `${[servicioNombre, puestoNombre].filter(Boolean).join(' · ')}${inicio ? ` · ${inicio}` : ''}${horas ? ` · ${horas}` : ''}`.trim();
                                  }).join('\n')
                                : 'Conflicto con otro servicio';
                              return (
                                <div className="mt-1 flex items-center gap-1">
                                  {(est !== DiaVigiladorEstado.TRABAJA && est !== DiaVigiladorEstado.NO_ASIGNADO) && (
                                    <div className={`inline-block text-[10px] px-1 py-0.5 rounded ${cls}`}>{est}</div>
                                  )}
                                  {hasConflict && (
                                    <span title={title} className="inline-flex items-center text-amber-600">
                                      <AlertTriangle className="w-3 h-3" />
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                        );
                      })}
                      {/* total semanal del vigilador */}
                      {showWeeklyTotals && (
                        <td className="border px-2 py-2 text-right text-[11px] bg-blue-50 text-blue-800 font-semibold">
                          {Array.from({ length: g.length }).reduce<number>((acc, _, j) => {
                            const d: DiaPlanilla = (dias as DiaPlanilla[])[g.startIndex + j];
                            const key = `${d.id_dia_planilla}:${v.id_vigilador}`;
                            const ts = (grid.get(key) || []) as Turno[];
                            return acc + sumHoras(ts);
                          }, 0)}
                        </td>
                      )}
                    </React.Fragment>
                  );
                })}
                {/* Total mensual por vigilador */}
                <td className="border px-3 py-2 text-right text-sm font-semibold bg-blue-50 text-blue-800">
                  {(dias as DiaPlanilla[]).reduce((acc: number, d: DiaPlanilla) => {
                    const key = `${d.id_dia_planilla}:${v.id_vigilador}`;
                    const ts = (grid.get(key) || []) as Turno[];
                    return acc + sumHoras(ts);
                  }, 0)}
                </td>
                {/* Totales diurnas y nocturnas por vigilador */}
                <td className="border px-3 py-2 text-right text-sm font-semibold bg-blue-50 text-blue-800">
                  {(dias as DiaPlanilla[]).reduce((acc: number, d: DiaPlanilla) => {
                    const key = `${d.id_dia_planilla}:${v.id_vigilador}`;
                    const ts = (grid.get(key) || []) as Turno[];
                    return acc + sumDiurnas(ts);
                  }, 0)}
                </td>
                <td className="border px-3 py-2 text-right text-sm font-semibold bg-blue-50 text-blue-800">
                  {(dias as DiaPlanilla[]).reduce((acc: number, d: DiaPlanilla) => {
                    const key = `${d.id_dia_planilla}:${v.id_vigilador}`;
                    const ts = (grid.get(key) || []) as Turno[];
                    return acc + sumNocturnas(ts);
                  }, 0)}
                </td>
              </tr>
            ))}
            {/* Totales al final: requeridas, trabajadas y cumplidas */}
            <tr>
              <td className="border px-3 py-2 font-semibold sticky left-0 bg-white">Horas requeridas</td>
              {weekGroups.map((g, idx) => (
                <React.Fragment key={`sum-req-${idx}`}>
                  {Array.from({ length: g.length }).map((_, j) => {
                    const d: any = (dias as any[])[g.startIndex + j];
                    return (
                      <td key={`req-${d.id_dia_planilla}`} className={`border px-3 py-2 text-right text-sm ${isMonday(d.fecha) ? 'border-l-2 border-gray-400' : ''} ${isWeekend(d.fecha) ? 'bg-rose-50' : ''}`}>{d.horas_requeridas || 0}</td>
                    );
                  })}
                  {showWeeklyTotals && (
                    <td className="border px-2 py-2 text-right text-[11px] bg-blue-50 text-blue-800 font-semibold">{weeklyTotals[idx]?.req ?? 0}</td>
                  )}
                </React.Fragment>
              ))}
              <td className="border px-3 py-2 text-right text-sm bg-gray-50 font-semibold">{monthTotals.req}</td>
              <td className="border px-3 py-2 bg-gray-50"></td>
              <td className="border px-3 py-2 bg-gray-50"></td>
            </tr>
            <tr>
              <td className="border px-3 py-2 font-semibold sticky left-0 bg-white">Horas trabajadas</td>
              {weekGroups.map((g, idx) => (
                <React.Fragment key={`sum-trab-${idx}`}>
                  {Array.from({ length: g.length }).map((_, j) => {
                    const d: any = (dias as any[])[g.startIndex + j];
                    return (
                      <td key={`trab-${d.id_dia_planilla}`} className={`border px-3 py-2 text-right text-sm ${isMonday(d.fecha) ? 'border-l-2 border-gray-400' : ''} ${isWeekend(d.fecha) ? 'bg-rose-50' : ''}`}>{d.horas_totales_trabajadas || 0}</td>
                    );
                  })}
                  {showWeeklyTotals && (
                    <td className="border px-2 py-2 text-right text-[11px] bg-blue-50 text-blue-800 font-semibold">{weeklyTotals[idx]?.trab ?? 0}</td>
                  )}
                </React.Fragment>
              ))}
              <td className="border px-3 py-2 text-right text-sm bg-gray-50 font-semibold">{monthTotals.trab}</td>
              <td className="border px-3 py-2 bg-gray-50"></td>
              <td className="border px-3 py-2 bg-gray-50"></td>
            </tr>
            <tr>
              <td className="border px-3 py-2 font-semibold sticky left-0 bg-white">Horas cumplidas</td>
              {weekGroups.map((g, idx) => (
                <React.Fragment key={`sum-cumpl-${idx}`}>
                  {Array.from({ length: g.length }).map((_, j) => {
                    const d: any = (dias as any[])[g.startIndex + j];
                    return (
                      <td key={`cumpl-${d.id_dia_planilla}`} className={`border px-3 py-2 text-right text-sm ${isMonday(d.fecha) ? 'border-l-2 border-gray-400' : ''} ${isWeekend(d.fecha) ? 'bg-rose-50' : ''}`}>{d.horas_cumplidas || 0}</td>
                    );
                  })}
                  {showWeeklyTotals && (
                    <td className="border px-2 py-2 text-right text-[11px] bg-blue-50 text-blue-800 font-semibold">{weeklyTotals[idx]?.cumpl ?? 0}</td>
                  )}
                </React.Fragment>
              ))}
              <td className="border px-3 py-2 text-right text-sm bg-gray-50 font-semibold">{monthTotals.cumpl}</td>
              <td className="border px-3 py-2 bg-gray-50"></td>
              <td className="border px-3 py-2 bg-gray-50"></td>
            </tr>
            {showWeeklyTotals && weekGroups.length > 0 && (
              <>
                <tr>
                  <td className="border px-3 py-2 font-semibold sticky left-0 bg-white">Requeridas por semana</td>
                  {weekGroups.map((g, idx) => (
                    <td key={`wreq-${idx}`} colSpan={g.length + 1} className="border px-3 py-2 text-right text-sm bg-blue-50 text-blue-800">{weeklyTotals[idx]?.req ?? 0}</td>
                  ))}
                  <td className="border px-3 py-2 text-right text-sm bg-gray-50 font-semibold">{monthTotals.req}</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2 font-semibold sticky left-0 bg-white">Trabajadas por semana</td>
                  {weekGroups.map((g, idx) => (
                    <td key={`wtrab-${idx}`} colSpan={g.length + 1} className="border px-3 py-2 text-right text-sm bg-blue-50 text-blue-800">{weeklyTotals[idx]?.trab ?? 0}</td>
                  ))}
                  <td className="border px-3 py-2 text-right text-sm bg-gray-50 font-semibold">{monthTotals.trab}</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2 font-semibold sticky left-0 bg-white">Cumplidas por semana</td>
                  {weekGroups.map((g, idx) => (
                    <td key={`wcumpl-${idx}`} colSpan={g.length + 1} className="border px-3 py-2 text-right text-sm bg-blue-50 text-blue-800">{weeklyTotals[idx]?.cumpl ?? 0}</td>
                  ))}
                  <td className="border px-3 py-2 text-right text-sm bg-gray-50 font-semibold">{monthTotals.cumpl}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Modal agregar vigilador */}
      <Modal
        open={addModalOpen && perms.canManagePlanillas}
        title="Agregar vigilador a la planilla"
        onClose={() => setAddModalOpen(false)}
        footer={<button className="btn-secondary" onClick={() => setAddModalOpen(false)}>Cerrar</button>}
      >
        <input
          className="input-field w-full"
          placeholder="Buscar por legajo, apellido o nombre..."
          value={vigFilter}
          onChange={(e) => setVigFilter(e.target.value)}
        />
        <div className="max-h-72 overflow-auto border rounded mt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-3 py-2 border">Legajo</th>
                <th className="text-left px-3 py-2 border">Apellido</th>
                <th className="text-left px-3 py-2 border">Nombre</th>
                <th className="px-3 py-2 border"></th>
              </tr>
            </thead>
            <tbody>
              {(allVigiladores as any[])
                .filter((v: any) => !(vigiladores as any[]).some((vv: any) => vv.id_vigilador === v.id_vigilador))
                .filter((v: any) => {
                  const q = vigFilter.trim().toLowerCase();
                  if (!q) return true;
                  return String(v.legajo).includes(q) || v.apellido.toLowerCase().includes(q) || v.nombre.toLowerCase().includes(q);
                })
                .map((v: any) => (
                  <tr key={v.id_vigilador} className="hover:bg-blue-50">
                    <td className="px-3 py-2 border">{v.legajo}</td>
                    <td className="px-3 py-2 border">{v.apellido}</td>
                    <td className="px-3 py-2 border">{v.nombre}</td>
                    <td className="px-3 py-2 border text-right">
                      {perms.canManagePlanillas && (
                        <button
                          className="px-2 py-1 rounded bg-blue-600 text-white text-xs disabled:opacity-50"
                          disabled={addVigilador.isPending}
                          onClick={() => addVigilador.mutate(v.id_vigilador, { onSuccess: () => setAddModalOpen(false) })}
                        >
                          {addVigilador.isPending ? 'Agregando…' : 'Agregar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Modal>
      {/* Modal clonar turno */}
      <Modal
        open={cloneModal.open && perms.canManagePlanillas}
        title="Clonar turno a otras fechas"
        onClose={() => setCloneModal({ open: false })}
        footer={(
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <button className="btn-secondary" onClick={selectAll}>Seleccionar todo</button>
              <button className="btn-secondary" onClick={clearAll}>Limpiar</button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 mr-2">{Object.keys(cloneSelection).length} seleccionadas</span>
              <button className="btn-secondary" onClick={() => setCloneModal({ open: false })}>Cancelar</button>
              <button className="btn-primary" onClick={confirmClone}>Clonar</button>
            </div>
          </div>
        )}
      >
        {!cloneModal.turno ? (
          <div className="text-sm text-gray-600">Seleccioná un turno para clonar.</div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm">Turno origen: <span className="font-medium">{cloneModal.turno.hora_inicio} · {cloneModal.turno.cantidad_horas}h</span></div>
            <div className="max-h-80 overflow-auto border rounded">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 border">Semana</th>
                    <th className="text-left px-3 py-2 border">Fechas disponibles</th>
                    <th className="px-3 py-2 border text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cloneTargetsByWeek.map((w, idx) => (
                    <tr key={`cw-${idx}`} className="align-top">
                      <td className="px-3 py-2 border w-32">{w.label}</td>
                      <td className="px-3 py-2 border">
                        <div className="flex flex-wrap gap-3">
                          {w.days.length === 0 ? (
                            <span className="text-gray-400 text-xs">Sin fechas disponibles</span>
                          ) : w.days.map(d => (
                            <label key={d.id_dia_planilla} className={`inline-flex items-center gap-2 px-2 py-1 rounded border ${isWeekend(d.fecha) ? 'bg-rose-50 border-rose-100' : 'bg-white'}`}>
                              <input
                                type="checkbox"
                                checked={!!cloneSelection[d.id_dia_planilla]}
                                onChange={() => toggleSelectDay(d.id_dia_planilla)}
                              />
                              <span className={`text-[11px] ${isWeekend(d.fecha) ? 'text-rose-700' : 'text-gray-600'}`}>{weekdayLabel(d.fecha)}</span>
                              <span className="text-sm">{Number(String(d.fecha).split('-')[2])}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2 border text-right">
                        <button className="btn-secondary text-xs" onClick={() => toggleWeek(idx, true)}>Seleccionar semana</button>
                        <button className="btn-secondary text-xs ml-2" onClick={() => toggleWeek(idx, false)}>Limpiar semana</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
      {modal.open && perms.canManagePlanillas && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow w-[640px] space-y-4">
            <h3 className="font-semibold">Turnos del día</h3>
            <div className="border rounded p-2 max-h-56 overflow-auto">
              {/* listamos turnos actuales de la celda */}
              {(() => {
                const ts = grid.get(`${modal.id_dia_planilla}:${modal.id_vigilador}`) || [];
                if (ts.length === 0) return <div className="text-sm text-gray-500">No hay turnos asignados</div>;
                return (
                  <ul className="space-y-2">
                    {ts.map((t: any) => (
                      <li key={t.id_turno} className="border rounded p-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <input className="input-field w-24" defaultValue={t.hora_inicio} onBlur={(e) => {
                              const val = e.target.value;
                              if (val !== t.hora_inicio) updateTurno.mutate({ id: t.id_turno, data: { hora_inicio: val } });
                            }} />
                            <input className="input-field w-20" defaultValue={t.cantidad_horas} onBlur={(e) => {
                              const num = Number(e.target.value);
                              if (!Number.isNaN(num) && num !== t.cantidad_horas) updateTurno.mutate({ id: t.id_turno, data: { cantidad_horas: num } });
                            }} />
                            <span className="text-gray-500">→ {t.hora_fin}</span>
                          </div>
                          {perms.canManagePlanillas && (
                            <div className="flex items-center gap-3">
                              <button className="text-blue-600" onClick={() => openCloneFromTurno(t)}>Clonar</button>
                              <button className="text-red-600" onClick={() => deleteTurno.mutate(t.id_turno)}>Eliminar</button>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-600">
                          <div><span className="text-gray-500">ID:</span> {t.id_turno}</div>
                          {typeof t.id_vigilador !== 'undefined' && <div><span className="text-gray-500">Vigilador:</span> {t.id_vigilador}</div>}
                          <div><span className="text-gray-500">Día planilla:</span> {t.id_dia_planilla}</div>
                          <div><span className="text-gray-500">Día vigilador:</span> {t.id_dia_vigilador}</div>
                          <div><span className="text-gray-500">Diurnas:</span> {t.horas_diurnas}</div>
                          <div><span className="text-gray-500">Nocturnas:</span> {t.horas_nocturnas}</div>
                          <div className="col-span-2">
                            {t.hora_fin <= t.hora_inicio ? (
                              <span className="inline-block px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">Cruza medianoche</span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700">Mismo día</span>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>

            {/* Estado del día vigilador */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Estado del día</h4>
              {(() => {
                if (!modal.id_dia_planilla || !modal.id_vigilador) return null;
                const dia = dias.find((d: any) => d.id_dia_planilla === modal.id_dia_planilla);
                if (!dia) return null;
                const dv = diasVigiladorIndex[modal.id_vigilador]?.[dia.fecha];
                if (!dv) return <div className="text-sm text-gray-500">No existe Día del Vigilador para esa fecha</div>;
                const current = String(dv.estado || '');
                const key = `${modal.id_dia_planilla}:${modal.id_vigilador}`;
                const ts = (grid.get(key) || []) as Turno[];
                const hasTurnos = ts.length > 0;
                const allOptions = [
                  DiaVigiladorEstado.TRABAJA,
                  DiaVigiladorEstado.FRANCO,
                  DiaVigiladorEstado.AUSENTE,
                  DiaVigiladorEstado.VACACIONES,
                  DiaVigiladorEstado.LICENCIA,
                  DiaVigiladorEstado.FERIADO,
                  DiaVigiladorEstado.ENFERMO,
                  DiaVigiladorEstado.NO_ASIGNADO,
                ];
                const allowedOptions = hasTurnos ? [DiaVigiladorEstado.TRABAJA] : allOptions;
                const selectedValue = hasTurnos ? DiaVigiladorEstado.TRABAJA : current;
                return (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <select
                        className="input-field"
                        value={allowedOptions.includes(selectedValue) ? selectedValue : allowedOptions[0]}
                        onChange={(e) => updateDiaEstado.mutate({ id_dia_vigilador: dv.id_dia_vigilador, estado: e.target.value })}
                      >
                        {allowedOptions.map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                    {hasTurnos && current !== DiaVigiladorEstado.TRABAJA && (
                      <div className="text-xs text-amber-700">Con turnos asignados, el estado permitido es "trabaja".</div>
                    )}
                    {!hasTurnos && (
                      <div className="text-[11px] text-gray-500">Tip: Podés marcar "franco" solo si no hay turnos asignados.</div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Crear nuevo turno */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Crear nuevo turno</h4>
              <div className="grid grid-cols-3 gap-2">
                <input className="input-field" placeholder="Hora inicio (HH:mm)" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} />
                <input className="input-field" placeholder="Horas (ej 8)" value={form.cantidad_horas} onChange={(e) => setForm({ ...form, cantidad_horas: e.target.value })} />
                <button className="btn-primary" onClick={submitTurno} disabled={createTurno.isPending}>{createTurno.isPending ? 'Creando...' : 'Crear'}</button>
              </div>
            </div>

            <div className="flex justify-end">
              <button className="btn-secondary" onClick={() => setModal({ open: false })}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanillaExcelScreen;


