import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/novix.tv-site/',
  server: {
    port: 6969,
  },
})
