
class AuthManager {
  constructor () {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.useBackend = true; // Backend API enabled
    this.loadUser();
  }

  /**
   * Load user from storage on init
   */
  loadUser () {
    try {
      const user = StorageManager.get(STORAGE_KEYS.CURRENT_USER, true);
      if (user) {
        this.currentUser = user;
        this.isAuthenticated = true;
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  }

  /**
   * Register new user
   * @param {Object} userData - User registration data
   */
  async register (userData) {
    try {
      // Validate input
      const errors = Validator.validateForm(userData, {
        fullName: { required: true, minLength: 3 },
        email: { required: true, type: 'email' },
        phone: { required: true, type: 'phone' },
        password: { required: true, minLength: 6 },
      });

      if (Object.keys(errors).length > 0) {
        return {
          success: false,
          error: Object.values(errors)[0],
        };
      }

      // Check if user already exists
      const users = StorageManager.get(STORAGE_KEYS.USERS, true) || [];
      const existingUser = users.find(u => u.email === userData.email);

      if (existingUser) {
        return {
          success: false,
          error: 'Email already registered',
        };
      }

      // Hash password before storage (using Web Crypto API)
      let hashedPassword;
      try {
        hashedPassword = await CryptoUtil.hashPassword(userData.password);
      } catch (hashError) {
        console.error('Password hashing failed:', hashError);
        return {
          success: false,
          error: 'Registration failed - unable to secure password',
        };
      }

      // Create new user with hashed password
      const newUser = {
        id: `user_${Date.now()}`,
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone,
        passwordHash: hashedPassword, // Store hash, never plaintext
        university: userData.university,
        level: userData.level || '',
        hall: userData.hall || '',
        role: 'buyer',
        isVerified: false,
        rating: 0,
        totalOrders: 0,
        createdAt: new Date().toISOString(),
      };

      // Save user
      users.push(newUser);
      StorageManager.set(STORAGE_KEYS.USERS, users);

      // Auto login (don't include hash in session)
      const sessionUser = { ...newUser };
      delete sessionUser.passwordHash;
      this.currentUser = sessionUser;
      this.isAuthenticated = true;
      StorageManager.set(STORAGE_KEYS.CURRENT_USER, sessionUser);

      return {
        success: true,
        message: 'Account created successfully!',
        user: sessionUser,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Registration failed',
      };
    }
  }

  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   */
  async login (email, password) {
    try {
      if (!email || !password) {
        return {
          success: false,
          error: 'Please enter email and password',
        };
      }

      // Try backend first if enabled
      if (this.useBackend) {
        try {
          const response = await api.auth.login(email, password);

          if (response.success) {
            this.currentUser = response.data.user;
            this.currentUser.token = response.data.token;
            this.isAuthenticated = true;
            StorageManager.set(STORAGE_KEYS.CURRENT_USER, this.currentUser);

            return {
              success: true,
              message: 'Login successful!',
              user: response.data.user,
            };
          }
        } catch (error) {
          // Backend unavailable - fall through to local storage
        }
      }

      // Fallback to local storage with password verification
      const users = StorageManager.get(STORAGE_KEYS.USERS, true) || [];
      const user = users.find(u => u.email === email);

      if (user) {
        // Verify hashed password
        const passwordMatch = await CryptoUtil.verifyPassword(password, user.passwordHash);

        if (passwordMatch) {
          const sessionUser = { ...user };
          delete sessionUser.passwordHash; // Never include hash in session
          this.currentUser = sessionUser;
          this.isAuthenticated = true;
          StorageManager.set(STORAGE_KEYS.CURRENT_USER, sessionUser);

          return {
            success: true,
            message: 'Login successful!',
            user: sessionUser,
          };
        }
      }

      // Check for demo admin account
      if (email === 'admin@unihub.local' && password === 'Admin123!') {
        const adminUser = {
          id: 'admin_001',
          fullName: 'Admin User',
          email: email,
          phone: '+233500000000',
          university: 'all',
          role: 'admin',
          isVerified: true,
          rating: 5.0,
        };

        this.currentUser = adminUser;
        this.isAuthenticated = true;
        StorageManager.set(STORAGE_KEYS.CURRENT_USER, adminUser);

        return {
          success: true,
          message: 'Login successful!',
          user: adminUser,
        };
      }

      return {
        success: false,
        error: 'Invalid email or password',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Login failed',
      };
    }
  }

  /**
   * Logout user
   */
  logout () {
    this.currentUser = null;
    this.isAuthenticated = false;
    StorageManager.remove(STORAGE_KEYS.CURRENT_USER);
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
    return this.isAuthenticated && this.currentUser !== null;
  }

  /**
   * Update user profile
   * @param {Object} updates - Profile updates
   */
  async updateProfile (updates) {
    try {
      if (!this.isLoggedIn()) {
        return {
          success: false,
          error: 'Not authenticated',
        };
      }

      // Update local user
      this.currentUser = { ...this.currentUser, ...updates };
      StorageManager.set(STORAGE_KEYS.CURRENT_USER, this.currentUser);

      // Update in users array
      const users = StorageManager.get(STORAGE_KEYS.USERS, true) || [];
      const index = users.findIndex(u => u.id === this.currentUser.id);
      if (index !== -1) {
        users[index] = this.currentUser;
        StorageManager.set(STORAGE_KEYS.USERS, users);
      }

      return {
        success: true,
        message: 'Profile updated successfully',
        user: this.currentUser,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Update failed',
      };
    }
  }

  /**
   * Change password
   * @param {string} currentPassword
   * @param {string} newPassword
   */
  async changePassword (currentPassword, newPassword) {
    try {
      if (!this.isLoggedIn()) {
        return {
          success: false,
          error: 'Not authenticated',
        };
      }

      // Use backend if enabled
      if (this.useBackend) {
        try {
          const response = await api.auth.changePassword(currentPassword, newPassword);
          return {
            success: true,
            message: response.message || 'Password changed successfully',
          };
        } catch (error) {
          return {
            success: false,
            error: error.data?.error || error.message || 'Password change failed',
          };
        }
      }

      // Fallback: verify current password hash
      const users = StorageManager.get(STORAGE_KEYS.USERS, true) || [];
      const user = users.find(u => u.id === this.currentUser.id);

      if (!user || !user.passwordHash) {
        return {
          success: false,
          error: 'User data not found',
        };
      }

      const passwordMatch = await CryptoUtil.verifyPassword(currentPassword, user.passwordHash);
      if (!passwordMatch) {
        return {
          success: false,
          error: 'Current password is incorrect',
        };
      }

      // Hash and store new password
      const hashedPassword = await CryptoUtil.hashPassword(newPassword);
      user.passwordHash = hashedPassword;
      StorageManager.set(STORAGE_KEYS.USERS, users);

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Password change failed',
      };
    }
  }
}

// Create singleton instance
const authManager = new AuthManager();
