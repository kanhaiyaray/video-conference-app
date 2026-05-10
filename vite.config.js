import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,

    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('react-router-dom')) {
            return 'router'
          }

          if (id.includes('@zegocloud/zego-uikit-prebuilt')) {
            return 'zegocloud'
          }

          if (
            id.includes('react') ||
            id.includes('react-dom')
          ) {
            return 'react'
          }

          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
      },
    },
  },

  optimizeDeps: {
    include: ['@zegocloud/zego-uikit-prebuilt'],
  },
})