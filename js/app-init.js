// ============================================
// APP INITIALIZATION - Unified Module Loader
// ============================================
// Single entry point that loads all modules in dependency order
// Replaces the fragile polling-based module loader in index.html

// Set API_URL for deployed environments (no backend)
// On localhost, keep the default so backend calls work
if (typeof window !== 'undefined' && !window.API_URL) {
  if (
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1' &&
    window.location.protocol !== 'file:'
  ) {
    window.API_URL = 'https://uni-hub-bnxi.onrender.com/api';
  } else {
    window.API_URL = window.API_URL || 'https://uni-hub-bnxi.onrender.com/api';
  }
}

// GOOGLE_CLIENT_ID is now set in index.html before this script loads
// If not set, leave as empty string (Google Sign-In will be disabled)
if (typeof window !== 'undefined' && !window.GOOGLE_CLIENT_ID) {
  window.GOOGLE_CLIENT_ID = '';
}

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
    {
      name: 'sentry',
      file: 'js/utils/sentry.js',
      exposes: [
        'initSentry',
        'captureException',
        'captureMessage',
        'setUserContext',
        'clearUserContext',
        'addBreadcrumb',
        'startTransaction',
      ],
    },
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
    {
      name: 'notifications',
      file: 'js/modules/notifications.js',
      exposes: ['notificationManager'],
    },
  ],

  // Level 4: Admin modules
  admin: [
    { name: 'admin-auth', file: 'js/admin/admin-auth.js', exposes: ['adminAuthManager'] },
    {
      name: 'admin-products',
      file: 'js/admin/admin-products.js',
      exposes: ['adminProductsManager'],
    },
    { name: 'admin-users', file: 'js/admin/admin-users.js', exposes: ['adminUsersManager'] },
    { name: 'admin-orders', file: 'js/admin/admin-orders.js', exposes: ['adminOrdersManager'] },
    { name: 'admin-reports', file: 'js/admin/admin-reports.js', exposes: ['adminReportsManager'] },
    {
      name: 'admin-verifications',
      file: 'js/admin/admin-verifications.js',
      exposes: ['adminVerificationsManager'],
    },
  ],

  // Level 5: Pages (depends on everything)
  pages: [
    { name: 'bestbuy-landing', file: 'js/pages/bestbuy-landing.js', exposes: [] },
    {
      name: 'landing-page-methods',
      file: 'js/pages/landing-page-methods.js',
      exposes: ['LandingPageMethods'],
    },
    {
      name: 'universities-page',
      file: 'js/pages/universities-page.js',
      exposes: ['UniversitiesPage'],
    },
    { name: 'auth-pages', file: 'js/pages/auth-pages.js', exposes: ['AuthPageMethods'] },
    { name: 'browse-pages', file: 'js/pages/browse-pages.js', exposes: ['BrowsePageMethods'] },
    { name: 'policies-content', file: 'js/content/policies.js', exposes: ['POLICIES'] },
    { name: 'static-pages', file: 'js/pages/static-pages.js', exposes: ['StaticPageMethods'] },
    { name: 'pages', file: 'js/pages/pages.js', exposes: ['Pages'] },
    { name: 'bestbuy-auth-dashboard', file: 'js/pages/bestbuy-auth-dashboard.js', exposes: [] },
    { name: 'messages', file: 'js/pages/messages.js', exposes: ['messagesPage'] },
    { name: 'landing-page-loader', file: 'js/pages/landing-page-loader.js', exposes: [] },
  ],

  // Level 6: Globals exposure
  setup: [{ name: 'globals', file: 'js/setup/globals.js', exposes: [] }],
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
      // Dynamic import for ES6 modules. Append a version query so the
      // browser fetches a fresh copy after each code change (the static
      // <script src="js/app-init.js?v=N"> tag in index.html is the only
      // explicitly-versioned entry point; without a version query here a
      // user can keep getting a stale pages.js / browse-pages.js from
      // the HTTP cache long after a deploy). Bump this version whenever
      // any of the dynamically-imported module files change.
      const MODULE_VERSION = '21';
      await import(/* @vite-ignore */ `./${moduleDef.file.replace('js/', '')}?v=${MODULE_VERSION}`);

      // Verify module was exposed to window
      const isLoaded =
        moduleDef.exposes.length === 0 ||
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
    const results = await Promise.all(modules.map(module => this.loadModule(module)));

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
    console.log('🚀 Initializing JERTS CART modules...');

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
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) loadingScreen.style.display = 'none';
      return { success: false, error: error.message, errors: this.errors };
    }
  }

  /**
   * Initialize the application after modules are loaded
   */
  async initializeApp() {
    // Initialize Sentry first
    if (typeof window.initSentry === 'function') {
      window.initSentry();
      console.log('✓ Sentry initialized');
    }

    // Initialize app - use window.* because ES6 module scope doesn't have bare globals
    if (window.app && window.app.init) {
      await window.app.init();
      console.log('✓ App initialized');
    }

    // Register routes
    if (window.Pages && window.Pages.registerRoutes) {
      window.Pages.registerRoutes();
      try {
        window.Pages.initDarkMode();
      } catch (e) {
        console.warn('initDarkMode error:', e);
      }
      try {
        window.Pages.updateWishlistBadge();
      } catch (e) {
        console.warn('updateWishlistBadge error:', e);
      }
      console.log('✓ Routes registered');
    } else {
      console.error('✗ Pages class not found on window - routes NOT registered');
    }

    // Initialize and start router
    if (window.router) {
      if (window.router.init) {
        window.router.init();
      }
      if (window.router.start) {
        window.router.start();
      }
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
    // Only initialize admin managers when an admin session is present.
    // Otherwise the unauthenticated 401 floods the console on every page
    // load and triggers the "Session expired" toast.
    let hasAdminSession = false;
    try {
      const adminSession = window.localStorage?.getItem('unihub_admin_session');
      if (adminSession) {
        const parsed = JSON.parse(adminSession);
        hasAdminSession = !!(parsed && parsed.token && parsed.expiresAt > Date.now());
      }
    } catch (_) {
      /* no admin session */
    }

    const managers = [
      { name: 'authManager', load: m => m.loadUser?.() },
      { name: 'cartManager', load: m => m.load?.() },
      { name: 'searchManager', load: m => m.loadHistory?.() },
      { name: 'notificationManager', load: m => m.load?.() },
      { name: 'adminAuthManager', load: m => m.load?.(), requireAdmin: true },
      { name: 'adminUsersManager', load: m => m.loadUsers?.(), requireAdmin: true },
      { name: 'messageManager', load: m => m.init?.() },
    ];

    const promises = [];
    for (const { name, load, requireAdmin } of managers) {
      if (requireAdmin && !hasAdminSession) {
        continue;
      }
      const manager = window[name];
      if (manager && typeof manager === 'object') {
        try {
          const result = load(manager);
          if (result && typeof result.then === 'function') {
            promises.push(
              result.catch(err => console.warn(`Failed to reinitialize ${name}:`, err))
            );
          }
        } catch (error) {
          console.warn(`Failed to reinitialize ${name}:`, error);
        }
      }
    }

    await Promise.all(promises);
  }

  /**
   * Handle initial route based on URL hash.
   *
   * The router itself dispatches the URL on start(), but for the home
   * page (`/`) the legacy landing renderer is async (it polls for the
   * bestbuy-landing module to be ready), so we explicitly await it
   * here and hide the loading screen on the way through. For any other
   * route the router's handler is responsible.
   *
   * In history mode the URL lives in `pathname`, not `hash` — so we
   * check both.
   */
  async handleInitialRoute() {
    const hash = window.location.hash;
    const path = window.location.pathname;
    // We only need to explicitly render the home page here because the
    // landing-page renderer is async (it polls for the bestbuy-landing
    // module to be ready before injecting HTML). For every other route
    // the router's handler is responsible, and the router runs in
    // start() right before this method.
    //
    // In history mode the URL lives in pathname, hash is always empty:
    //   "/"  -> home
    //   "/browse" -> router handles it (browse page)
    // In hash mode the path is always "/", the route is in hash:
    //   "" / "#" / "#/" -> home
    //   "#/browse" -> router handles it (browse page)
    // So: home iff (no meaningful route in either representation).
    const hashIsRoute = hash && hash !== '#' && hash !== '#/' && hash !== '';
    const pathIsRoute = path && path !== '/' && path !== '';
    const isHome = !hashIsRoute && !pathIsRoute;

    if (isHome) {
      if (window.Pages && window.Pages.renderLanding) {
        await window.Pages.renderLanding();
        console.log('✓ Landing page rendered');
      }
    }

    // Hide loading screen after app is ready
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      loadingScreen.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 300);
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
