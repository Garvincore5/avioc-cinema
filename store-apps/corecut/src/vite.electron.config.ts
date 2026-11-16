import { defineConfig } from 'vite';

// Bundles the desktop shell (electron/main.ts + audio-proxy.ts) into dist-electron/main.cjs.
export default defineConfig({
  build: {
    ssr: 'electron/main.ts',
    outDir: 'dist-electron',
    target: 'node22',
    emptyOutDir: true,
    rollupOptions: {
      external: ['electron', /^node:/],
      output: { format: 'cjs', entryFileNames: 'main.cjs' },
    },
  },
});
