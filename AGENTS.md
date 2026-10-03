# MenuGran PWA — Agent Instructions

## Project Overview
Multi-tenant digital menu platform with real-time order management and delivery tracking. Stack: React 18+/TypeScript/Vite/Tailwind (PWA), Node.js/Express modular monolith (Render), PostgreSQL/Supabase (Auth, DB, Realtime, Storage), Cloudinary (images), Leaflet/OpenStreetMap (maps).

## Development Workflow
**Before any code change:**
1. Run `npm run lint` → `npm run build` → `npm test` (in order)
2. All three must pass; task is NOT done if any exit code ≠ 0

## Commands
| Action | Command |
|---|---|
| Dev server | `npm run dev` |
| Build (typecheck + vite build) | `npm run build` |
| Lint (oxlint) | `npm run lint` |
| Tests (vitest) | `npm test` |
| Preview build | `npm run preview` |

## Key Conventions
- Functions ≤ 30 lines, single responsibility
- Descriptive names (English/Spanish), no ambiguous abbreviations
- Explicit error handling (try/catch or validation) on all public functions
- No `any` in TypeScript; no untyped globals
- Every new logical function needs a unit test (`*.test.ts` / `*.test.tsx`)
- Verify external library methods exist in `package.json` before use
- No heavy deps without approval

## Architecture Rules
- Modular monolith: single Express process on Render, kept alive via cron-job
- RLS policies in PostgreSQL enforce RBAC (superadmin, merchant_owner, merchant_staff, driver, customer)
- Multi-tenant via `merchant_id` on all business tables
- UUIDv7 primary keys, JSONB for flexible fields, PostGIS for locations
- Images → Cloudinary (unsigned upload preset); payment captures → Supabase Storage (auto-purge 30 days)
- Realtime delivery tracking via Supabase Realtime + Leaflet.js

## Testing
- Framework: Vitest + React Testing Library + jsdom
- Config: `vitest.config.ts` (globals, jsdom, setup file at `src/test/setup.ts`)
- Tests colocated with source: `src/**/*.test.{ts,tsx}`
- Run single test: `npm test -- --run src/path/to/file.test.ts`
- Timeout: 20s per test/hook, 2 workers fixed

## TypeScript
- Strict mode: `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax`
- Bundler module resolution, `noEmit: true`, JSX: `react-jsx`
- Two configs: `tsconfig.app.json` (src), `tsconfig.node.json` (build scripts)

## Linting
- Tool: oxlint (`.oxlintrc.json`)
- React hooks rules enforced, only-export-components warning

## PWA
- `vite-plugin-pwa` with Workbox, manifest, icons in `public/`
- Service worker: `dist/sw.js` (auto-generated)

## Documentation References
- `docs/ARCHITECTURE-STACK.md` — tech stack & data flow
- `docs/REQUIREMENTS-FEATURES.md` — RBAC roles & detailed features
- `docs/DATABASE-SCHEMA.md` — full PostgreSQL schema (enums, tables, indexes)
- `docs/THEME-GUIDE.md` — design system tokens & theme config

## Current State
Frontend implemented (React 19, Vite 8, Tailwind 3). Backend not yet started.