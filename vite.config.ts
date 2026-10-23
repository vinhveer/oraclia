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
    rolldownOptions: {
      output: {
        // Thư viện ít đổi tách thành chunk riêng: deploy app mới không bắt trình
        // duyệt tải lại cả React, Mantine, Supabase.
        advancedChunks: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|react-router)/ },
            { name: 'mantine', test: /node_modules[\\/](@mantine|@floating-ui)/ },
            { name: 'supabase', test: /node_modules[\\/]@supabase/ },
            {
              name: 'chat',
              test: /node_modules[\\/](@assistant-ui|assistant-stream|micromark|mdast|remark|unified|hast|react-markdown)/,
            },
          ],
        },
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@db': fileURLToPath(new URL('./supabase/client/index.ts', import.meta.url)),
    },
  },
})
