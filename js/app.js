// ============================================
// APP INITIALIZATION - MAIN APPLICATION ENTRY POINT
// ============================================

/**
 * Initialize the Uni-Hub application
 * Sets up global event listeners and initializes core modules
 */
class App {
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
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
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
      console.log('Uni-Hub is online');
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

// Create singleton instance
const app = new App();
