import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDptByPuesto, useCreateDpt, useUpdateDpt, useDeleteDpt } from '../hooks/useDiaPuestoTipo';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import { usePuestos } from '../hooks/usePuestos';

const ConfigurarDPTScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const puestoIdParam = searchParams.get('puestoId');
  const puestoId = useMemo(() => Number(puestoIdParam || 0), [puestoIdParam]);

  const { data: dpt = [], isLoading } = useDptByPuesto(puestoId);
  const createDpt = useCreateDpt();
  const updateDpt = useUpdateDpt();
  const deleteDpt = useDeleteDpt();
  const { data: allPuestos = [] } = usePuestos();
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyFromPuesto, setCopyFromPuesto] = useState<number | ''>('');
  const [overwriteMode, setOverwriteMode] = useState<'all' | 'only-empty'>('all');
  const [copyDaysModal, setCopyDaysModal] = useState<{ open: boolean; row?: any }>({ open: false });
  const [daysSelection, setDaysSelection] = useState<boolean[]>([false, false, false, false, false, false, false]);
  const [daysOverwrite, setDaysOverwrite] = useState(false);

  const [nuevo, setNuevo] = useState<any>({
    dia_semana: 0,
    fecha_especial: '',
    horario_entrada: '08:00',
    horario_salida: '16:00',
    horario_entrada_2: '',
    horario_salida_2: '',
    jornada_horario_partido: false,
    es_laborable: true,
  });

  const isValidTime = (t?: string) => /^(?:[01]\d|2[0-4]):[0-5]\d$/.test(t || '');

  const add = async () => {
    if (!puestoId) return;
    // Validar campos
    const errs: string[] = [];
    if (isNaN(Number(nuevo.dia_semana)) || Number(nuevo.dia_semana) < 0 || Number(nuevo.dia_semana) > 6) {
      errs.push('El día de semana debe estar entre 0 y 6');
    }
    if (nuevo.fecha_especial && !/^\d{4}-\d{2}-\d{2}$/.test(nuevo.fecha_especial)) {
      errs.push('La fecha especial debe tener formato AAAA-MM-DD');
    }
    if (nuevo.es_laborable) {
      if (!isValidTime(nuevo.horario_entrada) || !isValidTime(nuevo.horario_salida)) {
        errs.push('Ingresá horario de entrada y salida válidos (HH:mm)');
      }
      if (nuevo.horario_entrada === '24:00') errs.push('24:00 solo puede usarse como hora final');
      if (nuevo.jornada_horario_partido) {
        if (!isValidTime(nuevo.horario_entrada_2) || !isValidTime(nuevo.horario_salida_2)) {
          errs.push('Completá ambos horarios del segundo tramo');
        }
        if (nuevo.horario_entrada_2 === '24:00') errs.push('24:00 solo puede usarse como hora final');
      }
    }
    if (errs.length) {
      toast.error(errs[0]);
      return;
    }
    await createDpt.mutateAsync({
      id_puesto: puestoId,
      dia_semana: Number(nuevo.dia_semana),
      fecha_especial: nuevo.fecha_especial || null,
      horario_entrada: nuevo.horario_entrada || null,
      horario_salida: nuevo.horario_salida || null,
      horario_entrada_2: nuevo.jornada_horario_partido ? (nuevo.horario_entrada_2 || null) : null,
      horario_salida_2: nuevo.jornada_horario_partido ? (nuevo.horario_salida_2 || null) : null,
      jornada_horario_partido: !!nuevo.jornada_horario_partido,
      es_laborable: !!nuevo.es_laborable,
    });
    setNuevo({
      dia_semana: 0,
      fecha_especial: '',
      horario_entrada: '08:00',
      horario_salida: '16:00',
      horario_entrada_2: '',
      horario_salida_2: '',
      jornada_horario_partido: false,
      es_laborable: true,
    });
  };

  const update = async (id: number, partial: any) => {
    // Validaciones ligeras si cambia horarios
    if (partial.fecha_especial && !/^\d{4}-\d{2}-\d{2}$/.test(partial.fecha_especial)) {
      toast.error('Fecha especial inválida');
      return;
    }
    if ((partial.horario_entrada && !isValidTime(partial.horario_entrada)) || (partial.horario_salida && !isValidTime(partial.horario_salida))) {
      toast.error('Horarios del tramo 1 inválidos');
      return;
    }
    if ((partial.horario_entrada_2 && !isValidTime(partial.horario_entrada_2)) || (partial.horario_salida_2 && !isValidTime(partial.horario_salida_2))) {
      toast.error('Horarios del tramo 2 inválidos');
      return;
    }
    await updateDpt.mutateAsync({ id, data: partial });
  };

  const remove = async (id: number) => {
    await deleteDpt.mutateAsync(id);
  };

  const copyFromOtherPuesto = async () => {
    if (!puestoId || !copyFromPuesto || copyFromPuesto === puestoId) { toast.error('Seleccioná un puesto válido'); return; }
    try {
      // Traer DPT de origen via servicio existente
      // Reutilizamos el hook de pantalla actual para leer los del origen de manera directa (llamada manual)
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/dia-puesto-tipo/puesto/${copyFromPuesto}`, { credentials: 'include', headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}` } });
      const source = await resp.json();
      if (!Array.isArray(source)) { toast.error('No se pudo obtener DPT del puesto origen'); return; }
      // Mapa destino actual para decidir overwrite
      const current = Array.isArray(dpt) ? dpt : [];
      const hasForDay = (day: number) => current.some((r: any) => r.fecha_especial === null && Number(r.dia_semana) === Number(day));
      // Crear dpts necesarios
      for (const row of source) {
        const isSpecial = !!row.fecha_especial;
        if (isSpecial) {
          // Si overwrite only-empty, crear solo si no existe esa fecha especial
          if (overwriteMode === 'only-empty' && current.some((r: any) => r.fecha_especial === row.fecha_especial)) continue;
        } else {
          if (overwriteMode === 'only-empty' && hasForDay(Number(row.dia_semana))) continue;
        }
        await createDpt.mutateAsync({
          id_puesto: puestoId,
          dia_semana: Number(row.dia_semana || 0),
          fecha_especial: row.fecha_especial || null,
          horario_entrada: row.horario_entrada || null,
          horario_salida: row.horario_salida || null,
          horario_entrada_2: row.jornada_horario_partido ? (row.horario_entrada_2 || null) : null,
          horario_salida_2: row.jornada_horario_partido ? (row.horario_salida_2 || null) : null,
          jornada_horario_partido: !!row.jornada_horario_partido,
          es_laborable: !!row.es_laborable,
        });
      }
      toast.success('Configuración copiada');
      setCopyModalOpen(false);
    } catch (e) {
      toast.error('No se pudo copiar la configuración');
    }
  };

  if (!puestoId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Seleccioná un puesto para configurar sus días tipo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurar días tipo - Puesto #{puestoId}</h1>
        <p className="mt-2 text-sm text-gray-700">Definí los horarios por día de semana o por fecha especial</p>
      </div>

      <div className="card p-4 space-y-3">
        <h3 className="font-semibold">Agregar nuevo</h3>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Copiar configuración desde otro puesto</div>
          <button className="btn-secondary" onClick={() => setCopyModalOpen(true)}>Copiar de puesto…</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Día semana</label>
            <select className="input-field" value={nuevo.dia_semana} onChange={(e) => setNuevo({ ...nuevo, dia_semana: Number(e.target.value) })}>
              <option value={0}>Domingo (0)</option>
              <option value={1}>Lunes (1)</option>
              <option value={2}>Martes (2)</option>
              <option value={3}>Miércoles (3)</option>
              <option value={4}>Jueves (4)</option>
              <option value={5}>Viernes (5)</option>
              <option value={6}>Sábado (6)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Fecha especial</label>
            <input type="date" className="input-field" value={nuevo.fecha_especial} onChange={(e) => setNuevo({ ...nuevo, fecha_especial: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Desde (00:00–24:00)</label>
            <input type="text" inputMode="numeric" maxLength={5} placeholder="HH:mm" className="input-field" value={nuevo.horario_entrada} onChange={(e) => setNuevo({ ...nuevo, horario_entrada: e.target.value })} disabled={!nuevo.es_laborable} />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Hasta (00:00–24:00)</label>
            <input type="text" inputMode="numeric" maxLength={5} placeholder="HH:mm" className="input-field" value={nuevo.horario_salida} onChange={(e) => setNuevo({ ...nuevo, horario_salida: e.target.value })} disabled={!nuevo.es_laborable} />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="flex items-center space-x-2">
            <input type="checkbox" checked={nuevo.jornada_horario_partido} onChange={(e) => setNuevo({ ...nuevo, jornada_horario_partido: e.target.checked })} disabled={!nuevo.es_laborable} />
            <span className="text-xs">Jornada partida</span>
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" checked={nuevo.es_laborable} onChange={(e) => setNuevo({ ...nuevo, es_laborable: e.target.checked, ...(e.target.checked ? {} : { jornada_horario_partido: false, horario_entrada: '', horario_salida: '', horario_entrada_2: '', horario_salida_2: '' }) })} />
            <span className="text-xs">Laborable</span>
          </div>
          {nuevo.es_laborable && nuevo.jornada_horario_partido && (
            <>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Desde 2 (00:00–24:00)</label>
                <input type="text" inputMode="numeric" maxLength={5} placeholder="HH:mm" className="input-field" value={nuevo.horario_entrada_2} onChange={(e) => setNuevo({ ...nuevo, horario_entrada_2: e.target.value })} disabled={!nuevo.es_laborable || !nuevo.jornada_horario_partido} />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Hasta 2 (00:00–24:00)</label>
                <input type="text" inputMode="numeric" maxLength={5} placeholder="HH:mm" className="input-field" value={nuevo.horario_salida_2} onChange={(e) => setNuevo({ ...nuevo, horario_salida_2: e.target.value })} disabled={!nuevo.es_laborable || !nuevo.jornada_horario_partido} />
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end">
          <button className="btn-primary" onClick={add} disabled={createDpt.isPending}>{createDpt.isPending ? 'Agregando...' : 'Agregar'}</button>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Día/Fecha</th>
                <th className="table-header">Tramo 1</th>
                <th className="table-header">Tramo 2</th>
                <th className="table-header">Laborable</th>
                <th className="table-header">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr><td className="table-cell" colSpan={5}>Cargando...</td></tr>
              ) : (
                dpt.map((row: any) => (
                  <tr key={row.id_dia_tipo}>
                    <td className="table-cell">{row.fecha_especial || `Día ${row.dia_semana}`}</td>
                    <td className="table-cell">{row.horario_entrada || '-'} - {row.horario_salida || '-'}</td>
                    <td className="table-cell">{row.jornada_horario_partido ? `${row.horario_entrada_2 || '-'} - ${row.horario_salida_2 || '-'}` : '-'}</td>
                    <td className="table-cell">{row.es_laborable ? 'Sí' : 'No'}</td>
                    <td className="table-cell space-x-2">
                      <button className="btn-secondary" onClick={() => update(row.id_dia_tipo, { es_laborable: !row.es_laborable })} disabled={updateDpt.isPending}>Toggle laborable</button>
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          // Preseleccionar todos los días menos el propio si es general
                          const preset = [false, false, false, false, false, false, false];
                          if (!row.fecha_especial && typeof row.dia_semana === 'number') {
                            for (let i = 0; i < 7; i++) preset[i] = i !== Number(row.dia_semana);
                          }
                          setDaysSelection(preset);
                          setDaysOverwrite(false);
                          setCopyDaysModal({ open: true, row });
                        }}
                      >
                        Copiar a días…
                      </button>
                      <button className="text-red-600" onClick={() => remove(row.id_dia_tipo)} disabled={deleteDpt.isPending}>Eliminar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={copyModalOpen}
        title="Copiar DPT desde otro puesto"
        onClose={() => setCopyModalOpen(false)}
        footer={(
          <>
            <button className="btn-secondary" onClick={() => setCopyModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={copyFromOtherPuesto} disabled={!copyFromPuesto}>Copiar</button>
          </>
        )}
      >
        <div className="space-y-2">
          <label className="block text-sm text-gray-700">Puesto origen</label>
          <select className="input-field w-full" value={copyFromPuesto} onChange={(e) => setCopyFromPuesto(Number(e.target.value))}>
            <option value="">Seleccionar…</option>
            {allPuestos.filter((p: any) => p.id_puesto !== puestoId).map((p: any) => (
              <option key={p.id_puesto} value={p.id_puesto}>{p.nombre} (#{p.id_puesto})</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm text-gray-700">Modo de copiado</label>
          <select className="input-field" value={overwriteMode} onChange={(e) => setOverwriteMode(e.target.value as any)}>
            <option value="all">Sobrescribir todo</option>
            <option value="only-empty">Solo crear donde no hay definición</option>
          </select>
        </div>
      </Modal>

      <Modal
        open={copyDaysModal.open && !!copyDaysModal.row}
        title="Copiar configuración a días de la semana"
        onClose={() => setCopyDaysModal({ open: false })}
        footer={(
          <>
            <button className="btn-secondary" onClick={() => setCopyDaysModal({ open: false })}>Cancelar</button>
            <button
              className="btn-primary"
              onClick={async () => {
                if (!puestoId || !copyDaysModal.row) return;
                const targets = daysSelection
                  .map((v, i) => (v ? i : null))
                  .filter((x) => x !== null) as number[];
                if (targets.length === 0) { toast.error('Seleccioná al menos un día'); return; }
                const current = Array.isArray(dpt) ? dpt : [];
                for (const day of targets) {
                  const existing = current.find((r: any) => r.fecha_especial === null && Number(r.dia_semana) === Number(day));
                  const payload = {
                    id_puesto: puestoId,
                    dia_semana: day,
                    fecha_especial: null as string | null,
                    horario_entrada: copyDaysModal.row.horario_entrada || null,
                    horario_salida: copyDaysModal.row.horario_salida || null,
                    horario_entrada_2: copyDaysModal.row.jornada_horario_partido ? (copyDaysModal.row.horario_entrada_2 || null) : null,
                    horario_salida_2: copyDaysModal.row.jornada_horario_partido ? (copyDaysModal.row.horario_salida_2 || null) : null,
                    jornada_horario_partido: !!copyDaysModal.row.jornada_horario_partido,
                    es_laborable: !!copyDaysModal.row.es_laborable,
                  };
                  if (existing) {
                    if (daysOverwrite) {
                      await updateDpt.mutateAsync({ id: existing.id_dia_tipo, data: payload as any });
                    }
                  } else {
                    await createDpt.mutateAsync(payload);
                  }
                }
                toast.success('Días actualizados');
                setCopyDaysModal({ open: false });
              }}
            >
              Aplicar
            </button>
          </>
        )}
      >
        <div className="text-sm text-gray-700">Origen: {copyDaysModal.row?.fecha_especial || `Día ${copyDaysModal.row?.dia_semana}`}</div>
        <div className="grid grid-cols-7 gap-2 text-center mt-2">
          {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map((lbl, idx) => (
            <label key={lbl} className={`border rounded p-2 cursor-pointer select-none ${daysSelection[idx] ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}>
              <input
                type="checkbox"
                checked={daysSelection[idx]}
                onChange={(e) => setDaysSelection((prev) => prev.map((v, i) => i === idx ? e.target.checked : v))}
              />
              <div className="text-xs mt-1">{lbl}</div>
            </label>
          ))}
        </div>
        <label className="inline-flex items-center gap-2 text-sm mt-2">
          <input type="checkbox" checked={daysOverwrite} onChange={(e) => setDaysOverwrite(e.target.checked)} />
          Sobrescribir existentes
        </label>
      </Modal>
    </div>
  );
};

export default ConfigurarDPTScreen;


