import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Keep answer database in main bundle
          if (id.includes('constants/db/') || id.includes('answerDatabase')) {
            return 'main';
          }
          // Split large vendor libraries
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) {
              return 'firebase';
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('framer-motion')) {
              return 'framer';
            }
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  }
})
