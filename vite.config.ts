import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    build: {
      // React in its own chunk: it changes only when we upgrade it, so a game
      // update does not make every phone re-download the framework.
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
          },
        },
      },
      // scripts/budget.mjs is the real limit; this only quiets the generic warning.
      chunkSizeWarningLimit: 600,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
