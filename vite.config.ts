import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // 개발도 배포와 같은 동일 오리진 구조 — 브라우저 교차 출처 차단(CORS) 회피
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
