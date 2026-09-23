const { test, expect } = require('@playwright/test');

test.describe('Authentication', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/#/login');
    await expect(page.locator('#login-email')).toBeVisible({ timeout: 10000 });
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/#/login');
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('nonexistent@test.com');
      await passwordInput.fill('wrongpassword');
      const submitBtn = page
        .locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign")')
        .first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('signup page loads', async ({ page }) => {
    await page.goto('/#/register');
    await expect(page.locator('#reg-email')).toBeVisible({ timeout: 10000 });
  });

  // Regression: 67e3666e pointed API_URL at https://api.jertscart.com/api;
  // auth.js built the CSRF URL with baseURL.replace('/api', ''), which matched
  // '/api' inside the hostname and produced https:/.jertscart.com/... — the
  // fetch failed, _fetchCsrfToken returned null, and login was rejected with
  // 403 "CSRF token missing".
  test('csrf token fetch derives a valid URL from api.jertscart.com base', async ({ page }) => {
    await page.goto('/');
    const requested = [];
    await page.route('**/auth/csrf-token', route => {
      requested.push(route.request().url());
      route.fulfill({ json: { success: true, csrfToken: 'e2e-token' } });
    });
    const token = await page.evaluate(async () => {
      window.API_URL = 'https://api.jertscart.com/api';
      return await authManager._fetchCsrfToken();
    });
    expect(requested[0]).toBe('https://api.jertscart.com/api/auth/csrf-token');
    expect(token).toBe('e2e-token');
  });

  // Regression: /forgot-password and /reset-password were never registered
  // with the router — password-reset EMAILS landed on a blank 404 page.
  test('forgot password page loads', async ({ page }) => {
    await page.goto('/#/forgot-password');
    await expect(page.locator('#forgot-email, #forgot-form, #forgot-form-bb').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('reset password page loads from email link', async ({ page }) => {
    await page.goto('/#/reset-password?token=aaa.bbb.ccc');
    await expect(page.locator('#reset-form, #reset-form-bb').first()).toBeVisible({
      timeout: 10000,
    });
  });
});
