// ============================================
// APP INITIALIZATION - Unified Module Loader
// ============================================
// Single entry point that loads all modules in dependency order
// Replaces the fragile polling-based module loader in index.html

/**
 * Module dependency graph - defines loading order
 */
const MODULE_DEPENDENCIES = {
  // Level 1: Core utilities (no dependencies)
  core: [
    { name: 'constants', file: 'js/utils/constants.js', exposes: ['APP_NAME', 'STORAGE_KEYS'] },
    { name: 'storage', file: 'js/utils/storage.js', exposes: ['StorageManager'] },
    { name: 'icons', file: 'js/utils/icons.js', exposes: ['Icons'] },
    { name: 'validation', file: 'js/utils/validation.js', exposes: ['Validator'] },
    { name: 'formatters', file: 'js/utils/formatters.js', exposes: ['Formatter'] },
    { name: 'crypto', file: 'js/utils/crypto.js', exposes: ['CryptoUtil'] },
    { name: 'api', file: 'js/utils/api.js', exposes: ['api'] },
    { name: 'sentry', file: 'js/utils/sentry.js', exposes: ['sentryManager'], required: false },
    { name: 'footer', file: 'js/utils/footer.js', exposes: ['footerUtils'], required: false },
  ],

  // Level 2: Router and base app (depends on core)
  router: [
    { name: 'router', file: 'js/router.js', exposes: ['router'] },
    { name: 'app', file: 'js/app.js', exposes: ['app'] },
  ],

  // Level 3: Core modules (depends on router)
  modules: [
    { name: 'toast', file: 'js/modules/toast.js', exposes: ['toastManager'] },
    { name: 'modals', file: 'js/modules/modals.js', exposes: ['modalManager'] },
    { name: 'auth', file: 'js/modules/auth.js', exposes: ['authManager'] },
    { name: 'products', file: 'js/modules/products.js', exposes: ['productsManager'] },
    { name: 'cart', file: 'js/modules/cart.js', exposes: ['cartManager'] },
    { name: 'checkout', file: 'js/modules/checkout.js', exposes: ['checkoutManager'] },
    { name: 'payment', file: 'js/modules/payment.js', exposes: ['paymentManager'] },
    { name: 'delivery', file: 'js/modules/delivery.js', exposes: ['deliveryManager'] },
    { name: 'messaging', file: 'js/modules/messaging.js', exposes: ['messageManager'] },
    { name: 'reviews', file: 'js/modules/reviews.js', exposes: ['reviewManager'] },
    { name: 'region', file: 'js/modules/region.js', exposes: ['regionManager'] },
    { name: 'search', file: 'js/modules/search.js', exposes: ['searchManager'] },
    { name: 'notifications', file: 'js/modules/notifications.js', exposes: ['notificationManager'] },
  ],

  // Level 4: Admin modules
  admin: [
    { name: 'admin-auth', file: 'js/admin/admin-auth.js', exposes: ['adminAuthManager'] },
    { name: 'admin-products', file: 'js/admin/admin-products.js', exposes: ['adminProductsManager'] },
    { name: 'admin-users', file: 'js/admin/admin-users.js', exposes: ['adminUsersManager'] },
    { name: 'admin-orders', file: 'js/admin/admin-orders.js', exposes: ['adminOrdersManager'] },
    { name: 'admin-reports', file: 'js/admin/admin-reports.js', exposes: ['adminReportsManager'] },
  ],

  // Level 5: Pages (depends on everything)
  pages: [
  { name: 'landing-page-methods', file: 'js/pages/landing-page-methods.js', exposes: ['LandingPageMethods'] },
  { name: 'auth-pages', file: 'js/pages/auth-pages.js', exposes: ['AuthPageMethods'] },
  { name: 'browse-pages', file: 'js/pages/browse-pages.js', exposes: ['BrowsePageMethods'] },
  { name: 'static-pages', file: 'js/pages/static-pages.js', exposes: ['StaticPageMethods'] },
  { name: 'pages', file: 'js/pages/pages.js', exposes: ['Pages'] },
  { name: 'bestbuy-landing', file: 'js/pages/bestbuy-landing.js', exposes: [] },
  { name: 'bestbuy-auth-dashboard', file: 'js/pages/bestbuy-auth-dashboard.js', exposes: [] },
  { name: 'messages', file: 'js/pages/messages.js', exposes: ['messagesPage'] },
  { name: 'landing-page-loader', file: 'js/pages/landing-page-loader.js', exposes: [] },
],

  // Level 6: Globals exposure
  setup: [
    { name: 'globals', file: 'js/setup/globals.js', exposes: [] },
  ],
};

/**
 * Module Loader Class
 */
class ModuleLoader {
  constructor() {
    this.loadedModules = new Map();
    this.errors = [];
    this.loadStartTime = null;
  }

  /**
   * Load a single module as an ES6 module
   * @param {Object} moduleDef - Module definition
   * @returns {Promise<boolean>}
   */
  async loadModule(moduleDef) {
    try {
      // Dynamic import for ES6 modules
      await import(/* @vite-ignore */ `./${moduleDef.file.replace('js/', '')}`);

      // Verify module was exposed to window
      const isLoaded = moduleDef.exposes.length === 0 ||
        moduleDef.exposes.every(name => {
          const exists = typeof window[name] !== 'undefined';
          if (!exists) {
            console.warn(`Module ${moduleDef.name}: ${name} not found on window`);
          }
          return exists;
        });

      if (isLoaded) {
        this.loadedModules.set(moduleDef.name, true);
        console.log(`✓ Module loaded: ${moduleDef.name}`);
        return true;
      } else {
        throw new Error(`Module exposed variables not found: ${moduleDef.exposes.join(', ')}`);
      }
    } catch (error) {
      this.errors.push({ module: moduleDef.name, error: error.message });
      console.error(`✗ Failed to load ${moduleDef.name}:`, error);
      return false;
    }
  }

  /**
   * Load all modules in a dependency level
   * @param {Array} modules - Array of module definitions
   * @returns {Promise<boolean>}
   */
  async loadLevel(modules) {
    // Load all modules in this level concurrently
    const results = await Promise.all(
      modules.map(module => this.loadModule(module))
    );

    // Check if any critical module failed (non-optional)
    const allCriticalLoaded = results.every((result, index) => {
      if (!result && modules[index].required !== false) {
        return false;
      }
      return true;
    });

    return allCriticalLoaded;
  }

  /**
   * Initialize the entire application
   */
  async initialize() {
    this.loadStartTime = performance.now();
    console.log('🚀 Initializing Uni-Hub modules...');

    try {
      // Load modules in dependency order
      const levels = ['core', 'router', 'modules', 'admin', 'pages', 'setup'];

      for (const level of levels) {
        console.log(`Loading ${level} modules...`);
        const success = await this.loadLevel(MODULE_DEPENDENCIES[level]);

        if (!success && level === 'core') {
          throw new Error('Critical modules failed to load');
        }
      }

      const loadTime = (performance.now() - this.loadStartTime).toFixed(2);
      console.log(`✓ All modules loaded in ${loadTime}ms`);

      // Initialize the app
      await this.initializeApp();

      return { success: true, errors: this.errors };
    } catch (error) {
      console.error('Initialization failed:', error);
      return { success: false, error: error.message, errors: this.errors };
    }
  }

  /**
   * Initialize the application after modules are loaded
   */
  async initializeApp() {
    // Initialize app - use window.* because ES6 module scope doesn't have bare globals
    if (window.app && window.app.init) {
      await window.app.init();
      console.log('✓ App initialized');
    }

    // Register routes
    if (window.Pages && window.Pages.registerRoutes) {
      window.Pages.registerRoutes();
      try { window.Pages.initDarkMode(); } catch (e) { console.warn('initDarkMode error:', e); }
      try { window.Pages.updateWishlistBadge(); } catch (e) { console.warn('updateWishlistBadge error:', e); }
      console.log('✓ Routes registered');
    } else {
      console.error('✗ Pages class not found on window - routes NOT registered');
    }

    // Initialize and start router
    if (window.router) {
      if (window.router.init) { window.router.init(); }
      if (window.router.start) { window.router.start(); }
      console.log('✓ Router initialized and started');
    } else {
      console.error('✗ Router not found on window - router NOT started');
    }

    // Reinitialize managers that need DOM ready
    await this.reinitializeManagers();

    // Handle initial route
    await this.handleInitialRoute();
  }

  /**
   * Reinitialize managers that need DOM/content ready
   */
  async reinitializeManagers() {
    const managers = [
      { name: 'authManager', load: m => m.loadUser?.() },
      { name: 'cartManager', load: m => m.load?.() },
      { name: 'searchManager', load: m => m.loadHistory?.() },
      { name: 'notificationManager', load: m => m.load?.() },
      { name: 'adminAuthManager', load: m => m.load?.() },
      { name: 'adminUsersManager', load: m => m.loadUsers?.() },
      { name: 'messageManager', load: m => m.init?.() },
    ];

    const promises = [];
    for (const { name, load } of managers) {
      const manager = window[name];
      if (manager && typeof manager === 'object') {
        try {
          const result = load(manager);
          if (result && typeof result.then === 'function') {
            promises.push(result.catch(err => console.warn(`Failed to reinitialize ${name}:`, err)));
          }
        } catch (error) {
          console.warn(`Failed to reinitialize ${name}:`, error);
        }
      }
    }

    await Promise.all(promises);
  }

  /**
   * Handle initial route based on URL hash
   */
  async handleInitialRoute() {
    const hash = window.location.hash;

    if (!hash || hash === '#/' || hash === '#') {
      if (window.Pages && window.Pages.renderLanding) {
        await window.Pages.renderLanding();
        console.log('✓ Landing page rendered');
      }
    }

    // Hide loading screen after app is ready
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      loadingScreen.style.transition = 'opacity 0.3s ease';
      setTimeout(() => { loadingScreen.style.display = 'none'; }, 300);
    }
  }
}

// Create singleton
const moduleLoader = new ModuleLoader();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => moduleLoader.initialize());
} else {
  moduleLoader.initialize();
}

// Export for potential external use
export { ModuleLoader, moduleLoader };
