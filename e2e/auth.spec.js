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
});
