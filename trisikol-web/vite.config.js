import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Local server configuration only; never bundled into the client.
  const env = loadEnv(mode, '.', 'TRISIKOL_')
  return {
    plugins: [react()],
    server: {
      watch: { ignored: ['**/dist-routing-check/**'] },
      proxy: { '/api': { target: env.TRISIKOL_DEV_API_TARGET || 'http://127.0.0.1:8080', changeOrigin: true } },
    },
    preview: { proxy: { '/api': { target: env.TRISIKOL_DEV_API_TARGET || 'http://127.0.0.1:8080', changeOrigin: true } } },
  }
})
