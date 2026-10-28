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
      '/api': 'http://localhost:5000',
    },
  },
})
