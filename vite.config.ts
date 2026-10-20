import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3001,
    open: true,
    // Mismo origen en desarrollo: /api va al back (así viaja la cookie de sesión, sin CORS).
    proxy: {
      '/api': { target: process.env.VITE_PROXY_TARGET || 'http://localhost:3000', changeOrigin: false },
    },
  },
})
