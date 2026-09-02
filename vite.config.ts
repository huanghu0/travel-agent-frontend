import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    // 生产环境通过 VITE_APP_BASE_URL 部署到指定二级目录；本地开发仍使用根路径。
    base: env.VITE_APP_BASE_URL || '/',
    plugins: [vue()],
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
  }
})
