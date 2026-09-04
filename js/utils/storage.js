// ============================================
// LOCAL STORAGE MANAGEMENT
// ============================================

class StorageManager {
  /**
   * Save data to localStorage
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   */
  static set(key, value) {
    try {
      // Always JSON-encode so round-tripping through get(parse=true) works.
      // (Previously a bare string was written as-is, which JSON.parse on
      // read would reject as 'Corrupted data' for non-JSON values like
      // 'atu'.)
      const data = JSON.stringify(value);
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
  static get(key, parse = true) {
    try {
      const data = localStorage.getItem(key);
      if (!data) {
        return null;
      }
      return parse ? JSON.parse(data) : data;
    } catch (error) {
      // Corrupted data - clear it and return null
      console.warn(`Storage: Corrupted data for key "${key}", clearing...`);
      try {
        localStorage.removeItem(key);
      } catch (e) {
        /* Safari private */
      }
      return null;
    }
  }

  /**
   * Remove item from localStorage
   * @param {string} key - Storage key
   */
  static remove(key) {
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
  static clear() {
    try {
      if (typeof STORAGE_KEYS !== 'undefined') {
        Object.values(STORAGE_KEYS).forEach(key => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            /* Safari private */
          }
        });
      }
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
  static has(key) {
    try {
      return localStorage.getItem(key) !== null;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get all keys that match a prefix
   * @param {string} prefix - Key prefix
   */
  static getByPrefix(prefix) {
    const items = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(prefix)) {
          items[key] = this.get(key);
        }
      }
    } catch (e) {
      console.warn('localStorage unavailable:', e);
    }
    return items;
  }

  /**
   * Get authentication token from storage
   * Uses 'unihub_session' (authManager's storage key)
   * @returns {string|null} - Auth token or null if not found
   */
  static getAuthToken() {
    try {
      const session = this.get('unihub_session', true);
      if (session && session.token) {
        return session.token;
      }
      if (typeof STORAGE_KEYS !== 'undefined') {
        const sessionFromKey = this.get(STORAGE_KEYS.SESSION, true);
        if (sessionFromKey && sessionFromKey.token) {
          return sessionFromKey.token;
        }
      }
      return null;
    } catch (error) {
      console.error('Error retrieving auth token from storage:', error);
      return null;
    }
  }
}

// Export class for use across module scripts
export { StorageManager };

if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
}
