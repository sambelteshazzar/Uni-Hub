// UI kit — layout primitives (extracted from pages.js class AdminUI).
import { escapeValue, safeUrlValue } from '../utils/escape.js';

const _pageEsc = escapeValue;
const _pageSafeUrl = safeUrlValue;

// ---- Brand mark (top of sidebar) ----
export function brand() {
  return `
    <div class="adm-brand">
      <div class="adm-brand-mark">J</div>
      <div>
        <div class="adm-brand-name">JERTS CART</div>
        <div class="adm-brand-tag">Admin</div>
      </div>
    </div>
  `;
}

// ---- Profile chip (under brand) ----
export function profile(user) {
  const initials =
    (user?.fullName || 'A')
      .split(' ')
      .map(s => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'A';
  return `
    <div class="adm-profile">
      <div class="adm-avatar-md">${_pageEsc(initials)}</div>
      <div style="flex:1; min-width:0;">
        <div class="adm-profile-name">${_pageEsc(user?.fullName || 'Admin')}</div>
        <div class="adm-profile-email">${_pageEsc(user?.email || '')}</div>
      </div>
    </div>
  `;
}

// ---- Single nav item ----
export function navItem(item, isActive) {
  const cls = isActive ? 'adm-nav-item is-active' : 'adm-nav-item';
  const badge = item.badge
    ? `<span class="adm-nav-badge">${_pageEsc(String(item.badge))}</span>`
    : '';
  return `
    <a href="#" class="${cls}" data-adm-nav="${_pageEsc(item.key)}" data-action="nav">
      ${item.icon || ''}
      <span>${_pageEsc(item.label)}</span>
      ${badge}
    </a>
  `;
}

// ---- Section label ----
export function navSection(label) {
  return `<div class="adm-nav-section-label">${_pageEsc(label)}</div>`;
}

// ---- Full sidebar ----
export function sidebar(activeItem) {
  const user =
    (typeof adminAuthManager !== 'undefined' && adminAuthManager.getCurrentUser?.()) ||
    (typeof authManager !== 'undefined' && authManager.getCurrentUser?.()) ||
    null;
  const sections = [
    {
      label: 'Operations',
      items: [
        { key: 'dashboard', label: 'Dashboard', icon: Icons.chart },
        {
          key: 'verifications',
          label: 'Verifications',
          icon: Icons.shield || Icons.verification || Icons.check,
        },
        { key: 'users', label: 'Users', icon: Icons.users },
        { key: 'products', label: 'Products', icon: Icons.package },
        { key: 'orders', label: 'Orders', icon: Icons.clipboard },
        { key: 'payouts', label: 'Payouts', icon: Icons.money },
        { key: 'support', label: 'Support', icon: Icons.help },
      ],
    },
    {
      label: 'Marketing',
      items: [
        { key: 'coupons', label: 'Coupons', icon: Icons.gift || Icons.tag || Icons.chart },
        { key: 'newsletter', label: 'Newsletter', icon: Icons.mail || Icons.email || '' },
      ],
    },
    {
      label: 'Insights',
      items: [
        { key: 'reports', label: 'Reports', icon: Icons.chart },
        { key: 'analytics', label: 'Analytics', icon: Icons.chart },
        { key: 'activity', label: 'Activity', icon: Icons.clock || Icons.chart },
        { key: 'regions', label: 'Regions', icon: Icons.globe || Icons.chart },
      ],
    },
  ];
  const itemsHtml = sections
    .map(
      s => `
    ${navSection(s.label)}
    ${s.items.map(i => navItem(i, i.key === activeItem)).join('')}
  `
    )
    .join('');
  return `
    <aside class="adm-sidebar">
      ${brand()}
      ${profile(user)}
      <nav class="adm-sidebar-nav" id="adm-sidebar-nav">
        ${itemsHtml}
      </nav>
      <div class="adm-sidebar-footer">
        <button type="button" class="adm-sidebar-link" data-action="toggle-dark">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          <span id="adm-dark-label">Dark mode</span>
        </button>
        <button type="button" class="adm-sidebar-link" data-action="logout">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          Log out
        </button>
      </div>
    </aside>
  `;
}

// ---- Top utility bar (breadcrumb + search + actions) ----
// pageKey is the current route key (matches `data-adm-nav` value).
// pageActions is HTML for the right-side action area (search + buttons).
// The wrapper does NOT include sidebar — the page's render method
// composes both.
export function topbar(pageLabel, pageActions) {
  return `
    <div class="adm-topbar">
      <div class="adm-breadcrumb">
        <a href="#/admin">Admin</a>
        <span class="adm-breadcrumb-sep">/</span>
        <span class="adm-breadcrumb-current">${_pageEsc(pageLabel)}</span>
      </div>
      <div class="adm-topbar-actions">
        ${pageActions || ''}
      </div>
    </div>
  `;
}

// ---- Page header (title + sub + right actions like period selector) ----
export function pageHeader(title, sub, rightActions) {
  return `
    <header class="adm-page-header">
      <div>
        <h1 class="adm-page-title">${_pageEsc(title)}</h1>
        <p class="adm-page-sub">${sub ? _pageEsc(sub) : ''}</p>
      </div>
      ${rightActions ? `<div class="adm-actions">${rightActions}</div>` : ''}
    </header>
  `;
}

// ---- Standard sidebar wiring: nav clicks, dark toggle, logout ----
// activeItem is the current page key (so clicking it is a no-op).
// onNavigate: (key) => void — caller decides how to route.
export function wireSidebar(onNavigate) {
  const nav = document.getElementById('adm-sidebar-nav');
  if (nav) {
    nav.addEventListener('click', e => {
      const item = e.target.closest('[data-adm-nav]');
      if (!item) {
        return;
      }
      e.preventDefault();
      const key = item.dataset.admNav;
      // Update active class optimistically
      nav.querySelectorAll('.adm-nav-item').forEach(a => a.classList.remove('is-active'));
      item.classList.add('is-active');
      onNavigate?.(key);
    });
  }
  const sidebar = document.querySelector('.adm-sidebar');
  if (sidebar) {
    sidebar.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) {
        return;
      }
      const action = btn.dataset.action;
      if (action === 'toggle-dark') {
        const label = document.getElementById('adm-dark-label');
        const on = label && label.textContent === 'Dark mode';
        if (label) {
          label.textContent = on ? 'Light mode' : 'Dark mode';
        }
        // Dark mode itself is a separate spec; we just toggle the label.
      } else if (action === 'logout') {
        if (typeof adminAuthManager !== 'undefined') {
          adminAuthManager.logout?.();
          router.navigate('/');
        }
      }
    });
  }

  // Support badge (spec 2026-09-24): single "layout rendered" hook —
  // wireSidebar runs on every admin page, so the badge stays fresh
  // without patching 14 renderers.
  if (typeof Pages !== 'undefined' && typeof Pages.refreshSupportBadge === 'function') {
    Pages.refreshSupportBadge();
  }
}

// ---- Standard topbar search wiring ----
// inputEl: the search <input> element.
// onSearch: (value) => void — caller filters the current page.
export function wireSearch(inputEl, onSearch) {
  if (!inputEl) {
    return;
  }
  let timer = null;
  inputEl.addEventListener('input', e => {
    clearTimeout(timer);
    const v = e.target.value;
    timer = setTimeout(() => onSearch?.(v), 120);
  });
}
