import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  // Repo là project site (vinhveer.github.io/oraclia) nên mọi asset phải trỏ
  // vào /oraclia/, không phải gốc domain.
  base: '/oraclia/',
  build: {
    // GitHub Pages phục vụ từ nhánh main, thư mục /docs.
    outDir: 'docs',
    emptyOutDir: true,
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@db': fileURLToPath(new URL('./supabase/client/index.ts', import.meta.url)),
    },
  },
})
