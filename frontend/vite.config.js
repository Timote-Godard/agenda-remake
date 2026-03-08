import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    proxy: {
      // 🌟 Tunnel pour l'agenda universitaire (évite CORS en local)
      '/univ-api': {
        target: 'https://planning.univ-rennes1.fr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/univ-api/, ''),
        secure: false,
      }
    }
  }
})
