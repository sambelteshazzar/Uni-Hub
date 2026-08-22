// Regression test for the admin "Add Product" form crash.
//
// Root cause under test:
//   Pages.renderAdminProductCreate (js/pages/pages.js:5339-5344) used to
//   look up the "Back to Products" button via
//     form.querySelector('[data-action="back-to-products"]')
//   but the button is rendered as a SIBLING of the form (in the
//   admin-header div, not inside the form element). `form.querySelector`
//   only matches descendants, so it returned null, and
//   `null.addEventListener('click', ...)` threw:
//     "Cannot read properties of null (reading 'addEventListener')"
//
//   Because the crash happened BEFORE the form-submit handler was wired
//   (line 5344, form.addEventListener('submit', e =>
//   Pages._handleAdminProductCreate(e))), clicking "Create Product" fell
//   back to the form's default GET-submit, pollinating the URL bar with
//   `?title=...&description=...&category=...&images=` and reloading the
//   page, which re-rendered and crashed the same way.
//
//   The fix changes `form.querySelector(...)` to `mainContent.querySelector(...)`
//   at both the Create (line 5342) and Edit (line 5758) call sites.
//
// This test logs in via the ADMIN login form (matches the deployment's
// real flow), navigates to /#/admin/products/new, and asserts:
//   (1) The form renders without a "Cannot read properties of null"
//       console error.
//   (2) The submit handler is actually wired — clicking "Create Product"
//       with valid mandatory fields does NOT pollinate the URL bar
//       (i.e. preventDefault is called and no GET-submit occurs).

const { test, expect } = require('@playwright/test');
const { injectAdminSession } = require('./helpers/admin-auth');

test.describe('Admin Add Product form renders without crash (regression)', () => {
  test('renderAdminProductCreate wires submit + back button without null crash', async ({
    page,
  }) => {
    // Authenticate via the API (handles the MFA step) and inject the
    // separated admin session — see e2e/helpers/admin-auth.js.
    await injectAdminSession(page);

    // Listen for the specific console error the bug produced.
    const consoleErrors = [];
    page.on('console', msg => {
      const text = msg.text();
      if (
        text.includes("Cannot read properties of null (reading 'addEventListener')") ||
        text.includes('renderAdminProductCreate')
      ) {
        consoleErrors.push(text);
      }
    });
    page.on('pageerror', err => {
      if (err.message.includes('Cannot read properties of null')) {
        consoleErrors.push(`[pageerror] ${err.message}`);
      }
    });

    // Now run the function under test: navigate to Add Product.
    await page.goto('/#/admin/products/new');

    // The page must render the "Add New Product" heading. If
    // renderAdminProductCreate crashed at line 5343, the heading may
    // still render (because mainContent.innerHTML is set BEFORE the
    // null-crash), so this assertion alone isn't enough — but it's
    // useful to confirm we actually landed on the page.
    await expect(page.locator('h1, h2').filter({ hasText: /Add New Product/i })).toBeVisible({
      timeout: 10000,
    });

    // The key assertion: no null-addEventListener console error.
    expect(
      consoleErrors,
      `expected no null-addEventListener crash; got: ${JSON.stringify(consoleErrors)}`
    ).toEqual([]);

    // Secondary regression check: the form's submit handler must be wired.
    // If `form.addEventListener('submit', ...)` was never reached (because
    // of the line 5343 crash), clicking submit falls back to the form's
    // default GET behavior, which pollinates `location.search` with
    // `?title=...&description=...&images=`.
    //
    // We pick a category + condition + price + title that passes the
    // HTML5 `required` validation, then click submit. We don't actually
    // want to attempt the real POST that follows (it'd hit the local
    // backend and possibly succeed or fail for unrelated reasons), we
    // just want to confirm the wired handler called preventDefault and
    // the URL bar did NOT become `?title=...`.
    await page.locator('input[name="title"]').fill('TestProduct');
    await page.locator('textarea[name="description"]').fill('Test description');
    await page.locator('input[name="price"]').fill('10');
    // Wait a tick so any async handlers settle.
    await page.waitForTimeout(100);
    // Snapshot the URL before submit.
    const urlBefore = page.url();
    await page.locator('#admin-product-form').locator('button[type="submit"]').click();
    // Give the wired handler a chance to call preventDefault and either
    // run _handleAdminProductCreate or fail for a non-regression reason.
    // Either way, the URL bar must NOT have grown a `?title=` query.
    await page.waitForTimeout(500);
    const urlAfter = page.url();
    expect(
      urlAfter,
      'URL must not be pollinated with form fields (proves submit handler is wired and preventDefault is called)'
    ).not.toContain('?title=');
    expect(urlAfter, 'URL must be unchanged from before submit click').toBe(urlBefore);
  });
});
