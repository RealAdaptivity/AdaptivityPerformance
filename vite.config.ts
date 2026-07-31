import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Absolute base so deep routes (/portal, /login, /admin) resolve /assets correctly.
// GitHub project pages without a custom domain: VITE_BASE_PATH=/AdaptivityPerformance/
const base = process.env.VITE_BASE_PATH || '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  appType: 'spa',
})
