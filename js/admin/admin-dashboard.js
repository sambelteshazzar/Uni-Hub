class AdminDashboard {
  constructor () {
    this.period = 'week';
    this.stats = null;
    this.recentOrders = [];
    this.activityFeed = [];
    this.chartData = [];
    this._bound = {};
  }

  init () {
    this._loadData();
    this._bindPeriodSelector();
  }

  async _loadData () {
    try {
      this.stats = await adminReportsManager.getDashboardOverview();
      this.recentOrders = this.stats.recentOrders || [];
      this.recentUsers = this.stats.recentUsers || [];
      this.renderStats();
      this.renderChart();
      this.renderRecentOrders();
      this.renderActivityFeed();
    } catch (err) {
      console.error('Dashboard load failed:', err);
      this._renderError();
    }
  }

  renderStats () {
    const grid = document.getElementById('admin-stats-grid');
    if (!grid || !this.stats) return;

    const s = this.stats.summary;
    const t = this.stats.today;

    grid.innerHTML = `
      <div class="admin-stat-card revenue">
        <div class="admin-stat-header">
          <div class="admin-stat-icon primary">${Icons.money || '&#36;'}</div>
          <span class="admin-stat-change positive">+GHS ${(t.revenue || 0).toLocaleString()} today</span>
        </div>
        <div class="admin-stat-value">${Formatter.formatPrice(s.totalRevenue)}</div>
        <div class="admin-stat-label">Total Revenue</div>
      </div>
      <div class="admin-stat-card orders">
        <div class="admin-stat-header">
          <div class="admin-stat-icon warning">${Icons.clipboard || '&#9776;'}</div>
          ${s.activeOrders > 0 ? `<span class="admin-stat-change positive">${s.activeOrders} active</span>` : ''}
        </div>
        <div class="admin-stat-value">${s.totalOrders}</div>
        <div class="admin-stat-label">Total Orders</div>
      </div>
      <div class="admin-stat-card products">
        <div class="admin-stat-header">
          <div class="admin-stat-icon success">${Icons.package || '&#9733;'}</div>
          ${s.pendingProducts > 0 ? `<span class="admin-stat-change warning">${s.pendingProducts} pending</span>` : ''}
        </div>
        <div class="admin-stat-value">${s.totalProducts}</div>
        <div class="admin-stat-label">Total Products</div>
      </div>
      <div class="admin-stat-card users">
        <div class="admin-stat-header">
          <div class="admin-stat-icon danger">${Icons.users || '&#128100;'}</div>
          <span class="admin-stat-change positive">+${t.newUsers || 0} today</span>
        </div>
        <div class="admin-stat-value">${s.totalUsers}</div>
        <div class="admin-stat-label">Total Users</div>
      </div>
    `;
  }

  renderChart () {
    const container = document.getElementById('admin-chart-container');
    if (!container) return;

    this.chartData = this._generateChartData();
    const maxVal = Math.max(...this.chartData.map(d => d.value), 1);

    const bars = this.chartData.map(d => {
      const heightPct = (d.value / maxVal) * 100;
      return `
        <div class="admin-css-chart-bar-group">
          <div class="admin-css-chart-bar" style="height:${Math.max(heightPct, 2)}%">
            <span class="admin-css-chart-bar-tooltip">GHS ${d.value.toLocaleString()}</span>
          </div>
          <span class="admin-css-chart-label">${d.label}</span>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="admin-chart-area">
        <div class="admin-chart-header">
          <h3>Revenue Overview</h3>
          <div class="admin-period-selector">
            <button class="admin-period-btn ${this.period === 'today' ? 'active' : ''}" data-period="today">Today</button>
            <button class="admin-period-btn ${this.period === 'week' ? 'active' : ''}" data-period="week">Week</button>
            <button class="admin-period-btn ${this.period === 'month' ? 'active' : ''}" data-period="month">Month</button>
            <button class="admin-period-btn ${this.period === 'year' ? 'active' : ''}" data-period="year">Year</button>
          </div>
        </div>
        <div class="admin-chart-body">
          <div class="admin-css-chart">${bars}</div>
        </div>
        <div class="admin-css-chart-legend">
          <div class="admin-css-chart-legend-item">
            <span class="admin-css-chart-legend-dot" style="background:var(--color-primary)"></span>
            Revenue
          </div>
        </div>
      </div>
    `;

    this._bindPeriodSelector();
  }

  _generateChartData () {
    const orders = adminReportsManager._ordersCache || [];

    if (this.period === 'today') {
      const hours = [];
      for (let h = 0; h < 24; h += 3) {
        const hourOrders = orders.filter(o => {
          const d = new Date(o.createdAt);
          return d.toDateString() === new Date().toDateString() && d.getHours() >= h && d.getHours() < h + 3;
        });
        const revenue = hourOrders.filter(o => o.payment?.status === 'completed').reduce((sum, o) => sum + (o.pricing?.grandTotal || 0), 0);
        hours.push({ label: `${h}:00`, value: revenue });
      }
      return hours;
    }

    if (this.period === 'week') {
      const days = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        const dayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === dateStr);
        const revenue = dayOrders.filter(o => o.payment?.status === 'completed').reduce((sum, o) => sum + (o.pricing?.grandTotal || 0), 0);
        days.push({ label: dayNames[date.getDay()], value: revenue });
      }
      return days;
    }

    if (this.period === 'month') {
      const weeks = [];
      const now = new Date();
      for (let w = 3; w >= 0; w--) {
        const start = new Date(now);
        start.setDate(start.getDate() - (w + 1) * 7);
        const end = new Date(now);
        end.setDate(end.getDate() - w * 7);
        const weekOrders = orders.filter(o => {
          const d = new Date(o.createdAt);
          return d >= start && d < end;
        });
        const revenue = weekOrders.filter(o => o.payment?.status === 'completed').reduce((sum, o) => sum + (o.pricing?.grandTotal || 0), 0);
        weeks.push({ label: `W${4 - w}`, value: revenue });
      }
      return weeks;
    }

    if (this.period === 'year') {
      const months = [];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthOrders = orders.filter(o => {
          const d = new Date(o.createdAt);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === monthKey;
        });
        const revenue = monthOrders.filter(o => o.payment?.status === 'completed').reduce((sum, o) => sum + (o.pricing?.grandTotal || 0), 0);
        months.push({ label: monthNames[date.getMonth()], value: revenue });
      }
      return months;
    }

    return [];
  }

  renderRecentOrders () {
    const container = document.getElementById('admin-recent-orders');
    if (!container) return;

    const rows = (this.recentOrders || []).map(o => `
      <tr>
        <td style="font-weight:var(--font-semibold);">#${o.orderNumber || (o.id || '').slice(-6)}</td>
        <td>${o.customer?.name || 'N/A'}</td>
        <td>
          <span class="admin-status-badge ${o.status || 'placed'}">
            <span class="admin-status-dot"></span>
            ${Formatter.capitalize((o.status || 'placed').replace(/_/g, ' '))}
          </span>
        </td>
        <td style="font-weight:var(--font-semibold);">${Formatter.formatPrice(o.pricing?.grandTotal || 0)}</td>
        <td style="color:var(--neutral-400);font-size:var(--text-xs);">${Formatter.formatTimeAgo(o.createdAt)}</td>
        <td>
          <div class="table-actions">
            <button class="table-action-btn view" title="View" onclick="Pages.renderAdminOrders()">${Icons.view || '&#128065;'}</button>
          </div>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--neutral-400);padding:2rem;">No orders yet</td></tr>';

    container.innerHTML = `
      <div class="admin-table-container">
        <div class="admin-table-toolbar">
          <span class="admin-table-title">Recent Orders</span>
          <div class="admin-table-actions">
            <button class="btn btn-ghost btn-sm" onclick="Pages.renderAdminOrders()">View All</button>
          </div>
        </div>
        <div class="admin-table-scroll">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  renderActivityFeed () {
    const container = document.getElementById('admin-activity-feed');
    if (!container) return;

    let activities = [];

    try {
      activities = adminAuthManager.getActivityLog().slice(0, 8);
    } catch (_) {
      activities = [];
    }

    const recentOrderActivities = (this.recentOrders || []).slice(0, 3).map(o => ({
      icon: 'order',
      text: `New order <strong>#${o.orderNumber || (o.id || '').slice(-6)}</strong> placed by ${o.customer?.name || 'Customer'}`,
      time: o.createdAt,
    }));

    const recentUserActivities = (this.recentUsers || []).slice(0, 2).map(u => ({
      icon: 'user',
      text: `<strong>${u.fullName || 'User'}</strong> joined the platform`,
      time: u.createdAt || u.joinedDate,
    }));

    const logActivities = activities.slice(0, 5).map(a => ({
      icon: this._getActivityIcon(a.action),
      text: a.action,
      time: a.timestamp,
    }));

    const allActivities = [...recentOrderActivities, ...recentUserActivities, ...logActivities]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 8);

    const items = allActivities.map(a => `
      <li class="admin-activity-item">
        <div class="admin-activity-icon ${a.icon}">${this._getActivityIconSvg(a.icon)}</div>
        <div class="admin-activity-body">
          <div class="admin-activity-text">${a.text}</div>
          <div class="admin-activity-time">${a.time ? Formatter.formatTimeAgo(a.time) : 'Just now'}</div>
        </div>
      </li>
    `).join('') || '<li style="padding:2rem;text-align:center;color:var(--neutral-400);">No recent activity</li>';

    container.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-header">
          <h3>Recent Activity</h3>
          <button class="btn btn-ghost btn-sm" onclick="Pages.renderAdminActivity()">View All</button>
        </div>
        <ul class="admin-activity-feed">${items}</ul>
      </div>
    `;
  }

  _getActivityIcon (action) {
    if (!action) return 'order';
    const lower = action.toLowerCase();
    if (lower.includes('order') || lower.includes('purchase')) return 'order';
    if (lower.includes('user') || lower.includes('login') || lower.includes('signup')) return 'user';
    if (lower.includes('product')) return 'product';
    if (lower.includes('ban') || lower.includes('reject') || lower.includes('delete')) return 'alert';
    if (lower.includes('payment') || lower.includes('refund')) return 'payment';
    return 'order';
  }

  _getActivityIconSvg (type) {
    switch (type) {
      case 'order':
        return Icons.clipboard || '&#9776;';
      case 'user':
        return Icons.users || '&#128100;';
      case 'product':
        return Icons.package || '&#9733;';
      case 'alert':
        return Icons.alert || '&#9888;';
      case 'payment':
        return Icons.money || '&#36;';
      default:
        return Icons.chart || '&#9679;';
    }
  }

  _bindPeriodSelector () {
    const btns = document.querySelectorAll('.admin-period-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.period = e.target.dataset.period;
        document.querySelectorAll('.admin-period-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.renderChart();
      });
    });
  }

  _renderError () {
    const grid = document.getElementById('admin-stats-grid');
    if (grid) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--color-danger);">Failed to load dashboard data. Please try again.</div>';
    }
  }

  static showToast (message, type = 'info') {
    let container = document.querySelector('.admin-toast');
    if (!container) {
      container = document.createElement('div');
      container.className = 'admin-toast';
      document.body.appendChild(container);
    }

    const icons = {
      success: Icons.check || '&#10003;',
      error: Icons.close || '&#10007;',
      warning: Icons.alert || '&#9888;',
      info: Icons.info || '&#8505;',
    };

    const item = document.createElement('div');
    item.className = `admin-toast-item ${type}`;
    item.innerHTML = `
      <span class="admin-toast-icon">${icons[type] || icons.info}</span>
      <span class="admin-toast-message">${message}</span>
      <button class="admin-toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(item);
    requestAnimationFrame(() => item.classList.add('visible'));

    setTimeout(() => {
      item.classList.remove('visible');
      setTimeout(() => item.remove(), 300);
    }, 4000);
  }

  static showModal (title, bodyHtml, footerHtml) {
    let backdrop = document.querySelector('.admin-modal-backdrop');
    if (backdrop) backdrop.remove();

    backdrop = document.createElement('div');
    backdrop.className = 'admin-modal-backdrop';
    backdrop.innerHTML = `
      <div class="admin-modal">
        <div class="admin-modal-header">
          <h3>${title}</h3>
          <button class="admin-modal-close" onclick="AdminDashboard.hideModal()">&times;</button>
        </div>
        <div class="admin-modal-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="admin-modal-footer">${footerHtml}</div>` : ''}
      </div>
    `;

    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('visible'));

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) AdminDashboard.hideModal();
    });
  }

  static hideModal () {
    const backdrop = document.querySelector('.admin-modal-backdrop');
    if (backdrop) {
      backdrop.classList.remove('visible');
      setTimeout(() => backdrop.remove(), 200);
    }
  }

  static initTableSort (tableSelector) {
    const table = document.querySelector(tableSelector);
    if (!table) return;

    const headers = table.querySelectorAll('th.sortable');
    headers.forEach((th, colIndex) => {
      th.addEventListener('click', () => {
        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        const rows = Array.from(tbody.querySelectorAll('tr'));
        const isAsc = th.classList.contains('asc');

        headers.forEach(h => h.classList.remove('asc', 'desc'));
        th.classList.add(isAsc ? 'desc' : 'asc');

        rows.sort((a, b) => {
          const aVal = a.cells[colIndex]?.textContent?.trim() || '';
          const bVal = b.cells[colIndex]?.textContent?.trim() || '';
          const aNum = parseFloat(aVal.replace(/[^0-9.-]/g, ''));
          const bNum = parseFloat(bVal.replace(/[^0-9.-]/g, ''));

          if (!isNaN(aNum) && !isNaN(bNum)) {
            return isAsc ? bNum - aNum : aNum - bNum;
          }

          return isAsc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
        });

        rows.forEach(row => tbody.appendChild(row));
      });
    });
  }
}

const adminDashboard = new AdminDashboard();

window.AdminDashboard = AdminDashboard;
window.adminDashboard = adminDashboard;

if (typeof window !== 'undefined') {
  window.dispatchEvent(new CustomEvent('module-loaded', { detail: { name: 'AdminDashboard' } }));
}
