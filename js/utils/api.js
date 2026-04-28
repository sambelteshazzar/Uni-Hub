/* exported api */
// ============================================
// API CLIENT FOR BACKEND COMMUNICATION
// ============================================

class API {
  constructor (baseURL = null) {
    this.baseURL =
      baseURL || (typeof window !== 'undefined' && window.API_URL) || 'http://localhost:5000/api';
    this.timeout = 30000;
    this._csrfToken = null;
    this._csrfPromise = null;
  }

  async fetchCsrfToken () {
    if (this._csrfToken) return this._csrfToken;
    if (this._csrfPromise) return this._csrfPromise;

    this._csrfPromise = fetch(`${this.baseURL.replace('/api', '')}/api/auth/csrf-token`, {
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
        this._csrfPromise = null;
      });

    return this._csrfPromise;
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

      const response = await Promise.race([
        fetch(fullUrl, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...csrfHeaders,
            ...options.headers,
          },
          ...(isMutating ? { credentials: 'include' } : {}),
          ...options,
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
              ...options,
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
        console.warn('Backend unavailable - using local fallback');
        return { success: false, data: null, isOffline: true };
      }

      if (error.message === 'Request timeout') {
        console.warn('Request timed out - using local fallback');
        return { success: false, data: null, isOffline: true };
      }

      console.error('API Error:', error);

      if (error.status === 401) {
        localStorage.removeItem('unihub_session');
        if (window.location.hash && !window.location.hash.includes('login')) {
          window.location.hash = '/login';
        }
      }

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
  async loadJSON (filePath) {
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to load ${filePath}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error loading JSON:', error);
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
    getStats: () => this.get('/admin/stats'),
    getProducts: params => this.get('/admin/products', params),
    createProduct: data => this.post('/admin/products', data),
    updateProduct: (id, data) => this.put(`/admin/products/${id}`, data),
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
}

// Create singleton instance
const api = new API();

// Export for ES6 modules
export { API, api };

// Make globally available for module scripts
if (typeof window !== 'undefined') {
  window.api = api;
}
