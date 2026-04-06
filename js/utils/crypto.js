// ============================================
// CRYPTO UTILITIES - Password hashing
// ============================================
// Uses Web Crypto API (native to modern browsers)
// For production, implement on backend with bcryptjs

class CryptoUtil {
  /**
   * Hash a password using SHA-256
   * Note: SHA-256 is not ideal for passwords (use bcrypt on backend)
   * This is a temporary measure for local storage only
   * @param {string} password - Password to hash
   * @returns {Promise<string>} - Hex-encoded hash
   */
  static async hashPassword (password) {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
   * Verify password against hash
   * @param {string} password - Plaintext password to verify
   * @param {string} hash - Hash to compare against
   * @returns {Promise<boolean>} - True if password matches hash
   */
  static async verifyPassword (password, hash) {
    if (!password || typeof password !== 'string') {
      return false;
    }

    try {
      const hashAttempt = await this.hashPassword(password);
      return hashAttempt === hash;
    } catch (error) {
      console.error('Password verification failed:', error);
      return false;
    }
  }

  /**
   * Generate a simple salt (not cryptographically secure, use bcrypt on backend)
   * @returns {string} - Random salt
   */
  static generateSalt () {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}
