import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import RoleGuard from './components/RoleGuard'
import type { Role } from './types'
import { AuthProvider } from './context/AuthContext'
import LoginScreen from './screens/LoginScreen'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import ServiciosScreen from './screens/ServiciosScreen'
import PuestosScreen from './screens/PuestosScreen'
import PlanillasScreen from './screens/PlanillasScreen'
import PlanillaScreen from './screens/PlanillaScreen'
import GestionVigiladoresScreen from './screens/GestionVigiladoresScreen'
import VigiladorAgendaScreen from './screens/VigiladorAgendaScreen'
import ContabilidadScreen from './screens/ContabilidadScreen'
import ResumenVigiladorScreen from './screens/ResumenVigiladorScreen'
import PlanillaVigiladorScreen from './screens/PlanillaVigiladorScreen'
import ImportarAsistenciasScreen from './screens/ImportarAsistenciasScreen'
import ContabilidadResumenMensualScreen from './screens/ContabilidadResumenMensualScreen'
import UsuariosScreen from './screens/UsuariosScreen'
import ConfigurarDPTScreen from './screens/ConfigurarDPTScreen'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route element={<Layout><ProtectedRoute /></Layout>}>
          <Route path="/" element={<ServiciosScreen />} />
          <Route path="/servicios" element={<ServiciosScreen />} />
          <Route element={<RoleGuard roles={["admin" as Role]} />}>
            <Route path="/usuarios" element={<UsuariosScreen />} />
          </Route>
          <Route element={<RoleGuard roles={["admin" as Role,"contabilidad" as Role]} />}>
            <Route path="/contabilidad" element={<ContabilidadScreen />} />
            <Route path="/contabilidad/resumen" element={<ResumenVigiladorScreen />} />
            <Route path="/contabilidad/planilla" element={<PlanillaVigiladorScreen />} />
            <Route path="/contabilidad/resumen-mensual" element={<ContabilidadResumenMensualScreen />} />
            <Route path="/importar-asistencias" element={<ImportarAsistenciasScreen />} />
          </Route>
          <Route path="/puestos" element={<PuestosScreen />} />
          <Route path="/planillas" element={<PlanillasScreen />} />
          <Route path="/planillas/:id" element={<PlanillaScreen />} />
          <Route path="/planillas/:id/excel" element={<PlanillaScreen />} />
          <Route path="/puestos/configurar-dpt" element={<ConfigurarDPTScreen />} />
          <Route path="/vigiladores" element={<GestionVigiladoresScreen />} />
          <Route path="/agenda" element={<VigiladorAgendaScreen />} />
          <Route path="/vigiladores/:id/agenda" element={<VigiladorAgendaScreen />} />
          <Route path="/vigiladores/:id/resumen" element={<ResumenVigiladorScreen />} />
          <Route path="/planillas/:id/vigiladores" element={<PlanillaVigiladorScreen />} />
          <Route path="/gestion-planilla-vigilador" element={<Navigate to="/agenda" replace />} />
        </Route>
      </Routes>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </AuthProvider>
  )
}

export default App
