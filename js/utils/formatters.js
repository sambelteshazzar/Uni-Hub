// ============================================
// FORMAT & DISPLAY UTILITIES
// ============================================

class Formatter {
  /**
   * Format price with currency
   * @param {number} price - Price in base units
   * @param {string} currency - Currency code (default: GHS)
   * @returns {string}
   */
  static formatPrice(price, currency = 'GHS') {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  }

  /**
   * Format date to readable format
   * @param {string|Date} date
   * @param {string} format - 'short' or 'long'
   * @returns {string}
   */
  static formatDate(date, format = 'short') {
    const dateObj = date instanceof Date ? date : new Date(date);

    if (format === 'long') {
      return dateObj.toLocaleDateString('en-GH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    return dateObj.toLocaleDateString('en-GH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Format time relative to now (e.g., "2 days ago")
   * @param {string|Date} date
   * @returns {string}
   */
  static formatTimeAgo(date) {
    const dateObj = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const seconds = Math.floor((now - dateObj) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) {
      return Math.floor(interval) + ' years ago';
    }

    interval = seconds / 2592000;
    if (interval > 1) {
      return Math.floor(interval) + ' months ago';
    }

    interval = seconds / 86400;
    if (interval > 1) {
      return Math.floor(interval) + ' days ago';
    }

    interval = seconds / 3600;
    if (interval > 1) {
      return Math.floor(interval) + ' hours ago';
    }

    interval = seconds / 60;
    if (interval > 1) {
      return Math.floor(interval) + ' minutes ago';
    }

    return Math.floor(seconds) + ' seconds ago';
  }

  /**
   * Truncate text to specified length
   * @param {string} text
   * @param {number} length
   * @param {string} suffix - Default: '...'
   * @returns {string}
   */
  static truncate(text, length, suffix = '...') {
    return text.length > length ? text.substring(0, length) + suffix : text;
  }

  /**
   * Capitalize first letter of string
   * @param {string} text
   * @returns {string}
   */
  static capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /**
   * Capitalizes first letter of each word
   * @param {string} text
   * @returns {string}
   */
  static toTitleCase(text) {
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Format phone number
   * @param {string} phone
   * @returns {string}
   */
  static formatPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `${match[1]} ${match[2]} ${match[3]}`;
    }
    return phone;
  }

  /**
   * Format rating with stars
   * @param {number} rating
   * @returns {string}
   */
  static formatRating(rating) {
    const stars = Math.round(rating);
    const fullStar = '★';
    const emptyStar = '☆';
    return fullStar.repeat(stars) + emptyStar.repeat(5 - stars);
  }

  /**
   * Format number with thousand separators
   * @param {number} num
   * @returns {string}
   */
  static formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * Get condition label with icon
   * @param {string} condition - fair, good, excellent
   * @returns {string}
   */
  static getConditionBadge(condition) {
    const badges = {
      fair: '🟡 Fair',
      good: '🟢 Good',
      excellent: '🔵 Excellent',
    };
    return badges[condition] || condition;
  }

  /**
   * Get safe image URL with fallback
   * @param {string} url
   * @param {string} fallback
   * @returns {string}
   */
  static getImageUrl(url, fallback = 'assets/images/products/no-image.svg') {
    return url || fallback;
  }
}
