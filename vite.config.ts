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
        drop_console: false, // Keep console for now to debug
        drop_debugger: true,
        passes: 1, // Single pass for safety
      },
      format: {
        comments: false,
      },
      mangle: {
        reserved: ['React', 'ReactDOM', 'useState', 'useEffect', 'useRef', 'useCallback', 'useMemo'],
      },
    },
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Let Vite handle chunking automatically - it will properly handle React dependencies
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