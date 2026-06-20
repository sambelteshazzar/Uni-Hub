const { chromium } = require('playwright');

const BASE = 'http://localhost:8000';
const issues = [];
const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

async function audit() {
  const browser = await chromium.launch({ headless: true, executablePath: CHROMIUM_PATH, args: ['--no-sandbox'] });

  const consoleErrors = [];
  function setupErrorTracking(page) {
    consoleErrors.length = 0;
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', err => { consoleErrors.push(`PAGE_ERROR: ${err.message}`); });
  }

  async function gotoPage(page, hash) {
    await page.goto(`${BASE}/#${hash}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
  }

  // ---- 1. LANDING PAGE (desktop) ----
  console.log('\n=== 1. LANDING PAGE (1280x900) ===');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  setupErrorTracking(page);
  await gotoPage(page, '/');
  await page.screenshot({ path: '/tmp/audit-1-landing.png' });

  const brokenImages = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img')).filter(img => !img.complete || img.naturalWidth === 0).map(img => (img.src || '').substring(0, 100))
  );
  if (brokenImages.length) { issues.push(`LANDING: ${brokenImages.length} broken images`); console.log(`BROKEN IMAGES: ${JSON.stringify(brokenImages)}`); }
  else console.log('Images OK');

  const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 50);
  if (overflow) { issues.push('LANDING: horizontal scroll'); console.log('HORIZONTAL SCROLL'); }
  else console.log('Layout OK');

  if (consoleErrors.length) { issues.push(`LANDING: ${consoleErrors.length} console errors`); console.log(`CONSOLE ERRORS: ${JSON.stringify(consoleErrors.slice(0, 8))}`); }
  else console.log('Console OK');

  // ---- 2. BROWSE PAGE ----
  console.log('\n=== 2. BROWSE PAGE ===');
  setupErrorTracking(page);
  await gotoPage(page, 'browse');
  await page.screenshot({ path: '/tmp/audit-2-browse.png' });

  const productCards = await page.locator('[class*="product-card"], [class*="ProductCard"]').count();
  console.log(`Product cards: ${productCards}`);

  const browseImgIssues = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img')).filter(img => !img.complete || img.naturalWidth === 0).map(img => (img.src || '').substring(0, 100))
  );
  if (browseImgIssues.length) { issues.push(`BROWSE: ${browseImgIssues.length} broken images`); console.log(`BROKEN IMAGES: ${JSON.stringify(browseImgIssues)}`); }
  else console.log('Images OK');

  if (consoleErrors.length) { issues.push(`BROWSE: ${consoleErrors.length} console errors`); console.log(`CONSOLE: ${JSON.stringify(consoleErrors.slice(0, 8))}`); }
  else console.log('Console OK');

  // ---- 3. LOGIN PAGE ----
  console.log('\n=== 3. LOGIN PAGE ===');
  setupErrorTracking(page);
  await gotoPage(page, 'login');
  await page.screenshot({ path: '/tmp/audit-3-login.png' });

  const hasEmail = await page.locator('input[type="email"], input[name="email"], input[placeholder*="mail"]').count();
  const hasPass = await page.locator('input[type="password"]').count();
  console.log(`Email input: ${hasEmail}, Password input: ${hasPass}`);
  if (!hasEmail || !hasPass) issues.push('LOGIN: missing email or password input');

  if (consoleErrors.length) { issues.push(`LOGIN: ${consoleErrors.length} console errors`); console.log(`CONSOLE: ${JSON.stringify(consoleErrors.slice(0, 5))}`); }
  else console.log('Console OK');

  // ---- 4. REGISTER PAGE ----
  console.log('\n=== 4. REGISTER PAGE ===');
  setupErrorTracking(page);
  await gotoPage(page, 'register');
  await page.screenshot({ path: '/tmp/audit-4-register.png' });

  const regInputs = await page.locator('input').count();
  console.log(`Form inputs: ${regInputs}`);
  if (regInputs < 3) issues.push('REGISTER: too few form inputs');

  if (consoleErrors.length) { issues.push(`REGISTER: ${consoleErrors.length} console errors`); console.log(`CONSOLE: ${JSON.stringify(consoleErrors.slice(0, 5))}`); }
  else console.log('Console OK');

  // ---- 5. MOBILE VIEWPORT ----
  console.log('\n=== 5. MOBILE (375x812) ===');
  await page.setViewportSize({ width: 375, height: 812 });
  setupErrorTracking(page);
  await gotoPage(page, '/');
  await page.screenshot({ path: '/tmp/audit-5-mobile.png' });

  const mobileOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 20);
  if (mobileOverflow) { issues.push('MOBILE LANDING: horizontal scroll'); console.log('HORIZONTAL SCROLL on mobile!'); }
  else console.log('Mobile landing OK');

  await gotoPage(page, 'browse');
  const mobileBrowseOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 20);
  if (mobileBrowseOverflow) { issues.push('MOBILE BROWSE: horizontal scroll'); console.log('HORIZONTAL SCROLL on mobile browse!'); }
  else console.log('Mobile browse OK');

  // ---- 6. ADMIN ----
  console.log('\n=== 6. ADMIN ===');
  await page.setViewportSize({ width: 1280, height: 900 });
  setupErrorTracking(page);
  await gotoPage(page, 'admin');
  await page.screenshot({ path: '/tmp/audit-6-admin.png' });
  const adminText = await page.evaluate(() => document.body.innerText.substring(0, 150));
  console.log(`Admin content: ${adminText.substring(0, 80)}...`);
  if (consoleErrors.length) { issues.push(`ADMIN: ${consoleErrors.length} console errors`); console.log(`CONSOLE: ${JSON.stringify(consoleErrors.slice(0, 5))}`); }
  else console.log('Console OK');

  // ---- 7. DARK MODE ----
  console.log('\n=== 7. DARK MODE ===');
  setupErrorTracking(page);
  await gotoPage(page, '/');
  const darkBtn = page.locator('[class*="dark"], [class*="theme"], .dark-mode-toggle, [aria-label*="dark" i], [aria-label*="theme" i]').first();
  const darkBtnVis = await darkBtn.isVisible().catch(() => false);
  console.log(`Dark toggle visible: ${darkBtnVis}`);
  if (darkBtnVis) {
    await darkBtn.click();
    await page.waitForTimeout(1000);
    const isDark = await page.evaluate(() => {
      const el = document.documentElement;
      return el.classList.contains('dark-mode') || el.classList.contains('dark') || el.getAttribute('data-theme') === 'dark';
    });
    console.log(`Dark mode active: ${isDark}`);
    if (!isDark) issues.push('DARK MODE: toggle clicked but dark class not applied');
    await page.screenshot({ path: '/tmp/audit-7-dark.png' });
  } else {
    issues.push('DARK MODE: toggle not found');
    console.log('Toggle not found');
  }

  // ---- 8. CART PAGE ----
  console.log('\n=== 8. CART ===');
  setupErrorTracking(page);
  await gotoPage(page, 'cart');
  await page.screenshot({ path: '/tmp/audit-8-cart.png' });
  if (consoleErrors.length) { issues.push(`CART: ${consoleErrors.length} console errors`); console.log(`CONSOLE: ${JSON.stringify(consoleErrors.slice(0, 5))}`); }
  else console.log('Console OK');

  // ---- 9. TABLET VIEWPORT ----
  console.log('\n=== 9. TABLET (768x1024) ===');
  await page.setViewportSize({ width: 768, height: 1024 });
  setupErrorTracking(page);
  await gotoPage(page, '/');
  await page.screenshot({ path: '/tmp/audit-9-tablet.png' });
  const tabletOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 20);
  if (tabletOverflow) { issues.push('TABLET: horizontal scroll'); console.log('HORIZONTAL SCROLL on tablet!'); }
  else console.log('Tablet OK');

  // ---- SUMMARY ----
  console.log('\n========== AUDIT SUMMARY ==========');
  if (issues.length === 0) {
    console.log('No issues found!');
  } else {
    console.log(`Found ${issues.length} issue(s):`);
    issues.forEach((iss, i) => console.log(`  ${i + 1}. ${iss}`));
  }

  await browser.close();
  return issues;
}

audit().then(issues => { console.log('\nAudit complete.'); process.exit(0); })
  .catch(err => { console.error('Audit failed:', err.message); process.exit(2); });
