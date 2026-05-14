// ============================================
// ADMIN REPORTS MODULE - Analytics & Reports
// ============================================
/* exported adminReportsManager */

class AdminReportsManager {
  constructor () {
  this.REPORTS_STORAGE_KEY = `${STORAGE_KEY_PREFIX}reports`;
  this._ordersCache = null;
  this._cacheTime = 0;
  this.CACHE_TTL = 30000;
  }

  async _getOrders () {
  const now = Date.now();
  if (this._ordersCache && now - this._cacheTime < this.CACHE_TTL) {
  return this._ordersCache;
  }
  try {
  this._ordersCache = await checkoutManager.getAllOrders();
  } catch (_) {
  this._ordersCache = StorageManager.get(`${STORAGE_KEY_PREFIX}orders`, true) || [];
  }
  if (!Array.isArray(this._ordersCache)) this._ordersCache = [];
  this._cacheTime = now;
  return this._ordersCache;
  }

  invalidateCache () {
  this._ordersCache = null;
  this._cacheTime = 0;
  }

  async getDashboardOverview () {
  const orders = await this._getOrders();

  let users = [];
  try {
  await adminUsersManager.loadUsers();
  users = adminUsersManager.getAllUsers();
  } catch (_) {
  users = [];
  }
  if (!Array.isArray(users)) users = [];

  let products = [];
  try {
  products = productsManager.getAll();
  } catch (_) {
  products = [];
  }
  if (!Array.isArray(products)) products = [];

  let backendStats = null;
  try {
  const resp = await api.admin.getStats();
  if (resp.success && resp.data) backendStats = resp.data;
  } catch (err) { console.warn('Failed to fetch backend stats:', err); }

  const today = new Date().toDateString();
  const thisWeek = this.getDateRange(7);
  const thisMonth = this.getDateRange(30);

  const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
  const todayRevenue = todayOrders
  .filter(o => o.payment?.status === 'completed')
  .reduce((sum, o) => sum + (o.pricing?.grandTotal || 0), 0);

  const weekOrders = orders.filter(
  o => new Date(o.createdAt) >= thisWeek.start && new Date(o.createdAt) <= thisWeek.end,
  );
  const weekRevenue = weekOrders
  .filter(o => o.payment?.status === 'completed')
  .reduce((sum, o) => sum + (o.pricing?.grandTotal || 0), 0);

  const monthOrders = orders.filter(
  o => new Date(o.createdAt) >= thisMonth.start && new Date(o.createdAt) <= thisMonth.end,
  );
  const monthRevenue = monthOrders
  .filter(o => o.payment?.status === 'completed')
  .reduce((sum, o) => sum + (o.pricing?.grandTotal || 0), 0);

  const totalRevenue = backendStats?.totalRevenue || orders
  .filter(o => o.payment?.status === 'completed')
  .reduce((sum, o) => sum + (o.pricing?.grandTotal || 0), 0);

  const pendingProducts = products.filter(p => p.status === 'pending').length;
  const activeOrders = orders.filter(o => ['placed', 'confirmed', 'in_transit'].includes(o.status)).length;

  return {
  summary: {
  totalUsers: backendStats?.totalUsers || users.length,
  totalProducts: backendStats?.totalProducts || products.length,
  totalOrders: backendStats?.totalOrders || orders.length,
  totalRevenue: totalRevenue,
  pendingProducts: pendingProducts,
  activeOrders: activeOrders,
  },
  today: {
  orders: todayOrders.length,
  revenue: todayRevenue,
  newUsers: users.filter(u => new Date(u.joinedDate || u.createdAt).toDateString() === today).length,
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
  recentOrders: orders.slice(0, 5),
  recentUsers: users.slice(0, 5),
  };
  }

  async getTotalRevenue () {
  const orders = await this._getOrders();
  return orders
  .filter(o => o.payment?.status === 'completed')
  .reduce((sum, o) => sum + (o.pricing?.grandTotal || 0), 0);
  }

  getDateRange (days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);

  return {
  start: start,
  end: end,
  };
  }

  calculateGrowth (current, all) {
  if (all.length === 0) {
  return 0;
  }
  return ((current.length / all.length) * 100).toFixed(2);
  }

  async getSalesReport (period = 'monthly') {
  const orders = await this._getOrders();
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

  getWeekNumber (date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
  }

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

  groupByField (data, field) {
  return data.reduce((acc, item) => {
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

  async getOrderStatusDistribution () {
  const orders = await this._getOrders();
  return this.groupByField(orders, 'status');
  }

  async getPaymentMethodDistribution () {
  const orders = await this._getOrders();
  return this.groupByField(orders, 'payment.mode');
  }

  async getDeliveryMethodDistribution () {
  const orders = await this._getOrders();
  return this.groupByField(orders, 'delivery.mode');
  }

  async getTopProducts (limit = 10) {
  const orders = await this._getOrders();
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

  getTopSellers (limit = 10) {
  return adminUsersManager.getTopSellers(limit);
  }

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
  const cached = this._ordersCache || [];
  content += `<h2>Order Summary</h2><table><tr><th>Order #</th><th>Customer</th><th>Status</th><th>Total</th><th>Payment</th><th>Date</th></tr>`;
  cached.forEach(o => {
  content += `<tr><td>${o.orderNumber || ''}</td><td>${o.customer?.name || ''}</td><td>${o.status || ''}</td><td>GHS ${o.pricing?.grandTotal || 0}</td><td>${o.payment?.mode || ''}</td><td>${o.createdAt || ''}</td></tr>`;
  });
  content += `</table>`;
  }
  } catch (e) {
  content += `<p>Report data unavailable.</p>`;
  }

  return content;
  }

  async exportReport (type, format = 'csv') {
  let data;

  switch (type) {
  case 'sales':
  data = await this.getSalesReport();
  break;
  case 'users':
  data = this.getUserReport();
  break;
  case 'products':
  data = this.getProductReport();
  break;
  case 'orders':
  data = await this._getOrders();
  break;
  default:
  data = {};
  }

  if (format === 'json') {
  return JSON.stringify(data, null, 2);
  }

  return this.convertToCSV(data);
  }

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
