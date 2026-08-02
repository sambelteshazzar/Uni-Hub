// ============================================
// ROUTER - SPA PAGE NAVIGATION HANDLER
// ============================================

class Router {
  constructor() {
    this.currentRoute = null;
    this.currentParams = {};
    this.routes = new Map();
    this.history = [];
    this._started = false;
  }

  /**
   * Initialize router - listen to hash changes
   * Does NOT handle initial load - call start() after routes are registered
   */
  init() {
    window.addEventListener('hashchange', () => this.handleHashChange());
  }

  /**
   * Start the router - handle initial navigation after routes are registered
   */
  start() {
    if (this._started) {
      return;
    }
    this._started = true;
    this.handleHashChange();
  }

  /**
   * Handle hash change event
   */
  handleHashChange() {
    const hash = window.location.hash.slice(1) || '/';
    const [path, queryString] = hash.split('?');
    const params = this.parseQueryString(queryString || '');

    this.navigate(path, params, false);
  }

  /**
   * Parse query string to object
   */
  parseQueryString(queryString) {
    const params = {};
    if (!queryString) {
      return params;
    }

    const pairs = queryString.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key) {
        // URL hash params are attacker-controlled (anyone can craft a
        // link). Decode then HTML-escape so handlers that interpolate
        // these into innerHTML can't be XSS'd via the URL. Trying to
        // decodeURIComponent first means we escape the *actual* value,
        // not its URL-encoded form. SecurityUtils is loaded globally
        // by js/utils/security.js; if it's somehow missing we still
        // produce a string (the per-renderer escape helpers also
        // guard against this).
        let decoded;
        try {
          decoded = decodeURIComponent(value || '');
        } catch (e) {
          decoded = String(value || '');
        }
        if (typeof SecurityUtils !== 'undefined' && SecurityUtils.escapeHtml) {
          decoded = SecurityUtils.escapeHtml(decoded);
        }
        let decodedKey;
        try {
          decodedKey = decodeURIComponent(key);
        } catch (e) {
          decodedKey = String(key);
        }
        params[decodedKey] = decoded;
      }
    }
    return params;
  }

  /**
   * Register a route
   * @param {string} path - Route path
   * @param {Function} handler - Route handler function
   */
  register(path, handler) {
    this.routes.set(path, handler);
  }

  /**
   * Navigate to a route
   * @param {string} path - Route path
   * @param {Object} params - Route parameters
   * @param {boolean} updateHash - Whether to update the hash (default: true)
   */
  async navigate(path, params = {}, updateHash = true) {
    try {
      this.currentRoute = path;
      this.currentParams = params;

      // Find matching route (exact match first)
      let handler = this.routes.get(path);
      let parsedParams = {};

      // If no exact match, try pattern matching for dynamic routes
      if (!handler) {
        const match = this.findRouteMatch(path);
        if (match) {
          handler = match.handler;
          parsedParams = match.params;
        }
      }

      if (!handler) {
        console.error(`Route not found: ${path}`);
        await this.show404();
        return;
      }

      // Execute route handler
      await handler({ ...params, ...parsedParams });

      // Update URL hash if needed (only for forward navigation)
      if (updateHash) {
        this.updateHash(path, params);
      }

      // Scroll to top
      window.scrollTo(0, 0);

      // Focus management: move focus to main content for accessibility
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.focus();
      }
    } catch (error) {
      console.error('Navigation error:', error);
      this.showError(error.message);
    }
  }

  /**
   * Update URL hash using location.hash (triggers hashchange event)
   */
  updateHash(path, params = {}) {
    const queryString = Object.keys(params).length
      ? '?' + new URLSearchParams(params).toString()
      : '';
    const hash = path + queryString;

    // Use location.hash instead of pushState to trigger hashchange
    window.location.hash = hash;
  }

  /**
   * Find route match for dynamic routes
   * @param {string} path - Route path
   * @returns {Object|null}
   */
  findRouteMatch(path) {
    const pathParts = path.split('/').filter(Boolean);

    for (const [routePath, handler] of this.routes.entries()) {
      const routeParts = routePath.split('/').filter(Boolean);

      if (routeParts.length !== pathParts.length) {
        continue;
      }

      const params = {};
      let matches = true;

      for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i].startsWith(':')) {
          // Dynamic parameter
          const paramName = routeParts[i].slice(1);
          params[paramName] = decodeURIComponent(pathParts[i]);
        } else if (routeParts[i] !== pathParts[i]) {
          matches = false;
          break;
        }
      }

      if (matches) {
        return { handler, params };
      }
    }

    return null;
  }

  /**
   * Navigate back
   */
  back() {
    window.history.back();
  }

  /**
   * Navigate to a specific hash directly
   * @param {string} hash - Hash to navigate to
   */
  goToHash(hash) {
    window.location.hash = hash;
  }

  /**
   * Show 404 page
   */
  async show404() {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = `
        <div class="container" style="padding: 3rem 1rem; text-align: center; min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div style="font-size: 6rem; margin-bottom: 1rem;">404</div>
          <h1 style="font-size: 2rem; margin-bottom: 1rem;">Page Not Found</h1>
          <p style="color: var(--neutral-600); margin-bottom: 2rem;">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div style="display: flex; gap: 1rem;">
            <button class="btn btn-outline" onclick="router.back()">Go Back</button>
            <button class="btn btn-primary" onclick="router.goToHash('/')">Go Home</button>
          </div>
        </div>
      `;
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = `
        <div class="container" style="padding: 3rem 1rem; text-align: center;">
          <h1>Error</h1>
          <p>${message}</p>
          <button class="btn btn-primary" onclick="router.goToHash('/')">Go Home</button>
        </div>
      `;
    }
  }

  /**
   * Get current route
   */
  getCurrentRoute() {
    return this.currentRoute;
  }

  /**
   * Get route parameters
   */
  getParams() {
    return this.currentParams;
  }
}

// Create singleton instance
const router = new Router();

// Export for ES6 modules
export { Router, router };

// Make globally available for module scripts
if (typeof window !== 'undefined') {
  window.router = router;
}
