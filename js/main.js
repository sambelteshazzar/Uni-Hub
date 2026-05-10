/**
 * Uni-Hub Main Entry Point (ES6 Modules)
 * NOTE: This file is NOT the active entry point.
 * The app uses js/app-init.js instead, which loads modules
 * dynamically and exposes them to window globals.
 * This file is kept as a reference for a future ES6 migration.
 */

import { APP_NAME, APP_VERSION, STORAGE_KEYS, ROUTES } from './utils/constants.js';
import { StorageManager } from './utils/storage.js';
import { Validator } from './utils/validation.js';
import { Formatter } from './utils/formatters.js';
import { CryptoUtil } from './utils/crypto.js';
import { api } from './utils/api.js';
import { router } from './router.js';
import { app } from './app.js';
import { AuthManager, authManager } from './modules/auth.js';
import { ProductsManager, productsManager } from './modules/products.js';
import { CartManager, cartManager } from './modules/cart.js';
import { CheckoutManager, checkoutManager } from './modules/checkout.js';
import { PaymentManager, paymentManager } from './modules/payment.js';
import { DeliveryManager, deliveryManager } from './modules/delivery.js';
import { MessageManager, messageManager } from './modules/messaging.js';
import { ReviewManager, reviewManager } from './modules/reviews.js';
import { RegionManager, regionManager } from './modules/region.js';
import { SearchManager, searchManager } from './modules/search.js';
import { ToastManager, toastManager } from './modules/toast.js';
import { NotificationManager, notificationManager } from './modules/notifications.js';
import { ModalManager, modalManager } from './modules/modals.js';
import { Pages } from './pages/pages.js';
import { MessagesPage, messagesPage } from './pages/messages.js';

window.APP_NAME = APP_NAME;
window.APP_VERSION = APP_VERSION;
window.STORAGE_KEYS = STORAGE_KEYS;
window.ROUTES = ROUTES;

window.StorageManager = StorageManager;
window.Validator = Validator;
window.Formatter = Formatter;
window.CryptoUtil = CryptoUtil;
window.api = api;
window.router = router;
window.app = app;

window.authManager = authManager;
window.productsManager = productsManager;
window.cartManager = cartManager;
window.checkoutManager = checkoutManager;
window.paymentManager = paymentManager;
window.deliveryManager = deliveryManager;
window.messageManager = messageManager;
window.reviewManager = reviewManager;
window.regionManager = regionManager;
window.searchManager = searchManager;
window.toastManager = toastManager;
window.notificationManager = notificationManager;
window.modalManager = modalManager;

window.Pages = Pages;
window.messagesPage = messagesPage;

console.log(`✓ ${APP_NAME} v${APP_VERSION} modules loaded`);

document.addEventListener('DOMContentLoaded', async function () {
  const mainContent = document.getElementById('main-content');
  if (mainContent) {
    mainContent.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#050505;">
        <div style="text-align:center;">
          <div style="display:flex;gap:0.5rem;align-items:center;justify-content:center;margin:0 auto 1rem;">
            <span style="width:0.75rem;height:0.75rem;border-radius:50%;background:#6366f1;animation:bounce 1s infinite;"></span>
            <span style="width:0.75rem;height:0.75rem;border-radius:50%;background:#6366f1;animation:bounce 1s infinite 0.2s;"></span>
            <span style="width:0.75rem;height:0.75rem;border-radius:50%;background:#6366f1;animation:bounce 1s infinite 0.4s;"></span>
          </div>
          <p style="color:#a1a1aa;font-family:system-ui,sans-serif;">Loading Uni-Hub...</p>
        </div>
      </div>
      <style>@keyframes bounce{0%,100%{transform:translateY(-25%);animation-timing-function:cubic-bezier(0.8,0,1,1);}50%{transform:translateY(0);animation-timing-function:cubic-bezier(0,0,0.2,1);}}</style>
    `;
  }

  try {
    await app.init();
    Pages.registerRoutes();
    router.start();

    if (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#') {
      await Pages.renderLanding();
    }
  } catch (error) {
    console.error('App init failed:', error);
    if (typeof Pages !== 'undefined') {
      try {
        await Pages.renderLanding();
      } catch (e) {
        if (mainContent) {
          mainContent.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#050505;color:#fff;text-align:center;padding:2rem;">
              <div>
                <h2>⚠️ Something went wrong</h2>
                <p>Please refresh the page.</p>
                <button onclick="location.reload()" style="margin-top:1rem;padding:0.75rem 1.5rem;background:#6366f1;color:#fff;border:none;border-radius:0.5rem;cursor:pointer;font-weight:600;">
                  Refresh
                </button>
              </div>
            </div>
          `;
        }
      }
    }
  }
});
