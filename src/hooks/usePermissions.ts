import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

type Role = 'admin' | 'contabilidad' | 'supervisor';

export const usePermissions = () => {
  const { user } = useAuth();
  const role = (user?.rol || 'supervisor') as Role;

  return useMemo(() => {
    const canManageUsers = role === 'admin';
    const canViewAccounting = role === 'admin' || role === 'contabilidad';
    const canImportAssistance = canViewAccounting;

    // Según backend, admin/contabilidad/supervisor pueden gestionar estos módulos (propietario validado en backend)
    const canManageServicios = role === 'admin' || role === 'contabilidad' || role === 'supervisor';
    const canManagePuestos = canManageServicios;
    const canManagePlanillas = canManageServicios;
    const canManageVigiladores = canManageServicios;
    const canManageDPT = canManageServicios; // rutas DPT no restringen por rol, sólo auth+RLS

    return {
      role,
      canManageUsers,
      canViewAccounting,
      canImportAssistance,
      canManageServicios,
      canManagePuestos,
      canManagePlanillas,
      canManageVigiladores,
      canManageDPT,
    };
  }, [role]);
};


