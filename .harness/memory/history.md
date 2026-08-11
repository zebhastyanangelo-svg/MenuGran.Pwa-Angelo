## [2026-08-07] - TASK-001: Inicialización del Proyecto
- **Estado:** Completada (Commit `281ede5`)
- **Agente:** Implementer
- **Logros:**
  - Proyecto Vite + React + TS + Tailwind CSS configurado y funcional.
  - Estructura modular creada en `/src`.
  - Configuración de Vitest + Testing Library pasando 2/2 tests.
  - Ajuste en `.harness/scripts/init.sh` para gestionar códigos de salida de `pytest`.
  ## [2026-08-07] - TASK-002: Modelado de Tipos TypeScript y Cliente Supabase
- **Estado:** Completada
- **Agente:** Implementer
- **Logros:**
  - Instalado e integrado `@supabase/supabase-js`.
  - Creado `src/types/database.ts` mapeando 1:1 el esquema SQL (Enums + Interfaces Row/Insert/Update).
  - Creado cliente singleton `src/services/supabase.ts` con validación de variables de entorno.
  - Creados `.env.example` y `src/vite-env.d.ts`.
  - Verificado con `npm run build` (tsc sin errores), `oxlint` y `vitest` (2/2 passing).
  ## [2026-08-07] - TASK-003: Refactor del Script de Guardianes
- **Estado:** Completada
- **Agente:** Implementer
- **Logros:**
  - Limpieza de bloques duplicados y código muerto en `.harness/scripts/init.sh`.
  - Implementación de `nullglob` para iteración segura de scripts shell.
  - Manejo adecuado de `exit code` en ejecuciones de `npm test`.
  - Integración transparente con el hook `pre-commit` de Git.
  ## [2026-08-07] - TASK-004: AuthContext y Hook useAuth
- **Estado:** Completada
- **Agente:** Implementer
- **Logros:**
  - Implementación de `AuthProvider` y `AuthContext.tsx` con manejo de sesión en tiempo real.
  - Creación del hook `useAuth.ts` con tipado estricto (`ProfileRow`, `Session`, `User`).
  - Lógica de obtención automática de perfil (`profiles`) y métodos de autenticación (`signInWithGoogle`, `signInWithPassword`, `signUpWithPassword`, `signOut`).
  - Suite de 7 pruebas unitarias TDD en `src/context/AuthContext.test.tsx` (9/9 tests globales en verde).
  ## [2026-08-08] - TASK-005: Enrutamiento y Rutas Protegidas por Rol
- **Estado:** Completada
- **Agente:** Implementer
- **Logros:**
  - Instalación y configuración de `react-router-dom`.
  - Componente `ProtectedRoute.tsx` para control de acceso según autenticación y `user_role`.
  - Configuración del enrutador principal en `App.tsx` con soporte para rutas públicas y privadas.
  - Vistas placeholder en `src/pages/` (Login, Register, Marketplace, MerchantDashboard, NotFound).
  - Pruebas de integración para verificación de redirección en rutas protegidas.
  ## [2026-08-08] - TASK-006: Módulo Marketplace y Catálogo de Productos
- **Estado:** Completada
- **Agente:** Implementer
- **Logros:**
  - Creación de componentes UI en `src/components/marketplace/` (`SearchBar`, `CategoryFilter`, `MerchantCard`, `ProductCard`, `MarketplaceSkeleton`).
  - Implementación de la vista principal `MarketplacePage.tsx` con soporte para consulta paralela en Supabase (comercio, categorías, productos).
  - Filtrado interactivo por categorías, pestañas con contadores y buscador con estados vacíos/reintento.
  - Diseño PWA-first responsivo y suite de 20 tests unitarios en verde.
  ## [2026-08-08] - TASK-007: Módulo de Carrito de Compras (CartContext) y UI Drawer
- **Estado:** Completada
- **Agente:** Implementer
- **Logros:**
  - Tipado de carrito y utilidades de almacenamiento en `src/types/cart.ts`.
  - Creación de `CartContext.tsx` y `useCart.ts` con persistencia en `localStorage`.
  - Validación de restricción por comercio activo (`merchantId`) con alertas de mezcla de productos.
  - Creación del componente `CartDrawer.tsx` responsive con controles de cantidad y vaciado.
  - Suite de 14 tests específicos para el carrito (34 tests en verde a nivel global).
  ## [2026-08-09] - TASK-008: Checkout de Pedido y Carga de Comprobante de Pago Móvil
- **Estado:** Completada
- **Agente:** Implementer
- **Logros:**
  - Desarrollo de la vista `Checkout.tsx` integrada con `useCart` y `useAuth`.
  - Captura de datos de entrega y datos de Pago Móvil (banco origen y número de referencia).
  - Integración de `imageCompressor.ts` para compresión previa del comprobante (<150 KB) y subida a Supabase Storage (`payment-proofs`).
  - Creación de órdenes en la tabla `orders` con estado `payment_pending` e inserción de ítems en `order_items`.
  - Limpieza automática del carrito tras el envío y corrección de mocks en Vitest (46/46 tests globales en verde).
  ## [2026-08-09] - TASK-009: Panel del Comerciante y Validación de Comprobantes de Pago
- **Estado:** Completada
- **Agente:** Implementer
- **Logros:**
  - Desarrollo del panel en `src/pages/MerchantDashboard.tsx` para comerciantes y personal (*staff*).
  - Filtrado de órdenes por estados (`payment_pending`, `confirmed`, `preparing`, `ready`, `on_the_way`, `delivered`, `cancelled`).
  - Modal para visualización de comprobantes de Pago Móvil con generación de URLs firmadas (`createSignedUrl`) desde Supabase Storage.
  - Flujo de transición de estados de orden y pruebas unitarias/integración (50/50 tests globales en verde).
  ## [2026-08-09] - TASK-010: Seguimiento de Pedidos en Tiempo Real e Integración de CLI Supabase
- **Estado:** Completada
- **Agente:** Implementer / MCP
- **Logros:**
  - Desarrollo del componente `src/pages/OrderTracker.tsx` con barra de estado dinámica y detalle de productos.
  - Configuración de suscripciones en tiempo real con Supabase (`postgres_changes`) para cambios de estado en `orders`.
  - Configuración del CLI de Supabase (`supabase link --project-ref eeksewjxkkaasigjehat`) y creación del archivo `.mcp.json` para integración MCP.
  ## [2026-08-10] - TASK-011: Configuración PWA, Manifest y Service Worker con vite-plugin-pwa
- **Estado:** Completada (Commits `ac029fa`, `4e31d03`)
- **Agente:** Implementer
- **Logros:**
  - Configuración exitosa de `vite-plugin-pwa` en `vite.config.ts` con opciones de manifest e iconografía completa (192x192, 512x512).
  - Implementación del hook `usePwaUpdate.ts` y componente de alerta `ReloadPrompt.tsx` para notificar actualizaciones del Service Worker y habilitar modo offline.
  - Resolución de errores de tipado en `useCart.ts` (`CartContextValue`) y corrección de dispatching de eventos `jsdom` en tests unitarios.
  - Verificación exitosa de build PWA (`dist/sw.js`, `dist/manifest.webmanifest`) y 66/66 tests globales en verde con `init.sh` exit status 0.
  ## [2026-08-10] - TASK-012: Gestión de Catálogo de Productos y Categorías por el Comerciante
- **Estado:** Completada
- **Agente:** Implementer
- **Logros:**
  - Implementación completa de `ProductManagement.tsx` y `ProductFormModal.tsx` para flujo CRUD de productos y categorías.
  - Integración de servicio Cloudinary (`src/services/cloudinary.ts`) con compresión local previa y subida unsigned $0 costo.
  - Validaciones estrictas de formularios en `src/utils/productForm.ts` (precios positivos, campos requeridos).
  - Corrección de sintaxis JSX en `MerchantDashboard.tsx` (fragmentos y ternarios desbalanceados).
  - Cobertura de pruebas unitarias (`productForm.test.ts`, `cloudinary.test.ts`, `ProductManagement.test.tsx`) dejando 82/82 tests globales en verde con `init.sh` exit status 0.
  ## [2026-08-10] - TASK-013: Mapa Interactivo de Comercios Cercanos y Ubicación con Leaflet.js
- **Estado:** Completada
- **Agente:** Implementer
- **Logros:**
  - Instalación e integración de `leaflet` y `@types/leaflet` sin costo de API (OpenStreetMap).
  - Extensión de `MerchantRow` en `src/types/database.ts` con el campo `location` (GeoPoint de PostGIS).
  - Creación de componentes mapa `MapView.tsx` (vista de comercios en el Marketplace) y `LocationPicker.tsx` (captura de pin de entrega interactivo en `Checkout.tsx`).
  - Implementación de la fórmula de Haversine en `src/utils/distance.ts` para ordenamiento de comercios por proximidad.
  - Creación de mocks en Vitest para componentes de Leaflet dejando 97/97 tests en verde con `init.sh` exit status 0.
  ## [2026-08-10] - TASK-014: Sistema de Notificaciones Push y Alertas de Estado de Pedido
- **Estado:** Completada
- **Agente:** Implementer
- **Logros:**
  - Creación del hook `useNotifications.ts` para gestionar la Web Notification API nativa ($0 costo API).
  - Creación del sistema UI de fallback `NotificationToast.tsx` (`NotificationToastProvider`, `NotificationToastList`) para mostrar alertas banner/toast cuando las notificaciones estén deshabilitadas.
  - Integración en `OrderTracker.tsx` con las suscripciones de Supabase Realtime para emitir alertas en vivo al cambiar el estado del pedido.
  - Creación del mapper reutilizable `statusDisplayMap.ts`.
  - Cobertura de pruebas unitarias (`useNotifications.test.ts`, `NotificationToast.test.tsx`) elevando la suite a 119/119 tests en verde con `init.sh` exit status 0.
  ## [2026-08-10] - TASK-015: Estrategia Offline y Persistencia Local para Órdenes y Carrito
- **Estado:** Completada
- **Agente:** Implementer
- **Logros:**
  - Creación del hook `useOnlineStatus.ts` para detección en tiempo real de conectividad (`navigator.onLine`).
  - Implementación del componente `OfflineBanner.tsx` para feedback visual no intrusivo en la UI.
  - Creación del módulo `offlineStorage.ts` para persistencia local de hasta 10 órdenes en `localStorage` con validación de schema y resiliencia ante JSON corrupto.
  - Integración en `OrderTracker.tsx` con fallback automático a la caché local al detectar desconexión.
  - Cobertura de pruebas unitarias (`offlineStorage.test.ts`, `useOnlineStatus.test.ts`, `OfflineBanner.test.tsx`) elevando la suite a 148/148 tests en verde con `init.sh` exit status 0.
  ## [2026-08-11] - TASK-016: Optimización de Rendimiento, Lazy Loading y Auditoría PWA
- **Estado:** Completada
- **Agente:** Implementer
- **Logros:**
  - Configuración de Code Splitting en `App.tsx` con `React.lazy` y `Suspense` utilizando el fallback `PageLoader.tsx`.
  - Aplicación de `loading="lazy"` en las imágenes de tarjetas de comercio y catálogo de productos (`MerchantCard`, `ProductCard`).
  - Configuración e integración de meta tags PWA de alta prioridad en `index.html` (`theme-color`, `apple-touch-icon`, `viewport`, etc.).
  - Resolución del asincronismo en pruebas de enrutamiento diferido (`App.test.tsx`), alcanzando un total de 157/157 tests en verde con `init.sh` exit status 0.
  ## [2026-08-11] - TASK-017: Registro de Service Worker y Manejo de Actualizaciones PWA
- **Estado:** Completada
- **Agente:** Implementer
- **Logros:**
  - Configuración del registro del Service Worker en `main.tsx` usando `registerSW()` para conectividad de producción.
  - Refactorización de `usePwaUpdate.ts` para la escucha directa de eventos nativos/personalizados (`pwa:need-refresh`, `pwa:offline-ready`) e invocación de `SKIP_WAITING`.
  - Configuración de tipos en `vite-env.d.ts` para dar soporte a `virtual:pwa-register`.
  - Creación y actualización de suites de pruebas (`usePwaUpdate.test.ts`, `ReloadPrompt.test.tsx`), alcanzando un total de 172/172 tests en verde con `init.sh` exit status 0.