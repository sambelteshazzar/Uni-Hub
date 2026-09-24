const { test, expect } = require('@playwright/test');

// Hermetic contact-portal tests (spec 2026-09-24). Every /api/** call is
// mocked so the suite does not depend on backend seed state. The catch-all
// is registered FIRST — Playwright routes match the most recently
// registered handler, so the specific mocks below win.
//
// Shape must match authManager.saveSession (flat user + token + expiresAt;
// role stays 'buyer' or loadSession rejects it into the admin store).

const SESSION_KEY = 'unihub_session';

const baseUser = {
  id: 'e2e-support-user',
  fullName: 'E2E Supporter',
  email: 'e2e_support@example.com',
  phone: '+233200000002',
  university: 'atu',
  level: '300',
  role: 'buyer',
  isVerified: true,
};

const json = body => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

async function setup(page, { signedIn = true } = {}) {
  await page.addInitScript(() => {
    window.API_URL = 'http://localhost:5000/api';
  });
  if (signedIn) {
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
      { key: SESSION_KEY, user: baseUser }
    );
  }

  await page.route('**/api/**', route =>
    route.fulfill(json({ success: true, data: {} }))
  );
  await page.route('**/api/auth/me', route =>
    route.fulfill(json({ success: true, data: { user: baseUser } }))
  );
}

// Scope covers list, detail and replies — branch on method + path.
async function mockSupportApi(page) {
  const ticketA = {
    id: 'e2e-tkt-1',
    userId: baseUser.id,
    category: 'payment',
    subject: 'MoMo payment stuck',
    status: 'open',
    createdAt: '2026-09-24 09:00:00',
    updatedAt: '2026-09-24 09:05:00',
  };
  const state = {
    tickets: [ticketA],
    replies: [
      {
        id: 'e2e-rep-1',
        ticketId: 'e2e-tkt-1',
        authorId: baseUser.id,
        authorRole: 'user',
        body: 'I paid with MoMo and the order is still pending.',
        createdAt: '2026-09-24 09:00:00',
      },
    ],
  };

  await page.route('**/api/support/tickets**', route => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const method = req.method();
    const isDetail = /\/api\/support\/tickets\/[^/]+$/.test(path);
    const isReply = /\/replies$/.test(path);

    if (method === 'GET' && isDetail) {
      return route.fulfill(
        json({ success: true, data: { ticket: state.tickets[0], replies: state.replies } })
      );
    }
    if (method === 'GET') {
      return route.fulfill(json({ success: true, data: { tickets: state.tickets } }));
    }
    if (method === 'POST' && !isReply) {
      const body = JSON.parse(req.postData() || '{}');
      const created = {
        ...state.tickets[0],
        id: 'e2e-tkt-new',
        category: body.category,
        subject: body.subject,
        status: 'open',
        updatedAt: '2026-09-24 10:00:00',
      };
      state.tickets = [created, ...state.tickets];
      return route.fulfill(json({ success: true, data: { ticket: created } }));
    }
    if (method === 'POST' && isReply) {
      const body = JSON.parse(req.postData() || '{}');
      const reply = {
        id: 'e2e-rep-new',
        ticketId: 'e2e-tkt-1',
        authorId: baseUser.id,
        authorRole: 'user',
        body: body.message,
        createdAt: '2026-09-24 10:05:00',
      };
      state.replies = [...state.replies, reply];
      return route.fulfill(
        json({ success: true, data: { reply, ticket: { ...state.tickets[0], status: 'open' } } })
      );
    }
    return route.fulfill(json({ success: true, data: {} }));
  });
  return state;
}

test.describe('Support contact portal', () => {
  test('signed-out visitors see the sign-in panel, not a fake form', async ({ page }) => {
    await setup(page, { signedIn: false });
    await page.goto('/#/contact');

    await expect(page.getByRole('heading', { name: 'Contact support' })).toBeVisible();
    const signIn = page.getByRole('link', { name: 'Sign in to contact support' });
    await expect(signIn).toBeVisible();
    await expect(signIn).toHaveAttribute('href', '#/login');
    await expect(page.locator('#support-new-form')).toHaveCount(0);
    // Fake phone card removed (spec: email + FAQ only).
    await expect(page.getByText('+233 50 123 4567')).toHaveCount(0);
  });

  test('signed-in users get the create form and their ticket list', async ({ page }) => {
    await setup(page);
    await mockSupportApi(page);
    await page.goto('/#/contact');

    await expect(page.locator('#support-new-form')).toBeVisible();
    await expect(page.locator('#support-category option')).toHaveCount(6);
    await expect(page.locator('#contact-tickets .sup-ticket')).toHaveCount(1);
    await expect(page.locator('#contact-tickets')).toContainText('MoMo payment stuck');
  });

  test('creating a ticket posts the form and refreshes the list', async ({ page }) => {
    await setup(page);
    await mockSupportApi(page);
    await page.goto('/#/contact');

    await page.selectOption('#support-category', 'payment');
    await page.fill('#support-subject', 'Refund not received');
    await page.fill('#support-body', 'I want my money back.');
    await page.click('#support-new-form button[type="submit"]');

    await expect(page.locator('.toast').filter({ hasText: 'Ticket sent' })).toBeVisible();
    await expect(page.locator('#contact-tickets')).toContainText('Refund not received');
  });

  test('thread toggles, lazy-loads detail, and replies', async ({ page }) => {
    await setup(page);
    await mockSupportApi(page);
    await page.goto('/#/contact');

    await page.click('.sup-ticket[data-ticket-id="e2e-tkt-1"] [data-action="toggle-thread"]');
    await expect(page.locator('.sup-thread .sup-msg')).toHaveCount(1);
    await expect(page.locator('.sup-thread')).toContainText('I paid with MoMo');

    await page.fill('.sup-reply-row textarea', 'Any update on this?');
    await page.click('.sup-reply-row button[type="submit"]');
    await expect(page.locator('.toast').filter({ hasText: 'Reply sent' })).toBeVisible();
    await expect(page.locator('.sup-thread .sup-msg')).toHaveCount(2);
    await expect(page.locator('.sup-thread')).toContainText('Any update on this?');
  });

  test('FAQ Contact Support link navigates to the contact page', async ({ page }) => {
    await setup(page, { signedIn: false });
    await page.goto('/#/faq');

    await page.getByRole('link', { name: 'Contact Support' }).click();
    await expect(page).toHaveURL(/\/contact/);
    await expect(page.getByRole('heading', { name: 'Contact support' })).toBeVisible();
  });
});
