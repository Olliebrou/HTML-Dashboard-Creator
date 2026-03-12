import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Set base to the GitHub repository name so assets resolve correctly on GitHub Pages
  base: '/HTML-Dashboard-Creator/',
})
