/* exported api */
// ============================================
// API CLIENT FOR BACKEND COMMUNICATION
// ============================================

class API {
  constructor (baseURL = null) {
    let envAPI = '';
    try { envAPI = import.meta.env.VITE_API_URL || ''; } catch (e) { /* VITE_API_URL only available in Vite dev */ }
    this.baseURL =
      baseURL || (typeof window !== 'undefined' && window.API_URL) || envAPI || 'https://uni-hub-bnxi.onrender.com/api';
    this._isStaticDeploy = false;
    this._backendProbed = false;
    this._backendReachable = null;
    // Origin of the API server (this.baseURL minus the /api... path).
    // Used to hit /api/auth/csrf-token which lives at the same origin
    // as the rest of the backend but outside the /api path prefix.
    // Constructed from a URL object so variations like /api/v2 or
    // trailing slashes don't break.
    try {
      const u = new URL(this.baseURL);
      this._apiOrigin = u.origin;
    } catch (e) {
      this._apiOrigin = this.baseURL.replace(/\/api\/?$/, '').replace(/\/$/, '');
    }
    if (typeof window !== 'undefined' && !this._isStaticDeploy) {
      this._probeBackend();
    }
    this.timeout = 30000;
  }

  _csrfUrl () {
    return `${this._apiOrigin}/api/auth/csrf-token`;
  }

  get isStaticDeploy () {
    if (this._isStaticDeploy) {return true;}
    if (this._backendProbed && this._backendReachable === false) {return true;}
    return false;
  }

  _probeBackend (attempt = 1) {
    const maxAttempts = 3;
    const timeoutMs = attempt === 1 ? 8000 : 10000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    fetch(this._csrfUrl(), {
      signal: controller.signal,
      credentials: 'include',
    })
      .then(res => {
        clearTimeout(timeout);
        this._backendReachable = res.ok;
        this._backendProbed = true;
      })
      .catch(() => {
        clearTimeout(timeout);
        if (attempt < maxAttempts) {
          setTimeout(() => this._probeBackend(attempt + 1), 2000);
        } else {
          this._backendReachable = false;
          this._backendProbed = true;
        }
      });
  }

  async fetchCsrfToken () {
    if (this.isStaticDeploy) {
      return null;
    }
    if (this._csrfToken) {return this._csrfToken;}
    if (this._csrfPromise) {return this._csrfPromise;}

    const csrfPromise = fetch(this._csrfUrl(), {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.csrfToken) {
          this._csrfToken = data.csrfToken;
          return this._csrfToken;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => {
        if (this._csrfPromise === csrfPromise) {
          this._csrfPromise = null;
        }
      });

    this._csrfPromise = csrfPromise;
    return csrfPromise;
  }

  /**
   * Read a stored session object ({ token, user, expiresAt }) if present
   * and unexpired. Returns null otherwise.
   */
  _readSession (storageKey) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {return null;}
      const parsed = JSON.parse(raw);
      if (parsed && parsed.token && parsed.expiresAt > Date.now()) {
        return parsed;
      }
    } catch (_e) { /* malformed session — treat as absent */ }
    return null;
  }

  /**
   * Get the auth token appropriate for a request.
   *
   * Sessions are SEPARATE: the admin panel authenticates from
   * 'unihub_admin_session' and the main app from 'unihub_session'
   * (AuthManager). Admin credentials must never leak into user-context
   * requests and vice versa.
   */
  getTokenFor (url) {
    const path = String(url || '')
      .replace(/^https?:\/\/[^/]+/i, '')
      .replace(this.baseURL || '', '')
      .split('?')[0];
    const inAdminPanel = typeof location !== 'undefined' &&
      String(location.hash || '').startsWith('#/admin');
    const isAdminUrl = /^\/(admin|users|verification)\b/.test(path) ||
      path.startsWith('/payment/refund');

    if (isAdminUrl || inAdminPanel) {
      // Prefer the dedicated admin session; fall back to the user session
      // only when no separate admin login exists (legacy single-session).
      return this._readSession('unihub_admin_session')?.token ??
        this._readSession('unihub_session')?.token ?? null;
    }
    return this._readSession('unihub_session')?.token ?? null;
  }

  /**
   * Get auth token for the current (user) context.
   * Note: auth.js uses 'unihub_session', NOT 'unihub_current_user'.
   */
  getToken () {
    return this._readSession('unihub_session')?.token ?? null;
  }

  /**
   * Make a fetch request with error handling and auth
   * @param {string} url - Full URL or endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise}
   */
  async request (url, options = {}) {
    if (this.isStaticDeploy) {
      return { success: false, data: null, isOffline: true };
    }
    try {
      const fullUrl = url.startsWith('http') ? url : this.baseURL + url;

      const token = this.getTokenFor(fullUrl);

      const isMutating = options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method.toUpperCase());
      let csrfHeaders = {};
      if (isMutating) {
        const csrfToken = await this.fetchCsrfToken();
        if (csrfToken) {
          csrfHeaders = { 'X-CSRF-Token': csrfToken };
        }
      }

      const { headers: _optHeaders, ...safeOptions } = options;
      const response = await Promise.race([
        fetch(fullUrl, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...csrfHeaders,
            ..._optHeaders,
          },
          ...(isMutating ? { credentials: 'include' } : {}),
          ...safeOptions,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.timeout),
        ),
      ]);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Don't trigger session-expired flow for auth endpoints — a 401
        // from /auth/login (wrong password) or /auth/me (token check on
        // first load) is a normal error, not an expired-session signal.
        // Clearing the session there fires a misleading "Session expired"
        // toast and kicks the user to the login screen on a typo.
        const isAuthEndpoint = url.startsWith('/auth/');
        if (response.status === 401 && typeof authManager !== 'undefined' && authManager.clearSession && !isAuthEndpoint) {
          authManager.clearSession();
          const e = new Error('Session expired — please log in again');
          e.status = 401;
          e.isAuthError = true;
          throw e;
        }
        if (response.status === 403 && data.error && data.error.toLowerCase().includes('csrf')) {
          this._csrfToken = null;
          const retryCsrfToken = await this.fetchCsrfToken();
          if (retryCsrfToken) {
            const retryResponse = await fetch(fullUrl, {
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                'X-CSRF-Token': retryCsrfToken,
                ...options.headers,
              },
              credentials: 'include',
              ...safeOptions,
            });
            const retryData = await retryResponse.json().catch(() => ({}));
            if (!retryResponse.ok) {
              const error = new Error(retryData.error || retryResponse.statusText);
              error.status = retryResponse.status;
              error.data = retryData;
              throw error;
            }
            return retryData;
          }
        }

        const error = new Error(data.error || response.statusText);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        return { success: false, data: null, isOffline: true };
      }

      if (error.message === 'Request timeout') {
        return { success: false, data: null, isOffline: true };
      }

      console.error('API Error:', error);

      throw error;
    }
  }

  /**
   * GET request
   * @param {string} url - Endpoint
   * @param {Object} params - Query parameters
   */
  async get (url, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    return this.request(fullUrl, { method: 'GET' });
  }

  /**
   * POST request
   * @param {string} url - Endpoint
   * @param {Object} data - Request body
   */
  async post (url, data = {}) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT request
   */
  async put (url, data = {}) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request. `body` is optional; existing zero-body callers are
   * unaffected (verified: all in-repo call sites pass URL only).
   */
  async delete (url, body) {
    return this.request(url, {
      method: 'DELETE',
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }

  /**
   * Load JSON file from local storage (fallback for mock data)
   * @param {string} filePath
   */
  _jsonFallbacks = {
    'data/config.json': { universities: [], categories: [], conditions: [], deliveryModes: [], paymentModes: [] },
    'data/products.json': { products: [] },
    'data/regions.json': { regions: [] },
    'data/users.json': { users: [] },
    'data/categories.json': { categories: [] },
  };

  async loadJSON (filePath) {
    try {
      // Cache-bust: append a version query so the browser fetches a fresh
      // copy after updates. Bump JSON_VERSION whenever any data/*.json
      // file changes.
      const JSON_VERSION = '2';
      const response = await fetch(`${filePath}?v=${JSON_VERSION}`);
      if (!response.ok) {
        const fallback = this._jsonFallbacks[filePath];
        if (fallback) {
          return fallback;
        }
        throw new Error(`Failed to load ${filePath}`);
      }
      return await response.json();
    } catch (error) {
      const fallback = this._jsonFallbacks[filePath];
      if (fallback) {
        return fallback;
      }
      throw error;
    }
  }

  // ============================================
  // API Helper Methods for Common Operations
  // ============================================

  /**
   * Auth API
   */
  auth = {
    register: data => this.post('/auth/register', data),
    login: (email, password) => this.post('/auth/login', { email, password }),
    verifyMfa: (challengeId, code) => this.post('/auth/mfa/verify', { challengeId, code }),
    getMe: () => this.get('/auth/me'),
    updateProfile: data => this.put('/auth/profile', data),
    changePassword: (currentPassword, newPassword) =>
      this.put('/auth/change-password', { currentPassword, newPassword }),
    listUniversities: () => this.get('/auth/universities'),
    setUniversity: university => this.post('/auth/me/university', { university }),
  };

  /**
   * Products API
   *
   * Every helper that interpolates an id (or other backend-supplied
   * string) into a URL path segment uses encodeURIComponent on it
   * (AGENTS.md: do not bypass js/utils/api.js). For legitimate UUIDs
   * encodeURIComponent is a no-op, so there is no behavioural
   * change for valid input. The guard matters when a caller passes
   * 'undefined' / 'null' (literal strings), '/', '%', or a tampered
   * value: encodeURIComponent turns '/' into '%2F' so it stays inside
   * one path segment and can't reach another route handler, and the
   * backend's validateObjectId (product.routes.js:27-37,
   * admin.routes.js) then rejects it as 400 'Invalid ID format'.
   */
  products = {
    getAll: params => this.get('/products', params),
    getById: id => this.get(`/products/${encodeURIComponent(id)}`),
    create: data => this.post('/products', data),
    update: (id, data) => this.put(`/products/${encodeURIComponent(id)}`, data),
    delete: id => this.delete(`/products/${encodeURIComponent(id)}`),
    getMyProducts: status => this.get('/products/seller/my-products', { status }),
  };

  /**
   * Orders API — see products block for the encodeURIComponent rationale.
   * `track` takes a trackingNumber rather than an id; tracking numbers may
   * contain alphanumerics and dashes (UUIDs and similar) and the encoder
   * is still correct for them. It is REQUIRED for any value that might
   * otherwise contain reserved URL characters (rare but possible).
   */
  orders = {
    create: data => this.post('/orders', data),
    getMyOrders: () => this.get('/orders/my-orders'),
    getById: id => this.get(`/orders/${encodeURIComponent(id)}`),
    track: trackingNumber => this.get(`/orders/track/${encodeURIComponent(trackingNumber)}`),
    completePayment: (id, transactionId) =>
      this.post(`/orders/${encodeURIComponent(id)}/payment`, { transactionId }),
    cancel: id => this.put(`/orders/${encodeURIComponent(id)}/cancel`),
    updateStatus: (id, status, note) =>
      this.put(`/orders/${encodeURIComponent(id)}/status`, { status, note }),
    refund: (id, reason) =>
      this.put(`/orders/${encodeURIComponent(id)}/status`, { status: 'refunded', note: reason }),
  };

  /**
   * Verification API — `getStatus` interpolates two path params (studentId,
   * university). Both can legitimately be short alphanumeric strings (e.g.
   * ug, knust) but a user can supply arbitrary input via the public form,
   * encodeURIComponent keeps it inside one segment.
   */
  verification = {
    submit: data => this.post('/verification', data),
    getStatus: (studentId, university) =>
      this.get(
        `/verification/status/${encodeURIComponent(studentId)}/${encodeURIComponent(university)}`,
      ),
    getMyStatus: () => this.get('/verification/me'),
    /**
     * Multipart document upload (spec 2026-08-23). Mirrors upload()'s fetch
     * pattern: FormData must NOT get a manual Content-Type header — the
     * browser sets it with the correct boundary. request() cannot be used
     * here because it forces 'Content-Type: application/json' onto every
     * call and callers cannot unset it via the headers spread. CSRF is still
     * attached manually via fetchCsrfToken() (same as upload()) because
     * POST /verification is a CSRF-protected mutation.
     */
    submitDocuments: async formData => {
      if (this.isStaticDeploy) {
        return Promise.resolve({ success: false, data: null, isOffline: true });
      }
      const doPost = async csrfToken => {
        const fullUrl = this.baseURL + '/verification';
        const token = this.getTokenFor(fullUrl);
        return Promise.race([
          fetch(fullUrl, {
            method: 'POST',
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
            },
            credentials: 'include',
            body: formData,
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), this.timeout),
          ),
        ]);
      };
      const toJson = res =>
        res.json().catch(() => ({ success: false, error: 'Malformed server response' }));
      try {
        let res = await doPost(await this.fetchCsrfToken());
        if (res.status === 403) {
          const forbidden = await toJson(res);
          if (!String(forbidden.error || '').toLowerCase().includes('csrf')) {
            return forbidden;
          }
          // Stale CSRF token — mint a fresh one and retry once.
          this._csrfToken = null;
          res = await doPost(await this.fetchCsrfToken());
        }
        const data = await toJson(res);
        if (!res.ok) {
          return { ...data, success: false, error: data.error || res.statusText };
        }
        return data;
      } catch (error) {
        if (
          (error instanceof TypeError && error.message === 'Failed to fetch') ||
          error.message === 'Request timeout'
        ) {
          return { success: false, data: null, isOffline: true };
        }
        console.error('API Error:', error);
        return { success: false, error: error.message };
      }
    },
    getDocuments: id => this.get(`/verification/${encodeURIComponent(id)}/documents`),
    purgeDocuments: id => this.post(`/verification/${encodeURIComponent(id)}/purge-documents`),
    /**
     * Magic-link confirmation (2026-08-29). Public endpoint, the token in
     * the URL is the credential. We deliberately do NOT route this through
     * `this.get` because `getTokenFor` would otherwise attach the admin
     * session token (it matches /^\/verification\b/) — we want a clean,
     * unauthenticated request so the backend's public handler sees no
     * Authorization header.
     */
    confirm: async (token) => {
      if (this.isStaticDeploy) {
        return { success: false, data: null, isOffline: true };
      }
      try {
        const fullUrl = `${this.baseURL}/verification/confirm?token=${encodeURIComponent(token)}`;
        const response = await Promise.race([
          fetch(fullUrl, {
            method: 'GET',
            credentials: 'include',
            headers: { Accept: 'application/json' },
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 30000)),
        ]);
        const data = await response.json().catch(() => ({}));
        return {
          success: response.ok,
          status: response.status,
          data: data?.data ?? null,
          error: response.ok ? null : (data?.error || `HTTP ${response.status}`),
        };
      } catch (error) {
        console.error('API Error:', error);
        return { success: false, error: error.message };
      }
    },
  };

  /**
   * Users API — see products block for the encodeURIComponent rationale.
   * These three are admin-only on the backend (user.routes.js:7-9).
   */
  users = {
    getById: id => this.get(`/users/${encodeURIComponent(id)}`),
    getAll: params => this.get('/users', params), // Admin only
    update: (id, data) => this.put(`/users/${encodeURIComponent(id)}`, data), // Admin only
    delete: id => this.delete(`/users/${encodeURIComponent(id)}`), // Admin only
  };

  /**
   * Self-service account lifecycle (spec 2026-08-23).
   */
  account = {
    exportData: () => this.request('/users/me/export', { method: 'GET' }),
    deleteMe: (confirmText, password) => this.delete('/users/me', { confirmText, password }),
  };

  /**
   * Admin API — see products block for the encodeURIComponent rationale.
   * All :id-bearing routes now also enforce validateObjectId on the
   * backend (admin.routes.js), so the encoder here is the first line
   * of defense and the middleware the second — defense in depth.
   */
  admin = {
    login: (email, password) => this.post('/auth/login', { email, password }),
    getStats: () => this.get('/admin/stats'),
    getProducts: params => this.get('/admin/products', params),
    createProduct: data => this.post('/admin/products', data),
    updateProduct: (id, data) => this.put(`/admin/products/${encodeURIComponent(id)}`, data),
    getAnalytics: () => this.get('/admin/analytics'),
    deleteProduct: id => this.delete(`/admin/products/${encodeURIComponent(id)}`),
    getOrders: params => this.get('/admin/orders', params),
    getActivity: params => this.get('/admin/activity', params),
    getActivityStats: () => this.get('/admin/activity/stats'),
    getOnlineUsers: () => this.get('/admin/online-users'),
    approveProduct: id => this.put(`/admin/products/${encodeURIComponent(id)}/approve`),
    rejectProduct: (id, reason) =>
      this.put(`/admin/products/${encodeURIComponent(id)}/reject`, { reason }),
    banUser: (id, reason) =>
      this.put(`/admin/users/${encodeURIComponent(id)}/ban`, { action: 'ban', reason }),
    unbanUser: id => this.put(`/admin/users/${encodeURIComponent(id)}/ban`, { action: 'unban' }),
    getPendingVerifications: () => this.get('/verification/pending'),
    approveVerification: (id, notes) =>
      this.put(`/verification/${encodeURIComponent(id)}/approve`, { notes }),
    rejectVerification: (id, notes) =>
      this.put(`/verification/${encodeURIComponent(id)}/reject`, { notes }),
    // Payout approval queue (escrow Phase 3). Approve re-checks seller
    // funds server-side and writes the ledger entry; reject requires a
    // reason (>=3 chars) which is stored as failureReason.
    getPayouts: params => this.get('/admin/payouts', params),
    approvePayout: id => this.put(`/admin/payouts/${encodeURIComponent(id)}/approve`),
    rejectPayout: (id, reason) =>
      this.put(`/admin/payouts/${encodeURIComponent(id)}/reject`, { reason }),
  };

  wishlist = {
    getAll: () => this.get('/wishlist'),
    add: productId => this.post(`/wishlist/${encodeURIComponent(productId)}`),
    remove: productId => this.delete(`/wishlist/${encodeURIComponent(productId)}`),
    clear: () => this.delete('/wishlist'),
  };

  notifications = {
    getAll: params => this.get('/notifications', params),
    getUnreadCount: () => this.get('/notifications/unread-count'),
    create: data => this.post('/notifications', data),
    markAsRead: id => this.put(`/notifications/${encodeURIComponent(id)}/read`),
    markAllAsRead: () => this.put('/notifications/read-all'),
    delete: id => this.delete(`/notifications/${encodeURIComponent(id)}`),
    deleteAll: () => this.delete('/notifications/all'),
    deleteRead: () => this.delete('/notifications/read'),
  };

  search = {
    advanced: params => this.get('/search', params),
    suggestions: q => this.get('/search/suggestions', { q }),
    trending: () => this.get('/search/trending'),
    getHistory: () => this.get('/search/history'),
    addHistory: query => this.post('/search/history', { query }),
    clearHistory: () => this.delete('/search/history'),
    removeHistoryItem: query => this.delete(`/search/history/${encodeURIComponent(query)}`),
  };

  _compressImage (file, maxDim = 1200, quality = 0.7) {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) { resolve(file); return; }
      const heicExts = ['.heic', '.heif', '.hif'];
      const isHeic = heicExts.some(ext => file.name.toLowerCase().endsWith(ext)) ||
        ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'].includes(file.type);
      if (isHeic) { resolve(file); return; }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          const s = maxDim / Math.max(w, h);
          w = Math.round(w * s); h = Math.round(h * s);
        }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        c.toBlob((blob) => {
          if (!blob) { resolve(file); return; }
          const name = file.name.replace(/\.[^.]+$/, '.jpg');
          resolve(new File([blob], name, { type: 'image/jpeg' }));
        }, 'image/jpeg', quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    }).then(compressed => {
      if (compressed.size > 9 * 1024 * 1024) {
        throw new Error(`Image too large (${(compressed.size / 1024 / 1024).toFixed(1)}MB) — max 9MB. Try a smaller photo.`);
      }
      return compressed;
    });
  }

  upload = {
    images: async (files) => {
      if (this.isStaticDeploy) {
        return { success: false, error: 'Offline mode - upload unavailable', urls: [] };
      }
      const compressed = [];
      for (const f of files) {
        try {
          const c = await this._compressImage(f);
          compressed.push(c);
        } catch (compErr) {
          console.error('Compression error for', f.name, ':', compErr.message);
          return { success: false, error: compErr.message, urls: [] };
        }
      }
      const formData = new FormData();
      for (const file of compressed) {
        formData.append('images', file);
      }
      const doUpload = async (csrfToken) => {
        const token = this.getTokenFor(`${this.baseURL}/products/upload`);
        const headers = {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        };
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);
        try {
          const res = await fetch(`${this.baseURL}/products/upload`, {
            method: 'POST',
            headers,
            body: formData,
            signal: controller.signal,
            credentials: 'include',
          });
          clearTimeout(timeout);
          return { response: res, csrfInvalid: false };
        } catch (err) {
          clearTimeout(timeout);
          if (err.name === 'AbortError') {
            return { error: 'Upload timed out — try a smaller image or better connection' };
          }
          return { error: err.message || 'Network error during upload' };
        }
      };
      try {
        const csrfToken = await this.fetchCsrfToken();
        const first = await doUpload(csrfToken);
        if (first.error) {
          this._csrfToken = null;
          const freshCsrf = await this.fetchCsrfToken();
          const retry = await doUpload(freshCsrf);
          if (retry.error) {return { success: false, error: retry.error, urls: [], failures: [] };}
          if (retry.response) {
            const data = await retry.response.json().catch(() => ({}));
            if (retry.response.status === 401) {
              if (typeof authManager !== 'undefined' && authManager.clearSession) {authManager.clearSession();}
              return { success: false, error: 'Session expired — please log in again', urls: [], failures: [], isAuthError: true };
            }
            if (data.success && data.urls && data.urls.length > 0) {return { success: true, urls: data.urls, failures: data.failures || [] };}
            return { success: false, error: data.error || data.message || 'Upload failed', urls: [], failures: [] };
          }
        }
        if (!first.response) {return { success: false, error: first.error || 'Upload failed', urls: [], failures: [] };}
        const data = await first.response.json().catch(() => ({}));
        if (data.success && data.urls && data.urls.length > 0) {
          return { success: true, urls: data.urls, failures: data.failures || [] };
        }
        if (first.response && first.response.status === 401) {
          if (typeof authManager !== 'undefined' && authManager.clearSession) {authManager.clearSession();}
          return { success: false, error: 'Session expired — please log in again', urls: [], failures: [], isAuthError: true };
        }
        if (first.response && first.response.status === 403 && data.error && data.error.toLowerCase().includes('csrf')) {
          this._csrfToken = null;
          const retryCsrf = await this.fetchCsrfToken();
          if (retryCsrf) {
            const retry = await doUpload(retryCsrf);
            if (retry.error) {return { success: false, error: retry.error, urls: [], failures: [] };}
            if (retry.response) {
              const retryData = await retry.response.json().catch(() => ({}));
              if (retryData.success && retryData.urls && retryData.urls.length > 0) {return { success: true, urls: retryData.urls, failures: retryData.failures || [] };}
              return { success: false, error: retryData.error || retryData.message || 'Upload failed', urls: [], failures: [] };
            }
          }
        }
        return { success: false, error: data.error || data.message || `Upload failed (HTTP ${first.response.status})`, urls: [], failures: [] };
      } catch (err) {
        return { success: false, error: err.message || 'Upload error', urls: [], failures: [] };
      }
    },
  };
}

// Create singleton instance
const api = new API();

// Export for ES6 modules
export { API, api };

// Make globally available for module scripts
if (typeof window !== 'undefined') {
  window.api = api;
}
