# MenuGram PWA — Instrucciones para Pi

> **Nota:** Este archivo es para Pi (coding agent). El proyecto tiene además un `AGENTS.md` raíz orientado a su sistema harness (`.harness/`) — ambos coexisten, no los mezcles.

## Stack Detectado

| Capa | Tecnología |
|---|---|
| Frontend / PWA | React 18+ + TypeScript + Vite + Tailwind CSS |
| PWA Engine | `vite-plugin-pwa` |
| Backend | Node.js + Express (monolito modular en Render, keep-alive vía cron) |
| Base de datos | PostgreSQL en Supabase (UUIDv7, JSONB, PostGIS) |
| Auth | Supabase Auth (Google OAuth 2.0, email, JWT) |
| Storage imágenes | Cloudinary (unsigned upload preset) |
| Storage capturas | Supabase Storage (purga automática 30 días) |
| Mapas realtime | Leaflet.js + OpenStreetMap + Supabase Realtime |
| Hosting | Vercel/Cloudflare Pages (frontend), Render (backend) |

Más detalle en `docs/ARCHITECTURE-STACK.md`. Reglas de arquitectura completas en `.harness/rules/architecture.md`.

## Estado Actual

Proyecto en fase inicial: **solo documentación y scaffolding del harness**. Aún no existe `package.json` ni código fuente. La primera tarea de implementación será levantar el frontend React/Vite/TS y el backend Express según `docs/ARCHITECTURE-STACK.md`.

## Convenciones de Código

- **Código y comentarios en inglés.** Respuestas al usuario en español.
- **TypeScript estricto:** prohibido `any`, sin globales sin tipo, usar `unknown` + narrowing cuando haga falta.
- **Funciones ≤ 30 líneas**, una sola responsabilidad, nombres descriptivos.
- **Manejo de errores explícito** (try/catch o validación) en toda función pública.
- **TDD obligatorio:** escribir test mínimo que falle → código mínimo que lo haga pasar → refactor.
- Antes de usar una dependencia, confirmar que existe en `package.json`/`requirements.txt`. No añadir deps pesadas sin aprobación.
- Toda función lógica nueva necesita su test (`*.test.ts` / `*.test.tsx`).
- Si tocas una función con varios callers, arregla la causa raíz una vez (en el sitio compartido), no parches cada caller.

## Workflow Antes de Cualquier Cambio

1. Leer `.harness/rules/conventions.md` y `.harness/rules/architecture.md`.
2. Revisar tarea activa en `.harness/tasks/current.json` (si existe).
3. Correr `bash .harness/scripts/init.sh` — verifica integridad del harness, linter y tests. **La tarea NO está terminada si el exit code ≠ 0.**
4. Escribir código mínimo para que el test pase.
5. Volver a correr `bash .harness/scripts/init.sh`.

## Comandos Principales

> ⚠️ El proyecto aún no tiene `package.json`. Estos comandos entrarán en vigor cuando arranque la implementación.

| Acción | Comando |
|---|---|
| Bootstrap del harness | `bash .harness/scripts/init.sh` |
| Dev frontend (cuando exista) | `npm run dev` |
| Dev backend (cuando exista) | `npm run dev:api` |
| Build producción | `npm run build` |
| Tests | `npm test` |
| Linter | `npm run lint` |

Documentación funcional: `docs/REQUIREMENTS-FEATURES.md` (roles RBAC, features). Esquema DB: `docs/DATABASE-SCHEMA.md`.

## Roles RBAC

`superadmin`, `merchant_owner`, `merchant_staff`, `driver`, `customer`. RLS en PostgreSQL los enforce; multi-tenant via `merchant_id` en todas las tablas de negocio.
