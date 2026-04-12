// ============================================
// APP INITIALIZATION - MAIN APPLICATION ENTRY POINT
// ============================================

import toastManager from './modules/toast.js';
import productsManager from './modules/products.js';
import regionManager from './modules/region.js';
import modalManager from './modules/modals.js';
import cartManager from './modules/cart.js';
import Pages from './pages/pages.js';

/**
 * Initialize the Uni-Hub application
 * Sets up global event listeners and initializes core modules
 */
export class App {
  constructor() {
    this.initialized = false;
    this.version = '1.0.0';
  }

  /**
   * Initialize the application
   */
  async init() {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize core modules
      await this.initCoreModules();

      // Set up global event listeners
      this.setupEventListeners();

      // Initialize UI components
      this.initUIComponents();

      this.initialized = true;
      console.log(`Uni-Hub v${this.version} initialized successfully`);
    } catch (error) {
      console.error('Failed to initialize Uni-Hub:', error);
    }
  }

  /**
   * Initialize core modules
   */
  async initCoreModules() {
    // Initialize toast manager
    if (typeof toastManager !== 'undefined') {
      toastManager.init();
    }

    // Initialize products manager
    if (typeof productsManager !== 'undefined') {
      await productsManager.init();
    }

    // Initialize region manager
    if (typeof regionManager !== 'undefined') {
      await regionManager.init();
    }

    // Initialize modals
    if (typeof modalManager !== 'undefined') {
      modalManager.init();
    }
  }

  /**
   * Set up global event listeners
   */
  setupEventListeners() {
    // Handle online/offline status
    window.addEventListener('online', () => this.handleOnlineStatus(true));
    window.addEventListener('offline', () => this.handleOnlineStatus(false));

    // Handle beforeunload (save state)
    window.addEventListener('beforeunload', () => this.saveAppState());

    // Handle keyboard shortcuts
    document.addEventListener('keydown', e => this.handleKeyboardShortcuts(e));
  }

  /**
   * Initialize UI components
   */
  initUIComponents() {
    // Update cart badge
    if (typeof Pages !== 'undefined') {
      Pages.updateCartBadge();
      Pages.updateNavbar();
    }
  }

  /**
   * Handle online/offline status
   * @param {boolean} isOnline
   */
  handleOnlineStatus(isOnline) {
    if (isOnline) {
      // App online status logged
      // Sync any pending data
      this.syncPendingData();
    } else {
      console.log('Uni-Hub is offline - some features may be limited');
    }
  }

  /**
   * Handle keyboard shortcuts
   * @param {KeyboardEvent} e
   */
  handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + K - Search (future feature)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      // Future: Open search modal
    }

    // Escape - Close modals
    if (e.key === 'Escape') {
      // Close any open modals
      if (typeof modalManager !== 'undefined') {
        modalManager.closeAll();
      }
    }
  }

  /**
   * Save application state before unload
   */
  saveAppState() {
    // Save current state to sessionStorage
    const state = {
      timestamp: Date.now(),
      cart: cartManager?.getSummary?.() || null,
    };
    sessionStorage.setItem('uni-hub-state', JSON.stringify(state));
  }

  /**
   * Sync pending data when coming back online
   */
  async syncPendingData() {
    // Future: Sync any pending orders, cart updates, etc.
  }

  /**
   * Get app version
   * @returns {string}
   */
  getVersion() {
    return this.version;
  }

  /**
   * Check if app is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized;
  }
}

export default new App();
