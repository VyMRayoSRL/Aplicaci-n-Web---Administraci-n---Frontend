import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { 
  Menu, 
  X, 
  Building2, 
  Users, 
  Calendar, 
  Calculator,
  FileText,
  Settings
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import type { Role } from '../types'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const locationPathname = typeof window !== 'undefined' ? window.location.pathname : '/'

  const navigation: ReadonlyArray<{ name: string; href: string; icon: React.ComponentType<any>; roles: Role[] }> = [
    { name: 'Servicios', href: '/servicios', icon: Building2, roles: ['admin','contabilidad','supervisor'] },
    { name: 'Usuarios', href: '/usuarios', icon: Users, roles: ['admin'] },
    { name: 'Puestos', href: '/puestos', icon: Settings, roles: ['admin','contabilidad','supervisor'] },
    { name: 'Planillas', href: '/planillas', icon: Calendar, roles: ['admin','contabilidad','supervisor'] },
    { name: 'Vigiladores', href: '/vigiladores', icon: Users, roles: ['admin','contabilidad','supervisor'] },
    { name: 'Contabilidad', href: '/contabilidad', icon: Calculator, roles: ['admin','contabilidad'] },
    { name: 'Importar Asistencias', href: '/importar-asistencias', icon: FileText, roles: ['admin','contabilidad'] },
    { name: 'Agenda de vigiladores', href: '/agenda', icon: Calendar, roles: ['admin','contabilidad','supervisor'] },
  ]

  const isActive = (href: string) => {
    if (href === '/') return locationPathname === '/'
    return locationPathname.startsWith(href)
  }

  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar para móvil */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <h1 className="text-xl font-bold text-gray-900">Proyecto Rayo</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.filter(item => !user || item.roles.includes(user.rol)).map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive: active }) => `group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    active || isActive(item.href)
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </NavLink>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Sidebar para desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex items-center h-16 px-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Proyecto Rayo</h1>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.filter(item => !user || item.roles.includes(user.rol)).map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive: active }) => `group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    active || isActive(item.href)
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </NavLink>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="lg:pl-64">
        {/* Header móvil */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:hidden">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">Proyecto Rayo</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">{user?.nombre} {user?.apellido}</span>
              <button onClick={logout} className="btn-secondary py-1 px-3">Salir</button>
            </div>
          </div>
        </div>

        {/* Contenido de la página */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="hidden lg:flex items-center justify-end gap-4 mb-4">
              <span className="text-sm text-gray-700">{user?.email}</span>
              <button onClick={logout} className="btn-secondary py-1 px-3">Cerrar sesión</button>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout
