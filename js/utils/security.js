/**
 * Security Utilities
 * XSS Prevention, Input Sanitization, and Security Helpers
 */

class SecurityUtils {
  /**
   * Escape HTML special characters to prevent XSS
   * @param {string} text - Raw text input
   * @returns {string} - Escaped HTML-safe string
   */
  static escapeHtml (text) {
    if (typeof text !== 'string') return '';

    const htmlEscapes = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;',
    };

    return text.replace(/[&<>"'`=/]/g, char => htmlEscapes[char] || char);
  }

  /**
   * Sanitize user input before display
   * @param {string} input - User input
   * @returns {string} - Sanitized string
   */
  static sanitizeInput (input) {
    if (!input) return '';

    // Convert to string
    let sanitized = String(input);

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Remove control characters except newlines and tabs
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    // Escape HTML
    return this.escapeHtml(sanitized);
  }

  /**
   * Sanitize object recursively
   * @param {Object} obj - Object to sanitize
   * @returns {Object} - Sanitized object
   */
  static sanitizeObject (obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeInput(value);
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Sanitize URL to prevent javascript: protocol attacks
   * @param {string} url - URL to sanitize
   * @returns {string|null} - Safe URL or null
   */
  static sanitizeUrl (url) {
    if (!url) return null;

    try {
      const parsed = new URL(url, window.location.origin);

      // Block javascript: data: and other dangerous protocols
      const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];
      const protocol = parsed.protocol.toLowerCase();

      if (dangerousProtocols.some(p => protocol.startsWith(p))) {
        console.warn('Blocked dangerous URL protocol:', protocol);
        return null;
      }

      // Only allow http: https: and relative URLs
      if (protocol !== 'http:' && protocol !== 'https:' && url[0] !== '/') {
        return null;
      }

      return parsed.href;
    } catch {
      // If URL parsing fails, check if it's a relative URL
      if (url.startsWith('/') || url.startsWith('#')) {
        return url;
      }
      return null;
    }
  }

  /**
   * Validate and sanitize email address
   * @param {string} email - Email to validate
   * @returns {Object} - { valid: boolean, sanitized: string|null }
   */
  static validateEmail (email) {
    if (!email || typeof email !== 'string') {
      return { valid: false, sanitized: null };
    }

    // Remove whitespace and lowercase
    const sanitized = email.trim().toLowerCase();

    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return {
      valid: emailRegex.test(sanitized),
      sanitized: sanitized,
    };
  }

  /**
   * Create a safe HTML string for display
   * Only allows specific safe HTML tags
   * @param {string} html - HTML string
   * @returns {string} - Sanitized HTML with only allowed tags
   */
  static sanitizeHtml (html) {
    if (!html) return '';

    // Allowed tags (whitelist)
    const allowedTags = {
      p: [],
      br: [],
      strong: [],
      b: [],
      em: [],
      i: [],
      u: [],
      span: ['class'],
      a: ['href', 'target', 'rel'],
      ul: [],
      ol: [],
      li: [],
    };

    // Strip all tags first
    let sanitized = html.replace(/<[^>]*>/g, match => {
      const tagMatch = match.match(/^<\/?([a-z][a-z0-9]*)[^>]*>$/i);
      if (!tagMatch) return '';

      const tagName = tagMatch[1].toLowerCase();
      const isClosing = match.startsWith('</');

      if (!allowedTags[tagName]) return '';

      if (isClosing) {
        return `</${tagName}>`;
      }

      // Extract allowed attributes
      const allowedAttrs = allowedTags[tagName];
      let attrs = '';

      if (allowedAttrs.length > 0) {
        const attrRegex = /([a-z-]+)=["']([^"']*)["']/gi;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(match)) !== null) {
          const attrName = attrMatch[1].toLowerCase();
          const attrValue = attrMatch[2];

          if (allowedAttrs.includes(attrName)) {
            if (attrName === 'href') {
              const safeUrl = this.sanitizeUrl(attrValue);
              if (safeUrl) {
                attrs += ` ${attrName}="${this.escapeHtml(safeUrl)}"`;
              }
            } else {
              attrs += ` ${attrName}="${this.escapeHtml(attrValue)}"`;
            }
          }
        }
      }

      return `<${tagName}${attrs}>`;
    });

    return sanitized;
  }

  /**
   * Generate a cryptographically secure random token
   * @param {number} length - Token length
   * @returns {string} - Random token
   */
  static generateSecureToken (length = 32) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Hash a string using SHA-256 (for non-password use)
   * @param {string} data - Data to hash
   * @returns {Promise<string>} - SHA-256 hash
   */
  static async hashData (data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Check if string contains potential XSS patterns
   * @param {string} input - Input to check
   * @returns {boolean} - True if suspicious
   */
  static containsXssPatterns (input) {
    if (typeof input !== 'string') return false;

    const xssPatterns = [
      /<script[^>]*>/i,
      /<\/script>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /<form/i,
      /eval\s*\(/i,
      /expression\s*\(/i,
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Safe text truncation that prevents XSS
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} - Truncated text
   */
  static safeTruncate (text, maxLength = 100) {
    const sanitized = this.sanitizeInput(text);
    if (sanitized.length <= maxLength) return sanitized;
    return sanitized.substring(0, maxLength) + '...';
  }
}

// Export for ES6 modules
export { SecurityUtils };

// Make globally available
if (typeof window !== 'undefined') {
  window.SecurityUtils = SecurityUtils;
}
