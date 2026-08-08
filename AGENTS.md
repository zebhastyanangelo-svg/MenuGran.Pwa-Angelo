# MenuGram PWA — Agent Instructions

## Project Overview
Multi-tenant digital menu platform with real-time order management and delivery tracking. Stack: React 18+/TypeScript/Vite/Tailwind (PWA), Node.js/Express modular monolith (Render), PostgreSQL/Supabase (Auth, DB, Realtime, Storage), Cloudinary (images), Leaflet/OpenStreetMap (maps).

## Development Workflow (Harness)
**Before any code change:**
1. Read `.harness/rules/conventions.md` and `.harness/rules/architecture.md`
2. Check active task in `.harness/tasks/current.json`
3. **TDD required:** Run `bash .harness/scripts/init.sh` first — it verifies harness integrity, runs linter, and executes tests (npm test / pytest / .harness/tests/*.sh)
4. Write minimal code to make failing test pass
5. Re-run `bash .harness/scripts/init.sh` — **task is NOT done if exit code ≠ 0**

## Key Conventions
- Functions ≤ 30 lines, single responsibility
- Descriptive names (English/Spanish), no ambiguous abbreviations
- Explicit error handling (try/catch or validation) on all public functions
- No `any` in TypeScript; no untyped globals
- Every new logical function needs a unit test (`*.test.js` / `*.test.py`)
- Verify external library methods exist in `package.json`/`requirements.txt` before use
- No heavy deps without approval

## Architecture Rules
- Modular monolith: single Express process on Render, kept alive via cron-job
- RLS policies in PostgreSQL enforce RBAC (superadmin, merchant_owner, merchant_staff, driver, customer)
- Multi-tenant via `merchant_id` on all business tables
- UUIDv7 primary keys, JSONB for flexible fields, PostGIS for locations
- Images → Cloudinary (unsigned upload preset); payment captures → Supabase Storage (auto-purge 30 days)
- Realtime delivery tracking via Supabase Realtime + Leaflet.js

## Documentation References
- `docs/ARCHITECTURE-STACK.md` — tech stack & data flow
- `docs/REQUIREMENTS-FEATURES.md` — RBAC roles & detailed features
- `docs/DATABASE-SCHEMA.md` — full PostgreSQL schema (enums, tables, indexes)
- `.harness/tasks/featurelist.json` — planned features & acceptance criteria

## Agent Roles (Harness)
- **Architect** (`.harness/agents/architect.md`): plan, analyze code graph, break down tasks, verify deps
- **Implementer** (`.harness/agents/implementer.md`): write code + tests, run `init.sh`, log progress
- **Reviewer** (`.harness/agents/reviewer.md`): verify against conventions & architecture

## Current State
No code written yet — only documentation and harness scaffolding. First implementation will set up the React/Vite/TypeScript frontend and Express backend per the architecture doc.