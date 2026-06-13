/* exported api */
// ============================================
// API CLIENT FOR BACKEND COMMUNICATION
// ============================================

class API {
  constructor (baseURL = null) {
    var envAPI = '';
    try { envAPI = import.meta.env.VITE_API_URL || ''; } catch (e) {}
    this.baseURL =
      baseURL || (typeof window !== 'undefined' && window.API_URL) || envAPI || 'http://localhost:5000/api';
    this._isStaticDeploy = !this.baseURL || this.baseURL.includes('offline.local');
    this._backendProbed = false;
    this._backendReachable = null;
if (typeof window !== 'undefined' && !this._isStaticDeploy) {
    this._probeBackend();
  }
    this.timeout = 30000;
  }

  get isStaticDeploy () {
    if (this._isStaticDeploy) return true;
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

upload = {
  images: async (files) => {
    if (this.isStaticDeploy) {
      return { success: false, error: 'Offline mode - upload unavailable', urls: [] };
    }
    const formData = new FormData();
    for (const file of files) {
      formData.append('images', file);
    }
    try {
      const token = this.getToken();
      const csrfToken = await this.fetchCsrfToken();
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      };
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      const res = await fetch(`${this.baseURL}/products/upload`, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
        credentials: 'include',
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (data.success && data.urls && data.urls.length > 0) {
        return { success: true, urls: data.urls };
      }
      if (res.status === 403 && data.error && data.error.toLowerCase().includes('csrf')) {
        this._csrfToken = null;
        const retryCsrf = await this.fetchCsrfToken();
        if (retryCsrf) {
          const retryRes = await fetch(`${this.baseURL}/products/upload`, {
            method: 'POST',
            headers: {
              ...headers,
              'X-CSRF-Token': retryCsrf,
            },
            body: formData,
            credentials: 'include',
          });
          const retryData = await retryRes.json();
          if (retryData.success && retryData.urls && retryData.urls.length > 0) {
            return { success: true, urls: retryData.urls };
          }
          return { success: false, error: retryData.error || retryData.message || 'Upload failed', urls: [] };
        }
      }
      return { success: false, error: data.error || data.message || 'Upload failed', urls: [] };
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
