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