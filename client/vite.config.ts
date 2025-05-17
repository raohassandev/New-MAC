import { defineConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
      '~/components': path.resolve(__dirname, './src/components'),
      '~/services': path.resolve(__dirname, './src/services'),
      '~/hooks': path.resolve(__dirname, './src/hooks'),
      '~/utils': path.resolve(__dirname, './src/utils'),
      '~/types': path.resolve(__dirname, './src/types'),
      '~/context': path.resolve(__dirname, './src/context'),
      '~/layouts': path.resolve(__dirname, './src/layouts'),
      '~/pages': path.resolve(__dirname, './src/pages'),
      '~/api': path.resolve(__dirname, './src/api'),
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3333',
        changeOrigin: true,
        secure: false,
      },
      '/client/api': {
        target: 'http://localhost:3333',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV !== 'production',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
          recharts: ['recharts'],
          formik: ['formik', 'yup'],
        },
      },
    },
  },
  define: {
    // This ensures process.env can be used in the client code
    'process.env': {},
  },
});
