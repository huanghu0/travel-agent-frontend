import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // base: '/ai-creator-service/rHFReMyqD4sL/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5179,
    proxy: {
      '/api': {
        target: 'http://10.126.192.26:8000',
        changeOrigin: true
      }
    }
  }
})

