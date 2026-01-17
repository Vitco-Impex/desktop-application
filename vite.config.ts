import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';


// https://vitejs.dev/config/
export default defineConfig({
  base: './', // Use relative paths for Electron
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'], // Ensure single instance of React
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console in production
        drop_debugger: true,
        passes: 1,
      },
      format: {
        comments: false,
      },
      mangle: {
        reserved: ['React', 'ReactDOM', 'useState', 'useEffect', 'useRef', 'useCallback', 'useMemo'],
      },
    },
    sourcemap: false,
    chunkSizeWarningLimit: 500, // Reduced from 1000
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['zustand'],
          'utils-vendor': ['axios'],
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    cssCodeSplit: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'zustand',
    ],
    exclude: [
      'electron-updater', // Exclude Electron-specific deps from pre-bundling
    ],
  },
});