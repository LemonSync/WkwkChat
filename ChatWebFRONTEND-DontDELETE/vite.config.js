import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  server: { // Hapus kalo mau localhost
    host: '0.0.0.0',
    port: 2677,
    strictPort: true,
    allowedHosts: [
      'node2331.nay.shopryzen.my.id',
      '.shopryzen.my.id'
    ]
  },
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
