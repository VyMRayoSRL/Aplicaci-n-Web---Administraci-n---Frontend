import api, { refrescarToken } from './api';
import { User, LoginForm } from '../types';

export interface LoginResponse {
  usuario: User;
  token: string;
}

const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';

export const authService = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  getStoredUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  async login({ email, password }: LoginForm): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>('/auth/login', { email, password });
    const { usuario, token } = res.data;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(usuario));
    return { usuario, token };
  },

  refresh: refrescarToken,

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout', {});
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  },
};
