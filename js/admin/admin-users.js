/* exported adminUsersManager */
// ============================================
// ADMIN USERS MODULE - User Management
// ============================================

class AdminUsersManager {
  constructor () {
    this.USERS_STORAGE_KEY = `${STORAGE_KEY_PREFIX}users`;
    this.users = [];
    // Only load if both api and StorageManager are available
    if (typeof api !== 'undefined' && typeof StorageManager !== 'undefined' && typeof StorageManager.get === 'function') {
      this.loadUsers();
    }
  }

  /**
   * Load users from JSON and storage
   */
  async loadUsers () {
    try {
      if (typeof api !== 'undefined' && !api.isStaticDeploy && window._backendAvailable !== false) {
        const resp = await api.users.getAll({ limit: 200 });
        if (resp.success && resp.data && resp.data.users) {
          this.users = resp.data.users;
          StorageManager.set(this.USERS_STORAGE_KEY, this.users, true);
          return;
        }
      }
    } catch (_) { console.warn('admin-users: backend fetch failed, using cache:', _); }

    this.users = StorageManager.get(this.USERS_STORAGE_KEY, true) || [];
  }

  /**
   * Get all users
   * @returns {Array}
   */
  getAllUsers () {
    // Also include currently logged in users from sessions (authManager format)
    const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
    const currentUser = session?.user || null;
    if (currentUser && !this.users.find(u => u.id === currentUser.id)) {
      return [...this.users, currentUser];
    }
    return this.users;
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Object|null}
   */
  getUserById (userId) {
    return this.users.find(u => u.id === userId) || null;
  }

  /**
   * Get user by email
   * @param {string} email - User email
   * @returns {Object|null}
   */
  getUserByEmail (email) {
    return this.users.find(u => u.email === email) || null;
  }

  /**
   * Search users
   * @param {string} query - Search query
   * @returns {Array}
   */
  searchUsers (query) {
    const normalizedQuery = query.toLowerCase();
    return this.users.filter(
      u =>
        u.fullName.toLowerCase().includes(normalizedQuery) ||
        u.email.toLowerCase().includes(normalizedQuery),
    );
  }

  /**
   * Get users by university
   * @param {string} university - University ID
   * @returns {Array}
   */
  getUsersByUniversity (university) {
    return this.users.filter(u => u.university === university);
  }

  /**
   * Get users by role
   * @param {string} role - User role
   * @returns {Array}
   */
  getUsersByRole (role) {
    return this.users.filter(u => u.role === role);
  }

  /**
   * Update user role
   * @param {string} userId - User ID
   * @param {string} newRole - New role
   * @returns {Object}
   */
  async updateRole (userId, newRole) {
    const user = this.getUserById(userId);

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    const previousRole = user.role;
    user.role = newRole;
    user.updatedAt = new Date().toISOString();

    this._persistUser(user);

    if (typeof api !== 'undefined' && api.users && api.users.update) {
      try {
        await api.users.update(userId, { role: newRole });
      } catch (err) {
        console.warn('admin-users: backend role sync failed:', err);
      }
    }

    adminAuthManager.logActivity('User role updated', { userId, newRole, previousRole });

    return {
      success: true,
      message: 'User role updated',
      user: user,
    };
  }

  /**
   * Verify user
   * @param {string} userId - User ID
   * @returns {Object}
   */
  async verifyUser (userId) {
    const user = this.getUserById(userId);

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    user.isVerified = true;
    user.verifiedAt = new Date().toISOString();

    this._persistUser(user);

    if (typeof api !== 'undefined' && api.users && api.users.update) {
      try {
        await api.users.update(userId, { isVerified: true, verifiedAt: new Date().toISOString() });
      } catch (err) {
        console.warn('admin-users: backend verify sync failed:', err);
      }
    }

    adminAuthManager.logActivity('User verified', { userId });

    return {
      success: true,
      message: 'User verified successfully',
      user: user,
    };
  }

  /**
   * Suspend user
   * @param {string} userId - User ID
   * @param {string} reason - Suspension reason
   * @returns {Object}
   */
  async suspendUser (userId, reason) {
    const user = this.getUserById(userId);

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    user.isSuspended = true;
    user.suspensionReason = reason;
    user.suspendedAt = new Date().toISOString();

    this._persistUser(user);

    if (typeof api !== 'undefined' && api.admin && api.admin.banUser) {
      try {
        await api.admin.banUser(userId, reason);
      } catch (err) {
        console.error('Failed to sync suspension to backend:', err);
      }
    }

    adminAuthManager.logActivity('User suspended', { userId, reason });

    return {
      success: true,
      message: 'User suspended',
      user: user,
    };
  }

  /**
   * Unsuspend user
   * @param {string} userId - User ID
   * @returns {Object}
   */
  async unsuspendUser (userId) {
    const user = this.getUserById(userId);

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    user.isSuspended = false;
    user.suspensionReason = null;
    user.suspendedAt = null;

    this._persistUser(user);

    if (typeof api !== 'undefined' && api.admin && api.admin.unbanUser) {
      try {
        await api.admin.unbanUser(userId);
      } catch (err) {
        console.error('Failed to sync unsuspension to backend:', err);
      }
    }

    adminAuthManager.logActivity('User unsuspended', { userId });

    return {
      success: true,
      message: 'User unsuspended',
      user: user,
    };
  }

  /**
   * Delete user
   * @param {string} userId - User ID
   * @returns {Object}
   */
  async deleteUser (userId) {
    const index = this.users.findIndex(u => u.id === userId);

    if (index === -1) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    const user = this.users[index];
    this.users.splice(index, 1);

    this._persistUsersList();

    if (typeof api !== 'undefined' && api.users && api.users.delete) {
      try {
        await api.users.delete(userId);
      } catch (err) {
        console.warn('admin-users: backend delete sync failed:', err);
      }
    }

    adminAuthManager.logActivity('User deleted', { userId, email: user.email });

    return {
      success: true,
      message: 'User deleted successfully',
      user: user,
    };
  }

  _persistUser (user) {
    const index = this.users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      this.users[index] = user;
    }
    this._persistUsersList();
  }

  _persistUsersList () {
    if (typeof StorageManager !== 'undefined' && typeof StorageManager.set === 'function') {
      StorageManager.set(this.USERS_STORAGE_KEY, this.users, true);
    }
  }

  /**
 * Get user statistics
 * @returns {Object}
 */
  getStats () {
    const users = this.getAllUsers();

    const roleCount = {};
    const universityCount = {};
    let verifiedCount = 0;
    let suspendedCount = 0;

    users.forEach(u => {
      roleCount[u.role] = (roleCount[u.role] || 0) + 1;
      universityCount[u.university] = (universityCount[u.university] || 0) + 1;
      if (u.isVerified) {
        verifiedCount++;
      }
      if (u.isSuspended) {
        suspendedCount++;
      }
    });

    return {
      totalUsers: users.length,
      roleCount: roleCount,
      universityCount: universityCount,
      verifiedCount: verifiedCount,
      suspendedCount: suspendedCount,
    };
  }

  /**
   * Get recent users
   * @param {number} limit - Number of users
   * @returns {Array}
   */
  getRecentUsers (limit = 10) {
    return this.getAllUsers()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, limit);
  }

  /**
   * Get top sellers
   * @param {number} limit - Number of sellers
   * @returns {Array}
   */
  getTopSellers (limit = 10) {
    return this.getUsersByRole('seller')
      .sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0))
      .slice(0, limit);
  }

  /**
   * Get top buyers
   * @param {number} limit - Number of buyers
   * @returns {Array}
   */
  getTopBuyers (limit = 10) {
    return this.getUsersByRole('buyer')
      .sort((a, b) => (b.totalOrders || 0) - (a.totalOrders || 0))
      .slice(0, limit);
  }

  /**
   * Export users to CSV (placeholder)
   * @returns {string}
   */
  exportToCSV () {
    const users = this.getAllUsers();
    const headers = ['ID', 'Name', 'Email', 'Phone', 'University', 'Role', 'Verified', 'Joined'];
    const rows = users.map(u => [
      u.id,
      u.fullName,
      u.email,
      u.phone,
      u.university,
      u.role,
      u.isVerified ? 'Yes' : 'No',
      u.createdAt || u.joinedDate,
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    this._downloadCSV(csvContent, 'uni-hub-users.csv');
    return csvContent;
  }

  _downloadCSV (csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Bulk verify users
   * @param {Array} userIds - User IDs to verify
   * @returns {Object}
   */
  bulkVerify (userIds) {
    let verified = 0;
    let failed = 0;

    userIds.forEach(id => {
      const result = this.verifyUser(id);
      if (result.success) {
        verified++;
      } else {
        failed++;
      }
    });

    adminAuthManager.logActivity('Bulk verify users', { count: userIds.length, verified, failed });

    return {
      success: true,
      message: `Verified ${verified} users, ${failed} failed`,
      verified: verified,
      failed: failed,
    };
  }
}

// Create singleton instance
const adminUsersManager = new AdminUsersManager();

// Export to window for cross-module access
window.adminUsersManager = adminUsersManager;
if (typeof dispatchEvent !== 'undefined') {
  dispatchEvent(new Event('module-loaded', { detail: 'AdminUsersManager' }));
}
