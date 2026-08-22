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
    if (session && session.expiresAt && session.expiresAt > Date.now()) {
      this.adminUser = session;
    } else if (session) {
      // Expired — drop it.
      this.adminUser = null;
      StorageManager.remove(this.ADMIN_STORAGE_KEY);
    } else {
      this.adminUser = null;
    }
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

      // MFA: privileged logins get an emailed 6-digit code instead of a
      // token on the first call. Complete via verifyMfa below.
      if (response.success && response.data?.mfaRequired) {
        const challengeId = response.data.challengeId;
        let code = null;
        if (typeof this.onMfaRequired === 'function') {
          code = await this.onMfaRequired(response.data);
        } else {
          // Fallback prompt until a dedicated MFA form step exists.
          code = window.prompt(`Enter the 6-digit code sent to ${email}:`);
        }
        if (!code) {
          return { success: false, error: 'Verification cancelled' };
        }

        const verified = await api.auth.verifyMfa(challengeId, String(code).trim());
        if (!verified.success || !verified.data?.token) {
          return { success: false, error: verified.error || 'Invalid verification code' };
        }
        return this._completeLogin(verified.data, email);
      }

      if (response.success && response.data?.user) {
        return this._completeLogin(response.data, email);
      }

      return { success: false, error: response.error || 'Login failed' };
    } catch (error) {
      return { success: false, error: 'Cannot connect to server. Please check your internet connection.' };
    }
  }

  /**
   * Persist a completed login (password-only or password+MFA) as the
   * admin session.
   * @param {Object} data - { token, user } from the auth API
   * @param {string} email - login email, for the activity log
   */
  _completeLogin (data, email) {
    const user = data.user;

    // RBAC: admins have full access; moderators get read + moderation
    // views. Backend routes enforce the same matrix authoritatively.
    if (!['admin', 'moderator'].includes(user.role)) {
      return { success: false, error: 'Access denied. Admin credentials required.' };
    }

    if (data.token) {
      // Session separation (2026-08-21): the admin token lives ONLY in
      // ADMIN_STORAGE_KEY. It must NOT be copied into STORAGE_KEYS.
      // CURRENT_USER ('unihub_session') — that shared write made the main
      // app inherit admin credentials after visiting the admin panel.
      // js/utils/api.js now selects 'unihub_admin_session' for /admin/*
      // URLs and while #/admin routes are active. Shape stays FLAT
      // ({...user, token, expiresAt}) because admin modules read
      // adminAuthManager.adminUser.role/.email/.token directly.
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      this.adminUser = { ...user, token: data.token, loginAt: new Date().toISOString(), expiresAt };
    } else {
      this.adminUser = { ...user, loginAt: new Date().toISOString() };
    }
    StorageManager.set(this.ADMIN_STORAGE_KEY, this.adminUser);
    this.logActivity('Admin login', { email });

    return { success: true, message: 'Login successful', user: this.adminUser };
  }

  /**
   * Admin logout
   */
  logout () {
    this.logActivity('Admin logout', { email: this.adminUser?.email });
    this.adminUser = null;
    StorageManager.remove(this.ADMIN_STORAGE_KEY);
    // Legacy cleanup: older builds copied the admin session into the shared
    // user-session slot. If that pollution is still present, remove it so
    // the main app does not keep acting with admin credentials.
    try {
      const legacy = StorageManager.get(STORAGE_KEYS.CURRENT_USER, true);
      if (legacy?.user && ['admin', 'moderator'].includes(legacy.user.role)) {
        StorageManager.remove(STORAGE_KEYS.CURRENT_USER);
      }
    } catch (_e) { /* storage unavailable */ }
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
