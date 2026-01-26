import React, { useState } from 'react'
import { Plus, Search, Edit, Trash2 } from 'lucide-react'
import { useVigiladores, useCreateVigilador, useUpdateVigilador, useDeleteVigilador } from '../hooks/useVigiladores'
import { usePermissions } from '../hooks/usePermissions'

const GestionVigiladoresScreen: React.FC = () => {
  const { data: vigiladores = [], isLoading } = useVigiladores()
  const createV = useCreateVigilador()
  const updateV = useUpdateVigilador()
  const deleteV = useDeleteVigilador()
  const perms = usePermissions()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ nombre: '', apellido: '', dni: '', legajo: '' })

  const filtered = vigiladores.filter((v: any) =>
    `${v.apellido} ${v.nombre}`.toLowerCase().includes(search.toLowerCase()) ||
    String(v.dni).includes(search) ||
    String(v.legajo).includes(search)
  )

  const openNew = () => { setEditing(null); setForm({ nombre: '', apellido: '', dni: '', legajo: '' }); setIsModalOpen(true) }
  const openEdit = (v: any) => { setEditing(v); setForm({ nombre: v.nombre, apellido: v.apellido, dni: String(v.dni), legajo: String(v.legajo) }); setIsModalOpen(true) }
  const submit = async () => {
    if (!form.nombre || !form.apellido || !form.dni || !form.legajo) return
    if (editing) {
      await updateV.mutateAsync({ id: editing.id_vigilador, data: { nombre: form.nombre, apellido: form.apellido, dni: Number(form.dni), legajo: Number(form.legajo) } })
    } else {
      await createV.mutateAsync({ nombre: form.nombre, apellido: form.apellido, dni: Number(form.dni), legajo: Number(form.legajo) })
    }
    setIsModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Vigiladores</h1>
          <p className="text-sm text-gray-700">Alta, edición y baja lógica de vigiladores</p>
        </div>
        {perms.canManageVigiladores && (
          <button className="btn-primary" onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Nuevo</button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input className="input-field pl-10" placeholder="Buscar por nombre, DNI o legajo" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Legajo</th>
                <th className="table-header">DNI</th>
                <th className="table-header">Apellido</th>
                <th className="table-header">Nombre</th>
                <th className="table-header">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr><td className="table-cell" colSpan={5}>Cargando...</td></tr>
              ) : (
                filtered.map((v: any) => (
                  <tr key={v.id_vigilador}>
                    <td className="table-cell">{v.legajo}</td>
                    <td className="table-cell">{v.dni}</td>
                    <td className="table-cell">{v.apellido}</td>
                    <td className="table-cell">{v.nombre}</td>
                    <td className="table-cell">
                      <div className="flex gap-2">
                        {perms.canManageVigiladores && (
                          <>
                            <button className="text-blue-600" onClick={() => openEdit(v)} title="Editar"><Edit className="h-4 w-4" /></button>
                            <button className="text-red-600" onClick={() => deleteV.mutate(v.id_vigilador)} title="Eliminar"><Trash2 className="h-4 w-4" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && perms.canManageVigiladores && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 space-y-3">
              <h3 className="text-lg font-medium text-gray-900">{editing ? 'Editar' : 'Nuevo'} Vigilador</h3>
              <input className="input-field" placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              <input className="input-field" placeholder="Apellido" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
              <input className="input-field" placeholder="DNI" value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} />
              <input className="input-field" placeholder="Legajo" value={form.legajo} onChange={(e) => setForm({ ...form, legajo: e.target.value })} />
              <div className="flex justify-end gap-2">
                <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button className="btn-primary" onClick={submit} disabled={createV.isPending || updateV.isPending}>{(createV.isPending || updateV.isPending) ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GestionVigiladoresScreen
