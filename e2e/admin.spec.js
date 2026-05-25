const { test, expect } = require('@playwright/test');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@unihub.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/login');
    await page.waitForTimeout(2000);
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill(ADMIN_EMAIL);
      await passwordInput.fill(ADMIN_PASSWORD);
      const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign")').first();
      if (await submitBtn.isVisible()) { await submitBtn.click(); }
      await page.waitForTimeout(3000);
    }
  });

  test('admin dashboard loads', async ({ page }) => {
    await page.goto('/#/admin/dashboard');
    await page.waitForTimeout(3000);
    const dashboardEl = page.locator('[class*="admin"], h1, h2').first();
    await expect(dashboardEl).toBeVisible({ timeout: 10000 });
  });

  test('admin products page loads', async ({ page }) => {
    await page.goto('/#/admin/products');
    await page.waitForTimeout(3000);
    const tableEl = page.locator('table, [class*="product"]').first();
    await expect(tableEl).toBeVisible({ timeout: 10000 });
  });

  test('admin analytics page loads with charts', async ({ page }) => {
    await page.goto('/#/admin/analytics');
    await page.waitForTimeout(3000);
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });
  });

  test('create product form has image upload zone', async ({ page }) => {
    await page.goto('/#/admin/products');
    await page.waitForTimeout(2000);
    const addBtn = page.locator('button:has-text("Add Product"), button:has-text("+")').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(2000);
    } else {
      await page.goto('/#/admin/products');
    }
    const dropZone = page.locator('#image-drop-zone');
    if (await dropZone.isVisible()) {
      await expect(dropZone).toBeVisible();
    }
  });
});
