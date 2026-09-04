// ============================================
// ADMIN ORDERS MODULE - Order Management
// ============================================
/* exported adminOrdersManager */

class AdminOrdersManager {
  constructor() {
    this.ORDERS_STORAGE_KEY = `${STORAGE_KEY_PREFIX}orders`;
    this._ordersCache = null;
    this._cacheTime = 0;
    this.CACHE_TTL = 30000;
  }

  async _getOrders() {
    const now = Date.now();
    if (this._ordersCache && now - this._cacheTime < this.CACHE_TTL) {
      return this._ordersCache;
    }
    try {
      if (typeof api !== 'undefined' && !api.isStaticDeploy && window._backendAvailable !== false) {
        const resp = await api.admin.getOrders({ limit: 200 });
        if (resp.success && resp.data && resp.data.orders) {
          this._ordersCache = resp.data.orders;
          this._cacheTime = now;
          return this._ordersCache;
        }
      }
    } catch (_) {
      console.warn('admin-orders: backend fetch failed:', _);
    }
    this._ordersCache = await checkoutManager.getAllOrders();
    this._cacheTime = now;
    return this._ordersCache;
  }

  invalidateCache() {
    this._ordersCache = null;
    this._cacheTime = 0;
  }

  async getAllOrders() {
    return this._getOrders();
  }

  async getOrderById(orderId) {
    const orders = await this._getOrders();
    return orders.find(o => o.id === orderId) || null;
  }

  async getOrdersByStatus(status) {
    const orders = await this._getOrders();
    return orders.filter(o => o.status === status);
  }

  async getOrdersByUser(userId) {
    const orders = await this._getOrders();
    return orders.filter(o => o.userId === userId);
  }

  async getOrdersByDateRange(startDate, endDate) {
    const orders = await this._getOrders();
    return orders.filter(
      o =>
        new Date(o.createdAt) >= new Date(startDate) && new Date(o.createdAt) <= new Date(endDate)
    );
  }

  updateOrderStatus(orderId, status) {
    const result = checkoutManager.updateOrderStatus(orderId, status);

    if (result.success) {
      adminAuthManager.logActivity('Order status updated', { orderId, status });
      this.invalidateCache();
    }

    try {
      if (typeof api !== 'undefined' && !api.isStaticDeploy && window._backendAvailable !== false) {
        api.orders.updateStatus(orderId, status, '').catch(() => {});
      }
    } catch (_) {
      /* noop */
    }

    return result;
  }

  async cancelOrder(orderId, reason) {
    const order = await this.getOrderById(orderId);

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
      const orders = await this._getOrders();
      const index = orders.findIndex(o => o.id === orderId);
      if (index !== -1) {
        orders[index].cancellationReason = reason;
        orders[index].cancelledAt = new Date().toISOString();
        StorageManager.set(this.ORDERS_STORAGE_KEY, orders);
      }
    }

    adminAuthManager.logActivity('Order cancelled', { orderId, reason });
    this.invalidateCache();

    return result;
  }

  async refundOrder(orderId, reason) {
    const order = await this.getOrderById(orderId);

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

    if (typeof api !== 'undefined' && api.orders) {
      try {
        const response = await api.orders.refund(orderId, reason);
        if (response.success) {
          this.invalidateCache();
          adminAuthManager.logActivity('Order refunded', {
            orderId,
            reason,
            amount: order.pricing.grandTotal,
          });
          return { success: true, message: 'Refund processed successfully', order: response.data };
        }
      } catch (err) {
        console.error('Failed to process refund on backend:', err);
      }
    }

    order.payment.status = 'refunded';
    order.payment.refundReason = reason;
    order.payment.refundedAt = new Date().toISOString();
    order.status = ORDER_STATUS.CANCELLED;
    order.updatedAt = new Date().toISOString();

    const orders = await this._getOrders();
    const index = orders.findIndex(o => o.id === orderId);
    if (index !== -1) {
      orders[index] = order;
      StorageManager.set(this.ORDERS_STORAGE_KEY, orders);
    }

    this.invalidateCache();

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

  async getStats() {
    const orders = await this._getOrders();

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

  async getRecentOrders(limit = 10) {
    const orders = await this._getOrders();
    return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
  }

  async searchOrders(query) {
    const normalizedQuery = query.toLowerCase();
    const orders = await this._getOrders();
    return orders.filter(
      o =>
        o.orderNumber.toLowerCase().includes(normalizedQuery) ||
        o.customer.name.toLowerCase().includes(normalizedQuery) ||
        o.customer.email.toLowerCase().includes(normalizedQuery)
    );
  }

  async getOrdersRequiringAttention() {
    const orders = await this._getOrders();
    return orders.filter(
      o =>
        o.status === ORDER_STATUS.PLACED ||
        o.status === ORDER_STATUS.CANCELLED ||
        o.payment.status === 'failed'
    );
  }

  async exportToCSV() {
    const orders = await this._getOrders();
    const headers = [
      'Order Number',
      'Customer',
      'Email',
      'Status',
      'Total',
      'Payment',
      'Delivery',
      'Date',
    ];
    const rows = orders.map(o => [
      o.orderNumber,
      o.customer.name,
      o.customer.email,
      o.status,
      o.pricing.grandTotal,
      o.payment.mode,
      o.delivery.mode,
      o.createdAt,
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    this._downloadCSV(csvContent, 'jertscart-orders.csv');
    return csvContent;
  }

  _downloadCSV(csvContent, filename) {
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

  async getDailyOrderCount(days = 7) {
    const orders = await this._getOrders();
    const today = new Date();
    const dailyCounts = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const count = orders.filter(
        o => new Date(o.createdAt).toISOString().split('T')[0] === dateStr
      ).length;

      dailyCounts.push({
        date: dateStr,
        count: count,
      });
    }

    return dailyCounts;
  }

  async getRevenueByDateRange(startDate, endDate) {
    const orders = await this.getOrdersByDateRange(startDate, endDate);
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
if (typeof window !== 'undefined') {
  window.dispatchEvent(
    new CustomEvent('module-loaded', { detail: { name: 'AdminOrdersManager' } })
  );
}
