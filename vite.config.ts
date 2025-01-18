import { defineConfig } from 'vite';

export default defineConfig({
  root: 'client', // The root directory for development
  build: {
    outDir: '../dist/client', // Output directory for production build
    emptyOutDir: true,        // Clean the directory before building
  },
  server: {
    port: 3003, // Development server port
    open: true, // Automatically open the browser
  },
  preview: {
    port: 4173, // Preview server port
  },
});