import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 6000,
    rolldownOptions: {
      onwarn(warning, defaultHandler) {
        // Suppress eval warning from ZegoCloud SDK (third-party, cannot fix)
        if (warning.code === 'EVAL') return;
        defaultHandler(warning);
      },
    },
  },
})