// ============================================
// ADMIN ORDERS MODULE - Order Management
// ============================================
/* exported adminOrdersManager */

class AdminOrdersManager {
  constructor () {
    this.ORDERS_STORAGE_KEY = `${STORAGE_KEY_PREFIX}orders`;
  }

  /**
   * Get all orders
   * @returns {Array}
   */
  getAllOrders () {
    return checkoutManager.getAllOrders();
  }

  /**
   * Get order by ID
   * @param {string} orderId - Order ID
   * @returns {Object|null}
   */
  getOrderById (orderId) {
    return checkoutManager.getOrderById(orderId);
  }

  /**
   * Get orders by status
   * @param {string} status - Order status
   * @returns {Array}
   */
  getOrdersByStatus (status) {
    return this.getAllOrders().filter(o => o.status === status);
  }

  /**
   * Get orders by user
   * @param {string} userId - User ID
   * @returns {Array}
   */
  getOrdersByUser (userId) {
    return this.getAllOrders().filter(o => o.userId === userId);
  }

  /**
   * Get orders by date range
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Array}
   */
  getOrdersByDateRange (startDate, endDate) {
    return this.getAllOrders().filter(
      o =>
        new Date(o.createdAt) >= new Date(startDate) && new Date(o.createdAt) <= new Date(endDate),
    );
  }

  /**
   * Update order status
   * @param {string} orderId - Order ID
   * @param {string} status - New status
   * @returns {Object}
   */
  updateOrderStatus (orderId, status) {
    const result = checkoutManager.updateOrderStatus(orderId, status);

    if (result.success) {
      adminAuthManager.logActivity('Order status updated', { orderId, status });
    }

    return result;
  }

  /**
   * Cancel order
   * @param {string} orderId - Order ID
   * @param {string} reason - Cancellation reason
   * @returns {Object}
   */
  cancelOrder (orderId, reason) {
    const order = this.getOrderById(orderId);

    if (!order) {
      return {
        success: false,
        error: 'Order not found',
      };
    }

    if (order.status === ORDER_STATUS.DELIVERED) {
      return {
        success: false,
        error: 'Cannot cancel a delivered order',
      };
    }

    const result = this.updateOrderStatus(orderId, ORDER_STATUS.CANCELLED);

    if (result.success) {
      // Store cancellation reason
      const orders = this.getAllOrders();
      const index = orders.findIndex(o => o.id === orderId);
      if (index !== -1) {
        orders[index].cancellationReason = reason;
        orders[index].cancelledAt = new Date().toISOString();
        StorageManager.set(this.ORDERS_STORAGE_KEY, orders);
      }
    }

    adminAuthManager.logActivity('Order cancelled', { orderId, reason });

    return result;
  }

  /**
   * Refund order
   * @param {string} orderId - Order ID
   * @param {string} reason - Refund reason
   * @returns {Object}
   */
  refundOrder (orderId, reason) {
    const order = this.getOrderById(orderId);

    if (!order) {
      return {
        success: false,
        error: 'Order not found',
      };
    }

    if (order.payment.status !== 'completed') {
      return {
        success: false,
        error: 'Cannot refund an unpaid order',
      };
    }

    // Process refund
    order.payment.status = 'refunded';
    order.payment.refundReason = reason;
    order.payment.refundedAt = new Date().toISOString();
    order.status = ORDER_STATUS.CANCELLED;
    order.updatedAt = new Date().toISOString();

    const orders = this.getAllOrders();
    const index = orders.findIndex(o => o.id === orderId);
    orders[index] = order;
    StorageManager.set(this.ORDERS_STORAGE_KEY, orders);

    adminAuthManager.logActivity('Order refunded', {
      orderId,
      reason,
      amount: order.pricing.grandTotal,
    });

    return {
      success: true,
      message: 'Refund processed successfully',
      order: order,
    };
  }

  /**
   * Get order statistics
   * @returns {Object}
   */
  getStats () {
    const orders = this.getAllOrders();

    const statusCount = {};
    const paymentModeCount = {};
    const deliveryModeCount = {};
    let totalRevenue = 0;
    let totalRefunds = 0;

    orders.forEach(o => {
      statusCount[o.status] = (statusCount[o.status] || 0) + 1;
      paymentModeCount[o.payment.mode] = (paymentModeCount[o.payment.mode] || 0) + 1;
      deliveryModeCount[o.delivery.mode] = (deliveryModeCount[o.delivery.mode] || 0) + 1;

      if (o.payment.status === 'completed') {
        totalRevenue += o.pricing.grandTotal;
      }

      if (o.payment.status === 'refunded') {
        totalRefunds += o.pricing.grandTotal;
      }
    });

    return {
      totalOrders: orders.length,
      statusCount: statusCount,
      paymentModeCount: paymentModeCount,
      deliveryModeCount: deliveryModeCount,
      totalRevenue: totalRevenue,
      totalRefunds: totalRefunds,
      netRevenue: totalRevenue - totalRefunds,
      averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
    };
  }

  /**
   * Get recent orders
   * @param {number} limit - Number of orders
   * @returns {Array}
   */
  getRecentOrders (limit = 10) {
    return this.getAllOrders()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  /**
   * Search orders
   * @param {string} query - Search query
   * @returns {Array}
   */
  searchOrders (query) {
    const normalizedQuery = query.toLowerCase();
    return this.getAllOrders().filter(
      o =>
        o.orderNumber.toLowerCase().includes(normalizedQuery) ||
        o.customer.name.toLowerCase().includes(normalizedQuery) ||
        o.customer.email.toLowerCase().includes(normalizedQuery),
    );
  }

  /**
   * Get orders requiring attention
   * @returns {Array}
   */
  getOrdersRequiringAttention () {
    return this.getAllOrders().filter(
      o =>
        o.status === ORDER_STATUS.PLACED ||
        o.status === ORDER_STATUS.CANCELLED ||
        o.payment.status === 'failed',
    );
  }

  /**
   * Export orders to CSV (placeholder)
   * @returns {string}
   */
  exportToCSV () {
    const orders = this.getAllOrders();
    const headers = [
      'Order Number', 'Customer', 'Email', 'Status', 'Total', 'Payment', 'Delivery', 'Date',
    ];
    const rows = orders.map(o => [
      o.orderNumber, o.customer.name, o.customer.email, o.status,
      o.pricing.grandTotal, o.payment.mode, o.delivery.mode, o.createdAt,
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    this._downloadCSV(csvContent, 'uni-hub-orders.csv');
    return csvContent;
  }

  _downloadCSV (csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Get daily order count (for charts)
   * @param {number} days - Number of days
   * @returns {Array}
   */
  getDailyOrderCount (days = 7) {
    const orders = this.getAllOrders();
    const today = new Date();
    const dailyCounts = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const count = orders.filter(
        o => new Date(o.createdAt).toISOString().split('T')[0] === dateStr,
      ).length;

      dailyCounts.push({
        date: dateStr,
        count: count,
      });
    }

    return dailyCounts;
  }

  /**
   * Get revenue by date range
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Object}
   */
  getRevenueByDateRange (startDate, endDate) {
    const orders = this.getOrdersByDateRange(startDate, endDate);
    const revenue = orders
      .filter(o => o.payment.status === 'completed')
      .reduce((sum, o) => sum + o.pricing.grandTotal, 0);

    return {
      startDate: startDate,
      endDate: endDate,
      orderCount: orders.length,
      revenue: revenue,
    };
  }
}

// Create singleton instance
const adminOrdersManager = new AdminOrdersManager();

// Export to window for cross-module access
window.adminOrdersManager = adminOrdersManager;
if (typeof dispatchEvent !== 'undefined') {
  dispatchEvent(new Event('module-loaded', { detail: 'AdminOrdersManager' }));
}
