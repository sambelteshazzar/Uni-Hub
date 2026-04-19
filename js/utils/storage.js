// ============================================
// LOCAL STORAGE MANAGEMENT
// ============================================

class _StorageManager {
  /**
   * Save data to localStorage
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   */
  static set (key, value) {
    try {
      const data = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, data);
      return true;
    } catch (error) {
      console.error(`Storage error: ${error.message}`);
      return false;
    }
  }

  /**
   * Get data from localStorage
   * @param {string} key - Storage key
   * @param {boolean} parse - Whether to parse JSON
   * @returns {any} - Retrieved value
   */
  static get (key, parse = true) {
    try {
      const data = localStorage.getItem(key);
      if (!data) {return null;}
      return parse ? JSON.parse(data) : data;
    } catch (error) {
      // Corrupted data - clear it and return null
      console.warn(`Storage: Corrupted data for key "${key}", clearing...`);
      localStorage.removeItem(key);
      return null;
    }
  }

  /**
   * Remove item from localStorage
   * @param {string} key - Storage key
   */
  static remove (key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Storage error: ${error.message}`);
      return false;
    }
  }

  /**
   * Clear all app data from localStorage
   */
  static clear () {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error(`Storage error: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Storage key
   */
  static has (key) {
    return localStorage.getItem(key) !== null;
  }

  /**
   * Get all keys that match a prefix
   * @param {string} prefix - Key prefix
   */
  static getByPrefix (prefix) {
    const items = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(prefix)) {
        items[key] = this.get(key);
      }
    }
    return items;
  }

  /**
   * Get authentication token from storage
   * Tries multiple locations for backward compatibility
   * @returns {string|null} - Auth token or null if not found
   */
  static getAuthToken () {
    try {
      // Try STORAGE_KEYS.CURRENT_USER first (contains user object with token)
      const currentUser = this.get(STORAGE_KEYS.CURRENT_USER, true);
      if (currentUser && currentUser.token) {
        return currentUser.token;
      }
      // Fallback to checking raw 'authToken' key for direct token storage
      return this.get('authToken', false);
    } catch (error) {
      console.error('Error retrieving auth token from storage:', error);
      return null;
    }
  }
}

// Export singleton instance
