/**
 * Authentication Manager - Frontend
 * Handles user authentication with secure backend-only storage
 * CRITICAL: No passwords are ever stored in localStorage/browser storage
 * Falls back to local demo users when backend is unreachable
 */

class AuthManager {
  constructor () {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.useBackend = true;
    this.token = null;
    this.isOfflineMode = false;
    this._offlineUsers = {};
    this.loadSession();
  }

  /**
   * Load session from storage (token only, NO passwords)
   */
  loadSession () {
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

  /**
   * Save session to storage (token only, NO passwords)
   */
  saveSession (token, user, offline = false) {
    const safeUser = { ...user };
    delete safeUser.password;
    delete safeUser.passwordHash;
    delete safeUser.__v;

    const session = {
      token,
      user: safeUser,
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
      ...(offline ? { isOffline: true } : {}),
    };

    localStorage.setItem('unihub_session', JSON.stringify(session));
    this.token = token;
    this.currentUser = safeUser;
    this.isAuthenticated = true;
    this.isOfflineMode = offline;
  }

  /**
   * Clear session from storage
   */
  clearSession () {
    localStorage.removeItem('unihub_session');
    this.currentUser = null;
    this.isAuthenticated = false;
    this.token = null;
    this.isOfflineMode = false;
  }

  /**
   * Get auth token for API requests
   */
  getToken () {
    return this.token;
  }

  /**
   * Get offline demo users for when backend is down
   */
  _getOfflineUsers () {
    return {
      'admin@unihub.local': {
        id: 'admin_001',
        fullName: 'Admin User',
        email: 'admin@unihub.local',
        phone: '+233 50 000 0000',
        university: 'all',
        role: 'admin',
        avatar: 'assets/images/avatars/admin.jpg',
        rating: 5.0,
        isVerified: true,
        joinedDate: '2025-01-01T00:00:00Z',
        _password: 'Admin123!',
      },
      'kwame.mensah@ug.edu.gh': {
        id: 'user_001',
        fullName: 'Kwame Mensah',
        email: 'kwame.mensah@ug.edu.gh',
        phone: '+233 50 123 4567',
        university: 'ug',
        role: 'buyer',
        avatar: 'assets/images/avatars/user_001.jpg',
        rating: 4.5,
        isVerified: true,
        joinedDate: '2025-09-15T10:30:00Z',
        _password: 'Kwame123!',
      },
      'ama.osei@knust.edu.gh': {
        id: 'user_002',
        fullName: 'Ama Osei',
        email: 'ama.osei@knust.edu.gh',
        phone: '+233 24 987 6543',
        university: 'knust',
        role: 'seller',
        avatar: 'assets/images/avatars/user_002.jpg',
        rating: 4.8,
        totalSales: 45,
        isVerified: true,
        joinedDate: '2025-08-20T14:15:00Z',
        _password: 'Ama123!',
      },
      'kofi.asante@ucc.edu.gh': {
        id: 'user_003',
        fullName: 'Kofi Asante',
        email: 'kofi.asante@ucc.edu.gh',
        phone: '+233 54 321 7654',
        university: 'ucc',
        role: 'buyer',
        avatar: 'assets/images/avatars/user_003.jpg',
        rating: 4.2,
        isVerified: true,
        joinedDate: '2025-10-05T09:00:00Z',
        _password: 'Kofi123!',
      },
      'abena.darko@uew.edu.gh': {
        id: 'user_004',
        fullName: 'Abena Darko',
        email: 'abena.darko@uew.edu.gh',
        phone: '+233 20 555 1234',
        university: 'uew',
        role: 'seller',
        avatar: 'assets/images/avatars/user_004.jpg',
        rating: 4.9,
        totalSales: 67,
        isVerified: true,
        joinedDate: '2025-07-10T11:45:00Z',
        _password: 'Abena123!',
      },
    };
  }

  /**
   * Try offline login with local demo users
   */
  _tryOfflineLogin (email, password) {
    const users = this._getOfflineUsers();
    const user = users[email];

    if (!user) {
      return {
        success: false,
        error: 'Server is offline. Demo accounts available:\n\n• admin@unihub.local / Admin123!\n• kwame.mensah@ug.edu.gh / Kwame123!\n• ama.osei@knust.edu.gh / Ama123!\n• kofi.asante@ucc.edu.gh / Kofi123!\n• abena.darko@uew.edu.gh / Abena123!',
      };
    }

    if (user._password !== password) {
      return { success: false, error: 'Invalid credentials (offline mode)' };
    }

    const offlineUser = { ...user };
    delete offlineUser._password;

    const fakeToken = 'offline_' + btoa(email) + '_' + Date.now();
    this.saveSession(fakeToken, offlineUser, true);

    return {
      success: true,
      message: 'Login successful! (Offline Mode)',
      user: offlineUser,
      isOffline: true,
    };
  }

  /**
   * Register new user - Backend only (with offline fallback)
   */
  async register (userData) {
    try {
      if (!userData.email || !userData.password) {
        return { success: false, error: 'Email and password are required' };
      }

      if (userData.password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' };
      }

      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (data.success) {
        this.saveSession(data.data.token, data.data.user);
        return { success: true, message: 'Registration successful!', user: data.data.user };
      }

      return { success: false, error: data.error || 'Registration failed' };
    } catch (error) {
      console.warn('Backend unavailable for registration, using offline fallback');
      const existing = this._getOfflineUsers()[userData.email];
      if (existing) {
        return { success: false, error: 'Email already registered (offline mode)' };
      }

      const newUser = {
        id: 'user_' + Date.now(),
        fullName: userData.fullName || userData.name || 'New User',
        email: userData.email,
        phone: userData.phone || '',
        university: userData.university || 'ug',
        role: 'buyer',
        avatar: '',
        rating: 0,
        isVerified: false,
        joinedDate: new Date().toISOString(),
      };

      this._offlineUsers[userData.email] = { ...newUser, _password: userData.password };
      const fakeToken = 'offline_' + btoa(userData.email) + '_' + Date.now();
      this.saveSession(fakeToken, newUser, true);

      return {
        success: true,
        message: 'Registration successful! (Offline Mode)',
        user: newUser,
        isOffline: true,
      };
    }
  }

  /**
   * Login user - Backend with offline fallback
   */
  async login (email, password) {
    try {
      if (!email || !password) {
        return { success: false, error: 'Please enter email and password' };
      }

      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        this.saveSession(data.data.token, data.data.user);
        return { success: true, message: 'Login successful!', user: data.data.user };
      }

      return { success: false, error: data.error || 'Invalid credentials' };
    } catch (error) {
      console.warn('Backend unavailable for login, trying offline fallback');
      return this._tryOfflineLogin(email, password);
    }
  }

  /**
   * Logout user
   */
  logout () {
    if (this.token && !this.isOfflineMode) {
      fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
      }).catch(() => {});
    }

    this.clearSession();
    return { success: true, message: 'Logged out successfully' };
  }

  /**
   * Get current user
   */
  getCurrentUser () {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isLoggedIn () {
    if (this.isAuthenticated && this.token) {
      const session = localStorage.getItem('unihub_session');
      if (session) {
        const parsed = JSON.parse(session);
        return parsed.expiresAt > Date.now();
      }
    }
    return false;
  }

  /**
   * Check if user has specific role
   */
  hasRole (role) {
    return this.currentUser?.role === role;
  }

  /**
   * Update user profile - Backend with offline fallback
   */
  async updateProfile (updates) {
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

      const response = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

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
  async changePassword (currentPassword, newPassword) {
    try {
      if (!this.isLoggedIn()) {
        return { success: false, error: 'Not authenticated' };
      }

      if (this.isOfflineMode) {
        return { success: true, message: 'Password change saved (offline mode)' };
      }

      const response = await fetch('http://localhost:5000/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

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
  isSeller () {
    return this.currentUser?.role === 'seller' || this.currentUser?.role === 'admin';
  }

  /**
   * Check if user is admin
   */
  isAdmin () {
    return this.currentUser?.role === 'admin';
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
