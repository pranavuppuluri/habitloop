import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the same build works on GitHub Pages project sites
// (username.github.io/repo), Netlify, Vercel, or a plain file server.
export default defineConfig({
  base: './',
  plugins: [react()],
})
