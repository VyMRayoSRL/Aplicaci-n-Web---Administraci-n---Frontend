import { QueryClient } from '@tanstack/react-query'

// Reintenta solo errores de red o del servidor: un 4xx (permiso, validación, no encontrado) no cambia reintentando.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (intentos, error: any) => {
        const status = error?.response?.status
        if (status && status < 500) return false
        return intentos < 2
      },
      staleTime: 5 * 60 * 1000,
    },
  },
})
