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
// Strategy: reuse e2e/helpers/admin-auth.js, which runs the two-step MFA
// login through Playwright's request context (devCode in NODE_ENV=test)
// and ALSO tolerates the controller's no-mailtransport MFA bypass
// (auth.controller.js:229 — when a reused dev server runs without
// NODE_ENV=test and no mail transport, privileged login returns the token
// directly with no mfaRequired flag). The helper injects the resulting
// session into localStorage in the exact flat shape AdminAuthManager
// ._completeLogin persists; this spec then exercises the SPA normally.
// (The backend's MFA-enforcement security property itself is covered by
// backend/tests/mfa.test.js, which always runs with NODE_ENV=test.)

const { test, expect } = require('@playwright/test');
const { injectAdminSession, ADMIN_SESSION_KEY } = require('./helpers/admin-auth');

const PRIVILEGED_ROLES = ['admin', 'moderator'];

test.describe('Admin session separation + persistence', () => {
  test('separate admin session survives reload, powers /admin APIs, never leaks to the main app', async ({ page }) => {
    // Logs in via API (MFA or bypass, per server env) and injects the
    // flat session into unihub_admin_session before any app code runs.
    const session = await injectAdminSession(page);
    expect(PRIVILEGED_ROLES).toContain(session.role);

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
