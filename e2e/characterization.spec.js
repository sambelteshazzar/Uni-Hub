const { test, expect } = require('@playwright/test');
const { injectAdminSession } = require('./helpers/admin-auth');

const API = process.env.API_URL || 'http://localhost:5000/api';

// Characterization specs: pin CURRENT behavior before the refactor moves code.
// If an expectation fails: re-read the implementation. If actual behavior is
// intentional, update the expectation (the spec documents reality). If it
// looks like a bug, add it to docs/REFACTOR_FINDINGS.md — do NOT change
// product code in this task (strict refactor-only).

async function registerBuyer(request, stamp) {
  const csrf = await request.get(`${API}/auth/csrf-token`);
  const token = (await csrf.json()).csrfToken;
  const headers = { 'X-CSRF-Token': token };
  const email = `char-${stamp}@test.local`;
  const phone = `055${String(stamp).slice(-8)}`;
  const reg = await request.post(`${API}/auth/register`, {
    headers,
    data: {
      fullName: 'Characterization Buyer',
      email,
      password: 'Student123!',
      phone,
      university: 'atu',
      acceptedTerms: true,
    },
  });
  expect(reg.status(), await reg.text()).toBeLessThan(300);
  const login = await request.post(`${API}/auth/login`, { headers, data: { email, password: 'Student123!' } });
  expect(login.status(), await login.text()).toBe(200);
  const body = await login.json();
  return body.data;
}

async function injectBuyerSession(page, data) {
  await page.addInitScript(() => { window.API_URL = 'http://localhost:5000/api'; });
  // authManager.loadSession (js/modules/auth.js:56) only accepts the NESTED
  // shape { token, user, expiresAt } — the FLAT {...user, token, expiresAt}
  // shape is the ADMIN store (unihub_admin_session) and is cleared on boot
  // for the user store.
  await page.addInitScript(
    ({ value }) => window.localStorage.setItem('unihub_session', JSON.stringify(value)),
    { value: { token: data.token, user: data.user, expiresAt: Date.now() + 3600000 } }
  );
}

// renderCheckout checks the cart BEFORE the login and verification gates
// (js/pages/pages.js:3187) and diverts an empty cart to renderBrowse, and the
// landing page renders no Add-to-Cart control — so without a seeded item the
// checkout gates are unreachable and neither test below pins anything.
async function seedCart(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'unihub_cart',
      JSON.stringify([
        {
          product: { id: 'char-test-product', name: 'Characterization Item', price: 25, image: '' },
          quantity: 1,
          variant: null,
          addedAt: new Date().toISOString(),
        },
      ])
    );
  });
}

// F8 (docs/REFACTOR_FINDINGS.md): `renderStudentVerification` and
// `renderLogin` are NOT static members of the Pages class — they are attached
// by the 50ms setInterval poll in js/pages/bestbuy-auth-dashboard.js:7/228/735,
// which only starts once window.Pages exists. A cold deep link to #/checkout
// dispatches before that poll's next tick, so renderCheckout's
// `this.renderStudentVerification()` (js/pages/pages.js:3210) throws
// "not a function" and Router.navigate paints the 500 error page instead of
// the gate — reproducibly nondeterministic (4/4 failing on one run, passing on
// another). Pin the gate's real behaviour by booting on / first and waiting
// until the late-bound renderers and the router are ready, then navigate
// in-page. The cold-deep-link race itself is logged as F8, not pinned here.
async function bootAndWaitForLateBinds(page) {
  await page.goto('/');
  await page.waitForFunction(
    () =>
      typeof window.Pages !== 'undefined' &&
      typeof window.Pages.renderStudentVerification === 'function' &&
      typeof window.Pages.renderLogin === 'function' &&
      typeof window.router !== 'undefined' &&
      window.router.routes.size > 0 &&
      window.router.currentRoute !== null,
    null,
    { timeout: 20000 }
  );
}

test.describe('Characterization: checkout gate', () => {
  test('unverified signed-in buyer on #/checkout is routed to verification', async ({ page, request }) => {
    const data = await registerBuyer(request, Date.now());
    await injectBuyerSession(page, data);
    await seedCart(page);
    await bootAndWaitForLateBinds(page);
    await page.evaluate(() => window.router.navigate('/checkout'));
    await page.waitForSelector('#verification-form', { timeout: 15000 }).catch(() => {});
    const outcome = {
      url: page.url(),
      form: await page.locator('#verification-form').count(),
      statusPage: await page.locator('text=Awaiting admin review').count(),
      payment: await page.locator('input[name*="card"], #card-number, [data-payment-option]').count(),
      errorPage: await page.locator('.adm-auth-tagline').count(),
    };
    expect(outcome.errorPage, JSON.stringify(outcome)).toBe(0);
    expect(outcome.form + outcome.statusPage, JSON.stringify(outcome)).toBeGreaterThan(0);
    expect(outcome.payment, JSON.stringify(outcome)).toBe(0);
    const appText = await page.locator('#app').innerText();
    expect(appText.length).toBeGreaterThan(20);
  });

  test('logged-out #/checkout never reaches payment fields', async ({ page }) => {
    await seedCart(page);
    await bootAndWaitForLateBinds(page);
    await page.evaluate(() => window.router.navigate('/checkout'));
    // renderCheckout's login gate calls this.renderLogin()
    // (js/pages/pages.js:3198) — late-bound by the same F8 poll.
    await page.waitForSelector('#login-form-bb', { timeout: 15000 }).catch(() => {});
    expect(await page.locator('#login-form-bb').count()).toBe(1);
    const paymentish = page.locator('input[name*="card"], #card-number, [data-payment-option]');
    expect(await paymentish.count()).toBe(0);
  });
});

test.describe('Characterization: signed-in pages', () => {
  test('buyer dashboard and orders render content', async ({ page, request }) => {
    const data = await registerBuyer(request, Date.now());
    await injectBuyerSession(page, data);
    for (const hash of ['/dashboard', '/orders']) {
      await page.goto(`/#${hash}`);
      await page.waitForTimeout(2000);
      const text = await page.locator('#app').innerText();
      expect(text.length, `empty render for ${hash}`).toBeGreaterThan(20);
    }
  });

  test('buyer messages page renders (empty state acceptable)', async ({ page, request }) => {
    const data = await registerBuyer(request, Date.now());
    await injectBuyerSession(page, data);
    await page.goto('/#/messages');
    await page.waitForTimeout(2000);
    expect((await page.locator('#app').innerText()).length).toBeGreaterThan(10);
  });
});

test.describe('Characterization: static pages', () => {
  for (const hash of ['/faq', '/terms', '/privacy', '/about', '/track']) {
    test(`${hash} renders content`, async ({ page }) => {
      await page.goto(`/#${hash}`);
      await page.waitForTimeout(1500);
      expect((await page.locator('#app').innerText()).length).toBeGreaterThan(20);
    });
  }
});

test.describe('Characterization: admin pages smoke', () => {
  test('admin core pages render with a live session', async ({ page }) => {
    // 7 full SPA boots + 2s settle each exceeds the 30s per-test default.
    test.setTimeout(120000);
    await injectAdminSession(page);
    for (const hash of [
      '/admin',
      '/admin/users',
      '/admin/products',
      '/admin/orders',
      '/admin/coupons',
      '/admin/reports',
      '/admin/verifications',
    ]) {
      await page.goto(`/#${hash}`);
      await page.waitForTimeout(2000);
      const text = await page.locator('#app').innerText();
      expect(text.length, `empty render for ${hash}`).toBeGreaterThan(50);
    }
  });
});
