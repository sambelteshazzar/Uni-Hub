const { test, expect } = require('@playwright/test');

// Regression spec for the renderProductDetail stack-overflow loop.
//
// Pages.renderProductDetail is invoked both by the router (route
// handler for '/product/:id') and directly by product-card onclick
// handlers. In history mode the old guard read window.location.hash,
// which the router clears via replaceState() before the handler runs,
// so a direct call re-assigned the hash forever, firing popstate
// synchronously on every iteration (Maximum call stack size exceeded).
// See js/router.js isActive() and js/pages/pages.js renderProductDetail.

test.describe('Product detail navigation', () => {
  test('direct renderProductDetail call renders once without recursion', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(String(err && err.message)));

    await page.goto('/');
    await page.waitForFunction(
      () => window.Pages && window.productsManager && window.router,
      null,
      { timeout: 15000 }
    );

    const productId = await firstProductId(page);
    test.skip(!productId, 'no products available to test');

    // This is exactly what the product cards' onclick handlers do.
    await page.evaluate(id => window.Pages.renderProductDetail(id), productId);
    await page.waitForTimeout(1500);

    expect(pageErrors, 'uncaught page errors:\n' + pageErrors.join('\n')).toEqual([]);
    await expect(page).toHaveURL(new RegExp('/product/' + productId + '$'));
  });

  test('re-rendering the same product stays in place without recursion', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(String(err && err.message)));

    await page.goto('/');
    await page.waitForFunction(
      () => window.Pages && window.productsManager && window.router,
      null,
      { timeout: 15000 }
    );

    const productId = await firstProductId(page);
    test.skip(!productId, 'no products available to test');

    // Navigate, then call again the way toggleWishlistDetail does.
    await page.evaluate(id => window.Pages.renderProductDetail(id), productId);
    await page.waitForTimeout(1000);
    await page.evaluate(id => window.Pages.renderProductDetail(id), productId);
    await page.waitForTimeout(1000);

    expect(pageErrors, 'uncaught page errors:\n' + pageErrors.join('\n')).toEqual([]);
    await expect(page).toHaveURL(new RegExp('/product/' + productId + '$'));
  });
});

async function firstProductId(page) {
  return page.evaluate(() => {
    const mgr = window.productsManager;
    const all = (mgr && (mgr.products || (typeof mgr.getAll === 'function' ? mgr.getAll() : null))) || [];
    return Array.isArray(all) && all.length ? all[0].id : null;
  });
}
