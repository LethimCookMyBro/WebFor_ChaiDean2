import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig(({ mode }) => {
  // Use SSL for GPS testing (GPS requires HTTPS on mobile)
  const plugins = [react()]
  
  // Add SSL in development mode
  if (mode === 'development') {
    plugins.push(basicSsl())
  }
  
  return {
    plugins,
    
    // Development server config
    server: {
      host: '0.0.0.0',
      port: 5174,
      https: mode === 'development', // HTTPS only in dev for GPS
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        }
      }
    },
    
    // Production build optimizations
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: true
        }
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            map: ['leaflet', 'react-leaflet'],
            icons: ['lucide-react']
          },
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'chunks/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js'
        }
      },
      chunkSizeWarningLimit: 500,
      cssCodeSplit: true
    },
    
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'leaflet']
    }
  }
})
