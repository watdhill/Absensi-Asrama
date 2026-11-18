import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // bisa dibuka dari HP/laptop lain di jaringan Wi-Fi yang sama
    host: true,
    // request ke /api diteruskan ke backend Express, jadi tidak perlu tulis URL lengkap
    proxy: {
      // bisa diarahkan ke backend lain, misal: API_URL=http://localhost:5055 npm run dev
      '/api': process.env.API_URL || 'http://localhost:5000',
    },
  },
})
