/* exported toastManager */
// ============================================
// TOAST NOTIFICATION MODULE
// ============================================

class ToastManager {
  constructor () {
    this.container = null;
    this.toasts = [];
    this.defaultDuration = 3000;
  }

  /**
   * Initialize toast container
   */
  init () {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  }

  /**
   * Show a toast notification
   * @param {string} message - Message to display
   * @param {string} type - Type: success, error, warning, info
   * @param {string} title - Optional title
   * @param {number} duration - Duration in milliseconds
   */
  show (message, type = 'info', title = null, duration = null) {
    this.init();

    const toastId = this.generateId();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.dataset.toastId = toastId;

    const icon = this.getIconForType(type);
    const toastTitle = title || this.getDefaultTitle(type);

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        <div class="toast-title">${toastTitle}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" onclick="toastManager.dismiss('${toastId}')">×</button>
    `;

    this.container.appendChild(toast);
    this.toasts.push({ id: toastId, element: toast });

    // Auto dismiss after duration
    const toastDuration = duration || this.defaultDuration;
    if (toastDuration > 0) {
      setTimeout(() => {
        this.dismiss(toastId);
      }, toastDuration);
    }

    return toastId;
  }

  /**
   * Dismiss a toast
   * @param {string} toastId - Toast ID
   */
  dismiss (toastId) {
    const toastIndex = this.toasts.findIndex(t => t.id === toastId);
    if (toastIndex === -1) {
      return;
    }

    const toast = this.toasts[toastIndex];
    toast.element.style.animation = 'slideOut 0.3s ease-out forwards';

    setTimeout(() => {
      toast.element.remove();
      this.toasts.splice(toastIndex, 1);
    }, 300);
  }

  /**
   * Show success toast
   * @param {string} message - Message
   * @param {string} title - Optional title
   * @param {number} duration - Duration
   */
  success (message, title = 'Success', duration = null) {
    return this.show(message, 'success', title, duration);
  }

  /**
   * Show error toast
   * @param {string} message - Message
   * @param {string} title - Optional title
   * @param {number} duration - Duration
   */
  error (message, title = 'Error', duration = null) {
    return this.show(message, 'error', title, duration);
  }

  /**
   * Show warning toast
   * @param {string} message - Message
   * @param {string} title - Optional title
   * @param {number} duration - Duration
   */
  warning (message, title = 'Warning', duration = null) {
    return this.show(message, 'warning', title, duration);
  }

  /**
   * Show info toast
   * @param {string} message - Message
   * @param {string} title - Optional title
   * @param {number} duration - Duration
   */
  info (message, title = 'Info', duration = null) {
    return this.show(message, 'info', title, duration);
  }

  /**
   * Show order-related toast
   * @param {string} message - Message
   * @param {string} title - Optional title
   */
  order (message, title = 'Order Update') {
    return this.show(message, 'toast-order', title, 5000);
  }

  /**
   * Show payment-related toast
   * @param {string} message - Message
   * @param {string} title - Optional title
   */
  payment (message, title = 'Payment Update') {
    return this.show(message, 'toast-payment', title, 5000);
  }

  /**
   * Show delivery-related toast
   * @param {string} message - Message
   * @param {string} title - Optional title
   */
  delivery (message, title = 'Delivery Update') {
    return this.show(message, 'toast-delivery', title, 5000);
  }

  /**
   * Get icon for toast type
   * @param {string} type - Toast type
   * @returns {string} - Icon emoji
   */
  getIconForType (type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
      'toast-order': '📦',
      'toast-payment': '💳',
      'toast-delivery': '🚚',
    };
    return icons[type] || icons.info;
  }

  /**
   * Get default title for toast type
   * @param {string} type - Toast type
   * @returns {string} - Default title
   */
  getDefaultTitle (type) {
    const titles = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Information',
      'toast-order': 'Order Update',
      'toast-payment': 'Payment Update',
      'toast-delivery': 'Delivery Update',
    };
    return titles[type] || 'Notification';
  }

  /**
   * Generate unique ID
   * @returns {string}
   */
  generateId () {
    return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all toasts
   */
  clearAll () {
    this.toasts.forEach(toast => {
      toast.element.remove();
    });
    this.toasts = [];
  }

  /**
   * Get active toast count
   * @returns {number}
   */
  getCount () {
    return this.toasts.length;
  }
}

// Create singleton instance
const toastManager = new ToastManager();
