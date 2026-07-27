import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Local dev: base `/` so /admin loads JS correctly. GitHub Pages CI sets VITE_BASE_PATH=/AdaptivityPerformance/
const base = process.env.VITE_BASE_PATH || '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  appType: 'spa',
})
