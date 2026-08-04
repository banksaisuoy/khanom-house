/**
 * Vitest setup — MUST run before any test file imports.
 *
 * Sets DATABASE_URL from environment variable for test database.
 * All route handlers (which import `db` from @/lib/db) use the test DB.
 *
 * SECURITY: Never hardcode database URLs. Read from environment.
 *
 * Setup before running tests:
 *   1. Create .env.test with:
 *      TEST_DATABASE_URL=postgresql://USER:PASSWORD@HOST/test?sslmode=require
 *   2. Push schema to test database:
 *      DATABASE_URL=$TEST_DATABASE_URL bunx prisma db push --skip-generate
 *   3. Run tests:
 *      bun run test
 */

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://localhost:5432/test'
process.env.NODE_ENV = 'test'
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret-not-for-production'
