import { defineConfig, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Hostnames que pertenecen a Supabase (proyecto, API REST y Storage).
 *
 * El match es por sufijo exacto del dominio: `includes('supabase.co')`
 * también capturaba hosts ajenos como `notsupabase.co`, queiban a parar en
 * la caché del Service Worker y a servirse desde ella.
 */
function isSupabaseHost(url: URL): boolean {
  return url.hostname === 'supabase.co' || url.hostname.endsWith('.supabase.co')
}

// https://vite.dev/config/
export default defineConfig(() => {
  const config: UserConfig = {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo.png', 'pwa-192x192.png', 'pwa-512x512.png', 'maskable-512x512.png'],
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
          theme_color: '#C71523',
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
          cacheId: 'menu-pwa-v2',
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
              // Caché de mosaicos de mapas (OpenStreetMap). CacheFirst hace que
              // el fondo del mapa siga cargando sin conexión en la zona local:
              // las teselas ya vistas se sirven del Cache Storage y las nuevas
              // se acumulan para futuros recorridos del repartidor. Las teselas
              // de OSM son inmutables en la práctica, así que 30 días de TTL
              // es seguro y respetuoso con el proveedor.
              urlPattern: ({ url }) =>
                url.hostname === 'tile.openstreetmap.org' ||
                url.hostname.endsWith('.tile.openstreetmap.org'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'map-tiles-cache-v1',
                expiration: {
                  // ~500 teselas cubren una zona local en varios niveles de
                  // zoom; el límite evita que la caché crezca sin control.
                  maxEntries: 500,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
                // 0 cubre respuestas opacas (cross-origin sin CORS) y 200 las
                // teselas válidas; los errores 4xx/5xx no se cachean.
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // ImgBB queda TOTALMENTE excluido del Service Worker: tanto las
              // imágenes del CDN (i.ibb.co / *.ibb.co) como las subidas a
              // api.imgbb.com pasan directo a la red sin tocar caché.
              // NetworkOnly garantiza que, si un móvil falla una carga con
              // mala señal, el SW nunca guarde un estado inválido permanente
              // y el siguiente intento traiga la imagen fresca. Debe ser la
              // PRIMERA regla para que gane sobre cualquier otra que pudiera
              // coincidir con esos dominios.
              //
              // La vigencia del contenido la aporta el frontend: cada URL de
              // imagen lleva un parámetro `?v=<image_version>` que cambia al
              // sustituirse la foto, de modo que el navegador no puede
              // servir la copia vieja de la misma URL.
              urlPattern: ({ url }) =>
                url.hostname === 'ibb.co' ||
                url.hostname.endsWith('.ibb.co') ||
                url.hostname.endsWith('.imgbb.com'),
              handler: 'NetworkOnly',
            },
            {
              // API propia del backend (Express en Render): siempre se intenta
              // la red primero y la caché solo actúa de respaldo.
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
              // Objetos de Supabase Storage (logos, banners, fotos de platos
              // y comprobantes de pago): `NetworkFirst` da prioridad a la
              // versión más reciente siempre que haya conexión y cae en la
              // caché solo si la red no responde dentro del timeout (modo
              // avión o señal mala).
              //
              // La clave de caché incluye el query string, así que el
              // parámetro `?v=<image_version>` que antepone el frontend
              // invalida la entrada anterior: una foto nueva nunca se sirve
              // desde la copia cacheada de la anterior.
              urlPattern: ({ url }) =>
                isSupabaseHost(url) &&
                url.pathname.startsWith('/storage/v1/object/'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-storage-images-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 24 * 60 * 60, // 1 day
                },
                networkTimeoutSeconds: 5,
                // 0 cubre respuestas opacas (cross-origin sin CORS) y 200 las
                // imágenes válidas; los errores 4xx/5xx no se cachean.
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Resto de tráfico de Supabase (API REST, Auth, Realtime):
              // `NetworkFirst` con TTL corto para que los datos del comercio
              // y del menú no queden congelados en el dispositivo.
              urlPattern: ({ url }) => isSupabaseHost(url),
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
              // Solo se cachean imágenes del PROPIO origen (assets del bundle).
              // Las externas de ImgBB están además vetadas por la regla
              // NetworkOnly de *.ibb.co que va primero en esta lista.
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico)$/) !== null,
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

  // Nota: en Vite 8 (rolldown/oxc) las opciones `esbuild.drop`/`esbuild.pure`
  // se IGNORAN. El minificador de oxc sí tiene `compress.dropConsole`, pero es
  // todo-o-nada y eliminaría también console.error, que ExternalImage usa para
  // registrar las URLs de ImgBB que fallan — la única vía para depurar imágenes
  // rotas desde la PWA instalada en un teléfono. Por eso se conservan los logs
  // en el bundle de producción (los errores de imagen salen en la consola del
  // dispositivo).

  return config
})
