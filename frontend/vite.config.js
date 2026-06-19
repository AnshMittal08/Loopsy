import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  build: {
    // The heavy 3D/HEIC chunks are lazy-loaded and never enter the initial
    // bundle; group vendors so they cache well and the warning reflects reality.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('three') || id.includes('@react-three')) return 'three-vendor'
          if (id.includes('heic2any')) return 'heic2any'
          if (id.includes('/motion/') || id.includes('framer-motion')) return 'motion'
          return undefined
        },
      },
    },
  },
})
