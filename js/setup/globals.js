/* eslint-disable no-console */
// ============================================
// GLOBAL SETUP - Expose all modules and constants to window
// ============================================
// This file runs AFTER all modules load and ensures all managers
// and constants are available globally. This unifies the hybrid
// ES6/global module system into one cohesive global namespace.
//
// eslint-disable-next-line no-undef
// All variables below are defined in other module files and are assumed to exist at runtime

// ====================
// CONSTANTS - from constants.js
// ====================
// eslint-disable-next-line no-undef
if (typeof APP_NAME !== 'undefined') {
  window.APP_NAME = APP_NAME;
}
// eslint-disable-next-line no-undef
if (typeof APP_VERSION !== 'undefined') {
  window.APP_VERSION = APP_VERSION;
}
// eslint-disable-next-line no-undef
if (typeof STORAGE_KEY_PREFIX !== 'undefined') {
  window.STORAGE_KEY_PREFIX = STORAGE_KEY_PREFIX;
}
// eslint-disable-next-line no-undef
if (typeof STORAGE_KEYS !== 'undefined') {
  window.STORAGE_KEYS = STORAGE_KEYS;
}
// eslint-disable-next-line no-undef
if (typeof API_ENDPOINTS !== 'undefined') {
  window.API_ENDPOINTS = API_ENDPOINTS;
}
// eslint-disable-next-line no-undef
if (typeof PRODUCT_CONDITIONS !== 'undefined') {
  window.PRODUCT_CONDITIONS = PRODUCT_CONDITIONS;
}
// eslint-disable-next-line no-undef
if (typeof CATEGORIES !== 'undefined') {
  window.CATEGORIES = CATEGORIES;
}
// eslint-disable-next-line no-undef
if (typeof DELIVERY_MODES !== 'undefined') {
  window.DELIVERY_MODES = DELIVERY_MODES;
}
// eslint-disable-next-line no-undef
if (typeof PAYMENT_MODES !== 'undefined') {
  window.PAYMENT_MODES = PAYMENT_MODES;
}
// eslint-disable-next-line no-undef
if (typeof USER_ROLES !== 'undefined') {
  window.USER_ROLES = USER_ROLES;
}
// eslint-disable-next-line no-undef
if (typeof ORDER_STATUS !== 'undefined') {
  window.ORDER_STATUS = ORDER_STATUS;
}
// eslint-disable-next-line no-undef
if (typeof ROUTES !== 'undefined') {
  window.ROUTES = ROUTES;
}
// eslint-disable-next-line no-undef
if (typeof SORT_OPTIONS !== 'undefined') {
  window.SORT_OPTIONS = SORT_OPTIONS;
}
// eslint-disable-next-line no-undef
if (typeof VALIDATION_PATTERNS !== 'undefined') {
  window.VALIDATION_PATTERNS = VALIDATION_PATTERNS;
}
// eslint-disable-next-line no-undef
if (typeof ERROR_MESSAGES !== 'undefined') {
  window.ERROR_MESSAGES = ERROR_MESSAGES;
}
// eslint-disable-next-line no-undef
if (typeof SUCCESS_MESSAGES !== 'undefined') {
  window.SUCCESS_MESSAGES = SUCCESS_MESSAGES;
}
// eslint-disable-next-line no-undef
if (typeof PAGINATION !== 'undefined') {
  window.PAGINATION = PAGINATION;
}
// eslint-disable-next-line no-undef
if (typeof TIME !== 'undefined') {
  window.TIME = TIME;
}

// ====================
// UTILS - from utils/*.js
// ====================
// eslint-disable-next-line no-undef
if (typeof StorageManager !== 'undefined') {
  window.StorageManager = StorageManager;
}
// eslint-disable-next-line no-undef
if (typeof Validator !== 'undefined') {
  window.Validator = Validator;
}
// eslint-disable-next-line no-undef
if (typeof Formatter !== 'undefined') {
  window.Formatter = Formatter;
}
// eslint-disable-next-line no-undef
if (typeof CryptoUtil !== 'undefined') {
  window.CryptoUtil = CryptoUtil;
}
// eslint-disable-next-line no-undef
if (typeof api !== 'undefined') {
  window.api = api;
}

// ====================
// CORE - router and app
// ====================
// eslint-disable-next-line no-undef
if (typeof router !== 'undefined') {
  window.router = router;
}
// eslint-disable-next-line no-undef
if (typeof app !== 'undefined') {
  window.app = app;
}

// ====================
// CORE MANAGERS - from modules/*.js
// ====================
// eslint-disable-next-line no-undef
if (typeof authManager !== 'undefined') {
  window.authManager = authManager;
}
// eslint-disable-next-line no-undef
if (typeof productsManager !== 'undefined') {
  window.productsManager = productsManager;
}
// eslint-disable-next-line no-undef
if (typeof cartManager !== 'undefined') {
  window.cartManager = cartManager;
}
// eslint-disable-next-line no-undef
if (typeof checkoutManager !== 'undefined') {
  window.checkoutManager = checkoutManager;
}
// eslint-disable-next-line no-undef
if (typeof paymentManager !== 'undefined') {
  window.paymentManager = paymentManager;
}
// eslint-disable-next-line no-undef
if (typeof deliveryManager !== 'undefined') {
  window.deliveryManager = deliveryManager;
}
// eslint-disable-next-line no-undef
if (typeof messageManager !== 'undefined') {
  window.messageManager = messageManager;
}
// eslint-disable-next-line no-undef
if (typeof reviewManager !== 'undefined') {
  window.reviewManager = reviewManager;
}
// eslint-disable-next-line no-undef
if (typeof regionManager !== 'undefined') {
  window.regionManager = regionManager;
}
// eslint-disable-next-line no-undef
if (typeof searchManager !== 'undefined') {
  window.searchManager = searchManager;
}
// eslint-disable-next-line no-undef
if (typeof toastManager !== 'undefined') {
  window.toastManager = toastManager;
}
// eslint-disable-next-line no-undef
if (typeof notificationManager !== 'undefined') {
  window.notificationManager = notificationManager;
}
// eslint-disable-next-line no-undef
if (typeof modalManager !== 'undefined') {
  window.modalManager = modalManager;
}

// ====================
// ADMIN MANAGERS - from admin/*.js
// ====================
// eslint-disable-next-line no-undef
if (typeof adminAuthManager !== 'undefined') {
  window.adminAuthManager = adminAuthManager;
}
// eslint-disable-next-line no-undef
if (typeof adminProductsManager !== 'undefined') {
  window.adminProductsManager = adminProductsManager;
}
// eslint-disable-next-line no-undef
if (typeof adminUsersManager !== 'undefined') {
  window.adminUsersManager = adminUsersManager;
}
// eslint-disable-next-line no-undef
if (typeof adminOrdersManager !== 'undefined') {
  window.adminOrdersManager = adminOrdersManager;
}
// eslint-disable-next-line no-undef
if (typeof adminReportsManager !== 'undefined') {
  window.adminReportsManager = adminReportsManager;
}

// ====================
// PAGE CLASSES - from pages/*.js
// ====================
// eslint-disable-next-line no-undef
if (typeof Pages !== 'undefined') {
  window.Pages = Pages;
}
// eslint-disable-next-line no-undef
if (typeof BasePage !== 'undefined') {
  window.BasePage = BasePage;
}
// eslint-disable-next-line no-undef
if (typeof AuthPage !== 'undefined') {
  window.AuthPage = AuthPage;
}
// eslint-disable-next-line no-undef
if (typeof LandingPage !== 'undefined') {
  window.LandingPage = LandingPage;
}
// eslint-disable-next-line no-undef
if (typeof messagesPage !== 'undefined') {
  window.messagesPage = messagesPage;
}

console.log('✓ Global modules and constants initialized');
