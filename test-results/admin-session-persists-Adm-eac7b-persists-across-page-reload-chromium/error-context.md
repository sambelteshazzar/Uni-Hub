# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-session-persists.spec.js >> Admin session survives reload (regression) >> admin login via admin form persists across page reload
- Location: e2e/admin-session-persists.spec.js:28:3

# Error details

```
Error: session must contain expiresAt (the bug)

expect(received).toBeTruthy()

Received: undefined
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - main [ref=e4]:
    - generic [ref=e5]:
      - complementary [ref=e6]:
        - generic [ref=e7]:
          - img [ref=e9]
          - generic [ref=e11]: Admin Panel
        - generic [ref=e12]:
          - generic [ref=e13]: A
          - generic [ref=e14]:
            - generic [ref=e15]: Admin
            - generic [ref=e16]: Super Admin
        - navigation [ref=e17]:
          - generic [ref=e18]: Main
          - list [ref=e19]:
            - listitem [ref=e20]:
              - link "Dashboard" [ref=e21] [cursor=pointer]:
                - /url: "#"
                - img [ref=e23]
                - generic [ref=e24]: Dashboard
            - listitem [ref=e25]:
              - link "Verifications" [ref=e26] [cursor=pointer]:
                - /url: "#"
                - img [ref=e28]
                - generic [ref=e30]: Verifications
            - listitem [ref=e31]:
              - link "Users" [ref=e32] [cursor=pointer]:
                - /url: "#"
                - img [ref=e34]
                - generic [ref=e39]: Users
            - listitem [ref=e40]:
              - link "Products" [ref=e41] [cursor=pointer]:
                - /url: "#"
                - img [ref=e43]
                - generic [ref=e47]: Products
            - listitem [ref=e48]:
              - link "Orders" [ref=e49] [cursor=pointer]:
                - /url: "#"
                - img [ref=e51]
                - generic [ref=e54]: Orders
            - listitem [ref=e55]:
              - link "Reports" [ref=e56] [cursor=pointer]:
                - /url: "#"
                - img [ref=e58]
                - generic [ref=e59]: Reports
            - listitem [ref=e60]:
              - link "Analytics" [ref=e61] [cursor=pointer]:
                - /url: "#"
                - img [ref=e63]
                - generic [ref=e64]: Analytics
            - listitem [ref=e65]:
              - link "Activity" [ref=e66] [cursor=pointer]:
                - /url: "#"
                - img [ref=e68]
                - generic [ref=e71]: Activity
            - listitem [ref=e72]:
              - link "Regions" [ref=e73] [cursor=pointer]:
                - /url: "#"
                - img [ref=e75]
                - generic [ref=e78]: Regions
        - button "Logout" [ref=e80] [cursor=pointer]
      - main [ref=e81]:
        - generic [ref=e82]:
          - generic [ref=e83]:
            - heading "Dashboard" [level=1] [ref=e84]
            - paragraph [ref=e85]: Welcome back, Admin
          - generic [ref=e87]: 3 Aug 2026
        - generic [ref=e88]:
          - generic [ref=e89]:
            - generic [ref=e90]:
              - img [ref=e92]
              - generic [ref=e97]: +0 today
            - generic [ref=e98]: "1"
            - generic [ref=e99]: Total Users
          - generic [ref=e100]:
            - img [ref=e103]
            - generic [ref=e107]: "0"
            - generic [ref=e108]: Total Products
          - generic [ref=e109]:
            - img [ref=e112]
            - generic [ref=e115]: "0"
            - generic [ref=e116]: Total Orders
          - generic [ref=e117]:
            - generic [ref=e118]:
              - img [ref=e120]
              - generic [ref=e122]: +GHS 0 today
            - generic [ref=e123]: GH₵0
            - generic [ref=e124]: Total Revenue
          - generic [ref=e125] [cursor=pointer]:
            - img [ref=e128]
            - generic [ref=e130]: "0"
            - generic [ref=e131]: Pending Verifications
        - generic [ref=e133]:
          - generic [ref=e134]:
            - generic [ref=e135]:
              - heading "Recent Orders" [level=3] [ref=e136]
              - button "View All" [ref=e137] [cursor=pointer]
            - table [ref=e139]:
              - rowgroup [ref=e140]:
                - row "Order Tracking Customer Status Amount Date" [ref=e141]:
                  - columnheader "Order" [ref=e142]
                  - columnheader "Tracking" [ref=e143]
                  - columnheader "Customer" [ref=e144]
                  - columnheader "Status" [ref=e145]
                  - columnheader "Amount" [ref=e146]
                  - columnheader "Date" [ref=e147]
              - rowgroup [ref=e148]:
                - row "No orders yet" [ref=e149]:
                  - cell "No orders yet" [ref=e150]
            - generic [ref=e151]:
              - heading "Recent Users" [level=4] [ref=e152]
              - generic [ref=e153]:
                - generic [ref=e154]: A
                - generic [ref=e155]:
                  - generic [ref=e156]: Admin
                  - generic [ref=e157]: admin@unihub.local
                - generic [ref=e158]: Admin
          - generic [ref=e159]:
            - heading "Quick Actions" [level=3] [ref=e161]
            - generic [ref=e162]:
              - button "Add Product" [ref=e163] [cursor=pointer]:
                - img [ref=e164]
                - text: Add Product
              - button "Products" [ref=e166] [cursor=pointer]:
                - img [ref=e167]
                - text: Products
              - button "Orders" [ref=e171] [cursor=pointer]:
                - img [ref=e172]
                - text: Orders
              - button "Reports" [ref=e175] [cursor=pointer]:
                - img [ref=e176]
                - text: Reports
          - generic [ref=e177]:
            - heading "Platform Health" [level=3] [ref=e179]
            - generic [ref=e180]:
              - generic [ref=e181]:
                - generic [ref=e182]: Pending Products
                - generic [ref=e183]: "0"
              - generic [ref=e184]:
                - generic [ref=e185]: Active Orders
                - generic [ref=e186]: "0"
              - generic [ref=e187]:
                - generic [ref=e188]: Today Revenue
                - generic [ref=e189]: GHS 0
              - generic [ref=e190]:
                - generic [ref=e191]: Week Revenue
                - generic [ref=e192]: GHS 0
              - generic [ref=e193]:
                - generic [ref=e194]: Month Revenue
                - generic [ref=e195]: GHS 0
  - generic [ref=e197]:
    - img [ref=e199]
    - generic [ref=e201]:
      - generic [ref=e202]: Login Successful
      - generic [ref=e203]: Welcome to Admin Panel
    - button "×" [ref=e204] [cursor=pointer]
```

# Test source

```ts
  1   | // Regression test for the admin-session-wipe bug.
  2   | //
  3   | // Root cause under test:
  4   | //   adminAuthManager.login (js/admin/admin-auth.js) used to write
  5   | //   { token, user } to localStorage under `unihub_session`
  6   | //   (STORAGE_KEYS.CURRENT_USER) with NO `expiresAt` field. On the
  7   | //   next page load, AuthManager.loadSession (js/modules/auth.js)
  8   | //   evaluates `parsed.expiresAt > Date.now()` which is
  9   | //   `undefined > Date.now()` -> false, then calls clearSession(),
  10  | //   wiping the admin's token. From that point on, every admin-API
  11  | //   call sends no Authorization header and 401s, surfacing as a
  12  | //   misleading "Session expired — please log in again" error.
  13  | //
  14  | // The fix writes the session in the shape AuthManager.loadSession
  15  | // expects: { token, user, expiresAt: <now + 24h> }.
  16  | //
  17  | // This test logs in via the ADMIN login form (not the main app
  18  | // login form), forces a page reload (which re-runs loadSession),
  19  | // then navigates to /admin/products and asserts it renders
  20  | // without the "Session expired" failure.
  21  | 
  22  | const { test, expect } = require('@playwright/test');
  23  | 
  24  | const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@unihub.local';
  25  | const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';
  26  | 
  27  | test.describe('Admin session survives reload (regression)', () => {
  28  |   test('admin login via admin form persists across page reload', async ({ page }) => {
  29  |     // The frontend's app-init.js defaults window.API_URL to the production
  30  |     // Render backend even on localhost (see js/app-init.js:9-15). For
  31  |     // tests we need to point at the local backend Playwright already
  32  |     // started on :5000 (see webServer in playwright.config.js). Inject
  33  |     // window.API_URL BEFORE app-init.js runs via addInitScript.
  34  |     await page.addInitScript(() => {
  35  |       window.API_URL = 'http://localhost:5000/api';
  36  |     });
  37  | 
  38  |     // Navigate to /admin while logged-out. _requireAdmin() returns false
  39  |     // and Pages.renderAdminLogin() renders the admin login form.
  40  |     await page.goto('/#/admin');
  41  |     // Wait for the admin login form's email input to appear so fills don't race.
  42  |     const emailInput = page.locator('#admin-email');
  43  |     await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  44  |     const passwordInput = page.locator('#admin-password');
  45  | 
  46  |     await emailInput.fill(ADMIN_EMAIL);
  47  |     await passwordInput.fill(ADMIN_PASSWORD);
  48  |     // Sanity-check the fills landed (debugging aid when selectors break).
  49  |     await expect(emailInput).toHaveValue(ADMIN_EMAIL);
  50  |     await expect(passwordInput).toHaveValue(ADMIN_PASSWORD);
  51  | 
  52  |     // Capture every backend response so we can diagnose CSRF / login issues if
  53  |     // the assertion fails. This is purely diagnostic — the test still asserts
  54  |     // on a 200 below.
  55  |     const allResponses = [];
  56  |     page.on('response', resp => {
  57  |       if (resp.url().includes('/api/')) {
  58  |         allResponses.push({ url: resp.url(), status: resp.status() });
  59  |       }
  60  |     });
  61  | 
  62  |     // Capture console + uncaught pageerror events so a silent JS throw in the
  63  |     // admin login handler doesn't leave us guessing.
  64  |     const consoleMsgs = [];
  65  |     page.on('console', msg => consoleMsgs.push(`[${msg.type()}] ${msg.text()}`));
  66  |     page.on('pageerror', err => consoleMsgs.push(`[pageerror] ${err.message}`));
  67  | 
  68  |     // Submit the admin login form -> Pages.handleAdminLogin -> adminAuthManager.login
  69  |     const loginRespPromise = page.waitForResponse(resp => resp.url().includes('/api/auth/login'), {
  70  |       timeout: 15000,
  71  |     });
  72  |     await page.locator('#admin-login-form button[type="submit"]').click();
  73  |     let loginResp;
  74  |     try {
  75  |       loginResp = await loginRespPromise;
  76  |     } catch (e) {
  77  |       console.error('Login response never arrived.');
  78  |       console.error('Captured /api/* responses:', JSON.stringify(allResponses, null, 2));
  79  |       console.error('Captured console/pageerror messages:', consoleMsgs.slice(-30).join('\n  '));
  80  |       throw e;
  81  |     }
  82  |     expect(
  83  |       loginResp.status(),
  84  |       `Login should be 200. Captured responses: ${JSON.stringify(allResponses)}`
  85  |     ).toBe(200);
  86  | 
  87  |     // After login, the unihub_session entry MUST contain an `expiresAt`
  88  |     // field that AuthManager.loadSession will accept on the next reload.
  89  |     const stored = await page.evaluate(() => localStorage.getItem('unihub_session'));
  90  |     expect(stored, 'unihub_session must be written by adminAuthManager.login').not.toBeNull();
  91  |     const parsed = JSON.parse(stored);
  92  |     expect(parsed.token, 'session must contain a token').toBeTruthy();
  93  |     expect(parsed.user, 'session must contain a user object').toBeTruthy();
  94  |     // This is the regression assertion: without `expiresAt`, loadSession
  95  |     // wipes the session on the next reload.
> 96  |     expect(parsed.expiresAt, 'session must contain expiresAt (the bug)').toBeTruthy();
      |                                                                          ^ Error: session must contain expiresAt (the bug)
  97  |     expect(typeof parsed.expiresAt).toBe('number');
  98  |     expect(parsed.expiresAt).toBeGreaterThan(Date.now());
  99  | 
  100 |     // Force a page reload — this re-runs AuthManager.loadSession. Before the
  101 |     // fix, expiresAt was undefined, loadSession took the else branch, and
  102 |     // clearSession() removed unihub_session. After reload, api.getToken()
  103 |     // returned null and every admin-API call 401'd.
  104 |     await page.reload();
  105 |     await page.waitForTimeout(2000);
  106 | 
  107 |     // After reload, the token must still be present in localStorage so
  108 |     // api.getToken() (js/utils/api.js:100) returns it for admin-API calls.
  109 |     const storedAfterReload = await page.evaluate(() => localStorage.getItem('unihub_session'));
  110 |     expect(storedAfterReload, 'unihub_session must survive reload (the regression)').not.toBeNull();
  111 |     const parsedAfterReload = JSON.parse(storedAfterReload);
  112 |     expect(parsedAfterReload.token, 'token must remain after reload').toBeTruthy();
  113 |     expect(parsedAfterReload.token).toBe(parsed.token);
  114 | 
  115 |     // Reproduce the user-reported symptom: navigate to /admin/products.
  116 |     // renderAdminProducts calls api.admin.getProducts() which sends the
  117 |     // Authorization header from api.getToken(). Before the fix, it 401'd,
  118 |     // api.request threw `new Error('Session expired — please log in again')`,
  119 |     // and the catch block at pages.js:4515 logged
  120 |     // `pages: mergeLocalProducts failed: Error: Session expired — ...`.
  121 |     // We capture console messages and assert this string does NOT appear.
  122 |     const consoleWarnings = [];
  123 |     page.on('console', msg => {
  124 |       const text = msg.text();
  125 |       if (text.includes('Session expired') || text.includes('mergeLocalProducts failed')) {
  126 |         consoleWarnings.push(text);
  127 |       }
  128 |     });
  129 | 
  130 |     // The admin route guard (_requireAdmin) runs and admits the user via
  131 |     // either authManager.isAdmin() or adminAuthManager.isLoggedIn(). After
  132 |     // the fix BOTH paths work; before the fix neither did (token wiped
  133 |     // and the legacy slot was keyed differently).
  134 |     await page.goto('/#/admin/products');
  135 |     await page.waitForTimeout(3000);
  136 | 
  137 |     // No "Session expired" or mergeLocalProducts failure allowed.
  138 |     expect(
  139 |       consoleWarnings,
  140 |       `expected no session-expired warnings, got: ${JSON.stringify(consoleWarnings)}`
  141 |     ).toEqual([]);
  142 | 
  143 |     // The admin products page should render its title (sanity check that
  144 |     // the page actually rendered, not just that no error was logged).
  145 |     await expect(page.locator('h1, h2').filter({ hasText: /Product Management/i })).toBeVisible({
  146 |       timeout: 10000,
  147 |     });
  148 |   });
  149 | });
  150 | 
```