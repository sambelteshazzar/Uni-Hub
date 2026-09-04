// ============================================
// FORM VALIDATION UTILITIES
// ============================================

class Validator {
  static _getPatterns() {
    return typeof VALIDATION_PATTERNS !== 'undefined' ? VALIDATION_PATTERNS : {};
  }

  static _getMessages() {
    return typeof ERROR_MESSAGES !== 'undefined' ? ERROR_MESSAGES : {};
  }

  static isValidEmail(email) {
    const patterns = this._getPatterns();
    return patterns.EMAIL ? patterns.EMAIL.test(email) : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static isValidPhone(phone) {
    const patterns = this._getPatterns();
    return patterns.PHONE ? patterns.PHONE.test(phone) : /^(\+233|0)\d{9}$/.test(phone);
  }

  static isValidPassword(password) {
    const patterns = this._getPatterns();
    return patterns.PASSWORD ? patterns.PASSWORD.test(password) : password.length >= 8;
  }

  static isValidUrl(url) {
    const patterns = this._getPatterns();
    return patterns.URL ? patterns.URL.test(url) : /^https?:\/\/.+/.test(url);
  }

  /**
   * Check if string is empty or whitespace
   * @param {string} value
   * @returns {boolean}
   */
  static isEmpty(value) {
    return !value || value.trim().length === 0;
  }

  /**
   * Check if field meets minimum length
   * @param {string} value
   * @param {number} minLength
   * @returns {boolean}
   */
  static isMinLength(value, minLength) {
    return value && value.length >= minLength;
  }

  /**
   * Check if field meets maximum length
   * @param {string} value
   * @param {number} maxLength
   * @returns {boolean}
   */
  static isMaxLength(value, maxLength) {
    return !value || value.length <= maxLength;
  }

  /**
   * Check if two values match
   * @param {any} value1
   * @param {any} value2
   * @returns {boolean}
   */
  static isMatch(value1, value2) {
    return value1 === value2;
  }

  /**
   * Validate price (must be positive number)
   * @param {number|string} price
   * @returns {boolean}
   */
  static isValidPrice(price) {
    const num = Number(price);
    return !isNaN(num) && num > 0;
  }

  /**
   * Validate all form fields
   * @param {Object} fields - Object with field: value pairs
   * @param {Object} rules - Validation rules
   * @returns {Object} - Errors object
   */
  static validateForm(fields, rules) {
    const errors = {};
    const msgs = this._getMessages();

    for (const [fieldName, rule] of Object.entries(rules)) {
      const value = fields[fieldName];

      if (rule.required && this.isEmpty(value)) {
        errors[fieldName] = msgs.FIELD_REQUIRED || 'This field is required';
        continue;
      }

      if (value && rule.type === 'email' && !this.isValidEmail(value)) {
        errors[fieldName] = msgs.INVALID_EMAIL || 'Invalid email address';
      } else if (value && rule.type === 'phone' && !this.isValidPhone(value)) {
        errors[fieldName] = msgs.INVALID_PHONE || 'Invalid phone number';
      } else if (value && rule.type === 'password' && !this.isValidPassword(value)) {
        errors[fieldName] = msgs.INVALID_PASSWORD || 'Invalid password';
      } else if (value && rule.minLength && !this.isMinLength(value, rule.minLength)) {
        errors[fieldName] = `Minimum ${rule.minLength} characters required`;
      } else if (value && rule.maxLength && !this.isMaxLength(value, rule.maxLength)) {
        errors[fieldName] = `Maximum ${rule.maxLength} characters allowed`;
      } else if (rule.match && !this.isMatch(value, fields[rule.match])) {
        errors[fieldName] = msgs.PASSWORD_MISMATCH || 'Values do not match';
      }
    }

    return errors;
  }
}

export { Validator };

// Export Validator class for static method access
if (typeof window !== 'undefined') {
  window.Validator = Validator;
}

// Also dispatch module-loaded event
if (typeof window !== 'undefined' && typeof window.dispatchEvent !== 'undefined') {
  window.dispatchEvent(new Event('module-loaded', { detail: 'Validator' }));
}
