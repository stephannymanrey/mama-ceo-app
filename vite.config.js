import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.png', 'logo.png'],
      manifest: {
        name: 'MamaCEO',
        short_name: 'MamaCEO',
        description: 'Tu app de organización personal y de negocio',
        theme_color: '#C4526A',
        background_color: '#FDF9F6',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'logo.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
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
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
})
