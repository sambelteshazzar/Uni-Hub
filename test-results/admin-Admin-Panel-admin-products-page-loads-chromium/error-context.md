# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.js >> Admin Panel >> admin products page loads
- Location: e2e/admin.spec.js:28:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('table, [class*="product"]').first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('table, [class*="product"]').first()

```

```yaml
- link "Skip to main content":
  - /url: "#main-content"
- main:
  - text: U
  - heading "Admin Login" [level=2]
  - paragraph: Sign in to access the admin panel
  - text: Email *
  - textbox "Email *"
  - text: Password *
  - textbox "Password *"
  - button "Login as Admin"
  - link "Back to Home":
    - /url: "#/"
```

# Test source

```ts
  1  | const { test, expect } = require('@playwright/test');
  2  | 
  3  | const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@unihub.com';
  4  | const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';
  5  | 
  6  | test.describe('Admin Panel', () => {
  7  |   test.beforeEach(async ({ page }) => {
  8  |     await page.goto('/#/login');
  9  |     await page.waitForTimeout(2000);
  10 |     const emailInput = page.locator('input[name="email"], input[type="email"]').first();
  11 |     const passwordInput = page.locator('input[type="password"]').first();
  12 |     if (await emailInput.isVisible()) {
  13 |       await emailInput.fill(ADMIN_EMAIL);
  14 |       await passwordInput.fill(ADMIN_PASSWORD);
  15 |       const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign")').first();
  16 |       if (await submitBtn.isVisible()) { await submitBtn.click(); }
  17 |       await page.waitForTimeout(3000);
  18 |     }
  19 |   });
  20 | 
  21 |   test('admin dashboard loads', async ({ page }) => {
  22 |     await page.goto('/#/admin/dashboard');
  23 |     await page.waitForTimeout(3000);
  24 |     const dashboardEl = page.locator('[class*="admin"], h1, h2').first();
  25 |     await expect(dashboardEl).toBeVisible({ timeout: 10000 });
  26 |   });
  27 | 
  28 |   test('admin products page loads', async ({ page }) => {
  29 |     await page.goto('/#/admin/products');
  30 |     await page.waitForTimeout(3000);
  31 |     const tableEl = page.locator('table, [class*="product"]').first();
> 32 |     await expect(tableEl).toBeVisible({ timeout: 10000 });
     |                           ^ Error: expect(locator).toBeVisible() failed
  33 |   });
  34 | 
  35 |   test('admin analytics page loads with charts', async ({ page }) => {
  36 |     await page.goto('/#/admin/analytics');
  37 |     await page.waitForTimeout(3000);
  38 |     const canvas = page.locator('canvas').first();
  39 |     await expect(canvas).toBeVisible({ timeout: 10000 });
  40 |   });
  41 | 
  42 |   test('create product form has image upload zone', async ({ page }) => {
  43 |     await page.goto('/#/admin/products');
  44 |     await page.waitForTimeout(2000);
  45 |     const addBtn = page.locator('button:has-text("Add Product"), button:has-text("+")').first();
  46 |     if (await addBtn.isVisible()) {
  47 |       await addBtn.click();
  48 |       await page.waitForTimeout(2000);
  49 |     } else {
  50 |       await page.goto('/#/admin/products');
  51 |     }
  52 |     const dropZone = page.locator('#image-drop-zone');
  53 |     if (await dropZone.isVisible()) {
  54 |       await expect(dropZone).toBeVisible();
  55 |     }
  56 |   });
  57 | });
  58 | 
```