// ============================================
// ROUTER - SPA PAGE NAVIGATION HANDLER
// ============================================
//
// Supports two URL strategies behind a feature flag (window.ROUTER_MODE):
//   - 'history' (default): clean URLs (/browse, /product/abc). Requires
//     the host to serve index.html for unknown paths (the dev server in
//     tools/dev-server.mjs and the vercel.json / render.yaml production
//     configs already do this).
//   - 'hash': legacy. URLs look like /#/browse, /#/product/abc. The hash
//     is never sent to the server so any static host works, including
//     file://.
//
// Both modes share the same route table, the same query-string parser,
// and the same handler contract. The mode only changes (a) how we
// listen for URL changes and (b) how we update the URL after a
// navigate() call. So existing call sites — most of which already
// pass '/path' (not '#/path') to router.navigate() — work unchanged.
//
// To roll back: set window.ROUTER_MODE = 'hash' before app-init.js
// loads (e.g. via a <script> tag injected by the host, or by editing
// the default below).

class Router {
  constructor() {
    this.currentRoute = null;
    this.currentParams = {};
    this.routes = new Map();
    this.history = [];
    this._started = false;
    this._mode = (typeof window !== 'undefined' && window.ROUTER_MODE) || 'history';
  }

  /**
   * Initialize router - listen for URL changes in the active mode.
   * Does NOT handle initial load - call start() after routes are registered.
   */
  init() {
    if (this._mode === 'history') {
      window.addEventListener('popstate', () => this.handleUrlChange());
      // Legacy `window.location.hash = '#/foo'` assignments in
      // history mode: the browser updates the hash and fires
      // hashchange (it does not fire popstate). Route those too so
      // the 36+ call sites throughout the codebase keep working
      // without changes.
      window.addEventListener('hashchange', () => this.handleUrlChange());
      // Intercept <a href="#/..."> clicks and route them through
      // navigate() so the URL stays clean. Without this, the legacy
      // hash hrefs sprinkled across the codebase would silently break
      // the app on click (the hash would change but the router
      // wouldn't fire). We only intercept in history mode; in hash
      // mode the browser's default location.hash change is what we
      // already listen for.
      document.addEventListener('click', e => this._interceptHashClick(e));
    } else {
      window.addEventListener('hashchange', () => this.handleUrlChange());
    }
  }

  /**
   * Click handler that turns <a href="#/foo"> clicks into router
   * navigations under history mode. Same-origin only. Modifier keys
   * (cmd/ctrl/shift/middle-click) and target="_blank" defer to the
   * browser default. The href's leading '#' (with optional '/') is
   * normalized to a clean pathname.
   */
  _interceptHashClick(e) {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a) return;
    if (a.target && a.target !== '_self') return;
    if (a.hasAttribute('download')) return;
    const href = a.getAttribute('href') || '';
    if (!href.startsWith('#/')) return;
    e.preventDefault();
    const path = href.replace(/^#\/?/, '/');
    this.navigate(path);
  }

  /**
   * Start the router - handle initial navigation after routes are registered.
   *
   * If the page was loaded at a clean URL like /browse (no hash), the
   * server's SPA fallback returned index.html, and we now need to render
   * that route. If the page was loaded at /#/browse (legacy hash URL),
   * the hashchange handler isn't fired for the initial state, so we
   * trigger handleUrlChange() ourselves.
   */
  start() {
    if (this._started) {
      return;
    }
    this._started = true;
    this.handleUrlChange();
  }

  /**
   * Handle a URL change. Reads from either the pathname (history) or
   * the hash (legacy) depending on the active mode, and dispatches
   * to navigate().
   *
   * In history mode we also accept a '#/foo' hash as a route signal:
   * legacy `window.location.hash = '#/foo'` assignments from across
   * the codebase put the route in the hash while the pathname stays
   * stale. Without this fallback, those calls would not navigate.
   */
  handleUrlChange() {
    let path, queryString;
    const hash = window.location.hash;
    if (this._mode === 'history') {
      // Prefer a route-like hash (e.g. '#/foo') over the pathname.
      // The hash is the legacy call-site signal; the pathname is
      // either the real history-mode route or a stale leftover.
      if (hash && /^#\//.test(hash)) {
        [path, queryString] = hash.slice(1).split('?');
        // Clean the URL bar. Use replaceState (not pushState) so we
        // don't pollute the back stack with a redundant entry.
        if (typeof history !== 'undefined' && history.replaceState) {
          const clean = path + (queryString ? '?' + queryString : '');
          history.replaceState({}, '', clean);
        }
      } else {
        path = window.location.pathname || '/';
        queryString = window.location.search ? window.location.search.slice(1) : '';
      }
    } else {
      const stripped = hash.slice(1) || '/';
      [path, queryString] = stripped.split('?');
    }
    const params = this.parseQueryString(queryString || '');
    this.navigate(path, params, false);
  }

  /**
   * Parse query string to object.
   *
   * Same XSS hardening as the original router: hash params are
   * attacker-controlled (anyone can craft a link). With history mode the
   * same applies to query strings on the URL bar, so we HTML-escape
   * every decoded value before storing.
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
   * Register a route.
   */
  register(path, handler) {
    this.routes.set(path, handler);
  }

  /**
   * Navigate to a route.
   *
   * `path` is the same string in both modes (e.g. '/browse'). It is
   * resolved against the route table (with :param matching) exactly
   * as before. updateHash/updateUrl controls whether we also push the
   * new URL to the address bar.
   */
  async navigate(path, params = {}, updateUrl = true) {
    try {
      this.currentRoute = path;
      this.currentParams = params;

      // Find matching route (exact match first)
      let handler = this.routes.get(path);
      let parsedParams = {};

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

      await handler({ ...params, ...parsedParams });

      if (updateUrl) {
        this.updateUrl(path, params);
      }

      window.scrollTo(0, 0);

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
   * Update the address bar.
   *
   * History mode uses pushState so the URL stays clean and the page
   * doesn't reload. Hash mode keeps the legacy location.hash assignment
   * (which fires hashchange and re-runs through this method, but the
   * navigate() call from handleUrlChange passes updateUrl=false so we
   * don't loop).
   *
   * Note: window.location.hash = '#/foo' goes through this method and
   * is normalized here, so legacy callers keep working.
   */
  updateUrl(path, params = {}) {
    const queryString = Object.keys(params).length
      ? '?' + new URLSearchParams(params).toString()
      : '';
    const target = path + queryString;

    if (this._mode === 'history') {
      // Avoid spamming history with the same URL on every render.
      if (window.location.pathname + window.location.search !== target) {
        window.history.pushState({}, '', target);
      }
    } else {
      // Strip a leading '#' if a legacy caller passed '#/foo' as path.
      const hash = target.replace(/^#/, '');
      if (window.location.hash !== '#' + hash) {
        window.location.hash = hash;
      }
    }
  }

  /**
   * Find route match for dynamic routes.
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
   * Navigate back. With history mode this is just history.back() — the
   * popstate listener picks up the change. With hash mode we keep the
   * legacy behavior.
   */
  back() {
    if (this._mode === 'history') {
      window.history.back();
    } else {
      window.history.back();
    }
  }

  /**
   * Legacy helper for callers that pass a hash string like '#/browse'.
   * With history mode we map it to a clean pathname; with hash mode it
   * goes through the original location.hash assignment.
   */
  goToHash(hash) {
    if (this._mode === 'history') {
      // Strip the leading '#' (and any leading '/') so /#/browse → /browse.
      const target = String(hash || '').replace(/^#\/?/, '/');
      this.navigate(target);
    } else {
      window.location.hash = hash;
    }
  }

  /**
   * Show 404 page. The link targets in the rendered error page are
   * mode-aware so they always work in both routing strategies.
   */
  async show404() {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      const render =
        typeof AdminUI !== 'undefined' && AdminUI.renderErrorPage
          ? AdminUI.renderErrorPage
          : props =>
              `<div class="adm-auth"><aside class="adm-auth-side"><div class="adm-auth-brand"><div class="adm-auth-brand-mark">J</div><div class="adm-auth-brand-name">JERTS CART</div></div></aside><main class="adm-auth-form"><div class="adm-auth-form-inner"><h2 class="adm-auth-form-title" style="font-size:48px;font-weight:700;margin:0 0 8px;letter-spacing:-0.02em;">${props.code || '404'}</h2><h3 class="adm-auth-form-title">${props.title || 'Page not found'}</h3><p class="adm-auth-form-sub">${props.body || ''}</p><div style="margin-top:24px;"><a href="${(props.primaryAction && props.primaryAction.href) || this._url('/')}" class="adm-btn adm-btn--primary">${(props.primaryAction && props.primaryAction.label) || 'Go home'}</a></div></main></div>`;

      const isAdmin =
        typeof adminAuthManager !== 'undefined' &&
        adminAuthManager.isLoggedIn &&
        adminAuthManager.isLoggedIn();
      const isUser =
        typeof authManager !== 'undefined' && authManager.isLoggedIn && authManager.isLoggedIn();
      const primaryAction = isAdmin
        ? { label: 'Back to admin dashboard', href: this._url('/admin') }
        : isUser
          ? { label: 'Back to my dashboard', href: this._url('/dashboard') }
          : { label: 'Go to marketplace', href: this._url('/') };

      mainContent.innerHTML = render({
        code: '404',
        title: 'Page not found',
        body: 'The page you are looking for does not exist or has been moved.',
        primaryAction,
      });
    }
  }

  async showError(message) {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      const render =
        typeof AdminUI !== 'undefined' && AdminUI.renderErrorPage
          ? AdminUI.renderErrorPage
          : props =>
              `<div class="adm-auth"><aside class="adm-auth-side"><div class="adm-auth-brand"><div class="adm-auth-brand-mark">J</div><div class="adm-auth-brand-name">JERTS CART</div></div></aside><main class="adm-auth-form"><div class="adm-auth-form-inner"><h2 class="adm-auth-form-title" style="font-size:48px;font-weight:700;margin:0 0 8px;letter-spacing:-0.02em;">${props.code || '500'}</h2><h3 class="adm-auth-form-title">${props.title || 'Error'}</h3><p class="adm-auth-form-sub">${props.body || ''}</p><div style="margin-top:24px;"><a href="${(props.primaryAction && props.primaryAction.href) || this._url('/admin')}" class="adm-btn adm-btn--primary">${(props.primaryAction && props.primaryAction.label) || 'Back to dashboard'}</a></div></main></div>`;
      mainContent.innerHTML = render({
        code: '500',
        title: 'Something went wrong',
        body: message || 'An unexpected error occurred. Please try again.',
        primaryAction: { label: 'Back to dashboard', href: this._url('/admin') },
      });
    }
  }

  getCurrentRoute() {
    return this.currentRoute;
  }

  getParams() {
    return this.currentParams;
  }

  /**
   * Build a URL for a path that's valid in the active mode. Public so
   * templates can use it for href values that work in both modes.
   */
  url(path) {
    return this._url(path);
  }

  _url(path) {
    if (this._mode === 'history') {
      return String(path || '/').replace(/^#?\/?/, '/');
    }
    const stripped = String(path || '/').replace(/^#?\/?/, '/');
    return '#' + stripped;
  }
}

// Create singleton instance
const router = new Router();

// Compatibility shim for legacy `window.location.hash = '#/foo'`
// assignments in history mode.
//
// Location.hash is non-configurable in modern browsers, so we can't
// install a setter on it. Instead we listen for `hashchange` events
// in history mode and route any '#/foo' hash the same way we'd route
// a pathname. The native hash assignment changes the URL bar and
// fires hashchange; our handler then dispatches the path.
//
// Limitation: external code reading location.hash right after a
// legacy assignment sees the hash. That's fine for our codebase —
// the 36 legacy call sites don't read the hash back.

// Export for ES6 modules
export { Router, router };

// Make globally available for module scripts
if (typeof window !== 'undefined') {
  window.router = router;
}
