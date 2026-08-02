# Refactoring: Auth Stabilization + TypeScript Fixes

**Date**: 2026-07-27
**Status**: Approved (sign-off received)
**Branch**: main (commit `7f79919a74babc0c37a4866bc746296c6966e3d2`)
**Baseline**: 46 TypeScript errors across ~15 files; 1 test file; risk score 1.00 (high)

## Context

The MenuGran Next.js 15 PWA has accumulated ~46 TypeScript compilation errors that block `npm run build`. A code-review-graph analysis of the knowledge graph (602 nodes, 5146 edges, 153 files) identified:

- **2 critical bottlenecks** (`api-auth.ts` with 33 callers, `auth-next.ts` with authorize) that gate all API routes and pages
- **5 untested hotspots** with the highest connectivity (degree 44-58), all without test coverage
- **112 additional files** affected within 2 hops of the 13 changed files
- **Falsos positivos**: Next.js App Router pages flagged as "dead code" because they are auto-registered routes, not called symbols

## Goal

Reduce 46 TS errors → 0, unblock `npm run build`, and establish a minimal test safety net for the two highest-connectivity hotspots (`MenuPage`, `OperatorOrdersPage`) using TDD via Superpowers, with gstack (exploration) and code-review-graph (impact analysis) integrated.

Non-goals:
- Rewriting spaghetti pages (`MenuPage`, `OperatorOrdersPage`) — only stabilize and test
- Migrating auth to NextAuth v5 — keep v4 surface, fix only compile errors
- Adding features

## Approach: Top-down by dependency

**Enfoque A** (approved): Top-down fixing the authentication bottlenecks first because everything depends on them. Every auth fix unlocks compile-ability of dependent pages (`session.user.id`, `session.user.role` typings). After auth is green, write tests for the two highest-degree hotspots before any further code changes. Then mop up the remaining 33 TS errors in order of blast radius. Finally validate with a full graph rebuild and change detection.

Rejected alternatives:
- **Bottom-up independent files first**: Risky — could be invalidated by later auth changes
- **By error severity**: Doesn't respect dependency chains

## Design

### Phase 1 — Stabilize Auth (9 micro-tasks)

Target files: `src/lib/auth-next.ts`, `src/lib/api-auth.ts`, `src/middleware.ts`, `src/modules/auth/actions.ts`, `src/app/api/auth/login/route.ts`, `src/app/layout.tsx`, `src/app/api/auth/[...nextauth]/route.ts`.

Errors to resolve:
- `auth-next.ts:8` — TS2349 `NextAuth({...})` not callable
- `auth-next.ts:42,51` — TS7031 implicit any in callbacks
- `nextauth.ts:4` — same TS2349
- `middleware.ts:9` — TS7006 implicit any on `req`
- `modules/auth/actions.ts:5` — TS2305 `auth` not exported from route
- `api/auth/login/route.ts:29` — TS2552 `bcrypt` undefined
- `layout.tsx:3` — TS2307 `SessionProvider` module not found

Strategy:
- TDD Task 1.1: write `tests/auth-next.test.ts` asserting `auth` is callable. Watch it fail with TS2349.
- Task 1.2: fix the NextAuth v4 callable issue. Use `gstack` semantic search to confirm the right invocation pattern for `@auth/core` or `next-auth@4.24.15`.
- TDD Tasks 1.3–1.4: tests for `jwt` and `session` callbacks; fix the param typings.
- Task 1.5: write `tests/api-auth.test.ts` with mocks; confirm `withAuth` returns session/401/403 correctly.
- Tasks 1.6–1.9: fix downstream consumers (`middleware.ts`, `modules/auth/actions.ts`, `api/auth/login/route.ts`, `layout.tsx`) using `code-review-graph query_graph callers_of` to verify references.

Verification: `npm run type-check` must show 0 errors in these 7 files.

### Phase 2 — Minimal Tests for Hotspots (7 micro-tasks)

Target hotspots (from graph hub analysis):
- `OperatorOrdersPage` (degree 54) — `src/app/(operator)/operator/orders/page.tsx`
- `MenuPage` (degree 58) — `src/app/(admin)/admin/menu/page.tsx`

Strategy:
- Use `code-review-graph get_flow` on `OperatorOrdersPage` to list its outgoing connections; build the mock list from the actual dependencies.
- Configure vitest for dual environment (node default + jsdom for React). Add `@testing-library/react` if not present.
- TDD smoke tests: render page with mocked `fetch` returning empty array → assert "No hay pedidos pendientes" appears. Render `MenuPage` with mocked empty menu → assert no crash.
- Each test must fail first (red), then pass after the setup/config fix (green), then commit.

Verification: `npm test` includes `tests/operator-orders-page.test.tsx` and `tests/menu-page.test.tsx`, both passing.

### Phase 3 — Ignore False Positives

No micro-tasks. Documented exclusion list (App Router pages incorrectly flagged as dead code):
- `(operator)/operator/orders/page.tsx`, `[id]/page.tsx`, `operator/page.tsx`, `operator/riders/page.tsx`, `operator/layout.tsx`
- `(rider)/rider/page.tsx`, `rider/active/[orderId]/page.tsx`, `rider/active/page.tsx`, `rider/available/page.tsx`, `rider/layout.tsx`
- `(admin)/admin/menu/page.tsx`

Rule: never delete `page.tsx` or `layout.tsx` files based on `refactor_tool dead_code` reports unless verified as orphaned routes (not matched by any URL pattern).

### Phase 4 — Remaining TS Errors (14 micro-tasks)

Ordered by blast radius (largest first):

**Lote 4.A — operator/orders/[id]/page.tsx (11 errors)**
- 4.A.1: `params.id` → `id` from `useParams`
- 4.A.2: define `RiderOption` interface
- 4.A.3: remove dead `nextAction` block (lines 463-507)
- 4.A.4: align `OrderStatus` to UPPERCASE matching backend

**Lote 4.B — rider pages (8 errors)**
- 4.B.1: fix `OrderItem.id` in active/[orderId]
- 4.B.2: fix `session.user.id` typing across active, history, page
- 4.B.3: optional chaining on `restaurant?.name` + remove non-existent `distance`

**Lote 4.C — UI components (7 errors)**
- 4.C.1: type props in `OrderCard.tsx`
- 4.C.2: allow CSS custom properties in `OrderTimeIndicator.tsx` via `as React.CSSProperties`
- 4.C.3: remove duplicate `colors` declaration in `tailwind.config.ts`
- 4.C.4: fix `Default → Record<string, unknown>` cast in `RiderTracker.tsx`

**Lote 4.D — API + cart (4 errors)**
- 4.D.1: add `table` to Prisma include in `api/orders/route.ts`
- 4.D.2: fix `ServiceType` import in `CartDrawer.tsx` (from `@prisma/client`, not `@/types`); handle missing `ServiceTypeModal`

**Lote 4.E — Final cleanup (4 tasks)**
- 4.E.1: full `npm run type-check` clean
- 4.E.2: `npm run lint` clean
- 4.E.3: `npm test` passes
- 4.E.4: `npm run build` succeeds (also emits `public/sw.js`)

### Phase 5 — Graph Validation (3 micro-tasks)

- 5.1 `code-review-graph build_or_update_graph_tool { full_rebuild: true }` — compare isolated nodes and gap count to baseline
- 5.2 `code-review-graph detect_changes_tool` against pre-refactor commit — confirm risk score dropped below 1.00 and no new bridges
- 5.3 If `gstack /learn` skill is available, persist learnings (Top-Down dependency order, App Router false positives in dead-code reports, dual-env vitest setup)

## Testing Strategy

- **Vitest** is already configured (`vitest.config.ts`) with `environment: 'node'`, alias `@`.
- Add `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` as devDeps.
- Switch `vitest.config.ts` to per-file environment via `// @vitest-environment jsdom` pragma in React tests — keeps node tests fast.
- **Mocking rules**:
  - Mock `@/lib/db` with `vi.mock` returning stub Prisma client
  - Mock `@/lib/crypto` (`verifyPin`, `hashPin`, `maskPhone`) — no bcrypt hashing in unit tests
  - Mock `@/lib/auth-next` (`auth` returns a fake session) for downstream consumers
  - Mock `global.fetch` for page smoke tests
- Every code-fixing micro-task follows: write failing test → fix code → test green → commit. Click-only or trivial config changes (e.g., `tailwind.config.ts` duplicates) may skip the red step but must include a verification step.

## Commit Discipline

- Trivial small commits after each green test
- Format: `fix(auth): corregir export de auth en auth-next.ts para NextAuth v4`
- No commit without passing `npm test` for the affected test file
- Run `code-review-graph detect_changes_tool` after each commit to re-estimate risk

## Tooling Integration

- **gstack**: used inside micro-tasks for semantic exploration (e.g., `custom-skill codex` or `investigate`) when we need to find how session types are consumed elsewhere
- **code-review-graph MCP**:
  - `query_graph callers_of withAuth` — verify nothing unknown consumes the auth APIs after each fix
  - `get_impact_radius` — before Lote 4.A (highest remaining error count), confirm blast radius
  - `refactor_tool dead_code` — sanity check after Phase 4 that no lib/ files became orphaned
  - `detect_changes_tool` — Phase 5 final validation
  - `get_hub_nodes` / `get_bridge_nodes` — re-read after rebuild in Phase 5 to confirm hotspots still connected to nothing new

## Risks

1. **NextAuth v4 types**: the call signature TS2349 may require a custom d.ts augmentation patch beyond the existing `next-auth.d.ts`. Mitigation: Task 1.2 may expand to fix `_next-auth` types — include the patch in the same commit if needed.
2. **OperatorOrdersPage test setup**: if existing imports transitively load Prisma at module load (even indirect), the smoke test fails with "PrismaClient not available". Mitigation: mock `@/lib/db` in the test file even if not used directly; verify via `code-review-graph get_flow`.
3. **User privilege checks**: `withAuth` uses `session.user.role as Role` cast — the `Role` type is duplicated in `auth-next.ts` and `types/index.ts`. Keep them in sync or extract to `types/index.ts` only (tracked in Phase 5 learnings, not refactored in this pass).

## Success Criteria

- [ ] `npm run type-check` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm test` exits 0 with at least 5 test files (`orders-schema`, `auth-next`, `api-auth`, `operator-orders-page`, `menu-page`)
- [ ] `npm run build` exits 0 and produces `public/sw.js`
- [ ] `code-review-graph detect_changes_tool` shows risk score < 1.00 from baseline commit
- [ ] No `page.tsx`/`layout.tsx` files deleted as "dead code"

## Task Inventory

| Phase | Tasks | Est. time | TS errors closed |
|---|---|---|---|
| 1 — Auth | 9 | ~30 min | 13 |
| 2 — Hotspot tests | 7 | ~25 min | 0 (safety net) |
| 3 — Ignore false positives | 0 | — | 0 |
| 4 — Remaining TS | 14 | ~50 min | 33 |
| 5 — Graph validation | 3 | ~8 min | 0 (verify) |
| **Total** | **33** | **~113 min** | **46 → 0** |
