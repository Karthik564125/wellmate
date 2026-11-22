import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Fail loudly instead of silently moving to another port if 5173 is
  // taken - the backend's CORS is locked to exactly this origin
  // (backend/.env's FRONTEND_ORIGIN), so a silent port drift breaks every
  // real backend call with a CORS error.
  server: { port: 5173, strictPort: true },
})
