// Shared e2e helper: authenticate as an admin WITHOUT the UI.
//
// Privileged logins require MFA (emailed OTP). In the Playwright
// environment NODE_ENV=test makes the auth API return devCode, so we can
// complete the two-step login via the request context and inject the
// resulting session into localStorage in the exact FLAT shape that
// AdminAuthManager._completeLogin persists. Tests then exercise the SPA
// with a real, backend-verified admin session.

const { expect } = require('@playwright/test');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@unihub.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';
const ADMIN_SESSION_KEY = 'unihub_admin_session';

exports.ADMIN_SESSION_KEY = ADMIN_SESSION_KEY;

exports.injectAdminSession = async function injectAdminSession (page) {
  // Point SPA at the local backend before any app code runs.
  await page.addInitScript(() => {
    window.API_URL = 'http://localhost:5000/api';
  });

  const csrfRes = await page.request.get('http://localhost:5000/api/auth/csrf-token');
  const csrfToken = (await csrfRes.json())?.csrfToken;
  const headers = csrfToken ? { 'X-CSRF-Token': csrfToken } : {};

  const step1 = await page.request.post('http://localhost:5000/api/auth/login', {
    headers,
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const step1Body = await step1.text();
  expect(step1.status(), `admin login failed: ${step1Body}`).toBe(200);
  const body1 = await step1.json();

  let data;
  if (body1.data?.mfaRequired) {
    // devCode exists ONLY when the backend runs with NODE_ENV=test. If this
    // fails, the server serving :5000 was started without it (stale process
    // or webServer env not applied).
    expect(body1.data.devCode,
      'login response must include devCode — is the backend running with NODE_ENV=test?').toMatch(/^\d{6}$/);
    const step2 = await page.request.post('http://localhost:5000/api/auth/mfa/verify', {
      headers,
      data: { challengeId: body1.data.challengeId, code: body1.data.devCode },
    });
    const step2Body = await step2.text();
    expect(step2.status(), `mfa verify failed: ${step2Body}`).toBe(200);
    data = JSON.parse(step2Body).data;
  } else {
    data = body1.data; // defensive fallback for non-privileged accounts
  }

  const session = {
    ...data.user,
    token: data.token,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, JSON.stringify(value)),
    { key: ADMIN_SESSION_KEY, value: session },
  );
  return session;
};
