import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { User, LoginForm } from '../types';
import { authService } from '../services/auth';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  login: (data: LoginForm) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(authService.getStoredUser());
  const [token, setToken] = useState<string | null>(authService.getToken());
  const [isHydrating, setIsHydrating] = useState<boolean>(true);

  useEffect(() => {
    // Hydration pass: mark ready on mount
    setIsHydrating(false);
  }, []);

  const login = async (data: LoginForm) => {
    const res = await authService.login(data);
    setUser(res.usuario);
    setToken(res.token);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setToken(null);
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isAuthenticated: !!user && !!token,
    isHydrating,
    login,
    logout,
  }), [user, token, isHydrating]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
};


