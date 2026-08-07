#  Arquitectura General y Stack Tecnologico

## 1. Vision General del Proyecto
MenuGram es una plataforma web progresiva (PWA) multi-tenant diseñada para menús digitales, gestión de comandas en tiempo real y seguimiento de pedidos en vivo, optimizada para operar con costo de infraestructura cero ($0) y preparada para alta escalabilidad mediante un modelo de Monolito Modular.

---

## 2. Stack Tecnologico ($0 Costo Operativo)

| Componente | Tecnología Seleccionada | Justificación y Funcionamiento |
| :--- | :--- | :--- |
| **Frontend / PWA** | React 18+ / TypeScript / Vite / Tailwind CSS | Renderizado rápido en cliente, tipado estricto y diseño responsive. |
| **PWA Engine** | `vite-plugin-pwa` | Permite la instalación nativa en iOS, Android y Desktop sin pasar por tiendas. |
| **Hosting Frontend** | Vercel / Cloudflare Pages | Despliegue continuo en CDN Global con transferencia de datos gratuita. |
| **Backend API** | Node.js (Express) - Monolito Modular | Único proceso desplegado en Render, mantenido activo vía cron-job. |
| **Base de Datos** | PostgreSQL (Supabase) | Modelo relacional único con identificadores UUIDv7, soporte JSONB y PostGIS. |
| **Autenticación** | Supabase Auth | Manejo nativo de Google OAuth 2.0, registro por email y JWT. |
| **Storage (Catálogos)** | Cloudinary (Cuenta Maestra Única) | CDN especializado (25 GB free) para fotos de productos y logos optimizados. |
| **Storage (Captures)** | Supabase Storage | Bucket privado (1 GB free) para comprobantes con purga automática a 30 días. |
| **Mapas Realtime** | Leaflet.js + OpenStreetMap + Supabase Realtime | Rastreo de entregas estilo Uber sin depender de la API de pago de Google Maps. |

---

## 3. Arquitectura de Almacenamiento
* **Fotos de Menú y Logos:** Se suben a Cloudinary mediante un Unsigned Upload Preset desde la PWA, almacenando solo la URL optimizada en PostgreSQL.
* **Captures de Pago Móvil:** Se almacenan en Supabase Storage. Una función programada en PostgreSQL (Cron Job) elimina automáticamente los archivos con más de 30 días de antigüedad de pedidos finalizados o cancelados, manteniendo la cuota de almacenamiento limpia.