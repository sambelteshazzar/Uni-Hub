// ============================================
// ADMIN REPORTS MODULE - Analytics & Reports
// ============================================
/* exported adminReportsManager */

class AdminReportsManager {
  constructor () {
    this.REPORTS_STORAGE_KEY = `${STORAGE_KEY_PREFIX}reports`;
  }

  /**
   * Get dashboard overview
   * @returns {Object}
   */
  getDashboardOverview () {
    const orders = checkoutManager.getAllOrders();
    const users = adminUsersManager.getAllUsers();
    const products = productsManager.getAll();

    const today = new Date().toDateString();
    const thisWeek = this.getDateRange(7);
    const thisMonth = this.getDateRange(30);

    // Today's stats
    const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
    const todayRevenue = todayOrders
      .filter(o => o.payment.status === 'completed')
      .reduce((sum, o) => sum + o.pricing.grandTotal, 0);

    // This week's stats
    const weekOrders = orders.filter(
      o => new Date(o.createdAt) >= thisWeek.start && new Date(o.createdAt) <= thisWeek.end,
    );
    const weekRevenue = weekOrders
      .filter(o => o.payment.status === 'completed')
      .reduce((sum, o) => sum + o.pricing.grandTotal, 0);

    // This month's stats
    const monthOrders = orders.filter(
      o => new Date(o.createdAt) >= thisMonth.start && new Date(o.createdAt) <= thisMonth.end,
    );
    const monthRevenue = monthOrders
      .filter(o => o.payment.status === 'completed')
      .reduce((sum, o) => sum + o.pricing.grandTotal, 0);

    return {
      summary: {
        totalUsers: users.length,
        totalProducts: products.length,
        totalOrders: orders.length,
        totalRevenue: this.getTotalRevenue(),
      },
      today: {
        orders: todayOrders.length,
        revenue: todayRevenue,
        newUsers: users.filter(u => new Date(u.joinedDate).toDateString() === today).length,
      },
      thisWeek: {
        orders: weekOrders.length,
        revenue: weekRevenue,
        growth: this.calculateGrowth(weekOrders, orders),
      },
      thisMonth: {
        orders: monthOrders.length,
        revenue: monthRevenue,
        growth: this.calculateGrowth(monthOrders, orders),
      },
    };
  }

  /**
   * Get total revenue
   * @returns {number}
   */
  getTotalRevenue () {
    const orders = checkoutManager.getAllOrders();
    return orders
      .filter(o => o.payment.status === 'completed')
      .reduce((sum, o) => sum + o.pricing.grandTotal, 0);
  }

  /**
   * Get date range
   * @param {number} days - Number of days
   * @returns {Object}
   */
  getDateRange (days) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    return {
      start: start,
      end: end,
    };
  }

  /**
   * Calculate growth percentage
   * @param {Array} current - Current period data
   * @param {Array} all - All data
   * @returns {number}
   */
  calculateGrowth (current, all) {
    if (all.length === 0) {
      return 0;
    }
    return ((current.length / all.length) * 100).toFixed(2);
  }

  /**
   * Get sales report
   * @param {string} period - Time period (daily, weekly, monthly, yearly)
   * @returns {Object}
   */
  getSalesReport (period = 'monthly') {
    const orders = checkoutManager.getAllOrders();
    const groupedData = this.groupByPeriod(orders, period);

    return {
      period: period,
      data: groupedData.map(group => ({
        period: group.period,
        orders: group.items.length,
        revenue: group.items
          .filter(o => o.payment.status === 'completed')
          .reduce((sum, o) => sum + o.pricing.grandTotal, 0),
        averageOrderValue:
          group.items.length > 0
            ? group.items.reduce((sum, o) => sum + o.pricing.grandTotal, 0) / group.items.length
            : 0,
      })),
    };
  }

  /**
   * Group data by period
   * @param {Array} data - Data to group
   * @param {string} period - Period type
   * @returns {Array}
   */
  groupByPeriod (data, period) {
    const groups = {};

    data.forEach(item => {
      const date = new Date(item.createdAt);
      let key;

      switch (period) {
      case 'daily':
        key = date.toISOString().split('T')[0];
        break;
      case 'weekly':
        key = this.getWeekNumber(date);
        break;
      case 'monthly':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'yearly':
        key = date.getFullYear();
        break;
      default:
        key = date.toISOString().split('T')[0];
      }

      if (!groups[key]) {
        groups[key] = { period: key, items: [] };
      }
      groups[key].items.push(item);
    });

    return Object.values(groups).sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Get week number
   * @param {Date} date - Date
   * @returns {string}
   */
  getWeekNumber (date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
  }

  /**
   * Get user report
   * @returns {Object}
   */
  getUserReport () {
    const users = adminUsersManager.getAllUsers();

    return {
      totalUsers: users.length,
      byRole: this.groupByField(users, 'role'),
      byUniversity: this.groupByField(users, 'university'),
      verified: users.filter(u => u.isVerified).length,
      suspended: users.filter(u => u.isSuspended).length,
      newThisMonth: users.filter(u => new Date(u.joinedDate).getMonth() === new Date().getMonth())
        .length,
    };
  }

  /**
   * Get product report
   * @returns {Object}
   */
  getProductReport () {
    const products = productsManager.getAll();

    return {
      totalProducts: products.length,
      byCategory: this.groupByField(products, 'category'),
      byCondition: this.groupByField(products, 'condition'),
      byUniversity: this.groupByField(products, 'university'),
      averagePrice:
        products.length > 0 ? products.reduce((sum, p) => sum + p.price, 0) / products.length : 0,
    };
  }

  /**
   * Group by field
   * @param {Array} data - Data to group
   * @param {string} field - Field to group by (supports dot notation for nested properties)
   * @returns {Object}
   */
  groupByField (data, field) {
    return data.reduce((acc, item) => {
      // Support dot notation for nested properties (e.g., 'payment.mode')
      let value;
      if (field.includes('.')) {
        const parts = field.split('.');
        value = item;
        for (const part of parts) {
          value = value?.[part];
          if (value === undefined) {
            break;
          }
        }
      } else {
        value = item[field];
      }
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Get order status distribution
   * @returns {Object}
   */
  getOrderStatusDistribution () {
    const orders = checkoutManager.getAllOrders();
    return this.groupByField(orders, 'status');
  }

  /**
   * Get payment method distribution
   * @returns {Object}
   */
  getPaymentMethodDistribution () {
    const orders = checkoutManager.getAllOrders();
    return this.groupByField(orders, 'payment.mode');
  }

  /**
   * Get delivery method distribution
   * @returns {Object}
   */
  getDeliveryMethodDistribution () {
    const orders = checkoutManager.getAllOrders();
    return this.groupByField(orders, 'delivery.mode');
  }

  /**
   * Get top products
   * @param {number} limit - Number of products
   * @returns {Array}
   */
  getTopProducts (limit = 10) {
    const orders = checkoutManager.getAllOrders();
    const productSales = {};

    orders.forEach(order => {
      order.items.forEach(item => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            productId: item.productId,
            title: item.title,
            sales: 0,
            revenue: 0,
          };
        }
        productSales[item.productId].sales += item.quantity;
        productSales[item.productId].revenue += item.price * item.quantity;
      });
    });

    return Object.values(productSales)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, limit);
  }

  /**
   * Get top sellers
   * @param {number} limit - Number of sellers
   * @returns {Array}
   */
  getTopSellers (limit = 10) {
    return adminUsersManager.getTopSellers(limit);
  }

  /**
   * Get regional statistics
   * @returns {Object}
   */
  getRegionalStats () {
    const products = productsManager.getAll();
    const users = adminUsersManager.getAllUsers();
    const regions = regionManager.getAllRegions();

    return regions.map(region => ({
      region: region.name,
      universities: region.universities.length,
      products: products.filter(p => region.universities.includes(p.university)).length,
      users: users.filter(u => region.universities.includes(u.university)).length,
    }));
  }

  /**
   * Generate PDF report (placeholder)
   * @param {string} type - Report type
   * @param {Object} options - Report options
   */
  generatePDFReport (type, options = {}) {
    const reportContent = this._buildReportHTML(type, options);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Uni-Hub Report — ${type}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #1f2937; }
            h1 { color: #0046be; border-bottom: 2px solid #0046be; padding-bottom: 8px; }
            h2 { color: #374151; margin-top: 24px; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
            th { background: #f3f4f6; font-weight: 600; }
            .meta { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>${reportContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); }, 500);
    }

    return {
      success: true,
      message: 'Report generated successfully',
    };
  }

  _buildReportHTML (type, options) {
    const date = new Date().toLocaleDateString('en-GH', { year: 'numeric', month: 'long', day: 'numeric' });
    let content = `<h1>Uni-Hub ${type.charAt(0).toUpperCase() + type.slice(1)} Report</h1><p class="meta">Generated on ${date}</p>`;

    try {
      if (type === 'sales') {
        const stats = this.getSalesStats(options.period || 'month');
        content += `<h2>Sales Summary</h2><table><tr><th>Metric</th><th>Value</th></tr>`;
        content += `<tr><td>Total Revenue</td><td>GHS ${stats.totalRevenue || 0}</td></tr>`;
        content += `<tr><td>Total Orders</td><td>${stats.totalOrders || 0}</td></tr>`;
        content += `<tr><td>Average Order</td><td>GHS ${stats.averageOrder || 0}</td></tr>`;
        content += `</table>`;
      } else if (type === 'users') {
        const users = adminUsersManager.getAllUsers();
        content += `<h2>User Summary</h2><table><tr><th>ID</th><th>Name</th><th>Email</th><th>University</th><th>Role</th><th>Verified</th></tr>`;
        users.forEach(u => {
          content += `<tr><td>${u.id || ''}</td><td>${u.fullName || ''}</td><td>${u.email || ''}</td><td>${u.university || ''}</td><td>${u.role || ''}</td><td>${u.isVerified ? 'Yes' : 'No'}</td></tr>`;
        });
        content += `</table>`;
      } else if (type === 'products') {
        const products = adminProductsManager.getAllProducts();
        content += `<h2>Product Summary</h2><table><tr><th>Title</th><th>Price</th><th>Category</th><th>Condition</th><th>Seller</th><th>Status</th></tr>`;
        products.forEach(p => {
          content += `<tr><td>${p.title || ''}</td><td>GHS ${p.price || 0}</td><td>${p.category || ''}</td><td>${p.condition || ''}</td><td>${p.seller?.name || ''}</td><td>${p.status || ''}</td></tr>`;
        });
        content += `</table>`;
      } else if (type === 'orders') {
        const orders = adminOrdersManager.getAllOrders();
        content += `<h2>Order Summary</h2><table><tr><th>Order #</th><th>Customer</th><th>Status</th><th>Total</th><th>Payment</th><th>Date</th></tr>`;
        orders.forEach(o => {
          content += `<tr><td>${o.orderNumber || ''}</td><td>${o.customer?.name || ''}</td><td>${o.status || ''}</td><td>GHS ${o.pricing?.grandTotal || 0}</td><td>${o.payment?.mode || ''}</td><td>${o.createdAt || ''}</td></tr>`;
        });
        content += `</table>`;
      }
    } catch (e) {
      content += `<p>Report data unavailable.</p>`;
    }

    return content;
  }

  /**
   * Export report data
   * @param {string} type - Report type
   * @param {string} format - Export format (csv, json)
   * @returns {string}
   */
  exportReport (type, format = 'csv') {
    let data;

    switch (type) {
    case 'sales':
      data = this.getSalesReport();
      break;
    case 'users':
      data = this.getUserReport();
      break;
    case 'products':
      data = this.getProductReport();
      break;
    case 'orders':
      data = checkoutManager.getAllOrders();
      break;
    default:
      data = {};
    }

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    // CSV export
    return this.convertToCSV(data);
  }

  /**
   * Convert data to CSV
   * @param {Object|Array} data - Data to convert
   * @returns {string}
   */
  convertToCSV (data) {
    if (!data || typeof data !== 'object') {
      return '';
    }

    const items = Array.isArray(data) ? data : [data];
    if (items.length === 0) {
      return '';
    }

    const headers = Object.keys(items[0]);
    const rows = items.map(item => headers.map(h => item[h]).join(','));

    return [headers.join(','), ...rows].join('\n');
  }
}

// Create singleton instance
const adminReportsManager = new AdminReportsManager();

// Export to window for cross-module access
window.adminReportsManager = adminReportsManager;
if (typeof dispatchEvent !== 'undefined') {
  dispatchEvent(new Event('module-loaded', { detail: 'AdminReportsManager' }));
}
