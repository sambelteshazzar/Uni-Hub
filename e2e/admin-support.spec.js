const { test, expect } = require('@playwright/test');
const { injectAdminSession } = require('./helpers/admin-auth');

// Hermetic admin support tests (spec 2026-09-24 §Test decisions).
// injectAdminSession FIRST: it performs the real privileged login against
// the local backend (NODE_ENV=test devCode) and injects the flat admin
// session before any app code runs. Then all browser /api/** calls are
// mocked — most recently registered route wins, so the support mocks
// below take precedence over the catch-all.

const json = body => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

const adminTicket = {
  id: 'e2e-adm-tkt-1',
  userId: 'e2e-support-user',
  category: 'payment',
  subject: 'Checkout error at payment step',
  status: 'open',
  userEmail: 'customer@example.com',
  userName: 'Customer One',
  createdAt: '2026-09-24 09:00:00',
  updatedAt: '2026-09-24 09:10:00',
};

async function mockAdminSupport(page, { replies = [] } = {}) {
  // Stateful: a POSTed reply lands in `thread` so the detail refetch
  // after the reply actually shows it (spec §Test decisions).
  const thread = [...replies];
  await page.route('**/api/**', route => route.fulfill(json({ success: true, data: {} })));
  await page.route('**/api/admin/support/tickets**', route => {
    const path = new URL(route.request().url()).pathname;
    if (/\/api\/admin\/support\/tickets\/[^/]+$/.test(path)) {
      return route.fulfill(
        json({
          success: true,
          data: { ticket: adminTicket, replies: thread, userEmail: adminTicket.userEmail },
        })
      );
    }
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      const reply = {
        id: 'e2e-adm-rep-new',
        ticketId: adminTicket.id,
        authorId: 'e2e-admin',
        authorRole: 'admin',
        body: body.message,
        createdAt: '2026-09-24 10:00:00',
      };
      thread.push(reply);
      return route.fulfill(
        json({
          success: true,
          data: { reply, ticket: { ...adminTicket, status: 'pending' }, emailSent: true },
        })
      );
    }
    return route.fulfill(
      json({
        success: true,
        data: { tickets: [adminTicket], total: 1, openCount: 2, page: 1, pageSize: 20 },
      })
    );
  });
}

test.describe('Admin support queue', () => {
  test('queue renders rows and the sidebar badge shows the open count', async ({ page }) => {
    await injectAdminSession(page);
    await mockAdminSupport(page);

    await page.goto('/#/admin/support');
    await expect(page.locator('tr[data-ticket-id="e2e-adm-tkt-1"]')).toBeVisible();
    await expect(page.locator('tr[data-ticket-id="e2e-adm-tkt-1"]')).toContainText(
      'Checkout error at payment step'
    );
    await expect(page.locator('[data-adm-nav="support"] .adm-nav-badge')).toHaveText('2');
  });

  test('opening a ticket routes to the detail thread with reply form', async ({ page }) => {
    await injectAdminSession(page);
    await mockAdminSupport(page, {
      replies: [
        {
          id: 'e2e-adm-rep-1',
          ticketId: adminTicket.id,
          authorId: adminTicket.userId,
          authorRole: 'user',
          body: 'I paid with MoMo and the order is still pending.',
          createdAt: '2026-09-24 09:00:00',
        },
      ],
    });

    await page.goto('/#/admin/support');
    await page.click('tr[data-ticket-id="e2e-adm-tkt-1"] a[href^="#/admin/support/"]');

    // History mode strips the hash on dispatch (replaceState in
    // handleUrlChange) — assert the clean path, like product-detail.spec.
    await expect(page).toHaveURL(/\/admin\/support\/e2e-adm-tkt-1/);
    await expect(page.locator('#admin-support-detail-host')).toContainText(
      'Checkout error at payment step'
    );
    await expect(page.locator('.sup-msg')).toContainText('I paid with MoMo');
    await expect(page.locator('#admin-support-reply-form textarea')).toBeVisible();
    await expect(page.locator('[data-adm-support-action="back"]')).toBeVisible();
    await expect(page.locator('[data-adm-support-action="resolve"]')).toBeVisible();
  });

  test('admin reply posts, toasts, and re-renders the thread', async ({ page }) => {
    await injectAdminSession(page);
    await mockAdminSupport(page);

    await page.goto('/#/admin/support/e2e-adm-tkt-1');
    await expect(page.locator('#admin-support-reply-form')).toBeVisible();

    await page.fill('#admin-support-reply-form textarea', 'We are checking with the provider.');
    await page.click('#admin-support-reply-form button[type="submit"]');

    await expect(page.locator('.toast').filter({ hasText: 'emailed' })).toBeVisible();
    await expect(page.locator('#admin-support-detail-host')).toContainText(
      'We are checking with the provider.'
    );
  });
});
