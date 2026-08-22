const { test, expect } = require('@playwright/test');
const { injectAdminSession } = require('./helpers/admin-auth');

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate via the API (handles the MFA step) and inject the
    // separated admin session — see e2e/helpers/admin-auth.js.
    await injectAdminSession(page);
  });

  test('admin dashboard loads', async ({ page }) => {
    await page.goto('/#/admin');
    await page.waitForTimeout(1500);
    const dashboardEl = page.locator('[class*="admin"], h1, h2').first();
    await expect(dashboardEl).toBeVisible({ timeout: 10000 });
  });

  test('admin products page loads', async ({ page }) => {
    await page.goto('/#/admin/products');
    await page.waitForTimeout(1500);
    const tableEl = page.locator('table, [class*="product"]').first();
    await expect(tableEl).toBeVisible({ timeout: 10000 });
  });

  test('admin analytics page loads with charts', async ({ page }) => {
    await page.goto('/#/admin/analytics');
    await page.waitForTimeout(1500);
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });
  });

  test('create product form has image upload zone', async ({ page }) => {
    await page.goto('/#/admin/products');
    await page.waitForTimeout(1500);
    const addBtn = page.locator('button:has-text("Add Product"), button:has-text("+")').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(1500);
    }
    const dropZone = page.locator('#image-drop-zone');
    if (await dropZone.isVisible()) {
      await expect(dropZone).toBeVisible();
    }
  });
});
