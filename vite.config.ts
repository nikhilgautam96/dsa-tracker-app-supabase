import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // ~145 kB gzipped: React + Supabase client; one chunk is fine for this app.
  build: { chunkSizeWarningLimit: 600 },
})
