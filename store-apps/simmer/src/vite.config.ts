import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  // libraw-wasm starts its own worker and loads its .wasm next to itself: don't pre-bundle it.
  optimizeDeps: { exclude: ['libraw-wasm'] },
  worker: { format: 'es' },
  server: {
    port: 5173,
    // Exported photos may land in this folder; don't let the file watcher trip over them.
    watch: { ignored: ['**/*.{jpg,jpeg,png,webp,zip}', '**/public/mediapipe/**'] },
  },
});
