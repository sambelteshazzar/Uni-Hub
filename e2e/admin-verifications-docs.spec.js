// Smoke: admin verifications page + document states render after the
// doc-retention change (spec 2026-08-23). Full upload flow is covered by
// backend jest suites with mocked Cloudinary.
const { test, expect } = require('@playwright/test');
const { injectAdminSession } = require('./helpers/admin-auth');

test.describe('admin verifications with document states', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate via the API (handles the MFA step) and inject the
    // separated admin session — see e2e/helpers/admin-auth.js.
    await injectAdminSession(page);
  });

  test('verifications page loads with sidebar and stats', async ({ page }) => {
    await page.goto('/#/admin/verifications');
    await page.waitForTimeout(1500);
    const titleEl = page.locator('.adm-page-title').first();
    await expect(titleEl).toContainText(/Verifications/i, { timeout: 10000 });
    await expect(page.locator('.adm-sidebar')).toBeVisible({ timeout: 10000 });
  });

  test('payouts page still loads (adjacent admin surface regression)', async ({ page }) => {
    await page.goto('/#/admin/payouts');
    await page.waitForTimeout(1500);
    const titleEl = page.locator('.adm-page-title').first();
    await expect(titleEl).toContainText(/Payouts/i, { timeout: 10000 });
  });
});
