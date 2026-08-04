import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E configuration for Khanom House.
 *
 * Run: bun run test:e2e
 * UI mode: bun run test:e2e:ui
 *
 * Prerequisites:
 * - Dev server running on port 3000 (bun run dev)
 * - Test database seeded (bunx tsx prisma/seed.ts)
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // SQLite doesn't handle parallel writes
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Single worker for SQLite
  reporter: 'html',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Auto-start dev server if not running
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
})
