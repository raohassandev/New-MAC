import { defineConfig, Plugin } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

// Custom plugin to handle absolute Windows paths
function fixWindowsPathsPlugin(): Plugin {
  return {
    name: 'fix-windows-paths',
    // Priority is important - we want to run this before other resolvers
    enforce: 'pre',
    
    resolveId(id, importer) {
      // Handle absolute Windows paths
      if (id.match(/^[A-Z]:\\/) || id.match(/^[A-Z]:\//)) {
        console.log(`[fix-windows-paths] Converting Windows path: ${id}`);
        
        // Normalize the path first (convert backslashes to forward slashes)
        const normalizedId = id.replace(/\\/g, '/');
        
        
        // We can add more mappings here if needed
      }
      
      
      return null; // Let Vite handle other imports
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    fixWindowsPathsPlugin(), // Add our custom plugin first
    react(), 
    tsconfigPaths()
  ],
  resolve: {
    alias: [
      { find: /^~\//, replacement: path.resolve(__dirname, './src/') + '/' },
      { find: '~/components', replacement: path.resolve(__dirname, './src/components') },
      { find: '~/services', replacement: path.resolve(__dirname, './src/services') },
      { find: '~/hooks', replacement: path.resolve(__dirname, './src/hooks') },
      { find: '~/utils', replacement: path.resolve(__dirname, './src/utils') },
      { find: '~/types', replacement: path.resolve(__dirname, './src/types') },
      { find: '~/context', replacement: path.resolve(__dirname, './src/context') },
      { find: '~/layouts', replacement: path.resolve(__dirname, './src/layouts') },
      { find: '~/pages', replacement: path.resolve(__dirname, './src/pages') },
      { find: '~/api', replacement: path.resolve(__dirname, './src/api') },
    ],
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
