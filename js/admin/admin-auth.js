// ============================================
// ADMIN AUTH MODULE - Admin Authentication
// ============================================
/* exported adminAuthManager */

class AdminAuthManager {
  constructor () {
    this.ADMIN_STORAGE_KEY = `${STORAGE_KEY_PREFIX}admin_session`;
    this.adminUser = null;
    // Only load if StorageManager is available
    if (typeof StorageManager !== 'undefined' && typeof StorageManager.get === 'function') {
      this.load();
    }
  }

  /**
   * Load admin session
   */
  load () {
    const session = StorageManager.get(this.ADMIN_STORAGE_KEY, true);
    this.adminUser = session || null;
  }

  /**
   * Admin login
   * @param {string} email - Admin email
   * @param {string} password - Admin password
   * @returns {Object} - Login result
   */
  async login (email, password) {
    try {
      const response = await api.admin.login(email, password);
      if (response.success && response.data?.user) {
        const user = response.data.user;

        if (user.role !== 'admin') {
          return { success: false, error: 'Access denied. Admin credentials required.' };
        }

        if (response.data.token) {
          StorageManager.set(STORAGE_KEYS.CURRENT_USER, { token: response.data.token, user });
        }

        const adminUser = { ...user, token: response.data.token, loginAt: new Date().toISOString() };
        this.adminUser = adminUser;
        StorageManager.set(this.ADMIN_STORAGE_KEY, adminUser);
        this.logActivity('Admin login', { email });

        return { success: true, message: 'Login successful', user: adminUser };
      }

      return { success: false, error: response.error || 'Login failed' };
    } catch (error) {
      return { success: false, error: 'Cannot connect to server. Please check your internet connection.' };
    }
  }

  /**
   * Admin logout
   */
  logout () {
    this.logActivity('Admin logout', { email: this.adminUser?.email });
    this.adminUser = null;
    StorageManager.remove(this.ADMIN_STORAGE_KEY);
  }

  /**
   * Check if admin is logged in
   * @returns {boolean}
   */
  isLoggedIn () {
    return !!this.adminUser;
  }

  /**
   * Get current admin user
   * @returns {Object|null}
   */
  getCurrentUser () {
    return this.adminUser;
  }

  /**
   * Check admin permission
   * @param {string} permission - Permission to check
   * @returns {boolean}
   */
  hasPermission (permission) {
    if (!this.adminUser) { return false; }
    if (!this.adminUser.permissions) { return true; }
    return this.adminUser.permissions.includes(permission);
  }

  /**
   * Get all permissions
   * @returns {Array}
   */
  getAllPermissions () {
    return [
      'view_dashboard',
      'manage_users',
      'manage_products',
      'manage_orders',
      'manage_regions',
      'view_reports',
      'manage_settings',
      'delete_users',
      'delete_products',
      'delete_orders',
    ];
  }

  /**
   * Log admin activity
   * @param {string} action - Action performed
   * @param {Object} details - Action details
   */
  logActivity (action, details = {}) {
    const activities = this.getActivityLog();

    activities.unshift({
      id: `activity_${Date.now()}`,
      adminId: this.adminUser?.id || 'unknown',
      action: action,
      details: details,
      timestamp: new Date().toISOString(),
    });

    // Keep last 100 activities
    if (activities.length > 100) {
      activities.splice(100);
    }

    StorageManager.set(`${STORAGE_KEY_PREFIX}admin_activities`, activities);
  }

  /**
   * Get activity log
   * @returns {Array}
   */
  getActivityLog () {
    const activities = StorageManager.get(`${STORAGE_KEY_PREFIX}admin_activities`, true);
    return activities || [];
  }

  /**
   * Get activity log with filters
   * @param {Object} options - Filter options
   * @returns {Array}
   */
  getActivityLogFiltered (options = {}) {
    let activities = this.getActivityLog();

    // Filter by admin ID
    if (options.adminId) {
      activities = activities.filter(a => a.adminId === options.adminId);
    }

    // Filter by action
    if (options.action) {
      activities = activities.filter(a => a.action.includes(options.action));
    }

    // Filter by date range
    if (options.startDate) {
      activities = activities.filter(a => new Date(a.timestamp) >= new Date(options.startDate));
    }

    if (options.endDate) {
      activities = activities.filter(a => new Date(a.timestamp) <= new Date(options.endDate));
    }

    return activities;
  }

  /**
   * Clear activity log
   */
  clearActivityLog () {
    StorageManager.remove(`${STORAGE_KEY_PREFIX}admin_activities`);
  }

  /**
   * Get admin stats
   * @returns {Object}
   */
  getStats () {
    const activities = this.getActivityLog();
    const today = new Date().toDateString();

    const todayActivities = activities.filter(a => new Date(a.timestamp).toDateString() === today);

    return {
      totalActivities: activities.length,
      todayActivities: todayActivities.length,
      lastLogin: this.adminUser?.loginAt || null,
    };
  }

  /**
   * Verify admin session
   * @returns {Object}
   */
  verifySession () {
    if (!this.isLoggedIn()) {
      return {
        valid: false,
        error: 'Admin not logged in',
      };
    }

    // Check session expiry (24 hours)
    const loginTime = new Date(this.adminUser.loginAt);
    const now = new Date();
    const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);

    if (hoursSinceLogin > 24) {
      this.logout();
      return {
        valid: false,
        error: 'Session expired',
      };
    }

    return {
      valid: true,
      user: this.adminUser,
    };
  }

  /**
   * Change admin password (placeholder)
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Object}
   */
  async changePassword (currentPassword, newPassword) {
    if (typeof api !== 'undefined') {
      try {
        const session = StorageManager.get(STORAGE_KEYS.CURRENT_USER, true);
        if (session?.token) {
          const response = await api.auth.changePassword(currentPassword, newPassword);
          if (response.success) {
            this.logActivity('Password changed');
            return { success: true, message: 'Password changed successfully' };
          }
          return { success: false, error: response.error || 'Failed to change password' };
        }
      } catch (error) {
        return { success: false, error: error.message || 'Failed to change password' };
      }
    }

    return { success: false, error: 'You must be logged in to change your password' };
  }

  /**
   * Get admin profile
   * @returns {Object}
   */
  getProfile () {
    if (!this.adminUser) {
      return null;
    }

    return {
      id: this.adminUser.id,
      email: this.adminUser.email,
      fullName: this.adminUser.fullName,
      role: this.adminUser.role,
      avatar: this.adminUser.avatar,
      permissions: this.adminUser.permissions,
      stats: this.getStats(),
    };
  }
}

// Create singleton instance
const adminAuthManager = new AdminAuthManager();

// Export to window for cross-module access
window.adminAuthManager = adminAuthManager;
if (typeof dispatchEvent !== 'undefined') {
  dispatchEvent(new Event('module-loaded', { detail: 'AdminAuthManager' }));
}
