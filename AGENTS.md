# MenuGran — AGENTS.md

> The old `CLAUDE.md` at the repo root describes a different project (FastAPI + React). Ignore it. This file is the source of truth.

## Project structure

| Path | What |
|------|------|
| `menugran/` | Next.js 14 PWA (App Router). All work happens here. |
| `menugran/opencode-skills/` | Skill library — do not modify. |
| `docs/superpowers/` | Reference notes — not part of the build. |
| `CLAUDE.md` | Stale / describes a different project. Do not trust. |

## Stack

Next.js 14 (App Router), Prisma 5, PostgreSQL (Supabase in dev), NextAuth v5 (`beta.19`), Zustand, Tailwind CSS 3, Serwist (PWA), Zod.

## Commands — all run from `menugran/`

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (port 3000). |
| `npm run build` | Production build (**also emits `public/sw.js`** via Serwist). |
| `npm run lint` | ESLint via `next lint` (config: `.eslintrc.json`). |
| `npm run type-check` | `tsc --noEmit`. |
| `npm run prisma:generate` | Regenerate `@prisma/client`. Run after editing `schema.prisma`. |
| `npm run prisma:push` | Sync schema → DB without a migration. |
| `npm run prisma:seed` | Seed via `tsx prisma/seed.ts` (Prisma is configured to use this as the seed command). |
| `npm run prisma:studio` | Prisma Studio. |

There is **a migrations dir** (`prisma/migrations/`). If you change the schema for a production-relevant change, prefer a real migration over `prisma:push`.

## Verification order before reporting done

`lint` → `type-check` → `build`. There is **no test runner configured** (no jest/vitest/playwright config, zero `*.test.ts`). Do not invent test commands.

## Environment

- `.env.local` (gitignored) holds the real `DATABASE_URL` (Supabase Postgres pooler), `NEXTAUTH_SECRET`, and Supabase keys. The committed `.env.local.example` is the template.
- **Database is Postgres**, not SQLite. SQLite leftovers in `.gitignore` (`prisma/dev.db`) are vestigial — the `datasource` in `prisma/schema.prisma` is `postgresql`.
- Never commit `.env.local`. Supabase service-role key is present and sensitive.
- `NEXTAUTH_SECRET` generation: `openssl rand -base64 32`.

## Architecture quirks (you will guess these wrong)

- **Auth is cedula + PIN, not email/password.** `CredentialsProvider` in `src/lib/auth-next.ts` looks up `User.cedula` and verifies a bcrypt-hashed 4-digit `pin`. JWT session strategy. The `User` model has both `email` (nullable) and `cedula` — `cedula` is the real identifier.
- **API order creation uses Zod validation** (`src/app/api/orders/route.ts`). `price` is never accepted from the client body — server-side from `MenuItem.price` only. `clientId` is forced from the JWT session for non-privileged roles.
- **Middleware DOES exist** (`src/middleware.ts`). NextAuth `auth()` wrapper enforces role-based access on **both pages and `/api/*`** for `/admin`, `/superadmin`, `/operator`, `/client`, `/rider`. Unauthenticated API calls → **401 JSON**; unauthenticated page loads → 302 to `/login`. POST `/api/orders` is intentionally open but validates `clientId` server-side from the JWT session (never trusts the body).
- **Route layout uses App Router groups**, not flat paths: login pages live under `src/app/(auth)/{login,admin-login,superadmin-login,operator-login,register,forgot-pin}/page.tsx`. Role dashboards live under `(admin)`, `(superadmin)` (real path `/sa`), `(operator)`, `(client)`, `(rider)`.
- **Dual auth state** is real but the localStorage key is NOT `menugran-user` (grep finds no such key). Treat that old claim as unverified; if you need client-side user cache, look at the current code first.
- **No React Query is actually used** despite `@tanstack/react-query` in deps. Data fetching is raw `fetch()` and Prisma calls inside server actions / route handlers.
- **Zustand cart is not persisted** — `src/modules/cart/store.ts` is a plain `create(() => ({...}))` with no `persist` middleware. Cart resets on refresh.
- **Barrel exports**: `src/modules/{auth,cart,delivery,menu,orders}/index.ts` re-export their module surface. Import from the module root, not deep files.
- **Two icon libraries coexist**: Font Awesome 6 (via react-fontawesome) and `lucide-react`. Different layouts use different ones — match the surrounding code.
- **PWA via Serwist**: source at `src/pwa/sw.ts`, compiled to `public/sw.js` at build time by `@serwist/next` (configured in `next.config.mjs`). `sw.js` is a build artifact — do not hand-edit; edit `sw.ts`.
- **Safe-area CSS vars** `--sat/--sar/--sab/--sal` exposed as Tailwind spacing tokens `safe-top`, `safe-right`, `safe-bottom`, `safe-left` (defined in `tailwind.config.ts`). Use them for iPhone-notch padding instead of hardcoded values.

## Style

- **Spanish UI labels** throughout the app.
- Import alias `@/` → `src/`.
- Tailwind design tokens (defined in `tailwind.config.ts`): colors `brand|gold|cream|ink|neutral|success|danger|warning`; shadows `soft|card|elevated|popover`; animations `fade-in|slide-up|slide-down|scale-in`. Use these tokens, not raw hex / custom shadows.
- ESLint treats `@typescript-eslint/no-explicit-any` as a **warning**, not an error — existing code has plenty of `any`. Don't block on it; don't add more gratuitously.

## Setup

```bash
cd menugran
cp .env.local.example .env.local   # fill in Supabase URL, service key, NEXTAUTH_SECRET
npm install
npm run prisma:generate
npm run prisma:push                 # or create a migration
npm run prisma:seed
npm run dev
```
