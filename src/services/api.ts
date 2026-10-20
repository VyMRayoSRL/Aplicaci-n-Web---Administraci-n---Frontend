import axios, { AxiosInstance, AxiosError } from 'axios';

// Por defecto la API está en el mismo origen (/api): en desarrollo la sirve el proxy de Vite
// y en producción nginx. VITE_API_URL solo hace falta si el back vive en otro dominio.
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  // La cookie httpOnly del refresh token tiene que viajar
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Un solo refresh a la vez aunque fallen varios pedidos juntos.
let refreshPromise: Promise<string> | null = null;
export const refrescarToken = (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        const { token, usuario } = res.data as { token: string; usuario?: unknown };
        localStorage.setItem(TOKEN_KEY, token);
        if (usuario) localStorage.setItem(USER_KEY, JSON.stringify(usuario));
        return token;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};

let cerrandoSesion = false;
const forzarLogout = () => {
  if (cerrandoSesion) return;
  cerrandoSesion = true;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.replace('/login');
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original: any = error.config || {};
    const esAuth = String(original.url || '').startsWith('/auth/');
    // Un 401 de login (credenciales malas) no dispara refresh ni recarga la página.
    if (error.response?.status === 401 && !original._retry && !esAuth) {
      original._retry = true;
      try {
        const token = await refrescarToken();
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (refreshErr) {
        forzarLogout();
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

// Mensaje para mostrarle al usuario a partir de un error de la API.
// El back responde { error: { code, message, details }, requestId }.
export const getErrorMessage = (error: any, fallback = 'Ocurrió un error inesperado'): string => {
  const data = error?.response?.data;
  if (data?.error?.message) return data.error.message;
  if (typeof data?.error === 'string') return data.error;
  if (typeof data?.message === 'string') return data.message;
  if (error?.code === 'ECONNABORTED') return 'El servidor tardó demasiado en responder';
  if (error?.message === 'Network Error') return 'No se pudo conectar con el servidor';
  return fallback;
};

// Compatibilidad con el nombre anterior
export const handleApiError = (error: any): string => getErrorMessage(error, 'Error desconocido');

export const buildQueryParams = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
};

export default api;
