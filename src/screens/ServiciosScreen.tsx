import React, { useState } from 'react'
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useServicios, useCreateServicio, useUpdateServicio, useDeleteServicio, useTransferirResponsableServicio } from '../hooks/useServicios'
import { useUsuarios } from '../hooks/useUsuarios'
import { usePermissions } from '../hooks/usePermissions'
import { useNavigate } from 'react-router-dom'

const servicioSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
})

type ServicioFormData = z.infer<typeof servicioSchema>

const ServiciosScreen: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingServicio, setEditingServicio] = useState<any>(null)
  const [transferModal, setTransferModal] = useState<{ open: boolean; servicio?: any }>({ open: false })
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('')
  const [searchTerm, setSearchTerm] = useState('')

  const { data: servicios = [], isLoading, error } = useServicios()
  const perms = usePermissions()
  const { data: usuarios = [] } = useUsuarios({ activo: true }, perms.role === 'admin')
  const navigate = useNavigate()
  const createServicio = useCreateServicio()
  const updateServicio = useUpdateServicio()
  const deleteServicio = useDeleteServicio()
  const transferir = useTransferirResponsableServicio()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServicioFormData>({
    resolver: zodResolver(servicioSchema),
  })

  const filteredServicios = servicios.filter(servicio =>
    servicio.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    servicio.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const onSubmit = async (data: ServicioFormData) => {
    try {
      if (editingServicio) {
        await updateServicio.mutateAsync({ id: editingServicio.id_servicio || editingServicio.id, data })
        toast.success('Servicio actualizado correctamente')
      } else {
        await createServicio.mutateAsync(data)
        toast.success('Servicio creado correctamente')
      }
      handleCloseModal()
    } catch (error) {
      toast.error('Error al guardar el servicio')
    }
  }

  const handleEdit = (servicio: any) => {
    setEditingServicio(servicio)
    reset({ nombre: servicio.nombre, descripcion: servicio.descripcion })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este servicio?')) {
      try {
        await deleteServicio.mutateAsync(id)
        toast.success('Servicio eliminado correctamente')
      } catch (error) {
        toast.error('Error al eliminar el servicio')
      }
    }
  }

  const handleToggle = async (_id: number, _activo: boolean) => {
    toast.error('Esta acción no está disponible');
  }

  const openTransfer = (servicio: any) => {
    setTransferModal({ open: true, servicio })
    setSelectedUserId('')
  }

  const closeTransfer = () => {
    setTransferModal({ open: false })
    setSelectedUserId('')
  }

  const confirmTransfer = async () => {
    if (!transferModal.servicio || !selectedUserId) return;
    try {
      await transferir.mutateAsync({ id: transferModal.servicio.id_servicio || transferModal.servicio.id, id_usuario: Number(selectedUserId) })
      toast.success('Responsable transferido')
      closeTransfer()
    } catch (_e) {
      toast.error('No se pudo transferir el responsable')
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingServicio(null)
    reset()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error al cargar los servicios</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Servicios</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gestiona los servicios disponibles en el sistema
          </p>
        </div>
        {perms.canManageServicios && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary mt-4 sm:mt-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Servicio
          </button>
        )}
      </div>

      {/* Barra de búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Buscar servicios..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Tabla de servicios */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Nombre</th>
                <th className="table-header">Descripción</th>
                <th className="table-header">Administrado por</th>
                <th className="table-header">Estado</th>
                <th className="table-header">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
               {filteredServicios.map((servicio: any) => (
                <tr key={servicio.id_servicio || servicio.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{servicio.nombre}</td>
                  <td className="table-cell text-gray-600">{servicio.descripcion || '-'}</td>
                  <td className="table-cell text-gray-600">
                    {servicio.creador?.nombre ? `${servicio.creador.nombre} ${servicio.creador.apellido || ''}`.trim() : '—'}
                  </td>
                  <td className="table-cell">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        servicio.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {servicio.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/puestos?servicioId=${servicio.id_servicio || servicio.id}`, { state: { servicioNombre: servicio.nombre } })}
                        className="btn-secondary"
                        title="Ver Puestos"
                      >
                        Ver Puestos
                      </button>
                      {perms.canManageServicios && (
                        <>
                          <button
                            onClick={() => handleEdit(servicio)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {perms.role === 'admin' && (
                            <button
                              onClick={() => openTransfer(servicio)}
                              className="text-purple-600 hover:text-purple-900"
                              title="Transferir responsable"
                            >
                              Transferir
                            </button>
                          )}
                          <button
                            onClick={() => handleToggle(servicio.id_servicio || servicio.id, servicio.activo)}
                            className={`${
                              servicio.activo
                                ? 'text-orange-600 hover:text-orange-900'
                                : 'text-green-600 hover:text-green-900'
                            }`}
                            title={servicio.activo ? 'Desactivar' : 'Activar'}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(servicio.id_servicio || servicio.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para crear/editar servicio */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingServicio ? 'Editar Servicio' : 'Nuevo Servicio'}
              </h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    {...register('nombre')}
                    className="input-field"
                    placeholder="Nombre del servicio"
                  />
                  {errors.nombre && (
                    <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    {...register('descripcion')}
                    className="input-field"
                    rows={3}
                    placeholder="Descripción del servicio"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={createServicio.isPending || updateServicio.isPending}
                  >
                    {createServicio.isPending || updateServicio.isPending
                      ? 'Guardando...'
                      : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal transferir responsable */}
      {transferModal.open && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Transferir responsable</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo responsable</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
                    className="input-field"
                  >
                    <option value="">Selecciona un usuario</option>
                    {usuarios.map((u: any) => (
                      <option key={u.id_usuario} value={u.id_usuario}>
                        {u.nombre} {u.apellido} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button type="button" onClick={closeTransfer} className="btn-secondary">Cancelar</button>
                  <button
                    type="button"
                    onClick={confirmTransfer}
                    className="btn-primary"
                    disabled={transferir.isPending || !selectedUserId}
                  >
                    {transferir.isPending ? 'Transfiriendo...' : 'Transferir'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ServiciosScreen
