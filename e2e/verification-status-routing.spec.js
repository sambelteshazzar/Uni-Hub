const { test, expect } = require('@playwright/test');

// Hermetic routing tests for the verification entry surface. Regression
// (tester report 2026-09-24): renderStudentVerification only checked
// isVerified flags, so an approved_pending_user account got a blank form;
// submitting it hit the re-submit guard with a dead-end toast. These tests
// mock the API so they do not depend on backend seed state.
//
// A catch-all **/api/** mock is required: any unmocked endpoint (e.g.
// /notifications on boot) 401s with the fake bearer, and api.js reacts to
// 401s by clearSession() — which logs the injected user out mid-test.

const SESSION_KEY = 'unihub_session';

const baseUser = {
  id: 'e2e-verify-user',
  fullName: 'E2E Verifier',
  email: 'e2e_verify@example.com',
  phone: '+233200000001',
  university: 'atu',
  level: '300',
  role: 'buyer',
  isVerified: false,
};

async function setupSessionAndMocks(page, { meStatus, meIsVerified = false }) {
  await page.addInitScript(() => {
    window.API_URL = 'http://localhost:5000/api';
  });

  // Shape must match authManager.saveSession — loadSession rejects
  // admin/moderator roles into the admin store, so role stays 'buyer'.
  await page.addInitScript(
    ({ key, user }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          token: 'e2e-fake-token',
          user,
          expiresAt: Date.now() + 60 * 60 * 1000,
        })
      );
    },
    { key: SESSION_KEY, user: { ...baseUser, isVerified: meIsVerified } }
  );

  // Registered FIRST so later, more specific routes take precedence
  // (Playwright matches the most recently registered matching handler).
  await page.route('**/api/**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: {} }),
    })
  );

  // _validateToken clears the session on 401 — keep it at 200.
  await page.route('**/api/auth/me', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { user: baseUser } }),
    })
  );

  let status = meStatus;
  const setStatus = next => {
    status = next;
  };
  await page.route('**/api/verification/me', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          isVerified: meIsVerified || status === 'approved',
          status,
          email: baseUser.email,
          university: baseUser.university,
          studentId: '10234567',
        },
      }),
    })
  );

  return { setStatus };
}

test.describe('Verification entry routing', () => {
  test('approved_pending_user lands on the status page, not the form', async ({ page }) => {
    await setupSessionAndMocks(page, { meStatus: 'approved_pending_user' });

    await page.goto('/#/verification');

    await expect(page.locator('text=Almost there — check your email')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('#verification-form')).toHaveCount(0);
    await expect(page.locator('text=Verify Your Student Status')).toHaveCount(0);
  });

  test('pending submission lands on the status page, not the form', async ({ page }) => {
    await setupSessionAndMocks(page, { meStatus: 'pending' });

    await page.goto('/#/verification');

    await expect(page.locator('text=Awaiting admin review')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#verification-form')).toHaveCount(0);
  });

  test('rejected submission still shows the form (resubmit path)', async ({ page }) => {
    await setupSessionAndMocks(page, { meStatus: 'rejected' });

    await page.goto('/#/verification');

    await expect(page.locator('#verification-form')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Verify Your Student Status')).toBeVisible();
  });

  test('ALREADY_SUBMITTED 400 on submit redirects to the status page', async ({ page }) => {
    // Stale/race surface: /me says not_submitted (form correctly shown),
    // but the POST hits the re-submit guard — the backstop must not leave
    // the user on a dead-end toast.
    const { setStatus } = await setupSessionAndMocks(page, { meStatus: 'not_submitted' });

    await page.route('**/api/verification', route => {
      if (route.request().method() !== 'POST') {
        return route.fallback();
      }
      setStatus('approved_pending_user');
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'This student ID is already verified or awaiting confirmation',
          details: { code: 'ALREADY_SUBMITTED', status: 'approved' },
        }),
      });
    });

    await page.goto('/#/verification');
    await expect(page.locator('#verification-form')).toBeVisible({ timeout: 10000 });

    await page.fill('#v-full-name', 'E2E Verifier');
    await page.fill('#v-student-id', '10234567');
    await page.fill('#v-personal-email', 'e2e_verify@example.com');
    await page.fill('#v-phone', '+233501234567');
    await page.selectOption('#v-level', '300');
    await page.check('#v-declaration');
    await page.check('#v-wait-time');
    await page.click('#verification-form button[type="submit"]');

    await expect(page.locator('text=Almost there — check your email')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('#verification-form')).toHaveCount(0);
  });
});
