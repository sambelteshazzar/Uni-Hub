/**
 * ============================================
 * Uni-Hub Main Entry Point (ES6 Modules)
 * ============================================
 * This file imports and initializes all application modules
 */

// Import constants
import {
  APP_NAME,
  APP_VERSION,
  STORAGE_KEYS,
  ROUTES,
} from './utils/constants.js';

// Import utils
import StorageManager from './utils/storage.js';
import Validator from './utils/validation.js';
import Formatter from './utils/formatters.js';
import CryptoUtil from './utils/crypto.js';

// Import API client
import api from './utils/api.js';

// Import router
import router from './router.js';

// Import app
import app from './app.js';

// Import managers
import authManager from './modules/auth.js';
import productsManager from './modules/products.js';
import cartManager from './modules/cart.js';
import checkoutManager from './modules/checkout.js';
import paymentManager from './modules/payment.js';
import deliveryManager from './modules/delivery.js';
import messagingManager from './modules/messaging.js';
import reviewManager from './modules/reviews.js';
import regionManager from './modules/region.js';
import searchManager from './modules/search.js';
import toastManager from './modules/toast.js';
import notificationManager from './modules/notifications.js';
import modalManager from './modules/modals.js';

// Import page classes
import Pages from './pages/pages.js';
import messagesPage from './pages/messages.js';

// Import admin modules
import adminAuthManager from './admin/admin-auth.js';
import adminProductsManager from './admin/admin-products.js';
import adminUsersManager from './admin/admin-users.js';
import adminOrdersManager from './admin/admin-orders.js';
import adminReportsManager from './admin/admin-reports.js';

// Export everything for global access (temporary for migration)
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
window.messageManager = messagingManager;
window.reviewManager = reviewManager;
window.regionManager = regionManager;
window.searchManager = searchManager;
window.toastManager = toastManager;
window.notificationManager = notificationManager;
window.modalManager = modalManager;

window.Pages = Pages;
window.messagesPage = messagesPage;

window.adminAuthManager = adminAuthManager;
window.adminProductsManager = adminProductsManager;
window.adminUsersManager = adminUsersManager;
window.adminOrdersManager = adminOrdersManager;
window.adminReportsManager = adminReportsManager;

console.log(`✓ ${APP_NAME} v${APP_VERSION} modules loaded`);

// Initialize app on page load
document.addEventListener('DOMContentLoaded', async function () {
  // Show loading state immediately
  const mainContent = document.getElementById('main-content');
  if (mainContent) {
    mainContent.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#050505;">
        <div style="text-align:center;">
          <div style="width:48px;height:48px;border:3px solid rgba(99,102,241,0.2);border-top-color:#6366f1;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 1rem;"></div>
          <p style="color:#a1a1aa;font-family:system-ui,sans-serif;">Loading Uni-Hub...</p>
        </div>
      </div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    `;
  }

  try {
    // Initialize the application
    await app.init();

    // Register all routes with the router
    Pages.registerRoutes();

    // Now start the router to handle initial page rendering based on hash
    router.start();

    // Default to landing page if no hash is present
    if (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#') {
      await Pages.renderLanding();
    }
  } catch (error) {
    console.error('App init failed:', error);
    // Fallback: show landing page even if init fails
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
