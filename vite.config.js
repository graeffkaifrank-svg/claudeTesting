import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://<user>.github.io/claudeTesting/ via GitHub Pages,
  // so assets must resolve relative to that subpath instead of the domain root.
  base: '/claudeTesting/',
  plugins: [react()],
})
