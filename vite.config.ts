import { createHash } from 'node:crypto'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

/** Project Supabase mặc định, khớp DEFAULT_URL trong supabase/client/client.ts. */
const DEFAULT_SUPABASE_URL = 'https://eexciimmlqzlpeyklroe.supabase.co'

/**
 * Content-Security-Policy cho bản build. GitHub Pages không cho đặt header nên
 * dùng thẻ meta. Lớp chặn thứ hai sau việc render markdown an toàn: kể cả khi có
 * XSS, script lạ không chạy được, và dữ liệu chỉ đi được tới đúng Supabase của
 * dự án — không ảnh ngoài, không fetch ra domain khác.
 */
function contentSecurityPolicy(supabaseUrl: string): Plugin {
  const origin = new URL(supabaseUrl).origin
  const socket = origin.replace(/^http/, 'ws')
  return {
    name: 'oraclia-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        // Script inline duy nhất (tô màu trước lần vẽ đầu) được duyệt theo hash,
        // không mở 'unsafe-inline' cho script.
        const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
          ([, body]) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`,
        )
        const policy = [
          "default-src 'self'",
          `script-src 'self' ${hashes.join(' ')}`,
          // Mantine đặt biến CSS qua thẻ <style> lúc chạy.
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          'font-src https://fonts.gstatic.com',
          "img-src 'self' data: blob:",
          `connect-src 'self' ${origin} ${socket}`,
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; ')
        return html.replace(
          '<meta charset="UTF-8" />',
          `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
        )
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
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
  plugins: [
    react(),
    contentSecurityPolicy(loadEnv(mode, process.cwd(), '').VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@db': fileURLToPath(new URL('./supabase/client/index.ts', import.meta.url)),
    },
  },
}))
