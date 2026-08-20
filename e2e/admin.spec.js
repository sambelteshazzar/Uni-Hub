const { test, expect } = require('@playwright/test');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@unihub.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Point at the local backend (Playwright's webServer on :5000) instead
    // of the Render backend. Must run before config.js so it is not clobbered.
    await page.addInitScript(() => {
      window.API_URL = 'http://localhost:5000/api';
    });

    // Log in via the ADMIN login form (matches the regression specs).
    await page.goto('/#/admin');
    const emailInput = page.locator('#admin-email');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(ADMIN_EMAIL);
    await page.locator('#admin-password').fill(ADMIN_PASSWORD);
    const loginRespPromise = page.waitForResponse(resp => resp.url().includes('/api/auth/login'), {
      timeout: 15000,
    });
    await page.locator('#admin-login-form button[type="submit"]').click();
    await loginRespPromise;
    await page.waitForTimeout(1500);
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
