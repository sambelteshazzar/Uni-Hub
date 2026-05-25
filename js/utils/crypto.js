// ============================================
// CRYPTO UTILITIES - General purpose helpers
// ============================================
// Password hashing is handled by bcrypt on the backend.
// This file only provides non-password crypto utilities.

class _CryptoUtil {
  static generateSalt () {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  static generateSecureToken (length = 32) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

export { _CryptoUtil as CryptoUtil };

window.CryptoUtil = _CryptoUtil;

if (typeof dispatchEvent !== 'undefined') {
  dispatchEvent(new Event('module-loaded', { detail: 'CryptoUtil' }));
}
