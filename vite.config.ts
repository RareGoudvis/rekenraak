import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // The static marketing/FAQ/catalogue pages are plain HTML+TS (no React), built by
      // Vite alongside the app so they can reuse the app's real CSS (hashed, cache-busted)
      // instead of a hand-copied stylesheet. See src/site.ts.
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        about: resolve(import.meta.dirname, 'about.html'),
        faq: resolve(import.meta.dirname, 'faq.html'),
        oefeningen: resolve(import.meta.dirname, 'oefeningen.html'),
      },
    },
  },
})
