import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

const root = import.meta.dirname

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(root, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react'
            if (id.includes('@supabase')) return 'supabase'
            return 'vendor'
          }
        },
      },
    },
  },
})
