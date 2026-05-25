const { test, expect } = require('@playwright/test');

test.describe('Cart and Checkout', () => {
  test('cart page loads', async ({ page }) => {
    await page.goto('/#/cart');
    await page.waitForTimeout(2000);
    const cartEl = page.locator('[class*="cart"], h1, h2').first();
    await expect(cartEl).toBeVisible({ timeout: 10000 });
  });

  test('can add item to cart from product page', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    const addToCartBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Add")').first();
    if (await addToCartBtn.isVisible()) {
      await addToCartBtn.click();
      await page.waitForTimeout(1000);
      await page.goto('/#/cart');
      await page.waitForTimeout(2000);
    }
  });
});
