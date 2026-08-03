# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.js >> Authentication >> signup page loads
- Location: e2e/auth.spec.js:24:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('input[name="fullName"], input[name="name"]').first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('input[name="fullName"], input[name="name"]').first()

```

```yaml
- link "Skip to main content":
  - /url: "#main-content"
- navigation "Main navigation":
  - link "JERTS CART JERTS CART":
    - /url: "#/"
    - img "JERTS CART"
    - text: JERTS CART
  - textbox "Search products":
    - /placeholder: Search for textbooks, electronics, dorm items...
  - button "Search"
  - button "View cart":
    - img
  - button "View wishlist":
    - img
  - button "View notifications":
    - img
  - button "Toggle dark mode":
    - img
  - button "Log in"
  - button "Sign up"
- main:
  - text: "404"
  - heading "Page Not Found" [level=1]
  - paragraph: The page you're looking for doesn't exist or has been moved.
  - button "Go Back"
  - button "Go Home"
- contentinfo:
  - heading "Get updates on new features and deals." [level=3]
  - form "Newsletter signup":
    - img
    - textbox "Enter your email"
    - button "Subscribe"
  - img "JERTS CART"
  - text: JERTS CART
  - paragraph: The global university marketplace for students to buy essentials.
  - heading "Resources" [level=4]
  - list:
    - listitem:
      - link "Browse Products":
        - /url: "#/browse"
    - listitem:
      - link "FAQ":
        - /url: "#/faq"
  - heading "About" [level=4]
  - list:
    - listitem:
      - link "Terms":
        - /url: "#/terms"
    - listitem:
      - link "Privacy":
        - /url: "#/privacy"
    - listitem:
      - link "About Us":
        - /url: "#/about"
    - listitem:
      - link "Contact":
        - /url: "#/faq"
  - heading "Explore" [level=4]
  - list:
    - listitem:
      - link "Blog":
        - /url: "#/browse"
    - listitem:
      - link "Universities":
        - /url: "#/browse"
    - listitem:
      - link "Contact Us":
        - /url: "#/faq"
  - heading "Company" [level=4]
  - list:
    - listitem:
      - link "Team":
        - /url: "#/about"
    - listitem:
      - link "Careers":
        - /url: "#/about"
    - listitem:
      - link "Partners":
        - /url: "#/about"
  - paragraph: © 2026 JERTS CART. All rights reserved.
  - link "Facebook":
    - /url: https://www.facebook.com/share/18bXQW1ZoM/?mibextid=wwXIfr
    - img
  - link "Twitter" [disabled]:
    - /url: javascript:void(0)
    - img
  - link "Instagram" [disabled]:
    - /url: javascript:void(0)
    - img
  - link "TikTok":
    - /url: https://www.tiktok.com/@unihub_atu?_r=1&_t=ZS-96nvMfUM8G2
    - img
```

# Test source

```ts
  1  | const { test, expect } = require('@playwright/test');
  2  | 
  3  | test.describe('Authentication', () => {
  4  |   test('login page loads', async ({ page }) => {
  5  |     await page.goto('/#/login');
  6  |     await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible({ timeout: 10000 });
  7  |   });
  8  | 
  9  |   test('shows error on invalid credentials', async ({ page }) => {
  10 |     await page.goto('/#/login');
  11 |     const emailInput = page.locator('input[name="email"], input[type="email"]').first();
  12 |     const passwordInput = page.locator('input[type="password"]').first();
  13 |     if (await emailInput.isVisible()) {
  14 |       await emailInput.fill('nonexistent@test.com');
  15 |       await passwordInput.fill('wrongpassword');
  16 |       const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign")').first();
  17 |       if (await submitBtn.isVisible()) {
  18 |         await submitBtn.click();
  19 |         await page.waitForTimeout(2000);
  20 |       }
  21 |     }
  22 |   });
  23 | 
  24 |   test('signup page loads', async ({ page }) => {
  25 |     await page.goto('/#/signup');
> 26 |     await expect(page.locator('input[name="fullName"], input[name="name"]').first()).toBeVisible({ timeout: 10000 });
     |                                                                                      ^ Error: expect(locator).toBeVisible() failed
  27 |   });
  28 | });
  29 | 
```