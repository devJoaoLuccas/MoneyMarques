import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Mesma origem para a SPA e a API: o cookie de sessao (HttpOnly, SameSite=Lax) funciona sem CORS.
    proxy: { '/api': { target: 'http://localhost:3000' } },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    css: false,
  },
})
