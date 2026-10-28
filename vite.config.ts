import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * GitHub Pages 把站点放在 https://用户名.github.io/仓库名/ 下，
 * 不是根目录。所以构建时要知道这个前缀，否则 index.html 里引用的
 * /assets/index-xxx.js 会指到 github.io 的根目录，打开就是白屏。
 *
 * 前缀由 CI 传进来（.github/workflows/deploy.yml 里按仓库名生成），
 * 本地开发没有这个变量，就用 "/"。
 */
const base = process.env.BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [react()],
  server: { port: 5173 },
})
