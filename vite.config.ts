import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              // React-Bibliotheken in separaten Chunk
              'react-vendor': ['react', 'react-dom'],
              // Schach-Bibliotheken in separaten Chunk
              'chess-vendor': ['chess.js', 'react-chessboard'],
            }
          }
        },
        chunkSizeWarningLimit: 600,
      }
    };
});
