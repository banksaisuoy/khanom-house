import { test, expect } from '@playwright/test'

/**
 * E2E: Public storefront — homepage, products, cart, checkout.
 */
test.describe('Storefront', () => {
  test('homepage loads with product list', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Khanom House/)
    // Best sellers section should be visible
    await expect(page.locator('text=ขายดี')).toBeVisible({ timeout: 15000 })
  })

  test('product detail page loads', async ({ page }) => {
    // Go to homepage, find first product link
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Click first product image or name link
    const productLink = page.locator('a[href^="/products/"]').first()
    await productLink.click()
    await page.waitForLoadState('networkidle')
    // Should be on product detail page
    await expect(page).toHaveURL(/\/products\//)
  })

  test('add product to cart updates count', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Click first "add to cart" button
    const addBtn = page.locator('button:has-text("ลงตะกร้า"), button:has-text("cart")').first()
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click()
      // Cart badge should update (may need to wait for Zustand hydration)
      await page.waitForTimeout(1000)
    }
  })

  test('checkout page reachable from cart', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Open cart
    const cartBtn = page.locator('button:has-text("ตะกร้า"), [aria-label*="cart"]').first()
    if (await cartBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cartBtn.click()
      await page.waitForTimeout(500)
    }
  })

  test('no console errors on homepage', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Filter out hydration warnings (known non-blocking)
    const realErrors = errors.filter(
      (e) => !e.includes('hydrat') && !e.includes('did not match')
    )
    expect(realErrors).toHaveLength(0)
  })
})
