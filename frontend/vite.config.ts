import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Performance budget warnings
    chunkSizeWarningLimit: 500, // Reduced from 1000 to encourage smaller chunks
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // More granular chunking strategy for better performance
          if (id.includes('node_modules')) {
            // Separate vendor libraries into their own chunks
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor'
            }
            if (id.includes('pinyin-pro')) {
              return 'pinyin'
            }
            if (id.includes('axios')) {
              return 'http-client'
            }
            // Other vendor libraries
            return 'vendor'
          }

          // Page-based chunking for lazy-loaded components
          if (id.includes('src/pages/')) {
            const page = id.split('/pages/')[1].split('.')[0]
            return `page-${page.toLowerCase()}`
          }

          // Component chunking for large components
          if (id.includes('DrawingCanvas')) {
            return 'drawing'
          }

          // Utility chunking
          if (id.includes('src/utils/')) {
            return 'utils'
          }
        }
      }
    },
    // Enable source maps for production debugging
    sourcemap: true,
    // Bundle analysis and performance budgets
    reportCompressedSize: true,
    // Target modern browsers for better performance
    target: 'es2020'
  },
  // Development optimizations
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['pinyin-pro'] // Lazy load this
  },
  // Performance monitoring in development
  define: {
    __PERFORMANCE_MONITORING__: JSON.stringify(true)
  }
})
