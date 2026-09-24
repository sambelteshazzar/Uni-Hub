// Regression: admin approval must hit the backend EXACTLY ONCE and the
// no-SMTP escape hatch (`confirmationLink` in the approve response) must
// reach the copyable box.
//
// The bug: adminVerificationsManager.approve() fired its own unawaited
// PUT while Pages.approveVerification fired a second awaited one. Two
// rotations raced — the link shown to the admin came from the second
// response, but if the first call landed last it rotated that token away,
// so the admin copied a link that was dead on arrival, and the user sat
// in approved_pending_user forever (confirmation links also doubled).
const { test, expect } = require('@playwright/test');
const { injectAdminSession } = require('./helpers/admin-auth');

const API = 'http://localhost:5000/api';

test.describe('admin verification approve — single sync + link box', () => {
  test('approve fires one PUT and surfaces the confirmation link when email is unconfigured', async ({
    page,
    request,
  }) => {
    // 1. Buyer + pending verification through the real API (CSRF cookie
    //    jar lives in the request fixture).
    const csrfRes = await request.get(`${API}/auth/csrf-token`);
    const { csrfToken } = await csrfRes.json();

    const stamp = Date.now();
    const email = `e2eap_${stamp}@example.com`;
    const studentId = `30${String(stamp).slice(-8)}`;
    // Unique per run — users.phone is globally unique (a fixed number
    // collides with earlier runs and register() 400s).
    const phone = `02${String(stamp).slice(-9)}`;

    const reg = await request.post(`${API}/auth/register`, {
      headers: { 'X-CSRF-Token': csrfToken, 'Content-Type': 'application/json' },
      data: {
        fullName: 'E2E Approve',
        email,
        password: 'Student123!',
        phone,
        university: 'atu',
        acceptedTerms: true,
      },
    });
    const regText = await reg.text();
    expect(reg.status(), `register: ${regText}`).toBe(201);
    const buyerToken = JSON.parse(regText).data.token;

    const sub = await request.post(`${API}/verification`, {
      headers: { 'X-CSRF-Token': csrfToken, Authorization: `Bearer ${buyerToken}` },
      data: {
        studentId,
        fullName: 'E2E Approve',
        email,
        phone,
        university: 'atu',
        level: '300',
        hall: 'Commonwealth',
        verificationMethod: 'document',
      },
    });
    const subText = await sub.text();
    expect(sub.status(), `submit: ${subText}`).toBe(201);

    // 2. Admin session + PUT counter before any approve traffic.
    await injectAdminSession(page);
    const approvePuts = [];
    page.on('request', req => {
      if (req.method() === 'PUT' && /\/verification\/[^/]+\/approve(?:\?|$)/.test(req.url())) {
        approvePuts.push(req.url());
      }
    });

    await page.goto('/#/admin/verifications');
    await page.waitForFunction(
      sid => {
        try {
          return adminVerificationsManager.getPending().some(v => v.studentId === sid);
        } catch (e) {
          return false;
        }
      },
      studentId,
      { timeout: 20000 }
    );

    // 3. Drive the exact path the Approve button ultimately takes.
    //    Pages.approveVerification awaits manager.approve, which awaits the
    //    single backend sync — the evaluate resolves after that PUT.
    await page.evaluate(async sid => {
      const entry = adminVerificationsManager.getPending().find(v => v.studentId === sid);
      await Pages.approveVerification(entry.id);
    }, studentId);

    // 4. Exactly one backend PUT (the race regression).
    expect(approvePuts.length).toBe(1);

    // 5. No-SMTP escape hatch: copyable box with a fresh confirmation link.
    const box = page.locator('#confirm-link-box');
    await expect(box).toBeVisible();
    const link = await box.locator('[data-confirm-link]').inputValue();
    expect(link).toMatch(/\/#\/verify\?token=/);

    // 6. Server truth: approved, still awaiting the user's confirmation click.
    const me = await request.get(`${API}/verification/me`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(me.status()).toBe(200);
    const data = (await me.json()).data;
    expect(data.status).toBe('approved_pending_user');
    expect(data.isVerified).toBe(false);

    // 7. Awaiting rows come from the API, not just the approving browser's
    //    localStorage: wipe the queue snapshot and reload — the row must
    //    reappear from the server in the "Awaiting User Confirmation" tab.
    await page.evaluate(() => localStorage.removeItem(STORAGE_KEYS.VERIFICATION_QUEUE));
    await page.reload();
    await page.waitForFunction(
      sid => {
        try {
          return adminVerificationsManager.getApprovedPendingUser().some(v => v.studentId === sid);
        } catch (e) {
          return false;
        }
      },
      studentId,
      { timeout: 20000 }
    );

    // 8. The detail modal exposes a re-approve action for awaiting rows
    //    (the "ask an admin to re-approve" path for expired links).
    const entryId = await page.evaluate(sid => {
      const entry = adminVerificationsManager.getApprovedPendingUser().find(v => v.studentId === sid);
      return entry && entry.id;
    }, studentId);
    expect(entryId).toBeTruthy();
    await page.evaluate(id => Pages.viewVerificationDetail(id), entryId);
    const reapproveBtn = page.locator('#vrf-detail-overlay [data-adm-modal-action="approve"]');
    await expect(reapproveBtn).toBeVisible();
    await expect(reapproveBtn).toContainText(/Re-approve/);

    // 9. Driving the re-approve path fires exactly one more PUT.
    const putsBefore = approvePuts.length;
    await page.evaluate(id => Pages.approveVerification(id), entryId);
    expect(approvePuts.length).toBe(putsBefore + 1);
  });
});
