import { defineConfig } from 'vite'
import glsl from 'vite-plugin-glsl'

const isProduction = process.env.NODE_ENV === 'production'

export default defineConfig({
  base: isProduction ? '/3d-multiplayer-shooter/' : '/',
  plugins: [
    glsl()
  ],
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'public/index.html'
      }
    }
  }
})