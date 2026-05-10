import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
  },

  build: {
    outDir: 'dist',
    sourcemap: false,       // disable in production for smaller bundle
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Split large vendor chunks to improve caching
        manualChunks: {
          react:    ['react', 'react-dom'],
          router:   ['react-router-dom'],
          zegocloud: ['@zegocloud/zego-uikit-prebuilt'],
        },
      },
    },
  },

  optimizeDeps: {
    include: ['@zegocloud/zego-uikit-prebuilt'],
  },
})
