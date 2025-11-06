import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // listen on all addresses so mobile devices on the same LAN can connect
    host: true,
    port: 5173,
    strictPort: false,
    // Proxy API calls during development to the backend running on 5019
    // so fetch('/api/...') from the React app will reach the ASP.NET Core server.
    proxy: {
      '/api': {
        target: 'http://localhost:5019',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
