# MenuGram PWA

Plataforma de menús digitales multi-tenant con gestión de pedidos en tiempo real y seguimiento de entregas.

## Stack

- **Frontend / PWA:** React 18+, TypeScript, Vite, Tailwind CSS, `vite-plugin-pwa`
- **Backend API:** Node.js (Express) en Monolito Modular
- **Base de Datos & Auth:** PostgreSQL vía Supabase (UUIDs, JSONB, RLS)
- **Storage:** Cloudinary (imágenes) · Supabase Storage (capturas de pago)
- **Mapas Realtime:** Leaflet.js + OpenStreetMap + Supabase Realtime

## Desarrollo

```bash
npm install        # instalar dependencias
npm run dev        # servidor de desarrollo
npm run build      # build de producción (tsc + vite)
npm test           # suite de tests (vitest)
npm run lint       # linter (oxlint)
```

## Estructura

```
src/
├── components/    # Componentes UI reutilizables
├── pages/         # Vistas/páginas de la aplicación
├── services/      # Clientes de API y servicios externos
├── hooks/         # Custom hooks de React
├── types/         # Tipos e interfaces TypeScript
└── context/       # Contextos globales de estado
```

## Documentación

- `docs/ARCHITECTURE-STACK.md` — stack tecnológico y flujo de datos
- `docs/REQUIREMENTS-FEATURES.md` — roles RBAC y funcionalidades
- `docs/DATABASE-SCHEMA.md` — esquema completo de PostgreSQL
- `docs/THEME-GUIDE.md` — tokens visuales, componentes y guía de accesibilidad del diseño
- `docs/DESIGN-TOKENS-BOARD.md` — board visual del sistema de diseño para compartir con el equipo
