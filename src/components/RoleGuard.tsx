import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

interface RoleGuardProps {
  roles: Role[];
}

const RoleGuard: React.FC<RoleGuardProps> = ({ roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.rol)) return <Navigate to="/" replace />;
  return <Outlet />;
};

export default RoleGuard;


