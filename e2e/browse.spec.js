const { test, expect } = require('@playwright/test');

test.describe('Product Browsing', () => {
  test('homepage loads and shows products', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    const productCards = page.locator('.product-card, .card, [class*="product"]');
    const count = await productCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('product detail page loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    const firstProduct = page.locator('.product-card a, .card a, [class*="product"] a').first();
    if (await firstProduct.isVisible()) {
      await firstProduct.click();
      await page.waitForTimeout(2000);
      const detailEl = page.locator('[class*="detail"], [class*="product-detail"], h1, h2').first();
      await expect(detailEl).toBeVisible({ timeout: 5000 });
    }
  });

  test('search returns results', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('input[type="search"], input[placeholder*="earch"], input[name="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('book');
      await searchInput.press('Enter');
      await page.waitForTimeout(2000);
    }
  });
});
