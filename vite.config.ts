import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api/pgn': {
            target: 'http://localhost:3003',
            changeOrigin: true,
          },
        },
      },
      plugins: [tailwindcss(), react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            // Rolldown (Vite 8) erfordert manualChunks als Funktion
            manualChunks(id) {
              if (id.includes('react-dom') || id.includes('react/')) {
                return 'react-vendor';
              }
              if (id.includes('chess.js') || id.includes('react-chessboard')) {
                return 'chess-vendor';
              }
            }
          }
        },
        chunkSizeWarningLimit: 600,
      }
    };
});
