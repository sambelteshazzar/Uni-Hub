// ============================================
// SECURITY & UTILITY FIXES
// Drop-in replacements for common issues
// ============================================

// 1. INPUT SANITIZATION
// Prevents XSS attacks
class Sanitizer {
  /**
   * Sanitize string to prevent XSS
   * @param {string} str - String to sanitize
   * @returns {string} - Sanitized string
   */
  static sanitize(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Sanitize HTML (allow safe tags)
   * @param {string} html - HTML to sanitize
   * @returns {string} - Sanitized HTML
   */
  static sanitizeHTML(html) {
    const allowedTags = ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'ul', 'li'];
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    const elements = temp.querySelectorAll('*');
    elements.forEach(el => {
      if (!allowedTags.includes(el.tagName.toLowerCase())) {
        el.replaceWith(...el.childNodes);
      }
    });
    
    return temp.innerHTML;
  }

  /**
   * Escape special characters
   * @param {string} str - String to escape
   * @returns {string} - Escaped string
   */
  static escape(str) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return str.replace(/[&<>"']/g, m => map[m]);
  }
}

// 2. ERROR HANDLING UTILITIES
// Better error handling for async operations
class ErrorHandler {
  /**
   * Handle async operation with retry
   * @param {Function} operation - Async operation
   * @param {number} retries - Number of retries
   * @returns {any} - Result
   */
  static async withRetry(operation, retries = 3) {
    let lastError;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${i + 1} failed:`, error.message);
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Handle async operation with loading state
   * @param {Function} operation - Async operation
   * @param {Function} onLoading - Loading state handler
   * @returns {any} - Result
   */
  static async withLoading(operation, onLoading) {
    onLoading(true);
    try {
      return await operation();
    } catch (error) {
      console.error('Operation failed:', error);
      throw error;
    } finally {
      onLoading(false);
    }
  }

  /**
   * Show user-friendly error message
   * @param {Error} error - Error object
   * @returns {string} - User-friendly message
   */
  static getUserMessage(error) {
    const errorMessages = {
      'NetworkError': 'Unable to connect. Please check your internet connection.',
      'TimeoutError': 'Request timed out. Please try again.',
      'ValidationError': 'Please check your input and try again.',
      'AuthError': 'Authentication failed. Please login again.'
    };

    for (const [key, message] of Object.entries(errorMessages)) {
      if (error.name === key || error.message.includes(key)) {
        return message;
      }
    }

    return 'Something went wrong. Please try again.';
  }
}

// 3. FORM VALIDATION IMPROVEMENTS
// Inline error display
class FormValidator {
  /**
   * Show inline error for form field
   * @param {string} fieldId - Field ID
   * @param {string} message - Error message
   */
  static showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    const formGroup = field.closest('.form-group');
    if (!formGroup) return;

    let errorDiv = formGroup.querySelector('.error-message');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.style.cssText = 'color: var(--danger); font-size: 0.875rem; margin-top: 0.25rem; display: none;';
      formGroup.appendChild(errorDiv);
    }

    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    field.classList.add('error');
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', `${fieldId}-error`);
    errorDiv.id = `${fieldId}-error`;
  }

  /**
   * Clear error for form field
   * @param {string} fieldId - Field ID
   */
  static clearError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    const formGroup = field.closest('.form-group');
    if (!formGroup) return;

    const errorDiv = formGroup.querySelector('.error-message');
    if (errorDiv) {
      errorDiv.style.display = 'none';
      errorDiv.textContent = '';
    }

    field.classList.remove('error');
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
  }

  /**
   * Clear all errors in form
   * @param {HTMLFormElement} form - Form element
   */
  static clearAllErrors(form) {
    const errorDivs = form.querySelectorAll('.error-message');
    errorDivs.forEach(div => {
      div.style.display = 'none';
      div.textContent = '';
    });

    const errorFields = form.querySelectorAll('.error');
    errorFields.forEach(field => field.classList.remove('error'));
  }

  /**
   * Validate required field
   * @param {HTMLInputElement} field - Field element
   * @returns {boolean} - Is valid
   */
  static validateRequired(field) {
    if (!field.value || field.value.trim() === '') {
      this.showError(field.id, 'This field is required');
      return false;
    }
    this.clearError(field.id);
    return true;
  }

  /**
   * Validate email field
   * @param {HTMLInputElement} field - Field element
   * @returns {boolean} - Is valid
   */
  static validateEmail(field) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(field.value)) {
      this.showError(field.id, 'Please enter a valid email address');
      return false;
    }
    this.clearError(field.id);
    return true;
  }

  /**
   * Validate phone field (Ghana format)
   * @param {HTMLInputElement} field - Field element
   * @returns {boolean} - Is valid
   */
  static validatePhone(field) {
    const phoneRegex = /^(\+233|0)[0-9]{9}$/;
    if (!phoneRegex.test(field.value)) {
      this.showError(field.id, 'Please enter a valid Ghana phone number');
      return false;
    }
    this.clearError(field.id);
    return true;
  }

  /**
   * Validate password strength
   * @param {HTMLInputElement} field - Field element
   * @returns {boolean} - Is valid
   */
  static validatePassword(field) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(field.value)) {
      this.showError(field.id, 'Password must be 8+ chars with uppercase, lowercase, number, and special character');
      return false;
    }
    this.clearError(field.id);
    return true;
  }
}

// 4. LOADING STATE MANAGER
// Show/hide loading indicators
class LoadingManager {
  constructor() {
    this.loadingCount = 0;
  }

  /**
   * Show loading indicator
   * @param {string} targetId - Target element ID (optional)
   */
  show(targetId = null) {
    this.loadingCount++;
    
    if (targetId) {
      const target = document.getElementById(targetId);
      if (target) {
        target.style.opacity = '0.5';
        target.style.pointerEvents = 'none';
      }
    } else {
      const overlay = document.createElement('div');
      overlay.id = 'loading-overlay';
      overlay.className = 'loading-overlay';
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      `;
      overlay.innerHTML = `
        <div class="loading-spinner" style="
          width: 50px;
          height: 50px;
          border: 3px solid white;
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        "></div>
      `;
      document.body.appendChild(overlay);
    }
  }

  /**
   * Hide loading indicator
   * @param {string} targetId - Target element ID (optional)
   */
  hide(targetId = null) {
    this.loadingCount--;
    
    if (this.loadingCount <= 0) {
      this.loadingCount = 0;
      
      if (targetId) {
        const target = document.getElementById(targetId);
        if (target) {
          target.style.opacity = '1';
          target.style.pointerEvents = 'auto';
        }
      } else {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
          overlay.remove();
        }
      }
    }
  }

  /**
   * Execute operation with loading state
   * @param {Function} operation - Async operation
   * @param {string} targetId - Target element ID (optional)
   * @returns {any} - Result
   */
  async wrap(operation, targetId = null) {
    this.show(targetId);
    try {
      return await operation();
    } finally {
      this.hide(targetId);
    }
  }
}

// Create singleton instances
const loadingManager = new LoadingManager();

// 5. CART BACKUP/RESTORE
// Prevent data loss during checkout
class CartBackup {
  /**
   * Backup cart before checkout
   */
  static backup() {
    const cartItems = cartManager.getItems();
    StorageManager.set('checkout_cart_backup', cartItems);
    StorageManager.set('checkout_backup_time', Date.now());
  }

  /**
   * Restore cart from backup
   * @returns {boolean} - Success
   */
  static restore() {
    const backup = StorageManager.get('checkout_cart_backup', true);
    const backupTime = StorageManager.get('checkout_backup_time');
    
    // Only restore if backup is less than 1 hour old
    if (!backup || !backupTime || Date.now() - backupTime > 3600000) {
      return false;
    }

    backup.forEach(item => {
      cartManager.add(item.product, item.quantity);
    });

    this.clear();
    return true;
  }

  /**
   * Clear backup
   */
  static clear() {
    StorageManager.remove('checkout_cart_backup');
    StorageManager.remove('checkout_backup_time');
  }

  /**
   * Check if backup exists
   * @returns {boolean}
   */
  static hasBackup() {
    return StorageManager.has('checkout_cart_backup');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Sanitizer,
    ErrorHandler,
    FormValidator,
    LoadingManager,
    CartBackup,
    loadingManager
  };
}
