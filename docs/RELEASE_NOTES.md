# Release Notes — Khanom House v0.2.0

## Version Summary
Enterprise Thai Dessert E-commerce + POS + ERP platform

## Security Hardening Completed
- ✅ HMAC-signed admin session tokens (tamper-proof)
- ✅ HMAC-signed customer session tokens
- ✅ OTP no longer exposed in HTTP response
- ✅ PIN login restricted to CASHIER + BRANCH_MANAGER
- ✅ CASHIER RBAC tightened (no orders.update)
- ✅ Gift card validation + audit log + permission gate
- ✅ PDPA delete phone collision fixed
- ✅ Slip verification idempotent + transactional
- ✅ POS cancel-bill branch-specific stock reversal
- ✅ Stock transfer throws on missing inventory
- ✅ CSP unsafe-eval gated to dev only
- ✅ HSTS header in production
- ✅ reactStrictMode re-enabled
- ✅ Rate limiting on public endpoints

## Tests Added
- 25 static verification tests (audit fixes)
- 53 runtime integration tests (real Prisma + route handlers)
- 3 Playwright E2E test files (storefront, admin login, POS)
- Total: 78 automated tests

## CI Pipeline
- GitHub Actions: typecheck + lint + test + build
- Runs on every pull request + push to main

## Known Limitations
- SQLite (single-writer) — migrate to PostgreSQL for >5 concurrent POS
- No real SMS provider (OTP logged to console in dev)
- No real payment gateway (PromptPay QR is placeholder)
- No LINE Notify integration
- Playwright E2E not verified in CI (browser not available)
- ~100 API routes without Zod validation (lower risk — not on critical paths)

## Deployment Notes
- Set `SESSION_SECRET` env var (required in production)
- Run `bun run db:push` before first start
- Run `bunx tsx prisma/seed.ts` for demo data
- Demo passwords (`<your-password>`) must be changed before production

## Rollback Notes
- `git checkout <previous-commit>` + rebuild
- `bun run restore:db -- backups/pre-deploy.db --confirm`
- See `docs/DISASTER_RECOVERY.md` for full procedures
