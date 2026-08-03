# MenuGran — AGENTS.md

## Stack tecnológico
- Next.js 14 (App Router)
- Prisma 5
- PostgreSQL (Supabase in dev)
- NextAuth v5 (`beta.19`)
- Zustand
- Tailwind CSS 3
- Serwist (PWA)
- Zod

## Normas de código
- Explicaciones en español; código, variables y commits exclusivamente en inglés.
- Código limpio, modular y con tipado estricto.

## Comandos principales
| Comando | Propósito |
|---------|---------|
| `npm run dev` | Dev server (port 3000). |
| `npm run build` | Production build (**also emits `public/sw.js`** via Serwist). |
| `npm run lint` | ESLint via `next lint` (config: `.eslintrc.json`). |
| `npm run type-check` | `tsc --noEmit`. |
| `npm run prisma:generate` | Regenerate `@prisma/client`. Run after editing `schema.prisma`. |
| `npm run prisma:push` | Sync schema → DB without a migration. |
| `npm run prisma:seed` | Seed via `tsx prisma/seed.ts` (Prisma is configured to use this as the seed command). |
| `npm run prisma:studio` | Prisma Studio. |