import { VALIDATION_PATTERNS, ERROR_MESSAGES } from './constants.js';

// ============================================
// FORM VALIDATION UTILITIES
// ============================================

export class Validator {
  /**
   * Validate email address
   * @param {string} email
   * @returns {boolean}
   */
  static isValidEmail (email) {
    return VALIDATION_PATTERNS.EMAIL.test(email);
  }

  /**
   * Validate phone number (Ghana format)
   * @param {string} phone
   * @returns {boolean}
   */
  static isValidPhone (phone) {
    return VALIDATION_PATTERNS.PHONE.test(phone);
  }

  /**
   * Validate password strength
   * @param {string} password
   * @returns {boolean}
   */
  static isValidPassword (password) {
    return VALIDATION_PATTERNS.PASSWORD.test(password);
  }

  /**
   * Validate URL
   * @param {string} url
   * @returns {boolean}
   */
  static isValidUrl (url) {
    return VALIDATION_PATTERNS.URL.test(url);
  }

  /**
   * Check if string is empty or whitespace
   * @param {string} value
   * @returns {boolean}
   */
  static isEmpty (value) {
    return !value || value.trim().length === 0;
  }

  /**
   * Check if field meets minimum length
   * @param {string} value
   * @param {number} minLength
   * @returns {boolean}
   */
  static isMinLength (value, minLength) {
    return value && value.length >= minLength;
  }

  /**
   * Check if field meets maximum length
   * @param {string} value
   * @param {number} maxLength
   * @returns {boolean}
   */
  static isMaxLength (value, maxLength) {
    return !value || value.length <= maxLength;
  }

  /**
   * Check if two values match
   * @param {any} value1
   * @param {any} value2
   * @returns {boolean}
   */
  static isMatch (value1, value2) {
    return value1 === value2;
  }

  /**
   * Validate price (must be positive number)
   * @param {number|string} price
   * @returns {boolean}
   */
  static isValidPrice (price) {
    const num = Number(price);
    return !isNaN(num) && num > 0;
  }

  /**
   * Validate all form fields
   * @param {Object} fields - Object with field: value pairs
   * @param {Object} rules - Validation rules
   * @returns {Object} - Errors object
   */
  static validateForm (fields, rules) {
    const errors = {};

    for (const [fieldName, rule] of Object.entries(rules)) {
      const value = fields[fieldName];

      if (rule.required && this.isEmpty(value)) {
        errors[fieldName] = ERROR_MESSAGES.FIELD_REQUIRED;
        continue;
      }

      if (value && rule.type === 'email' && !this.isValidEmail(value)) {
        errors[fieldName] = ERROR_MESSAGES.INVALID_EMAIL;
      } else if (value && rule.type === 'phone' && !this.isValidPhone(value)) {
        errors[fieldName] = ERROR_MESSAGES.INVALID_PHONE;
      } else if (value && rule.type === 'password' && !this.isValidPassword(value)) {
        errors[fieldName] = ERROR_MESSAGES.INVALID_PASSWORD;
      } else if (value && rule.minLength && !this.isMinLength(value, rule.minLength)) {
        errors[fieldName] = `Minimum ${rule.minLength} characters required`;
      } else if (value && rule.maxLength && !this.isMaxLength(value, rule.maxLength)) {
        errors[fieldName] = `Maximum ${rule.maxLength} characters allowed`;
      } else if (rule.match && !this.isMatch(value, fields[rule.match])) {
        errors[fieldName] = ERROR_MESSAGES.PASSWORD_MISMATCH;
      }
    }

    return errors;
  }
}
