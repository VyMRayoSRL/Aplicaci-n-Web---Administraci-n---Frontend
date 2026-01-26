import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { authService } from './auth';

// Configuración base de la API
export const API_BASE_URL = import.meta.env.VITE_API_URL;

// Crear instancia de axios
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// Interceptor para agregar token de autenticación desde localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (() => {
    // Single-flight refresh lock to avoid concurrent refresh calls
    let refreshPromise: Promise<string> | null = null;
    let isLoggingOut = false;

    const forceLogout = () => {
      if (isLoggingOut) return;
      isLoggingOut = true;
      try {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
      } catch {}
      // Redirect to login; avoid using navigate here to prevent circular deps
      try { window.location.replace('/login'); } catch { /* no-op */ }
    };

    return async (error: AxiosError) => {
      const originalRequest: any = error.config || {};

      // Only handle unauthorized responses once per request
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          // Reuse ongoing refresh if present
          if (!refreshPromise) {
            refreshPromise = authService.refresh().finally(() => {
              // Reset lock after refresh settles
              refreshPromise = null;
            });
          }
          const newToken = await refreshPromise;
          // Retry original request with updated token
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (refreshErr) {
          // On refresh failure, force logout and propagate error
          forceLogout();
          return Promise.reject(refreshErr);
        }
      }

      return Promise.reject(error);
    };
  })()
);

// Función helper para manejar errores de la API
export const handleApiError = (error: any): string => {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.message) {
      return error.message;
    }
  }
  return 'Error desconocido';
};

// Función helper para construir query parameters
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
