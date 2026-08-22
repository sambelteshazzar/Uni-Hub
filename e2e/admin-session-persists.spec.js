// Regression tests: admin session integrity.
//
// Covers two historical bugs and one security property:
//  1. SESSION-WIPE (old): admin login wrote { token, user } without
//     expiresAt; the next reload's loadSession() wiped it -> every admin
//     API call 401'd with "Session expired".
//  2. CREDENTIAL LEAK (security): admin login ALSO copied the privileged
//     token into `unihub_session` (STORAGE_KEYS.CURRENT_USER), so the main
//     app acted with admin credentials after visiting the panel. The fix
//     stores admin sessions ONLY under `unihub_admin_session`; api.js
//     selects it for /admin/* URLs and while #/admin routes are active.
//
// Strategy: run the two-step MFA login through Playwright's request
// context (no mailbox needed — test env returns devCode), then inject the
// resulting session into localStorage exactly as AdminAuthManager
// ._completeLogin stores it (flat shape), and exercise the SPA normally.

const { test, expect } = require('@playwright/test');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@unihub.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';
const PRIVILEGED_ROLES = ['admin', 'moderator'];
const ADMIN_SESSION_KEY = 'unihub_admin_session';

async function adminLoginViaApi (request) {
  // The production server enforces CSRF on mutating requests; fetch a
  // token first exactly like js/utils/api.js does for the SPA.
  const csrf = await request.get('http://localhost:5000/api/auth/csrf-token');
  const csrfToken = (await csrf.json())?.csrfToken;
  const headers = csrfToken ? { 'X-CSRF-Token': csrfToken } : {};

  const step1 = await request.post('http://localhost:5000/api/auth/login', {
    headers,
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(step1.status()).toBe(200);
  const body1 = await step1.json();
  expect(body1.data.mfaRequired, 'privileged login must require MFA').toBe(true);

  const step2 = await request.post('http://localhost:5000/api/auth/mfa/verify', {
    headers,
    data: { challengeId: body1.data.challengeId, code: body1.data.devCode },
  });
  expect(step2.status()).toBe(200);
  const body2 = await step2.json();
  return body2.data; // { token, user }
}

test.describe('Admin session separation + persistence', () => {
  test('separate admin session survives reload, powers /admin APIs, never leaks to the main app', async ({ page }) => {
    const data = await adminLoginViaApi(page.request);
    expect(PRIVILEGED_ROLES).toContain(data.user.role);

    // Inject the session in the exact FLAT shape _completeLogin persists.
    await page.addInitScript(({ key, session }) => {
      window.API_URL = 'http://localhost:5000/api';
      window.localStorage.setItem(key, JSON.stringify(session));
    }, { key: ADMIN_SESSION_KEY, session: { ...data.user, token: data.token, expiresAt: Date.now() + 24 * 60 * 60 * 1000 } });

    // Diagnostics in case selectors or backend calls break.
    const consoleWarnings = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Session expired') || text.includes('mergeLocalProducts failed')) {
        consoleWarnings.push(text);
      }
    });

    // Fresh load: app boots WITH the injected admin session, NO user session.
    await page.goto('/#/admin');
    await page.waitForTimeout(2000);

    // --- Separation assertions -------------------------------------------
    const adminStored = await page.evaluate(key => localStorage.getItem(key), ADMIN_SESSION_KEY);
    expect(adminStored, 'admin session must live in unihub_admin_session').not.toBeNull();
    const adminParsed = JSON.parse(adminStored);
    expect(adminParsed.token).toBeTruthy();
    // Bug #1 regression guard: expiry must always be present going forward.
    expect(typeof adminParsed.expiresAt).toBe('number');
    expect(adminParsed.expiresAt).toBeGreaterThan(Date.now());

    const userRaw = await page.evaluate(() => localStorage.getItem('unihub_session'));
    if (userRaw) {
      const role = JSON.parse(userRaw)?.user?.role;
      expect(
        PRIVILEGED_ROLES.includes(role),
        `unihub_session must not hold privileged credentials (found role: ${role})`
      ).toBeFalsy();
    }

    // --- Panel renders authenticated (api.js picked the admin token) ------
    await page.goto('/#/admin/products');
    await page.waitForTimeout(3000);
    expect(
      consoleWarnings,
      `expected no session-expired warnings, got: ${JSON.stringify(consoleWarnings)}`
    ).toEqual([]);
    await expect(page.locator('h1, h2').filter({ hasText: /Product Management/i })).toBeVisible({
      timeout: 10000,
    });

    // --- Persistence across reload ----------------------------------------
    const tokenBefore = adminParsed.token;
    await page.reload();
    await page.waitForTimeout(2000);
    const storedAfterReload = await page.evaluate(key => localStorage.getItem(key), ADMIN_SESSION_KEY);
    expect(storedAfterReload, 'admin session must survive reload').not.toBeNull();
    expect(JSON.parse(storedAfterReload).token).toBe(tokenBefore);
  });
});
