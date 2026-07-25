# MenuGran — AGENTS.md

## Project structure

| Path | What |
|------|------|
| `menugran/` | Next.js 14 PWA (App Router) |
| `opencode-skills/` | Skill library — do not modify |
| `CLAUDE.md` | **Outdated** — describes a different project (FastAPI + React, not this one) |

## Stack

Next.js 14, Prisma 5, SQLite (dev), NextAuth v5, Zustand, Tailwind CSS, Serwist (PWA), Zod

## Key commands (`menugran/`)

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (port 3000) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run type-check` | `tsc --noEmit` |
| `npm run prisma:push` | Sync schema → DB |
| `npm run prisma:studio` | Prisma Studio |
| `npm run prisma:seed` | Seed DB (uses `tsx prisma/seed.ts`) |

## Architecture quirks (agent will guess wrong)

- **Auth**: CredentialsProvider by **cedula + PIN** (4 digits), not email/password. Session strategy: JWT. Config at `src/lib/auth-next.ts`.
- **No middleware**: Route protection is entirely client-side. API routes do not verify session.
- **Dual auth state**: NextAuth JWT session + `localStorage` (`menugran-user` key) coexist.
- **No React Query**: Despite being in package.json deps, all data fetching uses raw `fetch()` or Prisma server actions directly.
- **Prisma uses SQLite in dev**: `DATABASE_URL=file:./menugran.db` in `.env.local`.
- **5 role-specific login pages**: `/login`, `/admin-login`, `/superadmin-login`, `/operator-login`, `/register`.
- **Font Awesome 6 + Lucide React** both used (different layouts use different icon sets).
- **Safe-area CSS vars** (`--sat`, `--sar`, `--sab`, `--sal`) for iPhone notch — used via Tailwind's `pt-safe-top` etc. (defined in `tailwind.config.ts`).
- **No Zustand persistence**: cart resets on page refresh.
- **Barrel exports**: each `modules/*/` re-exports via `index.ts`.
- **PWA via Serwist**: `src/pwa/sw.ts` entry, configured in `next.config.mjs`.

## Setup

```bash
cd menugran
cp .env.local.example .env.local  # edit as needed
npm install
npm run prisma:generate
npm run prisma:push
npm run dev
```

## Style

- Spanish UI labels
- Import alias `@/` → `src/`
- Tailwind color tokens: `brand`, `ink`, `cream`, `neutral`, `gold`, `success`, `danger`, `warning`
- Shadow tokens: `soft`, `card`, `elevated`, `popover`
- Animation tokens: `fade-in`, `slide-up`, `slide-down`, `scale-in`
