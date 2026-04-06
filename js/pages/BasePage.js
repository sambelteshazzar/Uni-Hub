/**
 * BasePage - Abstract base class for all page components
 * Provides common functionality for page rendering and lifecycle management
 */
export class BasePage {
  /**
   * Get the main content element
   * @returns {HTMLElement}
   */
  protected getMainContent(): HTMLElement {
    return document.getElementById('main-content');
  }

  /**
   * Hide original navbar and footer
   */
  protected hideOriginalNavFooter(): void {
    const navbar = document.getElementById('navbar-container');
    const footer = document.getElementById('footer');
    if (navbar) navbar.style.display = 'none';
    if (footer) footer.style.display = 'none';
  }

  /**
   * Show original navbar and footer
   */
  protected showOriginalNavFooter(): void {
    const navbar = document.getElementById('navbar-container');
    const footer = document.getElementById('footer');
    if (navbar) navbar.style.display = 'block';
    if (footer) footer.style.display = 'block';
    this.updateNavbar();
  }

  /**
   * Update navbar based on auth state
   */
  protected updateNavbar(): void {
    const authButtons = document.getElementById('navbar-auth-buttons');
    const userMenu = document.getElementById('navbar-user-menu');

    if (!authButtons || !userMenu) return;

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
  protected isLoggedIn(): boolean {
    const StorageManager = (window as any).StorageManager;
    const STORAGE_KEYS = (window as any).STORAGE_KEYS;
    return !!StorageManager.get(STORAGE_KEYS.CURRENT_USER, true);
  }

  /**
   * Get current user
   * @returns {Object|null}
   */
  protected getCurrentUser(): Record<string, any> | null {
    const StorageManager = (window as any).StorageManager;
    const STORAGE_KEYS = (window as any).STORAGE_KEYS;
    return StorageManager.get(STORAGE_KEYS.CURRENT_USER, true);
  }

  /**
   * Show loading state
   */
  protected showLoading(): void {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.style.display = 'block';
    }
  }

  /**
   * Hide loading state
   */
  protected hideLoading(): void {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }
  }

  /**
   * Scroll to top
   */
  protected scrollToTop(): void {
    window.scrollTo(0, 0);
  }

  /**
   * Render method to be implemented by subclasses
   * @param {any} params - Page parameters
   */
  render(params?: any): void | Promise<void> {
    console.warn('render() method not implemented in subclass');
  }
}

export default BasePage;
