import { defineConfig, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const config: UserConfig = {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'logo.svg'],
        injectRegister: 'auto',
        manifest: {
          name: 'MenuGran - Menús digitales',
          short_name: 'MenuGran',
          description:
            'Plataforma multi-comercio para menús digitales con pedidos en tiempo real y seguimiento de entrega.',
          lang: 'es',
          dir: 'ltr',
          categories: ['food', 'shopping', 'business'],
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          background_color: '#ffffff',
          theme_color: '#E4002B',
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
          cacheId: 'menu-pwa-v1',
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          // Handler de Web Push (evento push + notificationclick). El SW es
          // generado por Workbox, así que el código custom se inyecta aquí.
          importScripts: ['/push-handler.js'],
          navigateFallback: '/index.html',
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 5 * 60, // 5 minutes
                },
                networkTimeoutSeconds: 10,
              },
            },
            {
              urlPattern: ({ url }) => url.hostname.includes('supabase.co'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 5 * 60, // 5 minutes
                },
                networkTimeoutSeconds: 10,
                plugins: [
                  {
                    fetchDidSucceed: async ({ response }) => {
                      if (response.ok) {
                        console.debug('[SW] Cached Supabase response');
                      }
                      return response;
                    },
                  },
                ],
              },
            },
            {
              urlPattern: ({ url }) => url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico)$/),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
              },
            },
            {
              urlPattern: ({ url }) => url.pathname.match(/\.(woff2?|ttf|eot)$/),
              handler: 'CacheFirst',
              options: {
                cacheName: 'fonts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
  }

  // Elimina console.* y debugger del bundle de producción
  // (no afecta el entorno de desarrollo, donde los logs son útiles)
  if (mode === 'production') {
    config.esbuild = { drop: ['console', 'debugger'] }
  }

  return config
})
