import React, { useEffect, useRef, useState } from 'react'
import { FileText, Paperclip, Trash2, X } from 'lucide-react'
import type { Novedad, NovedadTipo } from '../../types'
import { useNovedadMutations } from '../../hooks/usePlanillaGrilla'
import { novedadesService } from '../../services/novedades'
import { JUSTIFICACION, NOVEDADES, NovedadChip } from './estilos'

type Props = {
  idVigilador: number
  fecha: string
  novedad: Novedad | null
  puedeEditar: boolean
}

const TIPOS = Object.keys(NOVEDADES) as NovedadTipo[]
const ACEPTA = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'

const fechaCorta = (f: string) => f.split('-').reverse().join('/')

// Novedad del día: ver, cargar, editar el rango y adjuntar el certificado
const NovedadEditor: React.FC<Props> = ({ idVigilador, fecha, novedad, puedeEditar }) => {
  const m = useNovedadMutations()
  const archivoRef = useRef<HTMLInputElement>(null)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({ tipo: 'franco' as NovedadTipo, desde: fecha, hasta: fecha, observacion: '' })

  useEffect(() => {
    setEditando(false)
    setForm(novedad
      ? { tipo: novedad.tipo, desde: novedad.desde, hasta: novedad.hasta, observacion: novedad.observacion || '' }
      : { tipo: 'franco', desde: fecha, hasta: fecha, observacion: '' })
  }, [novedad, fecha])

  const guardar = () => {
    const data = { ...form, observacion: form.observacion.trim() || null }
    if (novedad) m.editar.mutate({ id: novedad.id_novedad, data }, { onSuccess: () => setEditando(false) })
    else m.crear.mutate({ id_vigilador: idVigilador, ...data })
  }

  const subir = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (archivo && novedad) m.adjuntar.mutate({ id: novedad.id_novedad, archivo })
  }

  const formulario = (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {TIPOS.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setForm(f => ({ ...f, tipo: t }))}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition ${form.tipo === t ? NOVEDADES[t].clase + ' ring-2' : 'bg-white text-gray-600 ring-gray-300 hover:bg-gray-50'}`}
          >
            {NOVEDADES[t].texto}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-gray-600">Desde
          <input type="date" className="input-field mt-0.5 py-1.5 text-sm" value={form.desde} onChange={e => setForm(f => ({ ...f, desde: e.target.value, hasta: f.hasta < e.target.value ? e.target.value : f.hasta }))} />
        </label>
        <label className="text-xs text-gray-600">Hasta
          <input type="date" className="input-field mt-0.5 py-1.5 text-sm" min={form.desde} value={form.hasta} onChange={e => setForm(f => ({ ...f, hasta: e.target.value }))} />
        </label>
      </div>
      <input
        className="input-field py-1.5 text-sm"
        placeholder={form.tipo === 'licencia' ? 'Motivo (examen, fallecimiento, ART…)' : 'Observación (opcional)'}
        value={form.observacion}
        maxLength={1000}
        onChange={e => setForm(f => ({ ...f, observacion: e.target.value }))}
      />
      <div className="flex justify-end gap-2">
        {novedad && <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={() => setEditando(false)}>Cancelar</button>}
        <button type="button" className="btn-primary px-3 py-1.5 text-sm" disabled={m.crear.isPending || m.editar.isPending} onClick={guardar}>
          {novedad ? 'Guardar cambios' : 'Cargar novedad'}
        </button>
      </div>
      {form.tipo === 'enfermo' && !novedad && (
        <p className="text-[11px] text-gray-500">Después de cargarla vas a poder adjuntar el certificado.</p>
      )}
    </div>
  )

  if (!novedad) {
    return puedeEditar ? formulario : <p className="text-sm text-gray-500">Sin novedades este día.</p>
  }
  if (editando) return formulario

  const j = JUSTIFICACION[novedad.justificacion]
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <NovedadChip novedad={novedad} />
            <span className="text-sm text-gray-700">
              {novedad.desde === novedad.hasta ? fechaCorta(novedad.desde) : `${fechaCorta(novedad.desde)} al ${fechaCorta(novedad.hasta)}`}
            </span>
          </div>
          <div className={`text-xs font-medium ${j.clase}`}>{j.texto}</div>
          {novedad.observacion && <p className="text-sm text-gray-600">{novedad.observacion}</p>}
        </div>
        {puedeEditar && (
          <div className="flex shrink-0 gap-1">
            <button type="button" className="rounded px-2 py-1 text-xs text-primary-700 hover:bg-primary-50" onClick={() => setEditando(true)}>Editar</button>
            <button
              type="button"
              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
              title="Eliminar novedad"
              onClick={() => { if (window.confirm('¿Eliminar la novedad y sus adjuntos?')) m.borrar.mutate(novedad.id_novedad) }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        {novedad.adjuntos.map(a => (
          <div key={a.id_adjunto} className="flex items-center gap-2 rounded-lg border border-gray-200 px-2 py-1.5 text-sm">
            <FileText className="h-4 w-4 shrink-0 text-gray-400" />
            <button type="button" className="min-w-0 flex-1 truncate text-left text-primary-700 hover:underline" onClick={() => novedadesService.abrirAdjunto(a.id_adjunto)}>
              {a.nombre}
            </button>
            <span className="text-[11px] text-gray-400">{Math.max(1, Math.round(a.tamano / 1024))} KB</span>
            {puedeEditar && (
              <button type="button" className="text-gray-400 hover:text-red-600" title="Quitar adjunto"
                onClick={() => { if (window.confirm(`¿Quitar "${a.nombre}"?`)) m.quitarAdjunto.mutate(a.id_adjunto) }}>
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {puedeEditar && (
          <>
            <input ref={archivoRef} type="file" accept={ACEPTA} className="hidden" onChange={subir} />
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:border-primary-400 hover:text-primary-700"
              disabled={m.adjuntar.isPending}
              onClick={() => archivoRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
              {m.adjuntar.isPending ? 'Subiendo…' : novedad.tipo === 'enfermo' ? 'Adjuntar certificado' : 'Adjuntar archivo'}
            </button>
            <p className="text-[11px] text-gray-400">PDF, JPG o PNG, hasta 10 MB.</p>
          </>
        )}
      </div>
    </div>
  )
}

export default NovedadEditor
