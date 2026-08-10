import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'logo.svg'],
      injectRegister: false,
      manifest: {
        name: 'MenuGram - Menús digitales',
        short_name: 'MenuGram',
        description:
          'Plataforma multi-comercio para menús digitales con pedidos en tiempo real y seguimiento de entrega.',
        lang: 'es',
        dir: 'ltr',
        categories: ['food', 'shopping', 'business'],
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/marketplace',
        scope: '/',
        background_color: '#ffffff',
        theme_color: '#f97316',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
