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
          // Pin the React runtime (incl. scheduler) to an eager vendor chunk so
          // Rollup can never merge it into three-vendor — that used to drag
          // 888KB of three.js into every first paint via modulepreload.
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react-vendor'
          if (/node_modules\/(three|three-stdlib|three-mesh-bvh|@react-three|troika-three)/.test(id)) return 'three-vendor'
          if (id.includes('heic2any')) return 'heic2any'
          if (id.includes('/motion/') || id.includes('framer-motion')) return 'motion'
          return undefined
        },
      },
    },
  },
})
