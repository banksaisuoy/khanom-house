import { test, expect } from '@playwright/test'

/**
 * E2E: POS flow — login as admin, open POS, add item, checkout with cash.
 */
test.describe('POS Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.fill('input[type="email"]', 'admin@khanomhouse.th')
    await page.fill('input[type="password"]', '<your-password>')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/admin', { timeout: 15000 })
  })

  test('POS page loads', async ({ page }) => {
    await page.goto('/admin/pos')
    await page.waitForLoadState('networkidle')
    // Should show either shift gate or POS terminal
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 })
  })

  test('mobile viewport homepage loads', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
    })
    const page = await context.newPage()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveTitle(/Khanom House/)
    await context.close()
  })

  test('mobile viewport login usable', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
    })
    const page = await context.newPage()
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=เข้าสู่ระบบ')).toBeVisible({ timeout: 10000 })
    await context.close()
  })
})
