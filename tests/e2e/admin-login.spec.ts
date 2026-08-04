import { test, expect } from '@playwright/test'

/**
 * E2E: Admin login flow.
 */
test.describe('Admin Login', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('text=เข้าสู่ระบบ')).toBeVisible({ timeout: 10000 })
  })

  test('valid admin login succeeds', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Fill login form
    await page.fill('input[type="email"]', 'admin@khanomhouse.th')
    await page.fill('input[type="password"]', '<your-password>')
    await page.click('button[type="submit"]')

    // Should redirect to /admin
    await page.waitForURL('**/admin', { timeout: 15000 })
    await expect(page).toHaveURL(/\/admin/)
  })

  test('invalid login fails safely', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await page.fill('input[type="email"]', 'wrong@test.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Should NOT redirect to /admin
    await page.waitForTimeout(3000)
    expect(page.url()).not.toMatch(/\/admin$/)
  })

  test('admin dashboard loads after login', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.fill('input[type="email"]', 'admin@khanomhouse.th')
    await page.fill('input[type="password"]', '<your-password>')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/admin', { timeout: 15000 })

    // Dashboard should show KPI content
    await expect(page.locator('text=แดชบอร์ด')).toBeVisible({ timeout: 10000 })
  })
})
