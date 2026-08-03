// Regression test for the admin-session-wipe bug.
//
// Root cause under test:
//   adminAuthManager.login (js/admin/admin-auth.js) used to write
//   { token, user } to localStorage under `unihub_session`
//   (STORAGE_KEYS.CURRENT_USER) with NO `expiresAt` field. On the
//   next page load, AuthManager.loadSession (js/modules/auth.js)
//   evaluates `parsed.expiresAt > Date.now()` which is
//   `undefined > Date.now()` -> false, then calls clearSession(),
//   wiping the admin's token. From that point on, every admin-API
//   call sends no Authorization header and 401s, surfacing as a
//   misleading "Session expired — please log in again" error.
//
// The fix writes the session in the shape AuthManager.loadSession
// expects: { token, user, expiresAt: <now + 24h> }.
//
// This test logs in via the ADMIN login form (not the main app
// login form), forces a page reload (which re-runs loadSession),
// then navigates to /admin/products and asserts it renders
// without the "Session expired" failure.

const { test, expect } = require('@playwright/test');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@unihub.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';

test.describe('Admin session survives reload (regression)', () => {
  test('admin login via admin form persists across page reload', async ({ page }) => {
    // The frontend's app-init.js defaults window.API_URL to the production
    // Render backend even on localhost (see js/app-init.js:9-15). For
    // tests we need to point at the local backend Playwright already
    // started on :5000 (see webServer in playwright.config.js). Inject
    // window.API_URL BEFORE app-init.js runs via addInitScript.
    await page.addInitScript(() => {
      window.API_URL = 'http://localhost:5000/api';
    });

    // Navigate to /admin while logged-out. _requireAdmin() returns false
    // and Pages.renderAdminLogin() renders the admin login form.
    await page.goto('/#/admin');
    // Wait for the admin login form's email input to appear so fills don't race.
    const emailInput = page.locator('#admin-email');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    const passwordInput = page.locator('#admin-password');

    await emailInput.fill(ADMIN_EMAIL);
    await passwordInput.fill(ADMIN_PASSWORD);
    // Sanity-check the fills landed (debugging aid when selectors break).
    await expect(emailInput).toHaveValue(ADMIN_EMAIL);
    await expect(passwordInput).toHaveValue(ADMIN_PASSWORD);

    // Capture every backend response so we can diagnose CSRF / login issues if
    // the assertion fails. This is purely diagnostic — the test still asserts
    // on a 200 below.
    const allResponses = [];
    page.on('response', resp => {
      if (resp.url().includes('/api/')) {
        allResponses.push({ url: resp.url(), status: resp.status() });
      }
    });

    // Capture console + uncaught pageerror events so a silent JS throw in the
    // admin login handler doesn't leave us guessing.
    const consoleMsgs = [];
    page.on('console', msg => consoleMsgs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => consoleMsgs.push(`[pageerror] ${err.message}`));

    // Submit the admin login form -> Pages.handleAdminLogin -> adminAuthManager.login
    const loginRespPromise = page.waitForResponse(resp => resp.url().includes('/api/auth/login'), {
      timeout: 15000,
    });
    await page.locator('#admin-login-form button[type="submit"]').click();
    let loginResp;
    try {
      loginResp = await loginRespPromise;
    } catch (e) {
      console.error('Login response never arrived.');
      console.error('Captured /api/* responses:', JSON.stringify(allResponses, null, 2));
      console.error('Captured console/pageerror messages:', consoleMsgs.slice(-30).join('\n  '));
      throw e;
    }
    expect(
      loginResp.status(),
      `Login should be 200. Captured responses: ${JSON.stringify(allResponses)}`
    ).toBe(200);

    // After login, the unihub_session entry MUST contain an `expiresAt`
    // field that AuthManager.loadSession will accept on the next reload.
    const stored = await page.evaluate(() => localStorage.getItem('unihub_session'));
    expect(stored, 'unihub_session must be written by adminAuthManager.login').not.toBeNull();
    const parsed = JSON.parse(stored);
    expect(parsed.token, 'session must contain a token').toBeTruthy();
    expect(parsed.user, 'session must contain a user object').toBeTruthy();
    // This is the regression assertion: without `expiresAt`, loadSession
    // wipes the session on the next reload.
    expect(parsed.expiresAt, 'session must contain expiresAt (the bug)').toBeTruthy();
    expect(typeof parsed.expiresAt).toBe('number');
    expect(parsed.expiresAt).toBeGreaterThan(Date.now());

    // Force a page reload — this re-runs AuthManager.loadSession. Before the
    // fix, expiresAt was undefined, loadSession took the else branch, and
    // clearSession() removed unihub_session. After reload, api.getToken()
    // returned null and every admin-API call 401'd.
    await page.reload();
    await page.waitForTimeout(2000);

    // After reload, the token must still be present in localStorage so
    // api.getToken() (js/utils/api.js:100) returns it for admin-API calls.
    const storedAfterReload = await page.evaluate(() => localStorage.getItem('unihub_session'));
    expect(storedAfterReload, 'unihub_session must survive reload (the regression)').not.toBeNull();
    const parsedAfterReload = JSON.parse(storedAfterReload);
    expect(parsedAfterReload.token, 'token must remain after reload').toBeTruthy();
    expect(parsedAfterReload.token).toBe(parsed.token);

    // Reproduce the user-reported symptom: navigate to /admin/products.
    // renderAdminProducts calls api.admin.getProducts() which sends the
    // Authorization header from api.getToken(). Before the fix, it 401'd,
    // api.request threw `new Error('Session expired — please log in again')`,
    // and the catch block at pages.js:4515 logged
    // `pages: mergeLocalProducts failed: Error: Session expired — ...`.
    // We capture console messages and assert this string does NOT appear.
    const consoleWarnings = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Session expired') || text.includes('mergeLocalProducts failed')) {
        consoleWarnings.push(text);
      }
    });

    // The admin route guard (_requireAdmin) runs and admits the user via
    // either authManager.isAdmin() or adminAuthManager.isLoggedIn(). After
    // the fix BOTH paths work; before the fix neither did (token wiped
    // and the legacy slot was keyed differently).
    await page.goto('/#/admin/products');
    await page.waitForTimeout(3000);

    // No "Session expired" or mergeLocalProducts failure allowed.
    expect(
      consoleWarnings,
      `expected no session-expired warnings, got: ${JSON.stringify(consoleWarnings)}`
    ).toEqual([]);

    // The admin products page should render its title (sanity check that
    // the page actually rendered, not just that no error was logged).
    await expect(page.locator('h1, h2').filter({ hasText: /Product Management/i })).toBeVisible({
      timeout: 10000,
    });
  });
});
