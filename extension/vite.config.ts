import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { cpSync, existsSync } from 'fs'

export default defineConfig({
  root: 'src',
  base: '',
  plugins: [
    react(),
    tailwindcss(),
    // Copy static files to dist after build
    {
      name: 'copy-extension-files',
      closeBundle() {
        const dist = resolve(__dirname, 'dist')
        // Copy manifest.json
        cpSync(resolve(__dirname, 'manifest.json'), resolve(dist, 'manifest.json'))
        // Copy icons if they exist
        const iconsDir = resolve(__dirname, 'icons')
        if (existsSync(iconsDir)) {
          cpSync(iconsDir, resolve(dist, 'icons'), { recursive: true })
        }
        // Copy static assets (images) if they exist
        const assetsStaticDir = resolve(__dirname, 'assets')
        if (existsSync(assetsStaticDir)) {
          cpSync(assetsStaticDir, resolve(dist, 'assets-static'), { recursive: true })
        }
      },
    },
  ],
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    modulePreload: false,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
        offscreen: resolve(__dirname, 'src/offscreen/offscreen.html'),
        options: resolve(__dirname, 'src/options/index.html'),
        permissions: resolve(__dirname, 'src/permissions/index.html'),
        'service-worker': resolve(__dirname, 'src/service-worker/index.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Service worker must be a single file at root level
          if (chunkInfo.name === 'service-worker') return 'service-worker.js'
          return 'assets/[name]-[hash].js'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
})
