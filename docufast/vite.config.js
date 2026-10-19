import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  // `vercel dev` serves /api on :3000; when you run plain `npm run dev`
  // this proxy lets the payment API calls reach it.
  server: {
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
});
