/**
 * Authentication Manager - Frontend
 * Handles user authentication with secure backend-only storage
 * CRITICAL: No passwords are ever stored in localStorage/browser storage
 * Falls back to local demo users when backend is unreachable
 */

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.useBackend = true;
    this.token = null;
    this.isOfflineMode = false;
    this._offlineUsers = {};
    this.loadSession();
    if (this.isAuthenticated && !this.isOfflineMode) {
      this._validateToken();
      this.syncVerificationStatus();
    }
  }

  /**
   * Load session from storage (token only, NO passwords)
   */
  loadSession() {
    try {
      const session = localStorage.getItem('unihub_session');
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed.token && parsed.user && parsed.expiresAt > Date.now()) {
          this.token = parsed.token;
          this.currentUser = parsed.user;
          this.isAuthenticated = true;
          if (parsed.isOffline) {
            this.isOfflineMode = true;
          }
        } else {
          this.clearSession();
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
      this.clearSession();
    }
  }

  async _validateToken() {
    const baseURL = this._getBaseURL();
    if (!baseURL) return;
    try {
      const res = await fetch(`${baseURL}/auth/me`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (res.status === 401) {
        this.clearSession();
      }
    } catch (e) {
      console.warn('auth: _validateToken failed:', e);
    }
  }

  /**
   * Save session to storage (token only, NO passwords)
   */
  saveSession(token, user, offline = false) {
    const safeUser = { ...user };
    delete safeUser.password;
    delete safeUser.passwordHash;
    delete safeUser.__v;

    const session = {
      token,
      user: safeUser,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      ...(offline ? { isOffline: true } : {}),
    };

    try {
      localStorage.setItem('unihub_session', JSON.stringify(session));
    } catch (e) {
      console.warn('localStorage unavailable:', e);
    }
    this.token = token;
    this.currentUser = safeUser;
    this.isAuthenticated = true;
    this.isOfflineMode = offline;
  }

  /**
   * Clear session from storage
   */
  clearSession() {
    try {
      localStorage.removeItem('unihub_session');
    } catch (e) {
      console.warn('localStorage unavailable:', e);
    }
    this.currentUser = null;
    this.isAuthenticated = false;
    this.token = null;
    this.isOfflineMode = false;
  }

  /**
   * Get auth token for API requests
   */
  getToken() {
    return this.token;
  }

  _isDevMode() {
    // Offline login bypasses the backend entirely (and accepts any
    // password for the hardcoded demo accounts, including
    // admin@unihub.local). Restrict it to true dev builds so a prod
    // backend outage can't turn the offline fallback into a backdoor.
    let isViteDev = false;
    try {
      isViteDev = import.meta.env?.DEV === true;
    } catch (e) {
      // import.meta.env is only available under Vite; in the
      // transpiled static build (no Rollup graph) we are NOT in dev.
      isViteDev = false;
    }
    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    return isViteDev || isLocalhost;
  }

  _getOfflineUsers() {
    if (!this._isDevMode()) return {};
    const _defaultAvatar =
      'data:image/svg+xml,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect fill="%232563eb" width="40" height="40" rx="20"/><text x="20" y="26" text-anchor="middle" fill="white" font-size="16" font-family="sans-serif">U</text></svg>'
      );
    return {
      'admin@unihub.local': {
        id: 'admin_001',
        fullName: 'Admin User',
        email: 'admin@unihub.local',
        phone: '+233 50 000 0000',
        university: 'all',
        role: 'admin',
        avatar: _defaultAvatar,
        rating: 5.0,
        isVerified: true,
        joinedDate: '2025-01-01T00:00:00Z',
      },
      'kwame.mensah@ug.edu.gh': {
        id: 'user_001',
        fullName: 'Kwame Mensah',
        email: 'kwame.mensah@ug.edu.gh',
        phone: '+233 50 123 4567',
        university: 'ug',
        role: 'buyer',
        avatar: _defaultAvatar,
        rating: 4.5,
        isVerified: true,
        joinedDate: '2025-09-15T10:30:00Z',
      },
      'ama.osei@knust.edu.gh': {
        id: 'user_002',
        fullName: 'Ama Osei',
        email: 'ama.osei@knust.edu.gh',
        phone: '+233 24 987 6543',
        university: 'knust',
        role: 'buyer',
        avatar: _defaultAvatar,
        rating: 4.8,
        isVerified: true,
        joinedDate: '2025-08-20T14:15:00Z',
      },
      'kofi.asante@ucc.edu.gh': {
        id: 'user_003',
        fullName: 'Kofi Asante',
        email: 'kofi.asante@ucc.edu.gh',
        phone: '+233 54 321 7654',
        university: 'ucc',
        role: 'buyer',
        avatar: _defaultAvatar,
        rating: 4.2,
        isVerified: true,
        joinedDate: '2025-10-05T09:00:00Z',
      },
      'abena.darko@uew.edu.gh': {
        id: 'user_004',
        fullName: 'Abena Darko',
        email: 'abena.darko@uew.edu.gh',
        phone: '+233 20 555 1234',
        university: 'uew',
        role: 'buyer',
        avatar: _defaultAvatar,
        rating: 4.9,
        isVerified: true,
        joinedDate: '2025-07-10T11:45:00Z',
      },
    };
  }

  _tryOfflineLogin(email, _password) {
    if (!this._isDevMode()) {
      return {
        success: false,
        error: 'Server is unreachable. Please check your connection and try again.',
      };
    }

    const users = this._getOfflineUsers();
    const user = users[email];

    if (!user) {
      return {
        success: false,
        error:
          'Server is offline (dev mode). Available demo accounts:\n\n• admin@unihub.local\n• kwame.mensah@ug.edu.gh\n• ama.osei@knust.edu.gh\n• kofi.asante@ucc.edu.gh\n• abena.darko@uew.edu.gh\n\nAny password works in dev offline mode.',
      };
    }

    const offlineUser = { ...user };

    const fakeToken = 'offline_' + btoa(email) + '_' + Date.now();
    this.saveSession(fakeToken, offlineUser, true);

    return {
      success: true,
      message: 'Login successful! (Offline Dev Mode)',
      user: offlineUser,
      isOffline: true,
    };
  }

  /**
   * Fetch CSRF token from backend
   */
  _getBaseURL() {
    return (
      (typeof window !== 'undefined' && window.API_URL) || 'https://uni-hub-bnxi.onrender.com/api'
    );
  }

  async _fetchCsrfToken() {
    try {
      const baseURL = this._getBaseURL();
      if (!baseURL) {
        return null;
      }
      const response = await fetch(`${baseURL.replace('/api', '')}/api/auth/csrf-token`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success && data.csrfToken) {
        this._csrfToken = data.csrfToken;
        return data.csrfToken;
      }
    } catch (error) {
      // CSRF token unavailable — non-critical
    }
    return null;
  }

  /**
   * Register new user - Backend only (with offline fallback)
   */
  async register(userData) {
    try {
      if (!userData.email || !userData.password) {
        return { success: false, error: 'Email and password are required' };
      }

      if (userData.password.length < 8) {
        return {
          success: false,
          error:
            'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        };
      }

      const baseURL = this._getBaseURL();
      if (baseURL) {
        const csrfToken = await this._fetchCsrfToken();
        const response = await fetch(`${this._getBaseURL()}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
          },
          credentials: 'include',
          body: JSON.stringify(userData),
        });

        let data;
        try {
          data = await response.json();
        } catch (_) {
          return {
            success: false,
            error: `Server error (HTTP ${response.status}). Please try again.`,
          };
        }

        if (data.success) {
          this.saveSession(data.data.token, data.data.user);
          return { success: true, message: 'Registration successful!', user: data.data.user };
        }

        return { success: false, error: data.error || 'Registration failed' };
      }

      // Offline mode - skip backend entirely
      return this._offlineRegister(userData);
    } catch (error) {
      console.error('Register error:', error);
      return {
        success: false,
        error: error.message || 'Network error. Please check your connection.',
      };
    }
  }

  _offlineRegister(userData) {
    if (!this._isDevMode()) {
      return {
        success: false,
        error: 'Server is unreachable. Registration requires an active server connection.',
      };
    }
    // Backend unavailable — using offline fallback
    const existing = this._getOfflineUsers()[userData.email];
    if (existing) {
      return { success: false, error: 'Email already registered (offline mode)' };
    }

    const newUser = {
      id: 'user_' + Date.now(),
      fullName:
        userData.fullName ||
        (userData.firstName && userData.lastName
          ? userData.firstName + ' ' + userData.lastName
          : userData.name || 'New User'),
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      email: userData.email,
      phone: userData.phone || '',
      university: userData.university || 'ug',
      role: 'buyer',
      avatar: '',
      rating: 0,
      isVerified: false,
      joinedDate: new Date().toISOString(),
    };

    this._offlineUsers[userData.email] = { ...newUser };
    const fakeToken = 'offline_' + btoa(userData.email) + '_' + Date.now();
    this.saveSession(fakeToken, newUser, true);

    return {
      success: true,
      message: 'Registration successful! (Offline Dev Mode)',
      user: newUser,
      isOffline: true,
    };
  }

  /**
   * Login user - Backend with offline fallback
   */
  async login(email, password) {
    try {
      if (!email || !password) {
        return { success: false, error: 'Please enter email and password' };
      }

      const baseURL = this._getBaseURL();
      if (baseURL) {
        const csrfToken = await this._fetchCsrfToken();
        const response = await fetch(`${this._getBaseURL()}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });

        let data;
        try {
          data = await response.json();
        } catch (_) {
          return {
            success: false,
            error: `Server error (HTTP ${response.status}). Please try again.`,
          };
        }

        if (data.success) {
          this.saveSession(data.data.token, data.data.user);
          this.syncVerificationStatus();
          return { success: true, message: 'Login successful!', user: data.data.user };
        }

        return { success: false, error: data.error || 'Invalid credentials' };
      }

      // Offline mode - skip backend entirely
      return this._tryOfflineLogin(email, password);
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message || 'Network error. Please check your connection.',
      };
    }
  }

  /**
   * Logout user
   */
  logout() {
    const baseURL = this._getBaseURL();
    if (this.token && !this.isOfflineMode && baseURL) {
      this._fetchCsrfToken()
        .then(csrfToken => {
          fetch(`${baseURL}/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.token}`,
              ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
            },
            credentials: 'include',
          }).catch(() => {});
        })
        .catch(() => {});
    }

    this.clearSession();
    return { success: true, message: 'Logged out successfully' };
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isLoggedIn() {
    if (this.isAuthenticated && this.token) {
      try {
        const session = localStorage.getItem('unihub_session');
        if (session) {
          const parsed = JSON.parse(session);
          return parsed.expiresAt > Date.now();
        }
      } catch (e) {
        console.warn('localStorage unavailable:', e);
      }
    }
    return false;
  }

  /**
   * Check if user has specific role
   */
  hasRole(role) {
    return this.currentUser?.role === role;
  }

  /**
   * Update user profile - Backend with offline fallback
   */
  async updateProfile(updates) {
    try {
      if (!this.isLoggedIn()) {
        return { success: false, error: 'Not authenticated' };
      }

      if (this.isOfflineMode) {
        const updatedUser = { ...this.currentUser, ...updates };
        delete updatedUser.password;
        delete updatedUser.passwordHash;
        this.saveSession(this.token, updatedUser, true);
        return { success: true, message: 'Profile updated (offline)', user: updatedUser };
      }

      delete updates.password;
      delete updates.passwordHash;
      delete updates._id;

      const csrfToken = await this._fetchCsrfToken();
      const response = await fetch(`${this._getBaseURL()}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      let data;
      try {
        data = await response.json();
      } catch (_) {
        return { success: false, error: `Server error (HTTP ${response.status})` };
      }

      if (data.success) {
        this.saveSession(this.token, data.data);
        return { success: true, message: 'Profile updated', user: data.data };
      }

      return { success: false, error: data.error };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: 'Update failed' };
    }
  }

  /**
   * Change password - Backend only (with offline fallback)
   */
  async changePassword(currentPassword, newPassword) {
    try {
      if (!this.isLoggedIn()) {
        return { success: false, error: 'Not authenticated' };
      }

      if (this.isOfflineMode) {
        return { success: true, message: 'Password change saved (offline mode)' };
      }

      const csrfToken = await this._fetchCsrfToken();
      const response = await fetch(`${this._getBaseURL()}/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      let data;
      try {
        data = await response.json();
      } catch (_) {
        return { success: false, error: `Server error (HTTP ${response.status})` };
      }

      if (data.success) {
        return { success: true, message: 'Password changed successfully' };
      }

      return { success: false, error: data.error };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, error: 'Password change failed' };
    }
  }

  /**
   * Check if user is seller
   */
  isSeller() {
    return this.currentUser?.role === 'seller' || this.currentUser?.role === 'admin';
  }

  /**
   * Check if user is admin
   */
  isAdmin() {
    return this.currentUser?.role === 'admin';
  }

  async syncVerificationStatus() {
    if (!this.isLoggedIn() || this.isOfflineMode) return;
    try {
      const response = await fetch(`${this._getBaseURL()}/verification/me`, {
        headers: { Authorization: `Bearer ${this.token}` },
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success && data.data) {
        const isNowVerified = data.data.isVerified || false;
        if (this.currentUser.isVerified !== isNowVerified) {
          this.currentUser.isVerified = isNowVerified;
          let session = null;
          try {
            session = JSON.parse(localStorage.getItem('unihub_session') || 'null');
          } catch (e) {
            console.warn('localStorage unavailable:', e);
          }
          if (session && session.user) {
            session.user.isVerified = isNowVerified;
            try {
              localStorage.setItem('unihub_session', JSON.stringify(session));
            } catch (e) {
              console.warn('localStorage unavailable:', e);
            }
          }
        }
        if (typeof StorageManager !== 'undefined' && typeof STORAGE_KEYS !== 'undefined') {
          const verification = StorageManager.get(STORAGE_KEYS.STUDENT_VERIFICATION, true) || {};
          verification.isVerified = isNowVerified;
          verification.isPending = data.data.status === 'pending';
          verification.status = data.data.status;
          StorageManager.set(STORAGE_KEYS.STUDENT_VERIFICATION, verification);
        }
      }
    } catch (e) {
      console.warn('auth: syncVerificationStatus failed:', e);
    }
  }

  banUser(userId, reason) {
    const key =
      (typeof STORAGE_KEY_PREFIX !== 'undefined' ? STORAGE_KEY_PREFIX : 'unihub_') + 'banned_users';
    const banned = StorageManager.get(key, true) || {};
    banned[userId] = { reason, bannedAt: new Date().toISOString() };
    StorageManager.set(key, banned);
    return { success: true };
  }

  unbanUser(userId) {
    const key =
      (typeof STORAGE_KEY_PREFIX !== 'undefined' ? STORAGE_KEY_PREFIX : 'unihub_') + 'banned_users';
    const banned = StorageManager.get(key, true) || {};
    delete banned[userId];
    StorageManager.set(key, banned);
    return { success: true };
  }

  isUserBanned(userId) {
    const key =
      (typeof STORAGE_KEY_PREFIX !== 'undefined' ? STORAGE_KEY_PREFIX : 'unihub_') + 'banned_users';
    const banned = StorageManager.get(key, true) || {};
    return !!banned[userId];
  }

  getBannedUsers() {
    const key =
      (typeof STORAGE_KEY_PREFIX !== 'undefined' ? STORAGE_KEY_PREFIX : 'unihub_') + 'banned_users';
    return StorageManager.get(key, true) || {};
  }
}

// Create singleton instance
const authManager = new AuthManager();

// Export for ES6 modules
export { AuthManager, authManager };

// Make globally available for module scripts
if (typeof window !== 'undefined') {
  window.authManager = authManager;
}
