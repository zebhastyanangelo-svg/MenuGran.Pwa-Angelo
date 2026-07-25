import { defaultCache } from "@serwist/next/worker";
import {
  Serwist,
  NetworkFirst,
  CacheFirst,
  NetworkOnly,
  StaleWhileRevalidate,
} from "serwist";
import { ExpirationPlugin, CacheableResponsePlugin } from "serwist";

// Estrategia API de datos en vivo: network-first con timeout corto
const apiFresh = new NetworkFirst({
  cacheName: "api-fresh",
  networkTimeoutSeconds: 3,
  plugins: [
    new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 }),
    new CacheableResponsePlugin({ statuses: [0, 200] }),
  ],
});

// Estrategia API con datos semi-estáticos (menú, restaurantes)
const apiStable = new StaleWhileRevalidate({
  cacheName: "api-stable",
  plugins: [
    new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 300 }),
    new CacheableResponsePlugin({ statuses: [0, 200] }),
  ],
});

// Imágenes: cache-first, reutilizar por 30 días
const imageCache = new CacheFirst({
  cacheName: "images",
  plugins: [
    new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    new CacheableResponsePlugin({ statuses: [0, 200] }),
  ],
});

// Dashboards admin/superadmin/operator: NUNCA cachear
const noCache = new NetworkOnly();

const runtimeCaching = [
  // API de órdenes y tracking → datos en vivo
  {
    matcher: /\/api\/(orders|rider)/i,
    handler: apiFresh,
  },
  // API de admin/operator/superadmin → no cachear
  {
    matcher: /\/api\/(admin|superadmin|operator)\//i,
    handler: noCache,
  },
  // API de auth → no cachear
  {
    matcher: /\/api\/auth\//i,
    handler: noCache,
  },
  // API de restaurants y menú → semi-estático
  {
    matcher: /\/api\/restaurants/i,
    handler: apiStable,
  },
  // Imágenes
  {
    matcher: /\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico)$/i,
    handler: imageCache,
  },
  // Todo lo demás (navegación HTML) → defaultCache de Serwist
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: (self as any).__SW_MANIFEST ?? [],
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});

serwist.addEventListeners();
