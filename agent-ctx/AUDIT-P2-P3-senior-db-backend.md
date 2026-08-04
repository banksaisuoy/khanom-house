# AUDIT-P2-P3 — Senior Database Architect + Backend Engineer

Task: Deep audit + fix pass on remaining Phase 2 (DB) and Phase 3 (Backend) issues
in the Khanom House Next.js project. Built on top of the prior AUDIT-FULL pass.

## Files modified

### Phase 2 — Database

- `src/lib/dashboard.ts` — major refactor
- `src/app/api/admin/reports/sales/route.ts`
- `src/app/api/admin/reports/products/route.ts`
- `src/app/api/admin/reports/customers/route.ts`
- `src/app/api/admin/reports/finance/route.ts`
- `prisma/schema.prisma` — cascade rules
- `src/app/api/admin/products/route.ts` — GET over-fetch fix

### Phase 3 — Backend

- `src/app/api/admin/orders/[id]/route.ts` — PATCH allowlist (H-7)
- `src/app/api/admin/inventory/[id]/route.ts` — added logAudit
- `src/app/api/admin/recipes/[id]/route.ts` — added logAudit (PATCH + DELETE)
- `src/app/api/auth/login/route.ts` — wrapped in `handle()`
- `src/app/api/auth/logout/route.ts` — wrapped in `handle()`
- `src/app/api/wishlist/route.ts` — wrapped GET + POST in `handle()`
- `src/app/api/promotions/validate/route.ts` — wrapped in `handle()`
- `src/app/api/products/route.ts` — wrapped in `handle()`
- `src/app/api/products/[slug]/route.ts` — wrapped in `handle()`
- `src/lib/api-response.ts` — added `tooManyRequests()` helper
- `src/lib/rate-limit.ts` — NEW: in-memory token-bucket rate limiter
- `src/app/api/orders/route.ts` — applied rate limit to POST
- `src/app/api/catering/inquiry/route.ts` — applied rate limit to POST
- `src/app/api/customers/register/route.ts` — applied rate limit to POST
- `next.config.ts` — added `headers()` with security headers

## Verification

- `bun run lint` — 0 errors, 0 warnings (only 1 pre-existing unrelated warning in
  `src/components/admin/kitchen/kitchen-board.tsx`)
- `bunx tsc --noEmit` — no errors in `src/` (pre-existing errors in
  `examples/`, `prisma/seed.ts`, and `skills/` are unrelated to this audit)
- Smoke test: `getDashboardData('7d')` returns valid response with correct shape
- Smoke test: `rateLimit('test-ip', 5, 60)` allows 5 requests then blocks with
  `retryAfterSec: 12` — token bucket working as designed
- `bun run db:push` — schema with new cascade rules applied successfully

## Notes for next agent

- The dev server was not running during this audit (last seen up at 05:56 local
  for the dashboard request). All verification was done via direct Prisma/TS
  calls and `tsc --noEmit`. The system will auto-restart dev when needed.
- `src/lib/rate-limit.ts` is in-memory only — fine for single-instance demo,
  must be replaced with Redis-backed limiter in multi-instance prod.
- Cascade rules added: `StockMovement → Inventory` and `LoyaltyLog → Customer`.
  Audit-sensitive FKs (AuditLog → User, StockMovement → User, WasteLog → User)
  intentionally left as RESTRICT (default) — preserves audit trail when a User
  is deleted.
