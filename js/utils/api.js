/* exported api */
// ============================================
// API CLIENT FOR BACKEND COMMUNICATION
// ============================================

class API {
  constructor (baseURL = null) {
    // Use provided URL, window config, or default to local backend
    // Note: process.env doesn't work in browser context
    this.baseURL =
      baseURL || (typeof window !== 'undefined' && window.API_URL) || 'http://localhost:5000/api';
    this.timeout = 30000; // 30 seconds
  }

  /**
   * Get auth token from storage
   */
  getToken () {
    try {
      const user = localStorage.getItem('unihub_current_user');
      if (user) {
        const userData = JSON.parse(user);
        return userData.token;
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

      // Get auth token
      const token = this.getToken();

      const response = await Promise.race([
        fetch(fullUrl, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
          },
          ...options,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.timeout),
        ),
      ]);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(data.error || response.statusText);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      // Network errors (backend not running) - return empty data gracefully
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.warn('Backend unavailable - using local fallback');
        return { success: false, data: null, isOffline: true };
      }

      // Timeout errors
      if (error.message === 'Request timeout') {
        console.warn('Request timed out - using local fallback');
        return { success: false, data: null, isOffline: true };
      }

      console.error('API Error:', error);

      // Handle 401 (unauthorized) - clear user data
      if (error.status === 401) {
        localStorage.removeItem('unihub_current_user');
        // Redirect to login if on a protected page
        if (window.location.hash && !window.location.hash.includes('login')) {
          // Session expired - will redirect on next navigation
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
    getOrders: params => this.get('/admin/orders', params),
  };
}

// Create singleton instance
// Create singleton instance
const _api = new API();
