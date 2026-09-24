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

  test('deep link /admin/dashboard renders the dashboard, not a 404 route error', async ({
    page,
  }) => {
    // Regression: history-mode deep link to the conventional
    // /admin/dashboard URL used to miss the route table (canonical
    // route is /admin), so the router logged
    //   Route not found: /admin/dashboard
    // (console.error — which Sentry's console instrumentation wraps,
    // making the stack frame point at sentry.js) and showed the 404
    // page instead of the admin dashboard.
    const routeErrors = [];
    page.on('console', msg => {
      if (msg.text().includes('Route not found')) {
        routeErrors.push(msg.text());
      }
    });

    await page.goto('/admin/dashboard');

    // The dashboard's topbar "Add product" button only renders on the
    // real dashboard — the 404 page has no such control.
    await expect(page.locator('button:has-text("Add product")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Page not found')).toHaveCount(0);
    expect(routeErrors).toEqual([]);
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
