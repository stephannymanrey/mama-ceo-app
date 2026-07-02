import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { copyFileSync, mkdirSync } from 'fs'

// Copia los binarios de FFmpeg.wasm al build para evitar dependencia de CDN
function copyFfmpegPlugin() {
  return {
    name: 'copy-ffmpeg-core',
    buildStart() {
      try {
        mkdirSync('public/ffmpeg', { recursive: true })
        copyFileSync('node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js',   'public/ffmpeg/ffmpeg-core.js')
        copyFileSync('node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm', 'public/ffmpeg/ffmpeg-core.wasm')
      } catch (e) {
        console.warn('No se pudieron copiar los archivos de FFmpeg:', e.message)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    copyFfmpegPlugin(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],
      manifest: {
        name: 'Mamá CEO App',
        short_name: 'Mamá CEO',
        description: 'Tu app de organización personal y de negocio',
        theme_color: '#C4526A',
        background_color: '#FDF9F6',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  resolve: {
    alias: {
      './runtimeConfig': './runtimeConfig.browser',
    },
  },
  optimizeDeps: {
    include: ['aws-amplify', 'aws-amplify/auth'],
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
})
