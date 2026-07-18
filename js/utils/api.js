/* exported api */
// ============================================
// API CLIENT FOR BACKEND COMMUNICATION
// ============================================

class API {
  constructor (baseURL = null) {
    var envAPI = '';
    try { envAPI = import.meta.env.VITE_API_URL || ''; } catch (e) { /* VITE_API_URL only available in Vite dev */ }
    this.baseURL =
      baseURL || (typeof window !== 'undefined' && window.API_URL) || envAPI || 'https://uni-hub-bnxi.onrender.com/api';
    this._isStaticDeploy = false;
    this._backendProbed = false;
    this._backendReachable = null;
if (typeof window !== 'undefined' && !this._isStaticDeploy) {
    this._probeBackend();
  }
    this.timeout = 30000;
  }

  get isStaticDeploy () {
    if (this._isStaticDeploy) return true;
    if (this._backendProbed && this._backendReachable === false) return true;
    return false;
  }

  _probeBackend (attempt = 1) {
    const maxAttempts = 3;
    const timeoutMs = attempt === 1 ? 8000 : 10000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    fetch(`${this.baseURL.replace('/api', '')}/api/auth/csrf-token`, {
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
    if (this._csrfToken) return this._csrfToken;
    if (this._csrfPromise) return this._csrfPromise;

  const csrfPromise = fetch(`${this.baseURL.replace('/api', '')}/api/auth/csrf-token`, {
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
   * Get auth token from storage
   * Note: auth.js uses 'unihub_session', NOT 'unihub_current_user'
   */
  getToken () {
    try {
      // Use the same key as auth.js: 'unihub_session'
      const session = localStorage.getItem('unihub_session');
      if (session) {
        const sessionData = JSON.parse(session);
        return sessionData.token;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return null;
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

      const token = this.getToken();

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
        if (response.status === 401 && typeof authManager !== 'undefined' && authManager.clearSession) {
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
   * DELETE request
   */
  async delete (url) {
    return this.request(url, { method: 'DELETE' });
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
      const response = await fetch(filePath);
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
    getMe: () => this.get('/auth/me'),
    updateProfile: data => this.put('/auth/profile', data),
    changePassword: (currentPassword, newPassword) =>
      this.put('/auth/change-password', { currentPassword, newPassword }),
  };

  /**
   * Products API
   */
  products = {
    getAll: params => this.get('/products', params),
    getById: id => this.get(`/products/${id}`),
    create: data => this.post('/products', data),
    update: (id, data) => this.put(`/products/${id}`, data),
    delete: id => this.delete(`/products/${id}`),
    getMyProducts: status => this.get('/products/seller/my-products', { status }),
  };

  /**
   * Orders API
   */
  orders = {
    create: data => this.post('/orders', data),
    getMyOrders: () => this.get('/orders/my-orders'),
    getById: id => this.get(`/orders/${id}`),
    track: trackingNumber => this.get(`/orders/track/${trackingNumber}`),
    completePayment: (id, transactionId) => this.post(`/orders/${id}/payment`, { transactionId }),
    cancel: id => this.put(`/orders/${id}/cancel`),
    updateStatus: (id, status, note) => this.put(`/orders/${id}/status`, { status, note }),
    refund: (id, reason) => this.put(`/orders/${id}/status`, { status: 'refunded', note: reason }),
  };

  /**
   * Verification API
   */
  verification = {
    submit: data => this.post('/verification', data),
    getStatus: (studentId, university) =>
      this.get(`/verification/status/${studentId}/${university}`),
    getMyStatus: () => this.get('/verification/me'),
  };

  /**
   * Users API
   */
  users = {
    getById: id => this.get(`/users/${id}`),
    getAll: params => this.get('/users', params), // Admin only
    update: (id, data) => this.put(`/users/${id}`, data), // Admin only
    delete: id => this.delete(`/users/${id}`), // Admin only
  };

  /**
   * Admin API
   */
  admin = {
    login: (email, password) => this.post('/auth/login', { email, password }),
    getStats: () => this.get('/admin/stats'),
    getProducts: params => this.get('/admin/products', params),
    createProduct: data => this.post('/admin/products', data),
    updateProduct: (id, data) => this.put(`/admin/products/${id}`, data),
    getAnalytics: () => this.get('/admin/analytics'),
    deleteProduct: id => this.delete(`/admin/products/${id}`),
    getOrders: params => this.get('/admin/orders', params),
    getActivity: params => this.get('/admin/activity', params),
    getActivityStats: () => this.get('/admin/activity/stats'),
    getOnlineUsers: () => this.get('/admin/online-users'),
    approveProduct: id => this.put(`/admin/products/${id}/approve`),
    rejectProduct: (id, reason) => this.put(`/admin/products/${id}/reject`, { reason }),
    banUser: (id, reason) => this.put(`/admin/users/${id}/ban`, { action: 'ban', reason }),
    unbanUser: id => this.put(`/admin/users/${id}/ban`, { action: 'unban' }),
    getPendingVerifications: () => this.get('/verification/pending'),
    approveVerification: (id, notes) => this.put(`/verification/${id}/approve`, { notes }),
    rejectVerification: (id, notes) => this.put(`/verification/${id}/reject`, { notes }),
  };

  wishlist = {
    getAll: () => this.get('/wishlist'),
    add: productId => this.post(`/wishlist/${productId}`),
    remove: productId => this.delete(`/wishlist/${productId}`),
    clear: () => this.delete('/wishlist'),
  };

  notifications = {
    getAll: params => this.get('/notifications', params),
    getUnreadCount: () => this.get('/notifications/unread-count'),
    create: data => this.post('/notifications', data),
    markAsRead: id => this.put(`/notifications/${id}/read`),
    markAllAsRead: () => this.put('/notifications/read-all'),
    delete: id => this.delete(`/notifications/${id}`),
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
      const token = this.getToken();
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
      let csrfToken = await this.fetchCsrfToken();
      const first = await doUpload(csrfToken);
      if (first.error) {
        this._csrfToken = null;
        const freshCsrf = await this.fetchCsrfToken();
        const retry = await doUpload(freshCsrf);
        if (retry.error) return { success: false, error: retry.error, urls: [] };
        if (retry.response) {
          const data = await retry.response.json().catch(() => ({}));
          console.warn('Upload retry response:', retry.response.status, data);
          if (retry.response.status === 401) {
            if (typeof authManager !== 'undefined' && authManager.clearSession) authManager.clearSession();
            return { success: false, error: 'Session expired — please log in again', urls: [], isAuthError: true };
          }
          if (data.success && data.urls && data.urls.length > 0) return { success: true, urls: data.urls };
          return { success: false, error: data.error || data.message || 'Upload failed', urls: [] };
        }
      }
      if (!first.response) return { success: false, error: first.error || 'Upload failed', urls: [] };
      const data = await first.response.json().catch(() => ({}));
      console.warn('Upload response:', first.response.status, data);
      if (data.success && data.urls && data.urls.length > 0) {
        return { success: true, urls: data.urls };
      }
      if (first.response && first.response.status === 401) {
        if (typeof authManager !== 'undefined' && authManager.clearSession) authManager.clearSession();
        return { success: false, error: 'Session expired — please log in again', urls: [], isAuthError: true };
      }
      if (first.response && first.response.status === 403 && data.error && data.error.toLowerCase().includes('csrf')) {
        this._csrfToken = null;
        const retryCsrf = await this.fetchCsrfToken();
        if (retryCsrf) {
          const retry = await doUpload(retryCsrf);
          if (retry.error) return { success: false, error: retry.error, urls: [] };
          if (retry.response) {
            const retryData = await retry.response.json().catch(() => ({}));
            if (retryData.success && retryData.urls && retryData.urls.length > 0) return { success: true, urls: retryData.urls };
            return { success: false, error: retryData.error || retryData.message || 'Upload failed', urls: [] };
          }
        }
      }
      return { success: false, error: data.error || data.message || `Upload failed (HTTP ${first.response.status})`, urls: [] };
    } catch (err) {
      return { success: false, error: err.message || 'Upload error', urls: [] };
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
