/**
 * BasePage - Abstract base class for all page components
 * Provides common functionality for page rendering and lifecycle management
 */
export class BasePage {
  /**
   * Get the main content element
   * @returns {HTMLElement}
   */
  getMainContent () {
    return document.getElementById('main-content');
  }

  /**
   * Hide original navbar and footer
   */
  hideOriginalNavFooter () {
    const navbar = document.getElementById('navbar-container');
    const footer = document.getElementById('footer');
    if (navbar) {navbar.style.display = 'none';}
    if (footer) {footer.style.display = 'none';}
  }

  /**
   * Show original navbar and footer
   */
  showOriginalNavFooter () {
    const navbar = document.getElementById('navbar-container');
    const footer = document.getElementById('footer');
    if (navbar) {navbar.style.display = 'block';}
    if (footer) {footer.style.display = 'block';}
    this.updateNavbar();
  }

  /**
   * Update navbar based on auth state
   */
  updateNavbar () {
    const authButtons = document.getElementById('navbar-auth-buttons');
    const userMenu = document.getElementById('navbar-user-menu');

    if (!authButtons || !userMenu) {return;}

    const isLoggedIn = this.isLoggedIn();

    if (isLoggedIn) {
      authButtons.style.display = 'none';
      userMenu.style.display = 'block';
    } else {
      authButtons.style.display = 'block';
      userMenu.style.display = 'none';
    }
  }

  /**
   * Check if user is logged in
   * @returns {boolean}
   */
  isLoggedIn () {
    const StorageManager = window.StorageManager;
    const STORAGE_KEYS = window.STORAGE_KEYS;
    return !!StorageManager.get(STORAGE_KEYS.CURRENT_USER, true);
  }

  /**
   * Get current user
   * @returns {Object|null}
   */
  getCurrentUser () {
    const StorageManager = window.StorageManager;
    const STORAGE_KEYS = window.STORAGE_KEYS;
    return StorageManager.get(STORAGE_KEYS.CURRENT_USER, true);
  }

  /**
   * Show loading state
   */
  showLoading () {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.style.display = 'block';
    }
  }

  /**
   * Hide loading state
   */
  hideLoading () {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }
  }

  /**
   * Scroll to top
   */
  scrollToTop () {
    window.scrollTo(0, 0);
  }

  /**
   * Render method to be implemented by subclasses
   * @param {any} params - Page parameters
   */
  render (params) {
    console.warn('render() method not implemented in subclass');
  }
}

export default BasePage;
