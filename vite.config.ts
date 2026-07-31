import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Local + custom domain: base `./`. Project Pages without a custom domain can set VITE_BASE_PATH=/AdaptivityPerformance/
const base = process.env.VITE_BASE_PATH || './'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  appType: 'spa',
})
