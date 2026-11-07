import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const apiTarget = loadEnv(mode, '.', '').VITE_API_PROXY || 'http://localhost:5004'
  return {
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
  preview: {
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    },
  }
})
