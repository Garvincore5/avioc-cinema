import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { audioProxy } from './audio-proxy.ts'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), audioProxy()],
})
