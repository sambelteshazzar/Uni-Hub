/* exported notificationManager */
// ============================================
// NOTIFICATIONS MODULE - Notification System
// ============================================

class NotificationManager {
  constructor () {
    this.NOTIFICATION_STORAGE_KEY = `${STORAGE_KEY_PREFIX}notifications`;
    this.notifications = [];
    this.listeners = [];
    // Only load if StorageManager is available
    if (typeof StorageManager !== 'undefined' && typeof StorageManager.get === 'function') {
      this.load();
    }
  }

  /**
   * Load notifications from localStorage
   */
  load () {
    const notifications = StorageManager.get(this.NOTIFICATION_STORAGE_KEY, true);
    this.notifications = notifications || [];
  }

  /**
   * Save notifications to localStorage
   */
  save () {
    StorageManager.set(this.NOTIFICATION_STORAGE_KEY, this.notifications);
  }

  /**
   * Create a new notification
   * @param {Object} notification - Notification object
   * @returns {Object} - Created notification
   */
  create (notification) {
    const newNotification = {
      id: this.generateId(),
      type: notification.type || 'info',
      title: notification.title,
      message: notification.message,
      icon: notification.icon || this.getDefaultIcon(notification.type),
      read: false,
      createdAt: new Date().toISOString(),
      expiresAt: notification.expiresAt || null,
    };

    this.notifications.unshift(newNotification);
    this.save();
    this.notifyListeners();

    // Show toast
    this.showToast(newNotification);

    return newNotification;
  }

  /**
   * Show toast notification
   * @param {Object} notification - Notification object
   */
  showToast (notification) {
    const toastContainer = document.querySelector('.toast-container');

    if (!toastContainer) {
      // Create toast container if it doesn't exist
      const container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${notification.type}`;
    toast.innerHTML = `
      <div class="toast-icon">${notification.icon}</div>
      <div class="toast-content">
        <div class="toast-title">${notification.title}</div>
        <div class="toast-message">${notification.message}</div>
      </div>
      <button class="toast-close" onclick="notificationManager.dismissToast(this)">×</button>
    `;

    document.querySelector('.toast-container').appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
      this.dismissToast(toast);
    }, 5000);
  }

  /**
   * Dismiss toast
   * @param {HTMLElement} toast - Toast element
   */
  dismissToast (toast) {
    if (toast && toast.parentNode) {
      toast.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }
  }

  /**
   * Get default icon for notification type
   * @param {string} type - Notification type
   * @returns {string}
   */
  getDefaultIcon (type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      order: '📦',
      payment: '💳',
      delivery: '🚚',
      message: '💬',
      system: '🔔',
    };
    return icons[type] || 'ℹ️';
  }

  /**
   * Generate unique ID
   * @returns {string}
   */
  generateId () {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all notifications
   * @param {Object} options - Filter options
   * @returns {Array}
   */
  getAll (options = {}) {
    let notifications = [...this.notifications];

    // Filter by type
    if (options.type) {
      notifications = notifications.filter(n => n.type === options.type);
    }

    // Filter by read status
    if (options.read !== undefined) {
      notifications = notifications.filter(n => n.read === options.read);
    }

    // Filter by date range
    if (options.startDate) {
      notifications = notifications.filter(
        n => new Date(n.createdAt) >= new Date(options.startDate),
      );
    }

    if (options.endDate) {
      notifications = notifications.filter(n => new Date(n.createdAt) <= new Date(options.endDate));
    }

    // Remove expired notifications
    const now = new Date();
    notifications = notifications.filter(n => !n.expiresAt || new Date(n.expiresAt) > now);

    return notifications;
  }

  /**
   * Get unread notification count
   * @returns {number}
   */
  getUnreadCount () {
    return this.notifications.filter(n => !n.read).length;
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Object}
   */
  markAsRead (notificationId) {
    const index = this.notifications.findIndex(n => n.id === notificationId);

    if (index === -1) {
      return {
        success: false,
        error: 'Notification not found',
      };
    }

    this.notifications[index].read = true;
    this.save();
    this.notifyListeners();

    return {
      success: true,
      message: 'Notification marked as read',
    };
  }

  /**
   * Mark all notifications as read
   * @returns {Object}
   */
  markAllAsRead () {
    this.notifications.forEach(n => {
      n.read = true;
    });
    this.save();
    this.notifyListeners();

    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }

  /**
   * Delete notification
   * @param {string} notificationId - Notification ID
   * @returns {Object}
   */
  delete (notificationId) {
    const index = this.notifications.findIndex(n => n.id === notificationId);

    if (index === -1) {
      return {
        success: false,
        error: 'Notification not found',
      };
    }

    this.notifications.splice(index, 1);
    this.save();
    this.notifyListeners();

    return {
      success: true,
      message: 'Notification deleted',
    };
  }

  /**
   * Delete all notifications
   * @returns {Object}
   */
  deleteAll () {
    this.notifications = [];
    this.save();
    this.notifyListeners();

    return {
      success: true,
      message: 'All notifications deleted',
    };
  }

  /**
   * Delete read notifications
   * @returns {Object}
   */
  deleteRead () {
    this.notifications = this.notifications.filter(n => !n.read);
    this.save();
    this.notifyListeners();

    return {
      success: true,
      message: 'Read notifications deleted',
    };
  }

  /**
   * Create order notification
   * @param {Object} order - Order object
   */
  orderCreated (order) {
    this.create({
      type: 'order',
      title: 'Order Placed',
      message: `Your order #${order.orderNumber} has been placed successfully!`,
    });
  }

  /**
   * Create payment notification
   * @param {Object} payment - Payment object
   */
  paymentReceived (payment) {
    this.create({
      type: 'payment',
      title: 'Payment Received',
      message: `Payment of GHS ${payment.amount} received for order #${payment.orderNumber}`,
    });
  }

  /**
   * Create delivery notification
   * @param {Object} delivery - Delivery object
   */
  deliveryUpdate (delivery) {
    this.create({
      type: 'delivery',
      title: 'Delivery Update',
      message: `Your order is now ${delivery.status}. ${delivery.estimatedTime}`,
    });
  }

  /**
   * Create system notification
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   */
  system (title, message) {
    this.create({
      type: 'system',
      title: title,
      message: message,
    });
  }

  /**
   * Create success notification
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   */
  success (title, message) {
    this.create({
      type: 'success',
      title: title,
      message: message,
    });
  }

  /**
   * Create error notification
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   */
  error (title, message) {
    this.create({
      type: 'error',
      title: title,
      message: message,
    });
  }

  /**
   * Create warning notification
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   */
  warning (title, message) {
    this.create({
      type: 'warning',
      title: title,
      message: message,
    });
  }

  /**
   * Create info notification
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   */
  info (title, message) {
    this.create({
      type: 'info',
      title: title,
      message: message,
    });
  }

  /**
   * Register listener for notification changes
   * @param {Function} listener - Listener function
   */
  addListener (listener) {
    this.listeners.push(listener);
  }

  /**
   * Remove listener
   * @param {Function} listener - Listener function
   */
  removeListener (listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Notify all listeners
   */
  notifyListeners () {
    this.listeners.forEach(listener => {
      try {
        listener(this.notifications);
      } catch (error) {
        console.error('Notification listener error:', error);
      }
    });
  }

  /**
   * Render notifications dropdown
   * @returns {string}
   */
  renderDropdown () {
    const notifications = this.getAll().slice(0, 10);
    const unreadCount = this.getUnreadCount();

    if (notifications.length === 0) {
      return `
        <div class="notifications-dropdown">
          <div class="notifications-header">
            <h3>Notifications</h3>
            <span class="notifications-badge">${unreadCount}</span>
          </div>
          <div class="notifications-empty">
            <div class="empty-icon">🔔</div>
            <p>No notifications yet</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="notifications-dropdown">
        <div class="notifications-header">
          <h3>Notifications</h3>
          <span class="notifications-badge">${unreadCount}</span>
        </div>
        <div class="notifications-list">
          ${notifications
    .map(
      n => `
            <div class="notification-item ${n.read ? 'read' : 'unread'}" data-id="${n.id}">
              <div class="notification-icon">${n.icon}</div>
              <div class="notification-content">
                <div class="notification-title">${n.title}</div>
                <div class="notification-message">${n.message}</div>
                <div class="notification-time">${this.formatTime(n.createdAt)}</div>
              </div>
              <button class="notification-close" onclick="notificationManager.delete('${n.id}')">×</button>
            </div>
          `,
    )
    .join('')}
        </div>
        <div class="notifications-footer">
          <button class="btn btn-outline btn-sm btn-block" onclick="notificationManager.markAllAsRead()">
            Mark all as read
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Format notification time
   * @param {string} dateString - ISO date string
   * @returns {string}
   */
  formatTime (dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return Formatter.formatDate(dateString, 'short');
    }
  }
}

// Create singleton instance
const _notificationManager = new NotificationManager();
