/* eslint-disable no-unused-vars */
// ============================================
// PAGE RENDERERS
// ============================================

// Centralized escape helpers. SecurityUtils (js/utils/security.js)
// is the canonical XSS defense layer — these helpers resolve to
// SecurityUtils when available and fall back to identity string
// conversion otherwise so the render doesn't crash if a module-load
// race leaves SecurityUtils undefined. The backend's sanitizeXss
// already escapes strings on HTTP ingress, but several write paths
// bypass it (Socket.io, Google OAuth ingest, seed data), so the
// render layer must validate too — defense in depth.
const _pageEsc = v => {
  if (typeof SecurityUtils !== 'undefined' && SecurityUtils.escapeHtml) {
    return SecurityUtils.escapeHtml(String(v == null ? '' : v));
  }
  return String(v == null ? '' : v);
};
const _pageSafeUrl = url => {
  if (typeof SecurityUtils !== 'undefined' && SecurityUtils.sanitizeUrl) {
    return SecurityUtils.sanitizeUrl(url) || '';
  }
  return String(url == null ? '' : url);
};

// Admin route guard. AGENTS.md requires /admin/* to enforce
// authManager.isAuthenticated plus an admin-role check before rendering —
// never rely on hiding UI alone. We additionally accept adminAuthManager
// (the legacy localStorage admin slot) so the existing admin login flow
// keeps working until it is consolidated with authManager. Returns true
// when the caller may proceed, false when the caller has already been
// redirected (caller must `return`).
const _requireAdmin = () => {
  const ammgr = typeof authManager !== 'undefined' ? authManager : null;
  const aamgr = typeof adminAuthManager !== 'undefined' ? adminAuthManager : null;
  // NOTE: authManager.isAuthenticated is a BOOLEAN property, not a function
  // (see js/modules/auth.js:11,34,86,100). Use the isLoggedIn() *function*
  // instead of isAuthenticated(), otherwise calling `true()` throws
  // `TypeError: ammgr.isAuthenticated is not a function`. This bug was
  // latent for a long time because adminAuthManager.login used to write a
  // session shape without `expiresAt` (admin-auth.js:41), causing
  // AuthManager.loadSession to wipe the session on the next page reload
  // — so `isAuthenticated` was always `false` on the admin route and the
  // broken boolean-as-function branch never fired. The admin-auth.js
  // fix (now adds `expiresAt`) makes loadSession accept the session and
  // sets isAuthenticated=true, surfacing this second bug. Fix it here by
  // using isLoggedIn() (a function) consistently.
  const backendAdmin =
    ammgr && ammgr.isLoggedIn && ammgr.isLoggedIn() && ammgr.isAdmin && ammgr.isAdmin();
  const legacyAdmin = aamgr && aamgr.isLoggedIn && aamgr.isLoggedIn();
  if (backendAdmin || legacyAdmin) {
    return true;
  }
  // Not authorized — show login. Prefer the existing admin login renderer
  // if Pages has been loaded, otherwise bounce to the regular login route.
  if (typeof Pages !== 'undefined' && Pages.renderAdminLogin) {
    Pages.renderAdminLogin();
  } else if (typeof navigateTo === 'function') {
    navigateTo('login');
  }
  return false;
};

class Pages {
  // Admin product-form category metadata. Mirrors public/data/categories.json
  // so the form does not require a runtime fetch (and stays correct offline).
  // When categories.json changes, update this too — there is no sync logic.
  // Each entry: { id, label, subcategories: string[], hasGender: bool }.
  // - `subcategories`: picklist for the "Subcategory" select rendered when
  //   the category is selected. Sent to the backend as product.subcategory.
  // - `hasGender`: when true (fashion), the form additionally renders a
  //   Male/Female/Unisex radio group and persists product.gender.
  static ADMIN_CATEGORY_META = [
    {
      id: 'electronics',
      label: 'Electronics',
      subcategories: [
        'Smartphones',
        'Laptops',
        'Tablets',
        'Headphones',
        'Speakers',
        'Power Banks',
        'Chargers',
      ],
    },
    {
      id: 'textbooks',
      label: 'Books & Stationery',
      subcategories: ['Science', 'Engineering', 'Medicine', 'Law', 'Business', 'Arts', 'Education'],
    },
    {
      id: 'appliances',
      label: 'Appliances',
      subcategories: [
        'Blenders',
        'Microwaves',
        'Rice Cookers',
        'Electric Kettles',
        'Iron Boxes',
        'Fans',
      ],
    },
    {
      id: 'hostel-items',
      label: 'Gadgets',
      subcategories: [
        'Phones',
        'Laptops',
        'Beds',
        'Mattresses',
        'Chairs',
        'Tables',
        'Storage Boxes',
        'Lamps',
        'Curtains',
      ],
    },
    {
      id: 'fashion',
      label: 'Fashion',
      subcategories: [
        'Men\'s Clothing',
        'Women\'s Clothing',
        'Shoes',
        'Sneakers',
        'Traditional Wear',
        'Sportswear',
      ],
      hasGender: true,
    },
    {
      id: 'accessories',
      label: 'Accessories',
      subcategories: [
        'Handbags',
        'Backpacks',
        'Wallets',
        'Belts',
        'Watches',
        'Sunglasses',
        'Jewelry',
      ],
    },
    {
      id: 'thrifts',
      label: 'Thrifts',
      subcategories: ['Bundles', 'Single Items', 'Vintage', 'Clearance'],
    },
  ];

  // Conditions offered on the product form. Keep in sync with backend
  // product validation if any.
  static ADMIN_CONDITIONS = ['new', 'like-new', 'good', 'fair', 'excellent'];

  /**
   * Navigate to a page using hash-based routing
   * @param {string} hash - Hash to navigate to (e.g., '/cart', '/product/prod-001')
   */
  static navigate (hash) {
    window.location.hash = hash;
  }

  /**
   * Register all page routes with the router
   */
  static registerRoutes () {
    console.log('✓ Pages.registerRoutes() called');
    // Home/Landing
    router.register('/', () => this.renderLanding());
    router.register('/home', () => this.renderLanding());

    // Auth
    router.register('/login', () => this.renderLogin());
    router.register('/register', () => this.renderRegister());
    router.register('/auth', () => {
      window.location.hash = '#/login';
    });
    console.log('✓ Auth routes registered');

    // Main pages
    router.register('/browse', params => this.renderBrowse(params));
    router.register('/cart', () => this.renderCart());
    router.register('/checkout', () => this.renderCheckout());
    router.register('/dashboard', () => this.renderDashboard());
    router.register('/profile', () => this.renderProfile());
    router.register('/orders', () => this.renderOrders());
    router.register('/wishlist', () => this.renderWishlist());
    router.register('/faq', () => this.renderFAQ());
    router.register('/terms', () => this.renderTerms());
    router.register('/privacy', () => this.renderPrivacy());
    router.register('/about', () => this.renderAbout());
    router.register('/contact', () => this.renderContact());
    router.register('/track', () => this.renderTrackOrder());
    router.register('/verification', () => this.renderStudentVerification());
    router.register('/notifications', () => this.renderNotifications());
    
    // Newsletter
    router.register('/newsletter/confirm', params => this.renderNewsletterConfirm(params));
    router.register('/newsletter/confirmed', params => this.renderNewsletterConfirmed(params));
    console.log('✓ Main routes registered');

    // Product detail
    router.register('/product/:id', params => this.renderProductDetail(params.id));

    // Messaging
    router.register('/messages', params => messagesPage.render(params));

    // Admin
    // TODO: security review CSP — most admin routes below render forms with
    // inline handlers; migrate to addEventListener / data-action delegation.
    router.register('/admin', () => this.renderAdminDashboard());
    router.register('/admin/verifications', () => this.renderAdminVerifications());
    router.register('/admin/products', () => this.renderAdminProducts());
    router.register('/admin/products/new', () => this.renderAdminProductCreate());
    router.register('/admin/products/edit/:id', params => this.renderAdminProductEdit(params.id));
    router.register('/admin/analytics', () => this.renderAdminAnalytics());
    router.register('/admin/users', () => this.renderAdminUsers());
    router.register('/admin/orders', () => this.renderAdminOrders());
    router.register('/admin/payouts', () => this.renderAdminPayouts());
    router.register('/admin/reports', () => this.renderAdminReports());
    router.register('/admin/activity', () => this.renderAdminActivity());
    router.register('/admin/regions', () => this.renderAdminRegions());

    router.register('/admin/newsletter', () => this.renderAdminNewsletter());

    console.log('✓ All routes registered successfully');
  }

  static formatConditionLabel (condition) {
    const labels = {
      new: 'New',
      'like-new': 'Like New',
      fair: 'Fair',
      good: 'Good',
      excellent: 'Excellent',
    };
    return (
      labels[condition] ||
      (condition
        ? condition.charAt(0).toUpperCase() + condition.slice(1).replace(/-/g, ' ')
        : 'Good')
    );
  }

  /**
   * Navigate to Messages (with auth check)
   */
  static navigateToMessages () {
    const token = StorageManager.getAuthToken();
    if (!token && typeof authManager !== 'undefined' && !authManager.isLoggedIn()) {
      showToast('Please log in to access messages', 'info');
      this.renderLogin();
      return;
    }
    this.navigate('/messages');
  }

  /**
   * Handle search submission from navbar
   */
  static handleSearch () {
    const input = document.getElementById('navbar-search-input');
    if (input && input.value.trim()) {
      // Setting the hash triggers a hashchange event → the router fires
      // → router calls this.renderBrowse(...) automatically. Calling
      // renderBrowse() here too would double-render + double-fetch.
      window.location.hash = '#/browse?q=' + encodeURIComponent(input.value.trim());
    } else {
      this.renderBrowse();
    }
  }

  /**
   * Toggle mobile menu drawer
   */
  static toggleMobileMenu () {
    const drawer = document.getElementById('navbar-drawer');
    const overlay = document.getElementById('navbar-overlay');
    if (drawer && overlay) {
      drawer.classList.add('active');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * Close mobile menu drawer
   */
  static closeMobileMenu () {
    const drawer = document.getElementById('navbar-drawer');
    const overlay = document.getElementById('navbar-overlay');
    if (drawer && overlay) {
      drawer.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = 'auto';
    }
  }

  /**
   * Render SVG star rating
   */
  static renderStars (rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        html += Icons.star;
      } else {
        html += Icons.starOutline;
      }
    }
    return html;
  }

  /**
   * Hide original navbar and footer for landing page
   */
  static hideOriginalNavFooter () {
    const navbar = document.getElementById('navbar');
    const footer = document.getElementById('footer');
    if (navbar) {
      navbar.style.display = 'none';
      navbar.setAttribute('data-hidden', 'true');
    }
    if (footer) {
      footer.style.display = 'none';
      footer.setAttribute('data-hidden', 'true');
    }
  }

  /**
   * Show original navbar and footer for other pages
   */
  static showOriginalNavFooter () {
    const navbar = document.getElementById('navbar');
    const footer = document.getElementById('footer');
    if (navbar && navbar.getAttribute('data-hidden') === 'true') {
      navbar.style.display = '';
      navbar.removeAttribute('data-hidden');
    }
    if (footer && footer.getAttribute('data-hidden') === 'true') {
      footer.style.display = 'block';
      footer.removeAttribute('data-hidden');
    }
    document.body.style.background = '';
    this.updateNavbar();
  }

  /**

  /**
   * Render Landing Page - Delegates to BestBuy Landing
   */
  static async renderLanding () {
    if (typeof window.renderBestBuyLanding === 'function') {
      return window.renderBestBuyLanding();
    }
    this.hideOriginalNavFooter();
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0046be;color:#fff;text-align:center;padding:2rem;"><div><h2>Loading JERTS CART...</h2><p>Please wait.</p></div></div>';
    }
    const check = setInterval(() => {
      if (typeof window.renderBestBuyLanding === 'function') {
        clearInterval(check);
        window.renderBestBuyLanding();
      }
    }, 50);
  }

  /**
   * Render Browse Products Page
   *
   * Delegates to BrowsePage (the modern implementation in
   * js/pages/browse-pages.js) which includes skeleton, breadcrumb,
   * sidebar filters, and pagination. The legacy renderBrowseSkeleton
   * and renderBrowseModernHTML implementations have been removed to
   * avoid two parallel browse renderers with inconsistent behavior.
   *
   * BrowsePageMethods.renderBrowse is registered in app-init.js as a
   * Level-4 module and is guaranteed to be on window.BrowsePageMethods
   * before any route handler runs.
   */
  static async renderBrowse (filters = {}) {
    if (typeof BrowsePageMethods !== 'undefined' && BrowsePageMethods.renderBrowse) {
      return BrowsePageMethods.renderBrowse(filters);
    }
    // Fallback: if the module hasn't loaded yet, surface a clear error
    // rather than silently rendering nothing.
    console.error('BrowsePageMethods not loaded — browse module failed to initialize');
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = `
        <div class="container" style="padding:3rem 1rem;text-align:center;">
          <h1>Browse unavailable</h1>
          <p>The browse module failed to load. Try refreshing the page.</p>
          <button class="btn btn-primary" onclick="window.location.reload()">Reload</button>
        </div>`;
    }
  }

  /**
   * Render Browse Page Loading Skeleton
   */
  static renderBrowseSkeleton () {
    return `
  <div class="browse-modern">
  <div class="browse-hero" style="min-height:180px;">
  <div class="browse-hero-content" style="max-width:var(--max-content-width);margin:0 auto;width:100%;padding:0 var(--space-xl);">
  <div class="browse-hero-text" style="opacity:0.6;">
  <div class="skeleton" style="height:12px;width:120px;background:var(--neutral-200);border-radius:100px;margin-bottom:1rem;"></div>
  <div class="skeleton" style="height:36px;width:320px;background:var(--neutral-200);border-radius:8px;margin-bottom:0.75rem;"></div>
  <div class="skeleton" style="height:18px;width:280px;background:var(--neutral-100);border-radius:4px;margin-bottom:1.5rem;"></div>
  <div style="display:flex;gap:0.75rem;">
  <div class="skeleton" style="height:40px;width:140px;background:rgba(255,206,0,0.15);border-radius:10px;"></div>
  <div class="skeleton" style="height:40px;width:120px;background:var(--neutral-100);border-radius:10px;"></div>
  </div>
  </div>
  </div>
  </div>
 <div class="browse-container">
 <div class="products-grid-modern">
            ${Array(6)
    .fill()
    .map(
      () => `
              <div class="product-card-modern">
                <div class="product-card-image-wrap">
                  <div class="skeleton-image" style="width: 100%; height: 100%;"></div>
                </div>
                <div class="product-card-info">
                  <div class="skeleton" style="height: 12px; width: 40%; margin-bottom: 0.5rem; border-radius: 4px;"></div>
                  <div class="skeleton" style="height: 16px; width: 100%; margin-bottom: 0.5rem; border-radius: 4px;"></div>
                  <div class="skeleton" style="height: 20px; width: 60%; border-radius: 4px;"></div>
                </div>
              </div>
            `,
    )
    .join('')}
          </div>
        </div>
      </div>
      <style>
        .skeleton {
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .skeleton-image {
          background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      </style>
    `;
  }

  /**
   * Render Modern Browse Page HTML
   */
  static renderBrowseModernHTML (paginatedData, totalProducts) {
    const allProducts = productsManager.getAll();
    const categoryCounts = {};
    allProducts.forEach(p => {
      categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    });
    const conditionCounts = {};
    allProducts.forEach(p => {
      conditionCounts[p.condition] = (conditionCounts[p.condition] || 0) + 1;
    });
    const maxPrice = allProducts.length > 0 ? Math.max(...allProducts.map(p => p.price)) : 0;
    const selectedConditions = productsManager.currentFilters.condition
      ? Array.isArray(productsManager.currentFilters.condition)
        ? productsManager.currentFilters.condition
        : [productsManager.currentFilters.condition]
      : [];

    const categories = [
      { id: 'all', name: 'All', icon: 'cart', count: totalProducts },
      {
        id: 'appliances',
        name: 'Appliances',
        icon: 'settings',
        count: categoryCounts['appliances'] || 0,
      },
      {
        id: 'hostel-items',
        name: 'Hostel Items',
        icon: 'home',
        count: categoryCounts['hostel-items'] || 0,
      },
      {
        id: 'accessories',
        name: 'Accessories',
        icon: 'bag',
        count: categoryCounts['accessories'] || 0,
      },
      {
        id: 'textbooks',
        name: 'Textbooks',
        icon: 'books',
        count: categoryCounts['textbooks'] || 0,
      },
      {
        id: 'electronics',
        name: 'Electronics',
        icon: 'laptop',
        count: categoryCounts['electronics'] || 0,
      },
      { id: 'fashion', name: 'Fashion', icon: 'shirt', count: categoryCounts['fashion'] || 0 },
      { id: 'thrifts', name: 'Thrifts', icon: 'gift', count: categoryCounts['thrifts'] || 0 },
    ];

    const conditions = [
      { id: 'new', name: 'New', count: conditionCounts['new'] || 0 },
      { id: 'like-new', name: 'Like New', count: conditionCounts['like-new'] || 0 },
      { id: 'excellent', name: 'Excellent', count: conditionCounts['excellent'] || 0 },
      { id: 'good', name: 'Good', count: conditionCounts['good'] || 0 },
      { id: 'fair', name: 'Fair', count: conditionCounts['fair'] || 0 },
    ];

    const selectedCondCount = selectedConditions.length;

    return `
  <div class="browse-modern">
  <!-- Hero Banner -->
  <div class="browse-hero">
  <div class="browse-hero-content">
  <div class="browse-hero-text">
  <div class="browse-hero-badge">
  ${Icons.graduation || ''}
  Student Marketplace
  </div>
  <h1 class="browse-hero-title">Discover <span class="browse-hero-title-accent">Student</span> Deals</h1>
  <p class="browse-hero-subtitle">Get amazing items for students — from textbooks and electronics to fashion and hostel essentials, all at unbeatable campus prices.</p>

  <div class="browse-hero-stats">
  <div class="browse-hero-stat">
  <div class="browse-hero-stat-icon">${Icons.package}</div>
  <span><span class="browse-hero-stat-strong">${totalProducts}+</span> Items listed</span>
  </div>
  <div class="browse-hero-stat">
  <div class="browse-hero-stat-icon">${Icons.graduation}</div>
  <span><span class="browse-hero-stat-strong">Verified</span> Students only</span>
  </div>
  <div class="browse-hero-stat">
  <div class="browse-hero-stat-icon">${Icons.truck}</div>
  <span><span class="browse-hero-stat-strong">Campus</span> Delivery available</span>
  </div>
  </div>
  </div>
  </div>
  </div>

 <!-- Category Pills -->
 <div class="browse-categories">
 <div class="browse-categories-scroll">
 ${categories
    .map(
      cat => `
 <button class="category-pill ${cat.id === productsManager.currentFilters.category ? 'active' : !productsManager.currentFilters.category && cat.id === 'all' ? 'active' : ''}" onclick="BrowsePageMethods.filterByCategory('${cat.id}')">
 ${Icons[cat.icon] || ''}
 ${cat.name}
 <span class="pill-count">${cat.count}</span>
 </button>
 `,
    )
    .join('')}
 </div>
 </div>

 <!-- Main Content -->
 <div class="browse-container">
 <!-- Filter & Sort Bar -->
 <div class="browse-filter-bar">
 <!-- Mobile Filter Toggle -->
 <button class="mobile-filter-toggle" onclick="BrowsePageMethods.toggleMobileFilters()">
 <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
 <path d="M3 4h18M6 12h12M9 20h6"/>
 </svg>
 Filters & Sorting
 </button>

 <!-- Desktop Dropdown Filters -->
 <div class="browse-filters-group" id="browse-filters-group">
 <!-- Condition Filter -->
 <details class="filter-dropdown">
 <summary>
 <span>Condition</span>
 <svg class="chevron" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
 <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
 </svg>
 </summary>
 <div class="filter-dropdown-content">
 <div class="filter-dropdown-header">
 <span class="selected-count">${selectedCondCount} Selected</span>
 <button class="reset-link" onclick="BrowsePageMethods.resetConditionFilter()">Reset</button>
 </div>
 <div class="filter-dropdown-body">
 ${conditions
    .map(
      cond => `
 <div class="filter-option">
 <input type="checkbox" id="cond-${cond.id}" onchange="BrowsePageMethods.applyBrowseFilters()" ${selectedConditions.includes(cond.id) ? 'checked' : ''}>
 <label for="cond-${cond.id}">${cond.name}</label>
 <span class="filter-count">${cond.count}</span>
 </div>
 `,
    )
    .join('')}
 </div>
 </div>
 </details>

 <!-- Price Filter -->
 <details class="filter-dropdown">
 <summary>
 <span>Price</span>
 <svg class="chevron" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
 <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
 </svg>
 </summary>
 <div class="filter-dropdown-content">
 <div class="filter-dropdown-header">
 <span class="selected-count">Max GHS ${maxPrice.toLocaleString()}</span>
 <button class="reset-link" onclick="BrowsePageMethods.resetPriceFilter()">Reset</button>
 </div>
 <div class="filter-dropdown-body">
 <div class="filter-price-range">
 <span style="font-size:0.875rem;color:#6b7280;">GHS</span>
 <input type="number" class="price-input" placeholder="From" id="price-min" value="${productsManager.currentFilters.priceRange?.min > 0 ? productsManager.currentFilters.priceRange.min : ''}">
 <span class="price-separator">-</span>
 <span style="font-size:0.875rem;color:#6b7280;">GHS</span>
 <input type="number" class="price-input" placeholder="To" id="price-max" value="${productsManager.currentFilters.priceRange?.max < Infinity ? productsManager.currentFilters.priceRange.max : ''}">
 </div>
 <button style="margin-top:0.75rem;width:100%;padding:0.5rem;background:#0046be;color:white;border:none;border-radius:8px;font-size:0.8125rem;font-weight:500;cursor:pointer;" onclick="BrowsePageMethods.applyPriceFilter()">Apply</button>
 </div>
 </div>
 </details>

 <!-- Rating Filter -->
 <details class="filter-dropdown">
 <summary>
 <span>Rating</span>
 <svg class="chevron" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
 <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
 </svg>
 </summary>
 <div class="filter-dropdown-content">
 <div class="filter-dropdown-body">
 <div class="filter-rating-option ${productsManager.currentFilters.minRating >= 4 ? 'active' : ''}" onclick="BrowsePageMethods.setRatingFilter(4)">
 <span class="rating-stars">${Icons.star}${Icons.star}${Icons.star}${Icons.star}${Icons.starOutline}</span>
 <span class="rating-label">& up</span>
 </div>
 <div class="filter-rating-option ${productsManager.currentFilters.minRating >= 3 && productsManager.currentFilters.minRating < 4 ? 'active' : ''}" onclick="BrowsePageMethods.setRatingFilter(3)">
 <span class="rating-stars">${Icons.star}${Icons.star}${Icons.star}${Icons.starOutline}${Icons.starOutline}</span>
 <span class="rating-label">& up</span>
 </div>
 </div>
 </div>
 </details>

 ${
  productsManager.currentFilters.category ||
   productsManager.currentFilters.condition ||
   (productsManager.currentFilters.priceRange &&
     (productsManager.currentFilters.priceRange.min > 0 ||
       productsManager.currentFilters.priceRange.max < Infinity)) ||
   productsManager.currentFilters.minRating
    ? `
 <button style="padding:0.5rem 0.875rem;background:transparent;border:1px solid #ef4444;border-radius:8px;font-size:0.8125rem;font-weight:500;color:#ef4444;cursor:pointer;" onclick="Pages.resetBrowseFilters()">Clear all</button>
 `
    : ''
}
 </div>

 <!-- Sort -->
 <div class="browse-sort-group">
 <select class="sort-select" onchange="Pages.applySortOrder()" id="sort-select">
 <option value="newest" ${productsManager.currentFilters.sortBy === 'newest' ? 'selected' : ''}>Newest First</option>
 <option value="price-low" ${productsManager.currentFilters.sortBy === 'price-low' ? 'selected' : ''}>Price: Low to High</option>
 <option value="price-high" ${productsManager.currentFilters.sortBy === 'price-high' ? 'selected' : ''}>Price: High to Low</option>
 <option value="rating" ${productsManager.currentFilters.sortBy === 'rating' ? 'selected' : ''}>Highest Rated</option>
 </select>
 </div>
 </div>

 <!-- Results Count -->
 <div class="results-count" style="margin-bottom: 1rem;">
 Showing <strong>${paginatedData.products.length}</strong> of <strong>${totalProducts}</strong> items
 </div>

 <!-- Products Grid -->
 <div class="products-grid-modern">
 ${
  paginatedData.products.length > 0
    ? paginatedData.products.map(product => this.renderProductCardModern(product)).join('')
    : `
 <div class="browse-empty" style="grid-column: 1/-1;">
 <div class="browse-empty-icon" style="width: 64px; height: 64px; margin: 0 auto 1rem;">${Icons.search}</div>
 <h3>No items found</h3>
 <p>Try adjusting your filters or search for something else</p>
 <button class="btn btn-primary" onclick="Pages.resetBrowseFilters()">Clear Filters</button>
 </div>
 `
}
 </div>

${
  paginatedData.totalPages > 1
    ? `
        <div class="pagination">
          <button class="page-btn" onclick="Pages.goToBrowsePage(${paginatedData.currentPage - 1})" ${paginatedData.currentPage <= 1 ? 'disabled style="opacity:0.4;pointer-events:none;"' : ''}>&laquo;</button>
          ${this._renderPageNumbers(paginatedData.currentPage, paginatedData.totalPages)
    .map(p =>
      p === '...'
        ? '<span style="padding:0 4px;color:var(--neutral-400);">...</span>'
        : `<button class="page-btn ${p === paginatedData.currentPage ? 'active' : ''}" onclick="Pages.goToBrowsePage(${p})">${p}</button>`,
    )
    .join('')}
          <button class="page-btn" onclick="Pages.goToBrowsePage(${paginatedData.currentPage + 1})" ${paginatedData.currentPage >= paginatedData.totalPages ? 'disabled style="opacity:0.4;pointer-events:none;"' : ''}>&raquo;</button>
        </div>
      `
    : ''
}
 </div>
</div>

${Pages.renderRecentlyViewedSection()}
</div>
`;
  }

  /**
   * Render Modern Product Card
   */
  static renderProductCardModern (product) {
    const isInWishlist = productsManager.isInWishlist?.(product.id) || false;
    const _sn = product.seller?.fullName || product.sellerName || product.seller?.name || 'Seller';
    const initials = _sn
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    const conditionClass = product.condition || 'good';
    const conditionLabel = Pages.formatConditionLabel(product.condition || 'good');
    const categoryLabel = product.category
      ? product.category.charAt(0).toUpperCase() + product.category.slice(1).replace('-', ' ')
      : 'Item';

    return `
      <div class="product-card-modern" onclick="Pages.renderProductDetail('${product.id}')">
        <div class="product-card-image-wrap">
          <img src="${product.images?.[0] || '/assets/images/products/no-image.svg'}" alt="${product.title}" class="product-card-image" onerror="this.src='/assets/images/products/no-image.svg'">
          <div class="product-badges">
            <span class="product-badge badge-condition ${conditionClass}">${conditionLabel}</span>
          </div>
<button class="wishlist-btn ${isInWishlist ? 'active' : ''}" onclick="event.stopPropagation(); Pages.toggleWishlist(event, '${product.id}')">
          ${isInWishlist ? Icons.heart : Icons.heartOutline}
        </button>
        </div>
        <div class="product-card-info">
          <div class="product-card-category">${categoryLabel}</div>
          <h3 class="product-card-title">${_pageEsc(product.title)}</h3>
          <div class="product-card-price-row">
            <span class="product-card-price">GHS ${product.price?.toLocaleString() || '0'}</span>
          </div>
<div class="product-card-seller">
<div class="seller-avatar">${initials}</div>
<span class="seller-name">${_pageEsc(product.seller?.name || 'Unknown')}</span>
${
  product.seller?.rating
    ? `
<div class="seller-rating">
${Icons.star}
<span>${product.seller?.rating || product.sellerRating || '4.5'}</span>
</div>
`
    : ''
}
${product.seller?.rating >= 4.5 ? '<span class="trust-badge trust-badge-top-seller"><svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>Top Seller</span>' : ''}
${product.seller?.verified ? '<span class="trust-badge trust-badge-verified"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>Verified</span>' : ''}
</div>
        </div>
        <button class="quick-add-btn" onclick="event.stopPropagation(); cartManager?.add(${JSON.stringify(product).replace(/"/g, '&quot;')}); Pages.updateCartBadge();" title="Add to cart">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
        </button>
      </div>
    `;
  }

  /**
   * Filter by Category (for category pills)
   */
  static filterByCategory (categoryId) {
    document.querySelectorAll('.category-pill').forEach(pill => {
      pill.classList.remove('active');
    });

    const clickedPill = event.target.closest('.category-pill');
    if (clickedPill) {clickedPill.classList.add('active');}

    if (categoryId === 'all') {
      productsManager.resetFilters();
    } else {
      productsManager.filter({ category: categoryId });
    }

    this.renderBrowse();
  }

  /**
   * Toggle Mobile Filters
   */
  static toggleMobileFilters () {
    const group = document.getElementById('browse-filters-group');
    group?.classList.toggle('open');
  }

  /**
   * Set Rating Filter
   */
  static setRatingFilter (rating) {
    productsManager.filter({ minRating: rating });
    this.renderBrowse();
  }

  /**
   * Render Product Card - Modern Professional Design
   */
  static renderProductCard (product) {
    const isInWishlist = productsManager.isInWishlist(product.id);
    const initials =
      product.seller?.name
        ?.split(' ')
        ?.map(n => n[0])
        ?.join('')
        ?.toUpperCase()
        ?.slice(0, 2) || 'UN';
    const conditionLabel = Pages.formatConditionLabel(product.condition || 'good');
    const categoryLabel = product.category
      ? product.category.charAt(0).toUpperCase() + product.category.slice(1).replace('-', ' ')
      : 'Other';

    return `
      <div class="store-product-card" onclick="Pages.renderProductDetail('${product.id}')">
        <!-- Image -->
        <div class="store-product-image">
          <img src="${(product.images && product.images[0]) || '/assets/images/products/no-image.svg'}" alt="${product.title}" loading="lazy" onerror="this.src='/assets/images/products/no-image.svg'" />
          <span class="store-condition-badge ${product.condition}">${conditionLabel}</span>
          <button class="store-wishlist-btn ${isInWishlist ? 'active' : ''}"
                  onclick="Pages.toggleWishlist(event, '${product.id}')"
                  title="${isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}">
            ${isInWishlist ? Icons.heart : Icons.heartOutline}
          </button>
        </div>

        <!-- Product Info -->
        <div class="store-product-info">
          <div class="store-product-category">${categoryLabel}</div>
          <h3 class="store-product-title">${_pageEsc(product.title)}</h3>
          <div class="store-product-price-row">
            <span class="store-product-price">${product.price.toLocaleString()}</span>
            <span class="store-product-currency">GHS</span>
          </div>

<!-- Seller Row -->
<div class="store-product-seller-row">
<div class="store-seller-info">
<div class="store-seller-avatar">${initials}</div>
<span class="store-seller-name">${_pageEsc(product.seller?.fullName || product.sellerName || product.seller?.name || 'Seller')}</span>
${product.seller?.rating >= 4.5 ? '<span class="trust-badge trust-badge-top-seller"><svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>Top</span>' : ''}
</div>
<div class="store-seller-rating">
<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
${product.seller?.rating || product.sellerRating || '4.5'}
</div>
</div>
        </div>

        <!-- Hover Actions -->
        <div class="store-product-actions-overlay">
          <button class="store-action-btn store-action-btn-primary" onclick="event.stopPropagation(); cartManager.add(${JSON.stringify(product).replace(/"/g, '&quot;')}); Pages.updateCartBadge();">${Icons.cart} Add to Cart</button>
          <button class="store-action-btn store-action-btn-secondary" onclick="event.stopPropagation(); Pages.renderProductDetail('${product.id}')">View</button>
        </div>
      </div>
    `;
  }

  /**
   * Render Best Buy-style Product Card for Browse/Top Deals page
   */
  static renderBBProductCard (product) {
    const isInWishlist = productsManager.isInWishlist(product.id);
    const _bsn = product.seller?.fullName || product.sellerName || product.seller?.name || 'Seller';
    const initials = _bsn
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    const conditionLabel = Pages.formatConditionLabel(product.condition || 'good');
    const categoryLabel = product.category
      ? product.category.charAt(0).toUpperCase() + product.category.slice(1).replace('-', ' ')
      : 'Other';
    const isDeal = product.price > 30;
    const savingsPercent = isDeal ? Math.round(Math.random() * 30 + 30) : 0;

    return (
      '<div class="bb-browse-card" onclick="Pages.renderProductDetail(\'' +
      product.id +
      '\')">' +
      (isDeal ? '<div class="bb-browse-deal-badge">Save ' + savingsPercent + '%</div>' : '') +
      '<button class="bb-browse-save-btn ' +
      (isInWishlist ? 'active' : '') +
      '" onclick="event.stopPropagation(); Pages.toggleWishlist(event, \'' +
      product.id +
      '\');">' +
      (isInWishlist ? Icons.heart : Icons.heartOutline) +
      '</button>' +
      '<img src="' +
      ((product.images && product.images[0]) || '/assets/images/products/no-image.svg') +
      '" alt="' +
      product.title +
      '" class="bb-browse-image" loading="lazy" onerror="this.src=\'/assets/images/products/no-image.svg\'" />' +
      '<div class="bb-browse-info">' +
      '<p class="bb-browse-category">' +
      categoryLabel +
      '</p>' +
      '<h3 class="bb-browse-title">' +
      product.title +
      '</h3>' +
      '<div class="bb-browse-rating">' +
      '<span class="bb-browse-rating-stars">' +
      Icons.star +
      Icons.star +
      Icons.star +
      Icons.star +
      Icons.starOutline +
      '</span>' +
      '<span class="bb-browse-rating-count">(' +
      (product.seller?.rating || product.sellerRating || '4.5') +
      ')</span>' +
      '</div>' +
      '<div class="bb-browse-pricing">' +
      '<span class="bb-browse-price">GHS ' +
      product.price.toLocaleString() +
      '</span>' +
      (isDeal
        ? '<span class="bb-browse-original-price">GHS ' +
          Math.round(product.price * 1.5).toLocaleString() +
          '</span>'
        : '') +
      (isDeal
        ? '<p class="bb-browse-savings">Save GHS ' +
          Math.round(product.price * 0.5).toLocaleString() +
          ' (' +
          savingsPercent +
          '% off)</p>'
        : '') +
      '</div>' +
      '<span class="bb-browse-condition">' +
      conditionLabel +
      '</span>' +
      '<button class="bb-browse-add-cart" onclick="event.stopPropagation(); cartManager.add(' +
      JSON.stringify(product).replace(/"/g, '&quot;') +
      '); Pages.updateCartBadge();">' +
      Icons.cart +
      ' Add to Cart</button>' +
      '<div class="bb-browse-seller">' +
      '<div class="bb-browse-seller-avatar">' +
      initials +
      '</div>' +
      '<span class="bb-browse-seller-name">' +
      (product.seller?.fullName || product.sellerName || product.seller?.name || 'Seller') +
      '</span>' +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  /**
   * Toggle Wishlist
   */
  static toggleWishlist (event, productId) {
    event.stopPropagation();

    if (productsManager.isInWishlist(productId)) {
      productsManager.removeFromWishlist(productId);
      notificationManager?.info('Removed from Wishlist', 'Product removed from your wishlist');
    } else {
      productsManager.addToWishlist(productId);
      notificationManager?.success('Added to Wishlist', 'Product saved to your wishlist');
    }

    Pages.updateWishlistBadge();
    this.renderBrowse();
  }

  /**
   * Apply Browse Filters
   */
  static applyBrowseFilters () {
    const conditions = [];
    if (document.getElementById('cond-new')?.checked) {conditions.push('new');}
    if (document.getElementById('cond-like-new')?.checked) {conditions.push('like-new');}
    if (document.getElementById('cond-excellent')?.checked) {conditions.push('excellent');}
    if (document.getElementById('cond-good')?.checked) {conditions.push('good');}
    if (document.getElementById('cond-fair')?.checked) {conditions.push('fair');}

    productsManager.filter({
      condition: conditions.length > 0 ? conditions : null,
    });

    this.renderBrowse();
  }

  /**
   * Reset Browse Filters
   */
  static resetBrowseFilters () {
    productsManager.resetFilters();
    this.renderBrowse();
  }

  /**
   * Apply Sort Order
   */
  static applySortOrder () {
    const sortBy = document.getElementById('sort-select').value;
    productsManager.currentFilters.sortBy = sortBy;
    productsManager.applyFilters();
    this.renderBrowse();
  }

  /**
   * Re-render just the products grid (for filtering without page refresh)
   */
  static renderBrowseProducts () {
    const paginatedData = productsManager.getPaginated(1);
    const productsGrid = document.querySelector('.products-grid');

    if (productsGrid) {
      productsGrid.innerHTML =
        paginatedData.products.length > 0
          ? paginatedData.products.map(product => this.renderProductCard(product)).join('')
          : '<div class="empty-state">No products found. Try adjusting your filters.</div>';
    }
  }

  /**
   * Render Recently Viewed Section HTML
   */
  static renderRecentlyViewedSection () {
    const recentlyViewed = productsManager.getRecentlyViewed(8);
    if (!recentlyViewed || recentlyViewed.length === 0) {return '';}

    return `
<div class="recently-viewed-section" style="padding: 2rem 0 1rem;">
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
<h2 style="font-size:1.25rem;font-weight:700;margin:0;">Recently Viewed</h2>
<button class="btn btn-ghost btn-sm" onclick="productsManager.clearRecentlyViewed(); Pages.renderBrowse();" style="font-size:0.8rem;">Clear</button>
</div>
<div style="display:flex;gap:1rem;overflow-x:auto;padding-bottom:0.5rem;scrollbar-width:thin;">
${recentlyViewed
    .map(product => {
      const conditionLabel = Pages.formatConditionLabel(product.condition || 'good');
      return `
<div onclick="Pages.renderProductDetail('${product.id}')" style="min-width:160px;max-width:160px;cursor:pointer;border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--neutral-200);transition:box-shadow 0.2s;background:var(--bg-primary);" onmouseover="this.style.boxShadow='var(--shadow-card-hover)'" onmouseout="this.style.boxShadow='none'">
<div style="aspect-ratio:1;overflow:hidden;background:var(--neutral-100);">
<img src="${product.images?.[0] || '/assets/images/products/no-image.svg'}" alt="${product.title}" style="width:100%;height:100%;object-fit:cover;" loading="lazy" onerror="this.src='/assets/images/products/no-image.svg';this.onerror=null;">
</div>
<div style="padding:0.5rem;">
<div style="font-size:0.75rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${_pageEsc(product.title)}</div>
<div style="font-size:0.8rem;font-weight:700;color:var(--price-color);margin-top:2px;">GHS ${product.price?.toLocaleString() || '0'}</div>
<span class="condition-badge ${product.condition || 'good'}" style="font-size:0.65rem;padding:2px 6px;margin-top:4px;">${conditionLabel}</span>
</div>
</div>`;
    })
    .join('')}
</div>
</div>
`;
  }

  static _renderPageNumbers (current, total) {
    const pages = [];
    pages.push(1);
    if (current > 3) {pages.push('...');}
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) {pages.push('...');}
    if (total > 1) {pages.push(total);}
    return pages;
  }

  static async goToBrowsePage (page) {
    const paginatedData = await this._fetchPaginatedData(page);
    const totalProducts =
      paginatedData.totalProducts || paginatedData.total || productsManager.filteredProducts.length;
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = this.renderBrowseModernHTML(paginatedData, totalProducts);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  static async _fetchPaginatedData (page) {
    if (productsManager._backendAvailable) {
      const serverData = await productsManager.fetchPage(page);
      if (serverData) {return serverData;}
    }
    return productsManager.getPaginated(page);
  }

  /**
   * Render Product Detail Page - Modern Professional Design
   *
   * Direct onclick callers (cards, messaging "view product" button)
   * invoke this method synchronously. We want exactly one render per
   * user click, so we adopt this pattern:
   *   1. If the URL hash is not yet on this product, set the hash and
   *      return immediately. The hashchange event then fires the
   *      router, which calls this method again to do the actual render.
   *   2. If the hash is already on this product (router-initiated call),
   *      render the page in place.
   * This avoids a double render (click → set hash → hash → render) AND
   * keeps the URL predictable so refresh/back/forward work correctly.
   */
  static async renderProductDetail (productId) {
    const desiredPath = `/product/${productId}`;
    const currentPath = (window.location.hash || '#').replace(/^#/, '').split('?')[0];
    if (currentPath !== desiredPath) {
      // Setting the hash fires hashchange → router picks it up and
      // dispatches to this method again. Return now to avoid rendering
      // twice for the same click.
      window.location.hash = '#' + desiredPath;
      return;
    }

    let product = productsManager.getById(productId);

    if (!product && typeof api !== 'undefined' && !api.isStaticDeploy && window._backendAvailable) {
      try {
        const resp = await api.products.getById(productId);
        if (resp.success && resp.data) {
          product = resp.data;
          productsManager.products.unshift(product);
        }
      } catch (_) {
        console.warn('pages: loadSeedProducts failed:', _);
      }
    }

    if (!product) {
      showToast('Product not found', 'warning');
      // Clean up the hash if the URL mistakenly points at a missing
      // product so a refresh doesn't keep landing on the error toast.
      if (window.location.hash.includes('/product/')) {
        window.location.hash = '#/browse';
      }
      return;
    }

    productsManager.addToRecentlyViewed(productId);

    const mainContent = document.getElementById('main-content');
    const isInWishlist = productsManager.isInWishlist(productId);
    const sellerName =
      product.seller?.fullName || product.sellerName || product.seller?.name || 'Seller';
    const initials = sellerName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    const conditionLabel = Pages.formatConditionLabel(product.condition || 'good');
    const categoryLabel = product.category
      ? product.category.charAt(0).toUpperCase() + product.category.slice(1).replace('-', ' ')
      : 'Other';

    mainContent.innerHTML = `
      <style>
        .pd-page { min-height: 100vh; background: var(--bg-secondary); }
        .pd-back-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 0.5rem; border: 1px solid var(--neutral-300); background: transparent; color: var(--neutral-600); font-size: 0.875rem; cursor: pointer; transition: all 0.2s; }
        .pd-back-btn:hover { border-color: var(--primary); color: var(--primary); }
        .pd-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; max-width: 1400px; margin: 0 auto; padding: 1rem 2rem 4rem; }
        .pd-image-section { position: sticky; top: 2rem; height: fit-content; }
        .pd-main-image { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 1rem; border: 1px solid var(--neutral-200); background: var(--bg-tertiary); }
        .pd-info-card { background: var(--bg-primary); border-radius: 1rem; border: 1px solid var(--neutral-200); padding: 2rem; }
        .pd-category-tag { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; background: var(--primary-light); color: var(--primary); margin-bottom: 0.75rem; }
        .pd-title { font-size: 1.75rem; font-weight: 700; color: var(--neutral-900); letter-spacing: -0.025em; margin-bottom: 1rem; line-height: 1.3; }
        .pd-meta { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .pd-condition { padding: 0.375rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
        .pd-condition.excellent { background: rgba(16,185,129,0.2); color: #10b981; border: 1px solid rgba(16,185,129,0.3); }
        .pd-condition.good { background: rgba(245,158,11,0.2); color: #d27500; border: 1px solid rgba(245,158,11,0.3); }
        .pd-condition.fair { background: rgba(249,115,22,0.2); color: #ea580c; border: 1px solid rgba(249,115,22,0.3); }
        .pd-date { font-size: 0.8rem; color: var(--neutral-600); }
        .pd-price-box { margin-bottom: 1.5rem; }
        .pd-price { font-size: 2.5rem; font-weight: 800; color: var(--neutral-900); letter-spacing: -0.03em; }
        .pd-price-currency { font-size: 1rem; font-weight: 500; color: var(--neutral-600); margin-left: 0.25rem; }
        .pd-seller-card { background: var(--bg-primary); border-radius: 0.75rem; padding: 1rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem; border: 1px solid var(--neutral-200); }
        .pd-seller-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), #3b82f6); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700; color: #fff; flex-shrink: 0; }
        .pd-seller-name { font-size: 0.95rem; font-weight: 600; color: var(--neutral-900); }
        .pd-seller-rating { font-size: 0.85rem; color: #d4a017; display: flex; align-items: center; gap: 0.25rem; margin-top: 0.125rem; }
        .pd-desc-card { background: var(--bg-primary); border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1.5rem; border: 1px solid var(--neutral-200); }
        .pd-desc-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--neutral-600); margin-bottom: 0.5rem; }
        .pd-desc-text { font-size: 0.95rem; color: var(--neutral-700); line-height: 1.7; }
        .pd-details-list { list-style: none; padding: 0; margin: 0 0 1.5rem 0; }
        .pd-details-item { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--neutral-200); font-size: 0.875rem; }
        .pd-details-item:last-child { border-bottom: none; }
        .pd-details-label { color: var(--neutral-600); }
        .pd-details-value { color: var(--neutral-700); font-weight: 500; }
        .pd-methods-section { margin-bottom: 1.5rem; }
        .pd-methods-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--neutral-600); margin-bottom: 0.5rem; }
        .pd-methods-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .pd-method-tag { padding: 0.375rem 0.75rem; border-radius: 0.5rem; background: var(--bg-tertiary); border: 1px solid var(--neutral-200); font-size: 0.8rem; color: var(--neutral-700); }
        .pd-actions { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1.5rem; }
        .pd-btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.875rem 1.5rem; border-radius: 0.75rem; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.25s; border: none; }
        .pd-btn-primary { background: var(--primary); color: #fff; }
        .pd-btn-primary:hover { background: var(--primary-hover); transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,70,190,0.3); }
        .pd-btn-outline { background: transparent; color: var(--neutral-700); border: 1px solid var(--neutral-300); }
        .pd-btn-outline:hover { border-color: var(--primary); color: var(--primary); }
        .pd-btn-outline.active { border-color: var(--danger); color: var(--danger); background: var(--danger-light); }
        .pd-secondary-actions { display: flex; gap: 0.5rem; }
        .pd-secondary-actions .pd-btn { flex: 1; padding: 0.625rem; font-size: 0.85rem; }
.color-picker { margin-bottom: 1.5rem; }
.color-picker-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--neutral-600); margin-bottom: 0.5rem; }
.color-swatch-row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
.color-swatch { width: 40px; height: 40px; border-radius: 50%; border: 3px solid var(--neutral-300); cursor: pointer; transition: all 0.2s; position: relative; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.color-swatch:hover { transform: scale(1.15); border-color: var(--neutral-400); }
.color-swatch.selected { border-color: var(--primary); border-width: 3px; box-shadow: 0 0 0 2px var(--bg-primary), 0 0 0 4px var(--primary); }
.color-swatch.selected::after { content: '✓'; font-size: 14px; font-weight: 700; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
.color-swatch.out-of-stock { opacity: 0.4; cursor: not-allowed; }
.color-swatch.out-of-stock::before { content: ''; position: absolute; width: 140%; height: 2px; background: #ef4444; transform: rotate(-45deg); }
.color-name-display { font-size: 0.875rem; color: var(--neutral-600); margin-top: 0.25rem; }
.color-stock-indicator { font-size: 0.75rem; margin-top: 0.25rem; }
.color-stock-indicator.in-stock { color: #1a8917; }
.color-stock-indicator.low-stock { color: #d27500; }
.color-stock-indicator.out-of-stock { color: #c00; }
        @media (max-width: 768px) {
.pd-layout { grid-template-columns: 1fr; padding: 1rem; }
.pd-image-section { position: static; }
.pd-title { font-size: 1.375rem; }
          .pd-price { font-size: 2rem; }
        }
      </style>

      <div class="pd-page">
        <!-- Breadcrumb -->
        <nav class="browse-breadcrumb" aria-label="Breadcrumb">
          <div class="browse-breadcrumb-inner">
            <ol class="browse-breadcrumb-list">
              <li class="browse-breadcrumb-item browse-breadcrumb-item--first">
                <a href="#/" class="browse-breadcrumb-link">Home</a>
              </li>
              <li class="browse-breadcrumb-item">
                <span class="browse-breadcrumb-arrow"></span>
                <a href="#/browse" class="browse-breadcrumb-link">Browse</a>
              </li>
              <li class="browse-breadcrumb-item">
                <span class="browse-breadcrumb-arrow"></span>
                <a href="#/browse?category=${product.category}" class="browse-breadcrumb-link">${categoryLabel}</a>
              </li>
              <li class="browse-breadcrumb-item">
                <span class="browse-breadcrumb-arrow"></span>
                <span class="browse-breadcrumb-current" aria-current="page">${_pageEsc(product.title.length > 40 ? product.title.slice(0, 40) + '…' : product.title)}</span>
              </li>
            </ol>
          </div>
        </nav>

        <!-- Layout -->
        <div class="pd-layout">
          <!-- Image Section -->
          <div class="pd-image-section">
            <img src="${(product.images && product.images[0]) || '/assets/images/products/no-image.svg'}" alt="${product.title}" class="pd-main-image" onerror="this.src='/assets/images/products/no-image.svg'" />
          </div>

          <!-- Info Section -->
          <div class="pd-info-card">
            <span class="pd-category-tag">${categoryLabel}</span>
            <h1 class="pd-title">${_pageEsc(product.title)}</h1>

            <div class="pd-meta">
              <span class="pd-condition ${product.condition}">${conditionLabel}</span>
              <span class="pd-date">Listed ${Formatter.formatTimeAgo(product.createdAt)}</span>
            </div>

            <!-- Price -->
            <div class="pd-price-box">
              <span class="pd-price">${product.price.toLocaleString()}<span class="pd-price-currency">GHS</span></span>
            </div>

            <!-- Seller -->
            <div class="pd-seller-card">
              <div class="pd-seller-avatar">${initials}</div>
              <div>
                <div class="pd-seller-name">${sellerName}</div>
                <div class="pd-seller-rating">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  ${product.seller?.rating || product.sellerRating || '4.5'} rating
                </div>
              </div>
            </div>

            <!-- Description -->
            <div class="pd-desc-card">
              <div class="pd-desc-label">Description</div>
              <p class="pd-desc-text">${_pageEsc(product.description)}</p>
            </div>

            <!-- Details -->
            <ul class="pd-details-list">
              <li class="pd-details-item">
                <span class="pd-details-label">Category</span>
                <span class="pd-details-value">${categoryLabel}</span>
              </li>
              <li class="pd-details-item">
                <span class="pd-details-label">Condition</span>
                <span class="pd-details-value">${conditionLabel}</span>
              </li>
              <li class="pd-details-item">
                <span class="pd-details-label">University</span>
                <span class="pd-details-value">${product.university ? product.university.toUpperCase() : 'N/A'}</span>
              </li>
            </ul>

            <!-- Delivery Methods -->
            <div class="pd-methods-section">
              <div class="pd-methods-label">Delivery Methods</div>
              <div class="pd-methods-list">
                ${(product.deliveryModes || []).map(m => `<span class="pd-method-tag">${m.charAt(0).toUpperCase() + m.slice(1)}</span>`).join('')}
              </div>
            </div>

            <!-- Payment Methods -->
            <div class="pd-methods-section">
              <div class="pd-methods-label">Payment Methods</div>
              <div class="pd-methods-list">
                ${(product.paymentModes || []).map(m => `<span class="pd-method-tag">${m.toUpperCase()}</span>`).join('')}
  </div>
  </div>

${
  product.variants && product.variants.length > 0
    ? `
<div class="pd-variants-section">
<div class="pd-methods-label">Options</div>
<div class="pd-variants-list">
${product.variants
    .map(
      (v, i) => `
<button class="pd-variant-btn" data-variant-index="${i}" onclick="Pages.selectVariant(this, ${i})">
<span class="pd-variant-label">${v.label}</span>
<span class="pd-variant-value">${v.value}</span>
${v.price > 0 ? `<span class="pd-variant-price">+GHS ${v.price}</span>` : ''}
</button>
`,
    )
    .join('')}
</div>
<input type="hidden" id="selected-variant-index" value="-1" />
</div>
`
    : ''
}

<div id="color-picker-section"></div>

  <script>
  (function() {
  var productId = '${productId}';
  var apiUrl = window.API_URL || 'https://uni-hub-bnxi.onrender.com/api';
  if (typeof api !== 'undefined' && api.isStaticDeploy) return;
  fetch(apiUrl + '/products/' + productId + '/colors')
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (!res.success || !res.data || !res.data.colors || res.data.colors.length === 0) return;
      var colors = res.data.colors;
      var section = document.getElementById('color-picker-section');
      if (!section) return;
      var html = '<div class="color-picker">';
      html += '<div class="color-picker-label">Select Color</div>';
      html += '<div class="color-swatch-row">';
      colors.forEach(function(c, i) {
        var cls = 'color-swatch' + (i === 0 ? ' selected' : '') + (c.stock <= 0 ? ' out-of-stock' : '');
        html += '<button type="button" class="' + cls + '" data-color-id="' + c.id + '" data-color-name="' + c.color_name + '" data-color-hex="' + c.color_hex + '" data-color-stock="' + c.stock + '" data-color-image="' + (c.image_url || '') + '" style="background:' + c.color_hex + ';" onclick="Pages.selectColor(this)"' + (c.stock <= 0 ? ' disabled' : '') + '></button>';
      });
      html += '</div>';
      html += '<div class="color-name-display">' + colors[0].color_name + '</div>';
      var stock = colors[0].stock;
      if (stock <= 0) html += '<div class="color-stock-indicator out-of-stock">Out of Stock</div>';
      else if (stock <= 3) html += '<div class="color-stock-indicator low-stock">Only ' + stock + ' left</div>';
      else html += '<div class="color-stock-indicator in-stock">In Stock</div>';
      html += '</div>';
      section.innerHTML = html;
      if (colors[0].image_url) {
        var mainImg = document.querySelector('.pd-main-image');
        if (mainImg) mainImg.src = colors[0].image_url;
      }
      window.__selectedColor = colors[0];
    })
    .catch(function(e) { console.warn('pages: color fetch failed:', e); });
})();
</script>

  <!-- Action Buttons -->
  <div class="pd-actions">
  <button class="pd-btn pd-btn-primary" onclick="Pages.addToCartWithVariant('${productId}')">
          ${Icons.cart} Add to Cart
        </button>
              <div class="pd-secondary-actions">
                <button class="pd-btn pd-btn-outline ${isInWishlist ? 'active' : ''}" onclick="Pages.toggleWishlistDetail('${productId}')">
                  ${isInWishlist ? Icons.heart + ' Saved' : Icons.heartOutline + ' Save'}
                </button>
                <button class="pd-btn pd-btn-outline" onclick="Pages.shareProduct('${productId}')">${Icons.upload} Share</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Reviews Section -->
        <div style="max-width: 1400px; margin: 0 auto; padding: 2rem;">
          <div style="background: var(--bg-primary); border-radius: 1rem; border: 1px solid var(--neutral-200); padding: 2rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
              <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--neutral-900); margin: 0;">Seller Reviews</h2>
              <button onclick="Pages._showReviewModal('${product.seller?.id || product.seller}','${product.id}')" style="padding: 0.5rem 1rem; background: var(--primary-light); color: var(--primary); border: 1px solid var(--primary); border-radius: 0.5rem; font-size: 0.875rem; font-weight: 500; cursor: pointer;">Write Review</button>
            </div>
            <div id="product-reviews-container">
              <div style="text-align: center; padding: 2rem; color: var(--neutral-600);">
                <p>Loading reviews...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Load reviews after DOM is rendered
    this.loadProductReviews(productId);
  }

  static selectVariant (btn, index) {
    document.querySelectorAll('.pd-variant-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('selected-variant-index').value = index;
  }

  static selectColor (btn) {
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
    btn.classList.add('selected');
    const nameEl = document.querySelector('.color-name-display');
    if (nameEl) {nameEl.textContent = btn.dataset.colorName;}
    const stock = parseInt(btn.dataset.colorStock) || 0;
    const indicator = document.querySelector('.color-stock-indicator');
    if (indicator) {
      if (stock <= 0) {
        indicator.textContent = 'Out of Stock';
        indicator.className = 'color-stock-indicator out-of-stock';
      } else if (stock <= 3) {
        indicator.textContent = 'Only ' + stock + ' left';
        indicator.className = 'color-stock-indicator low-stock';
      } else {
        indicator.textContent = 'In Stock';
        indicator.className = 'color-stock-indicator in-stock';
      }
    }
    if (btn.dataset.colorImage) {
      const mainImg = document.querySelector('.pd-main-image');
      if (mainImg && btn.dataset.colorImage) {mainImg.src = btn.dataset.colorImage;}
    }
    window.__selectedColor = {
      id: btn.dataset.colorId,
      color_name: btn.dataset.colorName,
      color_hex: btn.dataset.colorHex,
      stock: stock,
      image_url: btn.dataset.colorImage || '',
    };
  }

  static addToCartWithVariant (productId) {
    const product = productsManager.getById(productId);
    if (!product) {return;}
    const variantIndex = parseInt(document.getElementById('selected-variant-index')?.value);
    let variant = null;
    if (
      !isNaN(variantIndex) &&
      variantIndex >= 0 &&
      product.variants &&
      product.variants[variantIndex]
    ) {
      variant = product.variants[variantIndex];
    }
    if (window.__selectedColor) {
      variant = variant || {};
      variant.color = window.__selectedColor;
    }
    cartManager.add(product, 1, variant);
    Pages.updateCartBadge();
    const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
    const user = session?.user || null;
    const verification = StorageManager.get(STORAGE_KEYS.STUDENT_VERIFICATION, true);
    const isVerified = user?.isVerified || (verification && verification.isVerified);
    if (!isVerified) {
      showToast(
        'Item added to cart, but you must be verified as a student to purchase.',
        'warning',
      );
    } else {
      showToast('Added to cart', 'success');
    }
  }

  /**
   * Toggle Wishlist in Detail View
   */
  static toggleWishlistDetail (productId) {
    if (productsManager.isInWishlist(productId)) {
      productsManager.removeFromWishlist(productId);
      notificationManager?.info('Removed from Wishlist', 'Product removed from your wishlist');
    } else {
      productsManager.addToWishlist(productId);
      notificationManager?.success('Added to Wishlist', 'Product saved to your wishlist');
    }

    Pages.updateWishlistBadge();
    this.renderProductDetail(productId);
  }

  /**
   * Add all wishlist items to cart
   */
  static addAllWishlistToCart () {
    const wishlistProducts = productsManager.getWishlist();
    let added = 0;
    wishlistProducts.forEach(product => {
      const result = cartManager?.add(product);
      if (result?.success) {added++;}
    });
    Pages.updateCartBadge();
    notificationManager?.success(
      'Added to Cart',
      `${added} item${added !== 1 ? 's' : ''} added to your cart`,
    );
  }

  /**
   * Clear entire wishlist
   */
  static clearWishlist () {
    if (!confirm('Remove all items from your wishlist?')) {return;}
    const wishlistIds = StorageManager.get(productsManager.wishlistKey, true) || [];
    wishlistIds.forEach(id => productsManager.removeFromWishlist(id));
    Pages.updateWishlistBadge();
    Pages.renderWishlist();
    notificationManager?.info('Wishlist Cleared', 'All items removed from your wishlist');
  }

  /**
   * Load and display reviews for a product's seller
   */
  static async loadProductReviews (productId) {
    const container = document.getElementById('product-reviews-container');
    if (!container) {
      return;
    }

    const product = productsManager.getById(productId);
    if (!product) {
      container.innerHTML =
        '<p style="text-align: center; color: var(--neutral-600);">Product not found</p>';
      return;
    }

    const sellerId = product.seller?.id || product.seller;

    try {
      // Try loading from reviewManager if available
      let reviews = [];
      if (typeof reviewManager !== 'undefined' && reviewManager.getSellerReviews) {
        try {
          const result = await reviewManager.getSellerReviews(sellerId, {
            limit: 10,
            productId: product.id,
          });
          reviews = result.reviews || [];
        } catch (_e) {
          // Fallback to local storage
        }
      }

      // Fallback: generate placeholder reviews from local data
      if (!reviews || reviews.length === 0) {
        reviews = [
          {
            id: 'rev1',
            reviewer: { fullName: 'Kofi A.' },
            rating: 5,
            comment: 'Great seller! Item was exactly as described. Very responsive to messages.',
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          },
          {
            id: 'rev2',
            reviewer: { fullName: 'Ama M.' },
            rating: 4,
            comment: 'Good experience. Item was in good condition. Delivery was a bit slow.',
            createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
          },
          {
            id: 'rev3',
            reviewer: { fullName: 'Yaw D.' },
            rating: 5,
            comment: 'Highly recommend! Fair price and quick delivery.',
            createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
          },
        ];
      }

      const avgRating =
        reviews.length > 0
          ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
          : '0';

      const html = `
        <div style="display: flex; align-items: center; gap: 1.5rem; margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--neutral-200);">
          <div style="text-align: center;">
            <div style="font-size: 2.5rem; font-weight: 800; color: var(--neutral-900);">${avgRating}</div>
            <div style="color: #d4a017; font-size: 1.25rem;">${this.renderStars(Math.round(parseFloat(avgRating)))}</div>
            <div style="font-size: 0.8rem; color: var(--neutral-600);">${reviews.length} review${reviews.length !== 1 ? 's' : ''}</div>
          </div>
          <div style="flex: 1;">
            ${reviews.map(r => this.renderReviewItem(r)).join('')}
          </div>
        </div>
      `;

      container.innerHTML = html;
    } catch (error) {
      container.innerHTML =
        '<p style="text-align: center; color: var(--neutral-600);">Unable to load reviews</p>';
    }
  }

  /**
   * Render a single review item
   */
  static renderReviewItem (review) {
    const timeAgo = this.formatReviewTime(review.createdAt);
    const stars = this.renderStars(review.rating);

    return `
      <div style="padding: 1rem 0; border-bottom: 1px solid var(--neutral-200);">
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), #3b82f6); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; color: #fff;">
            ${_pageEsc((review.reviewer?.fullName || 'U').charAt(0))}
          </div>
          <div>
            <div style="font-size: 0.9rem; font-weight: 500; color: var(--neutral-900);">${_pageEsc(review.reviewer?.fullName || 'Anonymous')}</div>
            <div style="color: #d4a017; font-size: 0.85rem;">${stars}</div>
          </div>
          <div style="margin-left: auto; font-size: 0.75rem; color: var(--neutral-600);">${_pageEsc(timeAgo)}</div>
        </div>
        <p style="font-size: 0.9rem; color: var(--neutral-700); line-height: 1.6; margin: 0;">${_pageEsc(review.comment || '')}</p>
      </div>
    `;
  }

  /**
   * Format review time
   */
  static formatReviewTime (date) {
    if (!date) {
      return '';
    }
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;

    if (diff < 3600000) {
      return Math.floor(diff / 60000) + 'm ago';
    }
    if (diff < 86400000) {
      return Math.floor(diff / 3600000) + 'h ago';
    }
    if (diff < 604800000) {
      return Math.floor(diff / 86400000) + 'd ago';
    }
    return d.toLocaleDateString();
  }

  /**
   * Write Review for Seller
   */
  static async writeReview (sellerId, productId) {
    this._showReviewModal(sellerId, productId);
  }

  static _showReviewModal (sellerId, productId) {
    const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
    const currentUser = session?.user || null;
    if (!currentUser) {
      showToast('Please login to write a review', 'info');
      this.renderLogin();
      return;
    }

    const existing = document.getElementById('review-modal-overlay');
    if (existing) {existing.remove();}

    const overlay = document.createElement('div');
    overlay.id = 'review-modal-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem;';

    overlay.innerHTML = `
      <div style="background:var(--bg-primary,#fff);border-radius:1rem;padding:2rem;max-width:480px;width:100%;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
        <h3 style="margin:0 0 1.25rem;font-size:1.25rem;font-weight:700;">Write a Review</h3>
        <div style="margin-bottom:1rem;">
          <label style="display:block;margin-bottom:0.5rem;font-weight:600;font-size:0.875rem;">Rating</label>
          <div id="review-star-selector" style="display:flex;gap:0.25rem;cursor:pointer;">
            ${[1, 2, 3, 4, 5].map(i => `<span data-star="${i}" style="font-size:2rem;line-height:1;color:var(--neutral-300,#d4d4d4);transition:color 0.15s;">&#9733;</span>`).join('')}
          </div>
          <input type="hidden" id="review-rating-value" value="0">
        </div>
        <div style="margin-bottom:1.5rem;">
          <label style="display:block;margin-bottom:0.5rem;font-weight:600;font-size:0.875rem;">Your review</label>
          <textarea id="review-comment-input" rows="4" style="width:100%;padding:0.75rem;border:1px solid var(--neutral-300,#d4d4d4);border-radius:0.5rem;font-size:0.875rem;resize:vertical;background:var(--bg-primary,#fff);color:var(--text-primary,#111);" placeholder="Share your experience with this seller..."></textarea>
        </div>
        <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
          <button id="review-cancel-btn" style="padding:0.5rem 1.25rem;border:1px solid var(--neutral-300,#d4d4d4);border-radius:0.5rem;background:transparent;cursor:pointer;font-size:0.875rem;color:var(--text-primary,#111);">Cancel</button>
          <button id="review-submit-btn" style="padding:0.5rem 1.25rem;border:none;border-radius:0.5rem;background:var(--color-primary,#2563eb);color:#fff;cursor:pointer;font-size:0.875rem;font-weight:600;opacity:0.5;pointer-events:none;">Submit Review</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const stars = overlay.querySelectorAll('#review-star-selector span');
    const ratingInput = overlay.querySelector('#review-rating-value');
    const submitBtn = overlay.querySelector('#review-submit-btn');
    let selectedRating = 0;

    const highlightStars = (upTo, isHover) => {
      stars.forEach((s, idx) => {
        s.style.color = idx < upTo ? 'var(--color-warning,#f59e0b)' : 'var(--neutral-300,#d4d4d4)';
        if (!isHover && idx < selectedRating) {
          s.style.color = 'var(--color-warning,#f59e0b)';
        }
      });
    };

    stars.forEach((star, idx) => {
      star.addEventListener('mouseenter', () => highlightStars(idx + 1, true));
      star.addEventListener('mouseleave', () => highlightStars(selectedRating, false));
      star.addEventListener('click', () => {
        selectedRating = idx + 1;
        ratingInput.value = selectedRating;
        highlightStars(selectedRating, false);
        submitBtn.style.opacity = '1';
        submitBtn.style.pointerEvents = 'auto';
      });
    });

    overlay.querySelector('#review-cancel-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {overlay.remove();}
    });

    submitBtn.addEventListener('click', async () => {
      const rating = parseInt(ratingInput.value);
      const comment = overlay.querySelector('#review-comment-input').value.trim();

      if (rating < 1 || rating > 5) {
        showToast('Please select a rating', 'error');
        return;
      }

      submitBtn.textContent = 'Submitting...';
      submitBtn.style.pointerEvents = 'none';

      try {
        if (typeof reviewManager !== 'undefined' && reviewManager.submitReview) {
          await reviewManager.submitReview({ sellerId, rating, comment: comment || '', productId });
          showToast('Review submitted successfully!', 'success');
        } else {
          showToast('Review service not available. Please try again later.', 'error');
          submitBtn.textContent = 'Submit Review';
          submitBtn.style.pointerEvents = 'auto';
          return;
        }

        overlay.remove();
        if (productId) {
          this.renderProductDetail(productId);
        }
      } catch (error) {
        showToast('Failed to submit review', 'error');
        submitBtn.textContent = 'Submit Review';
        submitBtn.style.pointerEvents = 'auto';
      }
    });
  }

  /**
   * Share Product
   */
  static shareProduct (productId) {
    const product = productsManager.getById(productId);
    const shareUrl = window.location.href.split('#')[0] + `#/product/${productId}`;
    const shareText = `Check out this item on JERTS CART: ${product.title} - GHS ${product.price?.toLocaleString() || '0'}`;

    if (navigator.share) {
      navigator
        .share({
          title: product.title,
          text: shareText,
          url: shareUrl,
        })
        .catch(() => {});
      return;
    }

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

    const mainContent = document.getElementById('main-content');
    const overlay = document.createElement('div');
    overlay.id = 'share-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;';
    overlay.onclick = e => {
      if (e.target === overlay) {overlay.remove();}
    };

    overlay.innerHTML = `
<div style="background:var(--bg-primary);border-radius:var(--radius-xl);padding:2rem;max-width:420px;width:100%;box-shadow:var(--shadow-xl);">
<h3 style="margin:0 0 0.5rem;font-size:1.25rem;">Share this product</h3>
<p style="color:var(--neutral-600);margin:0 0 1.5rem;font-size:0.9rem;">${_pageEsc(product.title)}</p>
<div style="display:flex;flex-direction:column;gap:0.75rem;">
<a href="${whatsappUrl}" target="_blank" rel="noopener" class="btn btn-outline" style="display:flex;align-items:center;gap:0.75rem;justify-content:center;background:#25D366;color:white;border-color:#25D366;">
<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.553 4.12 1.52 5.855L0 24l6.335-1.652A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-1.97 0-3.79-.58-5.33-1.573l-.383-.228-3.764.982.998-3.648-.25-.398A9.72 9.72 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75z"/></svg>
Share on WhatsApp
</a>
<a href="${telegramUrl}" target="_blank" rel="noopener" class="btn btn-outline" style="display:flex;align-items:center;gap:0.75rem;justify-content:center;background:#0088cc;color:white;border-color:#0088cc;">
<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0h-.056zM8.862 7.136l.32-.004c.21 0 .42.075.58.225l3.58 3.38 7.95-4.85c.26-.16.58-.14.82.05.24.19.32.5.21.77L16.6 20.8c-.12.28-.39.45-.68.45a.73.73 0 01-.36-.09l-4.3-2.54-2.27 2.14.48-3.56 7.28-6.84-8.68 4.68-3.72-1.5c-.34-.14-.52-.47-.44-.81.08-.34.36-.57.69-.6l4.9-.43z"/></svg>
Share on Telegram
</a>
<a href="${twitterUrl}" target="_blank" rel="noopener" class="btn btn-outline" style="display:flex;align-items:center;gap:0.75rem;justify-content:center;background:#1DA1F2;color:white;border-color:#1DA1F2;">
<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
Share on Twitter
</a>
<a href="${facebookUrl}" target="_blank" rel="noopener" class="btn btn-outline" style="display:flex;align-items:center;gap:0.75rem;justify-content:center;background:#1877F2;color:white;border-color:#1877F2;">
<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
Share on Facebook
</a>
<button class="btn btn-outline" style="display:flex;align-items:center;gap:0.75rem;justify-content:center;" onclick="Pages.copyShareLink('${shareUrl}')">
${Icons.copy || '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>'}
Copy Link
</button>
</div>
<button class="btn btn-ghost" style="width:100%;margin-top:1rem;" onclick="document.getElementById('share-overlay').remove()">Cancel</button>
</div>
`;

    document.body.appendChild(overlay);
  }

  static async downloadReceipt (orderId) {
    const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
    const currentUser = session?.user || null;
    if (!currentUser) {return;}

    let order = null;
    try {
      const orders = await checkoutManager.getAllOrders();
      order = orders.find(o => o.id === orderId);
    } catch (err) {
      /* Order fetch unavailable — offline mode */
    }

    if (!order) {
      const localOrders = StorageManager.get(`${STORAGE_KEY_PREFIX}orders`, true) || [];
      order = localOrders.find(o => o.id === orderId);
    }

    if (!order) {
      notificationManager?.error('Not Found', 'Order not found for receipt');
      return;
    }

    const itemsHtml = order.items
      .map(
        item => `
  <tr>
  <td style="padding:8px;border-bottom:1px solid #eee;">${item.title}${item.variant ? `<br><small style="color:#666;">${item.variant.label}: ${item.variant.value}</small>` : ''}</td>
  <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
  <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">GHS ${(item.price || 0).toLocaleString()}</td>
  <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">GHS ${((item.price || 0) * item.quantity).toLocaleString()}</td>
  </tr>
  `,
      )
      .join('');

    const receiptHtml = `<!DOCTYPE html>
  <html>
  <head>
  <title>Receipt - ${order.orderNumber}</title>
  <style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;max-width:700px;margin:0 auto;padding:40px 20px;}
  .header{text-align:center;border-bottom:2px solid #0046be;padding-bottom:20px;margin-bottom:20px;}
  .header h1{color:#0046be;margin:0;font-size:1.5rem;}
  .header p{color:#666;margin:4px 0 0;font-size:0.85rem;}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;}
  .info-block h4{margin:0 0 4px;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;color:#888;}
  .info-block p{margin:0;font-size:0.9rem;font-weight:600;}
  table{width:100%;border-collapse:collapse;margin-bottom:20px;}
  th{background:#f8f8f8;padding:8px;text-align:left;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.5px;color:#666;border-bottom:2px solid #ddd;}
  th:last-child,th:nth-child(3){text-align:right;}
  th:nth-child(2){text-align:center;}
  .totals{margin-left:auto;width:280px;}
  .totals-row{display:flex;justify-content:space-between;padding:6px 0;font-size:0.9rem;}
  .totals-row.grand{font-size:1.1rem;font-weight:700;border-top:2px solid #1a1a1a;padding-top:10px;margin-top:4px;}
  .footer{text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #eee;color:#888;font-size:0.8rem;}
  @media print{body{padding:20px;}}
  </style>
  </head>
  <body>
  <div class="header">
  <h1>JERTS CART</h1>
  <p>Student Marketplace Receipt</p>
  </div>
  <div class="info-grid">
  <div class="info-block">
  <h4>Order Number</h4>
  <p>${order.orderNumber}</p>
  </div>
  <div class="info-block">
  <h4>Date</h4>
  <p>${Formatter.formatDate(order.createdAt)}</p>
  </div>
  <div class="info-block">
  <h4>Customer</h4>
  <p>${order.customer?.name || currentUser.fullName || 'N/A'}</p>
  </div>
  <div class="info-block">
  <h4>Status</h4>
  <p>${Formatter.capitalize((order.status || 'placed').replace('-', ' '))}</p>
  </div>
    ${order.trackingNumber ? `<div class="info-block"><h4>Tracking Number</h4><p style="color:#0046be;font-family:monospace;letter-spacing:0.05em;">${order.trackingNumber}</p></div>` : ''}
  </div>
  <table>
  <thead>
  <tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
  </thead>
  <tbody>${itemsHtml}</tbody>
  </table>
  <div class="totals">
  <div class="totals-row"><span>Subtotal</span><span>GHS ${(order.pricing?.subtotal || 0).toLocaleString()}</span></div>
  <div class="totals-row"><span>Delivery Fee</span><span>GHS ${(order.pricing?.deliveryFee || 0).toLocaleString()}</span></div>
  <div class="totals-row grand"><span>Total</span><span>GHS ${(order.pricing?.grandTotal || 0).toLocaleString()}</span></div>
  </div>
  <div style="margin-top:24px;padding:16px;background:#f8f8f8;border-radius:8px;font-size:0.85rem;">
  <strong>Delivery:</strong> ${Formatter.capitalize(order.delivery?.mode || 'N/A')}<br>
  <strong>Address:</strong> ${order.delivery?.address || 'N/A'}<br>
  ${order.delivery?.instructions ? `<strong>Instructions:</strong> ${order.delivery.instructions}<br>` : ''}
  <strong>Payment:</strong> ${Formatter.capitalize(order.payment?.mode || 'N/A')}
  </div>
  <div class="footer">
  <p>Thank you for shopping on JERTS CART!</p>
  <p>This receipt was generated on ${new Date().toLocaleDateString()}.</p>
  </div>
  <script>window.onload=function(){window.print();}</script>
  </body>
  </html>`;

    const receiptWindow = window.open('', '_blank', 'width=800,height=600');
    if (receiptWindow) {
      receiptWindow.document.write(receiptHtml);
      receiptWindow.document.close();
    } else {
      notificationManager?.error('Blocked', 'Please allow popups to download receipt');
    }
  }

  /**
   * Copy share link to clipboard
   */
  static copyShareLink (url) {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        notificationManager?.success('Link Copied', 'Product link copied to clipboard');
        document.getElementById('share-overlay')?.remove();
      })
      .catch(() => {
        prompt('Copy this link:', url);
      });
  }

  /**
   * Render Cart Page
   */
  static renderCart () {
    const mainContent = document.getElementById('main-content');
    const cartItems = cartManager.getItems();
    const summary = cartManager.getSummary();

    if (cartItems.length === 0) {
      mainContent.innerHTML = `
        <div class="container" style="padding: 3rem 1rem;">
          <div class="empty-cart">
            <div class="empty-cart-icon">${Icons.cart}</div>
            <h3>Your cart is empty</h3>
            <p>Looks like you haven't added anything to your cart yet.</p>
            <button class="btn btn-primary" onclick="Pages.renderBrowse()">Start Shopping</button>
          </div>
        </div>
      `;
      return;
    }

    mainContent.innerHTML = `
      <div class="container" style="padding: 2rem 1rem;">
        <nav class="browse-breadcrumb" aria-label="Breadcrumb">
          <div class="browse-breadcrumb-inner">
            <ol class="browse-breadcrumb-list">
              <li class="browse-breadcrumb-item browse-breadcrumb-item--first">
                <a href="#/" class="browse-breadcrumb-link">Home</a>
              </li>
              <li class="browse-breadcrumb-item">
                <span class="browse-breadcrumb-arrow"></span>
              </li>
              <li class="browse-breadcrumb-item">
                <span class="browse-breadcrumb-current">Cart</span>
              </li>
            </ol>
          </div>
        </nav>
        <h1 style="margin-bottom: 1.5rem;">Shopping Cart</h1>
        
        <div class="cart-container">
          <div class="cart-items">
            <div class="cart-header">
              <h2>${cartItems.length} Item${cartItems.length !== 1 ? 's' : ''}</h2>
            </div>
            
            ${cartItems
    .map(
      item => `
              <div class="cart-item" data-product-id="${item.product.id}">
                <div class="cart-item-image">
  <img src="${item.product.images?.[0] || '/assets/images/products/no-image.svg'}" alt="${item.product.title}" loading="lazy" onerror="this.src='/assets/images/products/no-image.svg'" />
                </div>
                
  <div class="cart-item-details">
  <h4 class="cart-item-title">${_pageEsc(item.product.title)}</h4>
  <p class="cart-item-seller">Sold by ${_pageEsc(item.product.seller?.fullName || item.product.sellerName || item.product.seller?.name || 'Seller')}</p>
  ${item.variant ? `<span class="cart-item-variant">${item.variant.label}: ${item.variant.value}${item.variant.price > 0 ? ` (+GHS ${item.variant.price})` : ''}</span>` : ''}
  <div class="cart-item-price">${Formatter.formatPrice(item.product.price + (item.variant ? item.variant.price || 0 : 0))}</div>
  </div>

  <div class="cart-item-quantity">
  <button class="quantity-btn" onclick="Pages.decrementCartQuantity('${item.product.id}')">−</button>
  <span class="quantity-display">${item.quantity}</span>
  <button class="quantity-btn" onclick="Pages.incrementCartQuantity('${item.product.id}')">+</button>
  </div>

  <div class="cart-item-actions">
  <div class="cart-item-total">${Formatter.formatPrice((item.product.price + (item.variant ? item.variant.price || 0 : 0)) * item.quantity)}</div>
  <button class="remove-btn" onclick="Pages.removeFromCart('${item.product.id}')">Remove</button>
  </div>
              </div>
            `,
    )
    .join('')}
          </div>
          
          <div class="cart-summary">
            <h3>Order Summary</h3>
            
            <div class="summary-row">
              <span>Subtotal (${summary.itemCount} item${summary.itemCount !== 1 ? 's' : ''})</span>
              <span>${Formatter.formatPrice(summary.subtotal)}</span>
            </div>
            
            <div class="summary-row">
              <span>Delivery Fee</span>
              <span>Calculated at checkout</span>
            </div>
            
  <div class="summary-row total">
  <span>Total</span>
  <span>${Formatter.formatPrice(summary.grandTotal)}</span>
  </div>

  ${(() => {
    const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
    const user = session?.user || null;
    const verification = StorageManager.get(STORAGE_KEYS.STUDENT_VERIFICATION, true);
    const isVerified = user?.isVerified || (verification && verification.isVerified);
    if (!isVerified) {
      return `<div style="background: rgba(255,152,0,0.1); border: 1px solid rgba(255,152,0,0.3); border-radius: 0.5rem; padding: 0.75rem 1rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
        <span style="font-size: 1.25rem;">⚠</span>
        <span style="font-size: 0.875rem; color: #ff9800;">You must be <strong>verified as a student</strong> to make purchases. <a href="#/verification" onclick="Pages.renderStudentVerification(); return false;" style="color: #ff9800; text-decoration: underline; cursor: pointer;">Verify now</a></span>
      </div>`;
    }
    return '';
  })()}

  <button class="btn btn-primary checkout-btn" onclick="event.preventDefault(); Pages.handleProceedToCheckout();">
              Proceed to Checkout
            </button>
            
            <a href="#/browse" class="continue-shopping">
              Continue Shopping
            </a>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Add product to cart from product detail
   */
  static addToCart (productId) {
    const product = productsManager.getById(productId);

    if (!product) {
      showToast('Product not found', 'warning');
      return;
    }

    const result = cartManager.add(product, 1);

    if (result.success) {
      this.updateCartBadge();
      const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
      const user = session?.user || null;
      const verification = StorageManager.get(STORAGE_KEYS.STUDENT_VERIFICATION, true);
      const isVerified = user?.isVerified || (verification && verification.isVerified);
      if (!isVerified) {
        showToast(
          'Item added to cart, but you must be verified as a student to purchase.',
          'warning',
        );
      } else {
        showToast(result.message, 'success');
      }
    }
  }

  /**
   * Remove item from cart
   */
  static removeFromCart (productId) {
    cartManager.remove(productId);
    this.updateCartBadge();
    this.renderCart();
  }

  /**
   * Increment cart item quantity
   */
  static incrementCartQuantity (productId) {
    cartManager.increment(productId);
    this.updateCartBadge();
    this.renderCart();
  }

  /**
   * Decrement cart item quantity
   */
  static decrementCartQuantity (productId) {
    cartManager.decrement(productId);
    this.updateCartBadge();
    this.renderCart();
  }

  /**
   * Handle Proceed to Checkout button click from Cart
   */
  static handleProceedToCheckout () {
    // Verify required managers are loaded
    if (typeof cartManager === 'undefined' || !cartManager) {
      console.error('Cart manager not loaded');
      showToast('Cart is loading. Please try again in a moment.', 'warning');
      return;
    }

    if (typeof checkoutManager === 'undefined' || !checkoutManager) {
      console.error('Checkout manager not loaded');
      showToast('Checkout is loading. Please try again in a moment.', 'warning');
      return;
    }

    const cartItems = cartManager.getItems();

    // Check if cart is empty
    if (!cartItems || cartItems.length === 0) {
      showToast('Your cart is empty. Add items before checkout.', 'warning');
      return;
    }

    // Check if user is logged in
    const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
    const currentUser = session?.user || null;
    if (!currentUser) {
      showToast('Please login to complete your order.', 'warning');
      this.renderLogin();
      return;
    }

    // Check if user is verified as a student
    const verification = StorageManager.get(STORAGE_KEYS.STUDENT_VERIFICATION, true);
    const isVerified = currentUser.isVerified || (verification && verification.isVerified);
    if (!isVerified) {
      showToast(
        'You must be verified as a student to make purchases. Please complete student verification first.',
        'warning',
      );
      this.renderStudentVerification();
      return;
    }

    // Navigate to checkout
    this.renderCheckout();
  }

  /**
   * Render Checkout Page
   */
  static renderCheckout () {
    // Verify checkoutManager is loaded
    if (typeof checkoutManager === 'undefined' || !checkoutManager) {
      console.error('Checkout manager not loaded yet');
      showToast('Please wait, checkout is loading...', 'info');
      return;
    }

    const mainContent = document.getElementById('main-content');
    const cartItems = cartManager.getItems();
    const summary = cartManager.getSummary();

    // Validate cart
    if (cartItems.length === 0) {
      showToast('Your cart is empty. Add items before checkout.', 'warning');
      this.renderBrowse();
      return;
    }

    // Check if user is logged in
    const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
    const currentUser = session?.user || null;
    if (!currentUser) {
      showToast('Please login to complete your order.', 'warning');
      this.renderLogin();
      return;
    }

    // Check if user is verified as a student
    const verification = StorageManager.get(STORAGE_KEYS.STUDENT_VERIFICATION, true);
    const isVerified = currentUser.isVerified || (verification && verification.isVerified);
    if (!isVerified) {
      showToast(
        'You must be verified as a student to make purchases. Please complete student verification first.',
        'warning',
      );
      this.renderStudentVerification();
      return;
    }

    // Update URL hash for proper routing
    window.location.hash = '/checkout';

    const deliveryOptions = checkoutManager.getDeliveryModeOptions();
    const paymentOptions = checkoutManager.getPaymentModeOptions();

    mainContent.innerHTML = `
      <div class="container" style="padding: 2rem 1rem;">
        <nav class="browse-breadcrumb" aria-label="Breadcrumb">
          <div class="browse-breadcrumb-inner">
            <ol class="browse-breadcrumb-list">
              <li class="browse-breadcrumb-item browse-breadcrumb-item--first">
                <a href="#/" class="browse-breadcrumb-link">Home</a>
              </li>
              <li class="browse-breadcrumb-item">
                <a href="#/cart" class="browse-breadcrumb-link">Cart</a>
              </li>
              <li class="browse-breadcrumb-item">
                <span class="browse-breadcrumb-arrow"></span>
              </li>
              <li class="browse-breadcrumb-item">
                <span class="browse-breadcrumb-current">Checkout</span>
              </li>
            </ol>
          </div>
        </nav>
        <h1 style="margin-bottom: 1.5rem;">Checkout</h1>
        
        <form id="checkout-form" onsubmit="Pages.handleCheckout(event)">
          <div class="checkout-container">
            <div class="checkout-main">
              <!-- Delivery Method -->
              <div class="checkout-section">
                <h3><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><path d="M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1"/><path d="M12 17V5"/><path d="M5 17a2 2 0 104 0"/><path d="M15 17a2 2 0 104 0"/></svg>Delivery Method</h3>
                <div class="delivery-options">
                  ${deliveryOptions
    .map(
      option => `
                    <div class="option-card" onclick="Pages.selectDeliveryOption('${option.value}', this)">
                      <input type="radio" name="deliveryMode" value="${option.value}" id="delivery-${option.value}" />
                      <div class="option-icon">${option.icon}</div>
                      <div class="option-label">${option.label}</div>
                      <div class="option-fee">${option.fee === 0 ? 'Free' : `GHS ${option.fee}`}</div>
                    </div>
                  `,
    )
    .join('')}
                </div>
              </div>

              <!-- Delivery Address -->
              <div class="checkout-section">
                <h3><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>Delivery Address</h3>
                <div class="form-group">
                  <label for="deliveryAddress" class="required">Delivery Address</label>
                  <textarea 
                    id="deliveryAddress" 
                    name="deliveryAddress" 
                    placeholder="Enter your delivery address (e.g., Hall name, room number, or off-campus address)"
                    required
                  ></textarea>
                </div>
                <div class="form-group">
                  <label for="phone">Phone Number (for delivery)</label>
                  <input 
                    type="tel" 
                    id="phone" 
                    name="phone" 
                    placeholder="+233 50 123 4567"
                    value="${currentUser.phone || ''}"
                  />
                </div>
                <div class="form-group">
                  <label for="deliveryInstructions">Delivery Instructions (Optional)</label>
                  <textarea 
                    id="deliveryInstructions" 
                    name="deliveryInstructions" 
                    placeholder="Any special instructions for delivery..."
                  ></textarea>
                </div>
              </div>

              <!-- Payment Method -->
              <div class="checkout-section">
                <h3><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><line x1="6" y1="12" x2="6.01" y2="12"/><line x1="18" y1="12" x2="18.01" y2="12"/></svg>Payment Method</h3>
                <div class="payment-options">
                  ${paymentOptions
    .map(
      option => `
                    <div class="option-card" onclick="Pages.selectPaymentOption('${option.value}', this)">
                      <input type="radio" name="paymentMode" value="${option.value}" id="payment-${option.value}" />
                      <div class="option-icon">${option.icon}</div>
                      <div class="option-label">${option.label}</div>
                    </div>
                  `,
    )
    .join('')}
                </div>
              </div>
            </div>

            <!-- Order Summary -->
            <div class="order-summary">
              <h3>Order Summary</h3>
              
              <div class="order-items">
                ${cartItems
    .map(
      item => `
  <div class="order-item">
  <div class="order-item-image">
        <img src="${(item.product.images && item.product.images[0]) || '/assets/images/products/no-image.svg'}" alt="${item.product.title}" onerror="this.src='/assets/images/products/no-image.svg'" />
  </div>
  <div class="order-item-details">
  <div class="order-item-title">${_pageEsc(item.product.title)}</div>
  ${item.variant ? `<div class="order-item-quantity" style="color:var(--primary);">${item.variant.label}: ${item.variant.value}${item.variant.price > 0 ? ` (+GHS ${item.variant.price})` : ''}</div>` : ''}
  <div class="order-item-quantity">Qty: ${item.quantity}</div>
  <div class="order-item-price">${Formatter.formatPrice((item.product.price + (item.variant ? item.variant.price || 0 : 0)) * item.quantity)}</div>
  </div>
  </div>
                `,
    )
    .join('')}
              </div>

              <div class="summary-divider"></div>

              <div class="summary-row">
                <span>Subtotal</span>
                <span>${Formatter.formatPrice(summary.subtotal)}</span>
              </div>

              <div class="summary-row" id="delivery-fee-row">
                <span>Delivery Fee</span>
                <span id="delivery-fee">GHS 0</span>
              </div>

              <div class="summary-row total">
                <span>Total</span>
                <span id="grand-total">${Formatter.formatPrice(summary.grandTotal)}</span>
              </div>

              <button type="submit" class="btn btn-primary place-order-btn">
                Place Order
              </button>
            </div>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Select delivery option
   */
  static selectDeliveryOption (value, element) {
    // Update radio button
    document.querySelectorAll('input[name="deliveryMode"]').forEach(radio => {
      radio.checked = radio.value === value;
    });

    // Update visual selection
    document.querySelectorAll('.delivery-options .option-card').forEach(card => {
      card.classList.remove('selected');
    });
    element.classList.add('selected');

    // Update delivery fee
    const deliveryFee = checkoutManager.calculateDeliveryFee(
      value,
      cartManager.getSummary().subtotal,
    );
    document.getElementById('delivery-fee').textContent = Formatter.formatPrice(deliveryFee);

    // Update grand total
    const subtotal = cartManager.getSummary().subtotal;
    const grandTotal = subtotal + deliveryFee;
    document.getElementById('grand-total').textContent = Formatter.formatPrice(grandTotal);
  }

  /**
   * Select payment option
   */
  static selectPaymentOption (value, element) {
    // Update radio button
    document.querySelectorAll('input[name="paymentMode"]').forEach(radio => {
      radio.checked = radio.value === value;
    });

    // Update visual selection
    document.querySelectorAll('.payment-options .option-card').forEach(card => {
      card.classList.remove('selected');
    });
    element.classList.add('selected');
  }

  /**
   * Handle checkout form submission
   */
  static async handleCheckout (event) {
    event.preventDefault();

    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');

    // Check student verification before processing
    const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
    const currentUser = session?.user || null;
    const verification = StorageManager.get(STORAGE_KEYS.STUDENT_VERIFICATION, true);
    const isVerified = currentUser?.isVerified || (verification && verification.isVerified);
    if (!isVerified) {
      showToast(
        'You must be verified as a student to make purchases. Please complete student verification first.',
        'warning',
      );
      this.renderStudentVerification();
      return;
    }

    // Disable submit button during processing
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Processing...';
    }

    const deliveryMode = form.querySelector('input[name="deliveryMode"]:checked')?.value;
    const paymentMode = form.querySelector('input[name="paymentMode"]:checked')?.value;
    const deliveryAddress = form.deliveryAddress.value.trim();
    const phone = form.phone.value.trim();
    const deliveryInstructions = form.deliveryInstructions.value.trim();

    // Validate
    if (!deliveryMode) {
      showToast('Please select a delivery method', 'warning');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Place Order';
      }
      return;
    }

    if (!paymentMode) {
      showToast('Please select a payment method', 'warning');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Place Order';
      }
      return;
    }

    if (!deliveryAddress) {
      showToast('Please enter a delivery address', 'warning');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Place Order';
      }
      return;
    }

    const checkoutData = {
      deliveryMode,
      paymentMode,
      deliveryAddress,
      phone,
      deliveryInstructions,
    };

    try {
      // Create order
      const result = await checkoutManager.createOrder(checkoutData);

      if (result.success) {
        // Show processing message
        if (submitButton) {
          submitButton.textContent = 'Processing Payment...';
        }

        // Process payment
        const paymentResult = await checkoutManager.processPayment(result.order.id, paymentMode);

        if (paymentResult.success) {
          // Send notification
          notificationManager?.success(
            'Order Confirmed',
            `Your order #${result.order.orderNumber} has been confirmed!`,
          );

          // Render confirmation page
          this.renderOrderConfirmation(result.order);
        } else {
          showToast('Payment failed: ' + paymentResult.error, 'error');
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Place Order';
          }
        }
      } else {
        showToast('Order failed: ' + result.error, 'error');
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Place Order';
        }
      }
    } catch (error) {
      console.error('Checkout error:', error);
      showToast('An error occurred during checkout. Please try again.', 'error');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Place Order';
      }
    }
  }

  /**
   * Render Order Confirmation Page
   */
  static renderOrderConfirmation (order) {
    const mainContent = document.getElementById('main-content');

    mainContent.innerHTML = `
      <div class="order-confirmation-container">
        <div class="confirmation-icon">${Icons.checkCircle}</div>
        
        <h1>Order Placed Successfully!</h1>
        <p class="subtitle">Thank you for your purchase</p>

        <div class="order-number-box">
          <div class="order-number-label">Order Number</div>
          <div class="order-number">${order.orderNumber}</div>
        </div>

        <div class="confirmation-details">
          <h3>Order Details</h3>
          
          <div class="detail-row">
            <span>Order Date</span>
            <span>${Formatter.formatDate(order.createdAt)}</span>
          </div>
          
          <div class="detail-row">
            <span>Delivery Method</span>
            <span>${Formatter.capitalize(order.delivery.mode)}</span>
          </div>
          
          <div class="detail-row">
            <span>Delivery Address</span>
            <span>${order.delivery.address}</span>
          </div>
          
          <div class="detail-row">
            <span>Payment Method</span>
            <span>${Formatter.capitalize(order.payment.mode)}</span>
          </div>

          <div class="summary-divider"></div>

          <div class="detail-row total">
            <span>Total Paid</span>
            <span>${Formatter.formatPrice(order.pricing.grandTotal)}</span>
          </div>
        </div>

  <div class="confirmation-actions">
  <button class="btn btn-primary" onclick="Pages.renderBrowse()">
  Continue Shopping
  </button>
  <button class="btn btn-outline" onclick="Pages.renderOrders()">
  View My Orders
  </button>
  <button class="btn btn-outline" onclick="Pages.downloadReceipt('${order.id}')">
  ${Icons.download || ''} Download Receipt
  </button>
  </div>
      </div>
    `;

    // Clear cart badge
    this.updateCartBadge();
  }

  /**
   * Render Orders Page
   */
  static async renderOrders () {
    const mainContent = document.getElementById('main-content');
    const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
    const currentUser = session?.user || null;

    if (!currentUser) {
      showToast('Please login to view your orders.', 'warning');
      this.renderLogin();
      return;
    }

    const orders = await checkoutManager.getUserOrders(currentUser.id);

    if (orders.length === 0) {
      mainContent.innerHTML = `
        <div class="container" style="padding: 3rem 1rem;">
          <div class="empty-cart">
<div class="empty-cart-icon">${Icons.package}</div>
        <h3>No orders yet</h3>
            <p>You haven't placed any orders yet.</p>
            <button class="btn btn-primary" onclick="Pages.renderBrowse()">Start Shopping</button>
          </div>
        </div>
      `;
      return;
    }

    mainContent.innerHTML = `
      <div class="container" style="padding: 2rem 1rem;">
        <nav class="browse-breadcrumb" aria-label="Breadcrumb">
          <div class="browse-breadcrumb-inner">
            <ol class="browse-breadcrumb-list">
              <li class="browse-breadcrumb-item browse-breadcrumb-item--first">
                <a href="#/" class="browse-breadcrumb-link">Home</a>
              </li>
              <li class="browse-breadcrumb-item">
                <span class="browse-breadcrumb-arrow"></span>
              </li>
              <li class="browse-breadcrumb-item">
                <span class="browse-breadcrumb-current">My Orders</span>
              </li>
            </ol>
          </div>
        </nav>
        <h1 style="margin-bottom: 1.5rem;">My Orders</h1>
        
        <div class="cart-items">
          ${orders
    .map(
      order => `
            <div class="cart-item" style="display: block;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
<div>
      <strong style="font-size: 1.1rem;">Order #${order.orderNumber}</strong>
      ${order.trackingNumber ? `<div style="color: #0046be; font-size: 0.8rem; font-family: monospace; letter-spacing: 0.03em; margin-top: 2px;">Tracking: ${order.trackingNumber}</div>` : ''}
      <div style="color: var(--neutral-500); font-size: 0.9rem;">
                    ${Formatter.formatDate(order.createdAt)}
                  </div>
                </div>
                <span class="condition-badge ${order.status}" style="background: ${this.getStatusColor(
  order.status,
)}; color: white; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.875rem;">
                  ${Formatter.capitalize(order.status.replace('-', ' '))}
                </span>
              </div>
              
              <div style="border-top: 1px solid var(--neutral-200); padding-top: 1rem;">
                ${order.items
    .map(
      item => `
                  <div style="display: flex; gap: 1rem; margin-bottom: 0.75rem;">
                    <img src="${item.image || '/assets/images/products/no-image.svg'}" alt="${item.title}" style="width: 60px; height: 60px; object-fit: cover; border-radius: var(--radius-md);" loading="lazy" onerror="this.src='/assets/images/products/no-image.svg'" />
                    <div style="flex: 1;">
                      <div style="font-weight: 500;">${item.title}</div>
                      <div style="color: var(--neutral-500); font-size: 0.875rem;">Qty: ${item.quantity}</div>
                    </div>
                    <div style="font-weight: 600;">${Formatter.formatPrice(item.price * item.quantity)}</div>
                  </div>
                `,
    )
    .join('')}
              </div>
              
<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--neutral-200);">
  <div style="font-weight: 700; font-size: 1.1rem;">
  Total: ${Formatter.formatPrice(order.pricing.grandTotal)}
  </div>
  <div style="display:flex;gap:0.5rem;">
  <button class="btn btn-outline btn-sm" onclick="Pages.viewOrderDetails('${order.id}')">
  View Details
  </button>
  <button class="btn btn-ghost btn-sm" onclick="Pages.downloadReceipt('${order.id}')">
  Receipt
  </button>
  </div>
</div>

${Pages.renderOrderTimeline(order.status)}
</div>
          `,
    )
    .join('')}
        </div>
      </div>
    `;
  }

  /**
   * Get status color
   */
  static getStatusColor (status) {
    const colors = {
      [ORDER_STATUS.PLACED]: '#0046be',
      [ORDER_STATUS.CONFIRMED]: '#10b981',
      [ORDER_STATUS.IN_TRANSIT]: '#f59e0b',
      [ORDER_STATUS.DELIVERED]: '#10b981',
      [ORDER_STATUS.CANCELLED]: '#ef4444',
    };
    return colors[status] || '#0046be';
  }

  /**
   * Render Order Timeline Stepper
   */
  static renderOrderTimeline (status) {
    if (status === ORDER_STATUS.CANCELLED) {
      return `
<div class="order-timeline" style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--neutral-200);">
<div style="display:flex;align-items:center;gap:0.5rem;color:#ef4444;font-weight:600;font-size:0.85rem;">
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
Order Cancelled
</div>
</div>`;
    }

    const steps = [
      { key: ORDER_STATUS.PLACED, label: 'Placed' },
      { key: ORDER_STATUS.CONFIRMED, label: 'Confirmed' },
      { key: ORDER_STATUS.IN_TRANSIT, label: 'In Transit' },
      { key: ORDER_STATUS.DELIVERED, label: 'Delivered' },
    ];

    const stepOrder = steps.map(s => s.key);
    const currentIdx = stepOrder.indexOf(status);
    if (currentIdx === -1) {return '';}

    return `
<div class="order-timeline" style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--neutral-200);">
<div style="display:flex;align-items:center;width:100%;">
${steps
    .map((step, i) => {
      const isCompleted = i <= currentIdx;
      const isCurrent = i === currentIdx;
      const dotColor = isCompleted
        ? isCurrent
          ? this.getStatusColor(status)
          : '#10b981'
        : 'var(--neutral-300)';
      const lineColor = i < currentIdx ? '#10b981' : 'var(--neutral-200)';
      return `
<div style="flex:1;display:flex;flex-direction:column;align-items:center;position:relative;">
${i > 0 ? `<div style="position:absolute;top:8px;left:-50%;width:100%;height:2px;background:${lineColor};z-index:0;"></div>` : ''}
<div style="width:18px;height:18px;border-radius:50%;background:${dotColor};border:2px solid ${dotColor};z-index:1;display:flex;align-items:center;justify-content:center;margin-bottom:4px;">
${isCompleted && !isCurrent ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>' : ''}
${isCurrent ? '<div style="width:6px;height:6px;border-radius:50%;background:white;"></div>' : ''}
</div>
<span style="font-size:0.7rem;color:${isCompleted ? 'var(--neutral-700)' : 'var(--neutral-400)'};font-weight:${isCurrent ? '600' : '400'};text-align:center;white-space:nowrap;">${step.label}</span>
</div>`;
    })
    .join('')}
</div>
</div>`;
  }

  /**
   * View Order Details (expand in page)
   */
  static async viewOrderDetails (orderId) {
    const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
    const currentUser = session?.user || null;
    if (!currentUser) {return;}

    const orders = await checkoutManager.getUserOrders(currentUser.id);
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      notificationManager?.error('Not Found', 'Order not found');
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'order-detail-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;';
    overlay.onclick = e => {
      if (e.target === overlay) {overlay.remove();}
    };

    overlay.innerHTML = `
<div style="background:var(--bg-primary);border-radius:var(--radius-xl);padding:2rem;max-width:600px;width:100%;box-shadow:var(--shadow-xl);max-height:90vh;overflow-y:auto;">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
<h2 style="margin:0;">Order #${order.orderNumber}</h2>
<button class="btn btn-ghost btn-sm" onclick="document.getElementById('order-detail-overlay').remove()">Close</button>
</div>
${order.trackingNumber ? `<div style="background:rgba(0,70,190,0.08);border:1px solid rgba(0,70,190,0.2);border-radius:0.5rem;padding:0.75rem 1rem;margin-bottom:1rem;display:flex;align-items:center;gap:0.75rem;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0046be" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><div><div style="font-size:0.75rem;color:#666;text-transform:uppercase;letter-spacing:0.5px;">Tracking Number</div><div style="font-family:monospace;font-weight:700;color:#0046be;letter-spacing:0.05em;font-size:1rem;">${order.trackingNumber}</div></div></div>` : ''}
<span class="condition-badge ${order.status}" style="background:${this.getStatusColor(order.status)};color:white;padding:0.25rem 0.75rem;border-radius:999px;font-size:0.875rem;margin-bottom:1rem;display:inline-block;">
${Formatter.capitalize(order.status.replace('-', ' '))}
</span>
${Pages.renderOrderTimeline(order.status)}
<div style="margin-top:1.5rem;">
<h3 style="font-size:1rem;margin:0 0 1rem;">Items</h3>
${order.items
    .map(
      item => `
<div style="display:flex;gap:1rem;margin-bottom:0.75rem;align-items:center;">
  <img src="${item.image || '/assets/images/products/no-image.svg'}" alt="${item.title}" style="width:50px;height:50px;object-fit:cover;border-radius:var(--radius-md);" loading="lazy" onerror="this.src='/assets/images/products/no-image.svg'" />
<div style="flex:1;">
<div style="font-weight:500;">${item.title}</div>
<div style="color:var(--neutral-500);font-size:0.85rem;">Qty: ${item.quantity}</div>
</div>
<div style="font-weight:600;">${Formatter.formatPrice(item.price * item.quantity)}</div>
</div>
`,
    )
    .join('')}
</div>
  <div style="border-top:1px solid var(--neutral-200);padding-top:1rem;margin-top:1rem;display:flex;justify-content:space-between;align-items:center;">
  <div>
  <div style="color:var(--neutral-500);font-size:0.85rem;">Order Total</div>
  <div style="font-weight:700;font-size:1.25rem;">${Formatter.formatPrice(order.pricing.grandTotal)}</div>
  </div>
  <div style="display:flex;gap:0.5rem;align-items:center;">
  <button class="btn btn-outline btn-sm" onclick="Pages.downloadReceipt('${order.id}')">Download Receipt</button>
  <button class="btn btn-ghost btn-sm" onclick="document.getElementById('order-detail-overlay').remove()">Close</button>
  </div>
  </div>
</div>
`;

    document.body.appendChild(overlay);
  }

  /**
   * Update cart badge in navbar
   */
  static updateCartBadge () {
    const badge = document.getElementById('cart-badge');
    if (badge) {
      const count = cartManager.getCount();
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  /**
   * Update wishlist badge in navbar
   */
  static updateWishlistBadge () {
    try {
      const badge = document.getElementById('wishlist-badge');
      if (badge && productsManager && typeof productsManager.getWishlist === 'function') {
        const count = productsManager.getWishlist().length;
        if (count > 0) {
          badge.textContent = count;
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      }
    } catch (error) {
      console.warn('updateWishlistBadge error:', error);
    }
  }

  /**
   * Initialize dark mode from saved preference
   */
  static initDarkMode () {
    const saved = StorageManager.get(STORAGE_KEYS.THEME, false);
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    Pages.updateDarkModeIcons();
  }

  /**
   * Toggle dark mode
   */
  static toggleDarkMode () {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      StorageManager.set(STORAGE_KEYS.THEME, 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      StorageManager.set(STORAGE_KEYS.THEME, 'dark');
    }
    Pages.updateDarkModeIcons();
  }

  /**
   * Update dark mode toggle icons
   */
  static updateDarkModeIcons () {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const sunIcon = document.getElementById('dark-mode-icon-sun');
    const moonIcon = document.getElementById('dark-mode-icon-moon');
    if (sunIcon && moonIcon) {
      sunIcon.style.display = isDark ? 'block' : 'none';
      moonIcon.style.display = isDark ? 'none' : 'block';
    }
  }

  /**
   * Update navbar based on authentication state
   */
  static updateNavbar () {
    const authButtons = document.getElementById('navbar-auth-buttons');
    const userMenu = document.getElementById('navbar-user-menu');
    const drawerAuth = document.getElementById('navbar-drawer-auth');
    const drawerUser = document.getElementById('navbar-drawer-user');

    // Check auth using authManager (which uses unihub_session)
    const isLoggedIn = typeof authManager !== 'undefined' && authManager.isLoggedIn();

    if (isLoggedIn) {
      // Desktop navbar - logged in
      if (authButtons) {authButtons.style.display = 'none';}
      if (userMenu) {
        userMenu.style.display = 'flex';
        userMenu.style.gap = 'var(--space-sm)';
      }
      // Mobile drawer - logged in
      if (drawerAuth) {drawerAuth.style.display = 'none';}
      if (drawerUser) {drawerUser.style.display = 'block';}
    } else {
      // Desktop navbar - logged out
      if (authButtons) {
        authButtons.style.display = 'flex';
        authButtons.style.gap = 'var(--space-sm)';
      }
      if (userMenu) {userMenu.style.display = 'none';}
      // Mobile drawer - logged out
      if (drawerAuth) {drawerAuth.style.display = 'block';}
      if (drawerUser) {drawerUser.style.display = 'none';}
    }
  }

  // ============================================
  // ADDITIONAL PAGE RENDERERS (Placeholder implementations)
  // ============================================

  /**
   * Render Wishlist Page
   */
  static renderWishlist () {
    const mainContent = document.getElementById('main-content');
    const wishlistProducts = productsManager.getWishlist();
    const priceDrops = productsManager.trackWishlistPrices();

    if (wishlistProducts.length === 0) {
      mainContent.innerHTML = `
<div class="container" style="padding: 3rem 1rem; text-align: center;">
<div class="empty-cart">
<div class="empty-cart-icon">${Icons.heartOutline}</div>
<h3>Your wishlist is empty</h3>
<p>Save your favorite items to see them here.</p>
<button class="btn btn-primary" onclick="Pages.renderBrowse()">Browse Products</button>
</div>
</div>
`;
      return;
    }

    const priceDropBanner =
      priceDrops.length > 0
        ? `<div style="background:var(--color-success-light);border:1px solid var(--color-success);border-radius:var(--radius-lg);padding:1rem 1.25rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="2"><path d="M13 17V7M6 17l5-5 5 5M20 7l-5 5"/></svg>
<div>
<strong style="color:var(--color-success);">Price Drop Alert!</strong>
<span style="font-size:0.9rem;"> ${priceDrops.length} item${priceDrops.length > 1 ? 's' : ''} in your wishlist ${priceDrops.length > 1 ? 'have' : 'has'} dropped in price.</span>
</div>
${priceDrops.map(d => `<span style="font-size:0.8rem;background:var(--bg-primary);padding:2px 8px;border-radius:var(--radius-md);">${d.title}: GHS ${d.oldPrice.toLocaleString()} → GHS ${d.newPrice.toLocaleString()} <strong style="color:var(--color-success);">(-GHS ${d.saved.toLocaleString()})</strong></span>`).join('')}
</div>`
        : '';

    mainContent.innerHTML = `
<div class="container" style="padding: 2rem 1rem;">
<nav class="browse-breadcrumb" aria-label="Breadcrumb">
<div class="browse-breadcrumb-inner">
<ol class="browse-breadcrumb-list">
<li class="browse-breadcrumb-item browse-breadcrumb-item--first">
<a href="#/" class="browse-breadcrumb-link">Home</a>
</li>
<li class="browse-breadcrumb-item">
<span class="browse-breadcrumb-arrow"></span>
</li>
<li class="browse-breadcrumb-item">
<span class="browse-breadcrumb-current">My Wishlist</span>
</li>
</ol>
</div>
</nav>
${priceDropBanner}
<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
<div>
<h1 style="margin: 0;">My Wishlist</h1>
<p style="color: var(--neutral-600); margin: 0.5rem 0 0;">${wishlistProducts.length} item${wishlistProducts.length !== 1 ? 's' : ''} saved</p>
</div>
<div style="display: flex; gap: 0.75rem;">
<button class="btn btn-outline" onclick="Pages.addAllWishlistToCart()" title="Add all to cart">
${Icons.cart} Add All to Cart
</button>
<button class="btn btn-outline" style="color: var(--color-danger); border-color: var(--color-danger-light);" onclick="Pages.clearWishlist()" title="Remove all">
${Icons.trash} Clear All
</button>
</div>
</div>
<div class="wishlist-grid">
${wishlistProducts
    .map(product => {
      const _wsn = product.seller?.fullName || product.sellerName || product.seller?.name || 'Seller';
      const initials = _wsn
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      const conditionLabel = Pages.formatConditionLabel(product.condition || 'good');
      const conditionClass = product.condition || 'good';
      return `
<div class="wishlist-card" onclick="Pages.renderProductDetail('${product.id}')">
<div class="wishlist-card-image">
<img src="${product.images?.[0] || '/assets/images/products/no-image.svg'}" alt="${product.title}" loading="lazy" onerror="this.src='/assets/images/products/no-image.svg';this.onerror=null;">
<span class="condition-badge ${conditionClass}" style="position:absolute;top:0.5rem;left:0.5rem;">${conditionLabel}</span>
<button class="wishlist-card-remove" onclick="event.stopPropagation(); Pages.toggleWishlistDetail('${product.id}')" title="Remove from wishlist">
<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
</button>
</div>
<div class="wishlist-card-info">
<h3 class="wishlist-card-title">${_pageEsc(product.title)}</h3>
<div style="display:flex;align-items:center;gap:0.5rem;margin:0.25rem 0;">
<span style="font-weight:700;color:var(--price-color);font-size:1.1rem;">GHS ${product.price?.toLocaleString() || '0'}</span>
</div>
<div class="wishlist-card-seller">
<div class="seller-avatar" style="width:24px;height:24px;font-size:10px;">${initials}</div>
<span style="font-size:0.85rem;color:var(--neutral-600);">${_pageEsc(product.seller?.name || 'Unknown')}</span>
${product.seller?.rating ? `<span style="font-size:0.8rem;color:var(--neutral-500);">★ ${product.seller.rating}</span>` : ''}
</div>
<div class="wishlist-card-actions">
<button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); cartManager?.add(${JSON.stringify(product).replace(/"/g, '&quot;')}); Pages.updateCartBadge(); notificationManager?.success('Added to Cart','Item added to your cart');" style="flex:1;">Add to Cart</button>
<button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); Pages.shareProduct('${product.id}')" title="Share">
${Icons.upload}
</button>
</div>
</div>
</div>`;
    })
    .join('')}
</div>
</div>
<style>
.wishlist-grid {
display: grid;
grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
gap: 1.25rem;
}
.wishlist-card {
background: var(--bg-primary);
border-radius: var(--radius-lg);
overflow: hidden;
cursor: pointer;
transition: box-shadow 0.2s, transform 0.2s;
border: 1px solid var(--neutral-200);
}
.wishlist-card:hover {
box-shadow: var(--shadow-card-hover);
transform: translateY(-2px);
}
.wishlist-card-image {
position: relative;
aspect-ratio: 1;
overflow: hidden;
background: var(--neutral-100);
}
.wishlist-card-image img {
width: 100%;
height: 100%;
object-fit: cover;
}
.wishlist-card-remove {
position: absolute;
top: 0.5rem;
right: 0.5rem;
width: 30px;
height: 30px;
border-radius: 50%;
background: rgba(255,255,255,0.9);
border: none;
cursor: pointer;
display: flex;
align-items: center;
justify-content: center;
color: var(--neutral-500);
transition: all 0.15s;
}
.wishlist-card-remove:hover {
background: var(--color-danger);
color: white;
}
.wishlist-card-info {
padding: 1rem;
}
.wishlist-card-title {
font-size: 0.95rem;
font-weight: 600;
margin: 0 0 0.25rem;
display: -webkit-box;
-webkit-line-clamp: 2;
-webkit-box-orient: vertical;
overflow: hidden;
}
.wishlist-card-seller {
display: flex;
align-items: center;
gap: 0.4rem;
margin: 0.5rem 0 0.75rem;
}
.wishlist-card-actions {
display: flex;
gap: 0.5rem;
}
.btn-sm {
padding: 0.4rem 0.75rem;
font-size: 0.8rem;
}
</style>
`;

    window.scrollTo(0, 0);
  }

  /**
   * Render User Dashboard - Vertical Tabs Modern Design
   */
  static async renderDashboard () {
    const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
    const currentUser = session?.user || null;

    if (!currentUser) {
      showToast('Please login to view your dashboard.', 'warning');
      this.renderLogin();
      return;
    }

    this.showOriginalNavFooter();

    const mainContent = document.getElementById('main-content');
    const orders = await checkoutManager.getUserOrders(currentUser.id || '');
    const wishlist = productsManager.getWishlist();
    const cartCount = cartManager.getCount();
    const initials = currentUser.fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const recentOrders = orders.slice(0, 5);

    mainContent.innerHTML = `
      <div class="dashboard-vertical">
        <nav class="browse-breadcrumb" style="padding: 0 1rem; margin-bottom: 0.5rem;" aria-label="Breadcrumb">
          <div class="browse-breadcrumb-inner">
            <ol class="browse-breadcrumb-list">
              <li class="browse-breadcrumb-item browse-breadcrumb-item--first">
                <a href="#/" class="browse-breadcrumb-link">Home</a>
              </li>
              <li class="browse-breadcrumb-item">
                <span class="browse-breadcrumb-arrow"></span>
              </li>
              <li class="browse-breadcrumb-item">
                <span class="browse-breadcrumb-current">Dashboard</span>
              </li>
            </ol>
          </div>
        </nav>
        <div class="dashboard-card">
          <!-- Sidebar -->
          <aside class="dv-sidebar">
            <div class="dv-user-info">
              <div class="dv-user-avatar">${initials}</div>
              <div>
                <div class="dv-user-name">${currentUser.fullName}</div>
                <div class="dv-user-email">${currentUser.email}</div>
              </div>
            </div>

            <div class="dv-tabs">
              <button class="dv-tab active" data-tab="overview" onclick="Pages.switchDashboardTab('overview')">
                <span class="dv-tab-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="7" height="9" x="3" y="3" rx="1" />
                    <rect width="7" height="5" x="14" y="3" rx="1" />
                    <rect width="7" height="9" x="14" y="12" rx="1" />
                    <rect width="7" height="5" x="3" y="16" rx="1" />
                  </svg>
                </span>
                <span class="dv-tab-label">Overview</span>
              </button>

              <button class="dv-tab" data-tab="orders" onclick="Pages.switchDashboardTab('orders')">
                <span class="dv-tab-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <path d="M3 6h18" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </span>
                <span class="dv-tab-label">Orders</span>
                ${orders.length > 0 ? `<span class="dv-tab-badge">${orders.length}</span>` : ''}
              </button>

              <button class="dv-tab" data-tab="wishlist" onclick="Pages.switchDashboardTab('wishlist')">
                <span class="dv-tab-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </span>
                <span class="dv-tab-label">Wishlist</span>
                ${wishlist.length > 0 ? `<span class="dv-tab-badge">${wishlist.length}</span>` : ''}
              </button>

              <button class="dv-tab" data-tab="cart" onclick="Pages.switchDashboardTab('cart')">
                <span class="dv-tab-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="8" cy="21" r="1" />
                    <circle cx="19" cy="21" r="1" />
                    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                  </svg>
                </span>
                <span class="dv-tab-label">Cart</span>
                ${cartCount > 0 ? `<span class="dv-tab-badge">${cartCount}</span>` : ''}
              </button>

              <button class="dv-tab" data-tab="profile" onclick="Pages.switchDashboardTab('profile')">
                <span class="dv-tab-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <span class="dv-tab-label">Profile</span>
              </button>

              <button class="dv-tab" data-tab="settings" onclick="Pages.switchDashboardTab('settings')">
                <span class="dv-tab-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </span>
                <span class="dv-tab-label">Settings</span>
              </button>
            </div>
          </aside>

          <!-- Content Area -->
          <main class="dv-content">
            <!-- Overview Panel -->
            <div class="dv-panel active" id="dv-panel-overview">
              <h1 class="dv-panel-title">Welcome back, ${currentUser.fullName}!</h1>
              <p class="dv-panel-subtitle">Here's what's happening with your account today.</p>

              <div class="dv-stats">
                <div class="dv-stat">
                  <div class="dv-stat-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                  </div>
                  <div class="dv-stat-value">${orders.length}</div>
                  <div class="dv-stat-label">Total Orders</div>
                </div>
                <div class="dv-stat">
                  <div class="dv-stat-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </div>
                  <div class="dv-stat-value">${wishlist.length}</div>
                  <div class="dv-stat-label">Wishlist Items</div>
                </div>
                <div class="dv-stat">
                  <div class="dv-stat-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                  </div>
                  <div class="dv-stat-value">${cartCount}</div>
                  <div class="dv-stat-label">Cart Items</div>
                </div>
                <div class="dv-stat">
                  <div class="dv-stat-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <div class="dv-stat-value">${currentUser.university ? currentUser.university.toUpperCase() : 'N/A'}</div>
                  <div class="dv-stat-label">University</div>
                </div>
              </div>

              <div class="dv-section-header">
                <h2 class="dv-section-title">Recent Orders</h2>
                <button class="dv-section-link" onclick="Pages.switchDashboardTab('orders')">View All →</button>
              </div>

              <div class="dv-orders">
                ${
  recentOrders.length > 0
    ? recentOrders
      .map(
        order => `
                  <div class="dv-order-item">
<div class="dv-order-icon">${Icons.package}</div>
          <div class="dv-order-info">
            <div class="dv-order-number">Order #${order.orderNumber}</div>
            <div class="dv-order-amount">${Formatter.formatPrice(order.pricing.grandTotal)}</div>
          </div>
                    <div class="dv-order-time">${Formatter.formatTimeAgo(order.createdAt)}</div>
                    <span class="dv-order-status ${order.status ? order.status.toLowerCase() : 'placed'}">${order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Placed'}</span>
                  </div>
                `,
      )
      .join('')
    : `
                  <div class="dv-empty">
<div class="dv-empty-icon">${Icons.package}</div>
        <h3>No orders yet</h3>
        <p>Start shopping to see your orders here!</p>
                  </div>
                `
}
              </div>
            </div>

            <!-- Orders Panel -->
            <div class="dv-panel" id="dv-panel-orders">
              <h1 class="dv-panel-title">My Orders</h1>
              <p class="dv-panel-subtitle">Track and manage all your orders.</p>

              <div class="dv-orders">
                ${
  orders.length > 0
    ? orders
      .map(
        order => `
                  <div class="dv-order-item">
<div class="dv-order-icon">${Icons.package}</div>
          <div class="dv-order-info">
            <div class="dv-order-number">Order #${order.orderNumber}</div>
            <div class="dv-order-amount">${order.items.length} item(s) • ${Formatter.formatPrice(order.pricing.grandTotal)}</div>
          </div>
                    <div class="dv-order-time">${Formatter.formatTimeAgo(order.createdAt)}</div>
                    <span class="dv-order-status ${order.status ? order.status.toLowerCase() : 'placed'}">${order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Placed'}</span>
                  </div>
                `,
      )
      .join('')
    : `
                  <div class="dv-empty">
<div class="dv-empty-icon">${Icons.cart}</div>
        <h3>No orders yet</h3>
        <p>Browse products and make your first purchase!</p>
                  </div>
                `
}
              </div>
            </div>

            <!-- Wishlist Panel -->
            <div class="dv-panel" id="dv-panel-wishlist">
              <h1 class="dv-panel-title">My Wishlist</h1>
              <p class="dv-panel-subtitle">Items you've saved for later.</p>

              ${
  wishlist.length > 0
    ? `
                <div class="dv-wishlist-grid">
                  ${wishlist
    .map(
      product => `
                    <div class="store-product-card" onclick="Pages.renderProductDetail('${product.id}')">
                      <div class="store-product-image">
                        <img src="${(product.images && product.images[0]) || '/assets/images/products/no-image.svg'}" alt="${product.title}" loading="lazy" onerror="this.src='/assets/images/products/no-image.svg'" />
                        <span class="store-condition-badge ${product.condition}">${product.condition.charAt(0).toUpperCase() + product.condition.slice(1)}</span>
                        <button class="store-wishlist-btn active" onclick="Pages.toggleWishlist(event, '${product.id}'); Pages.renderDashboard();">${Icons.heart}</button>
                      </div>
                      <div class="store-product-info">
          <h3 class="store-product-title">${_pageEsc(product.title)}</h3>
                        <div class="store-product-price-row">
                          <span class="store-product-price">${product.price.toLocaleString()}</span>
                          <span class="store-product-currency">GHS</span>
                        </div>
                      </div>
                    </div>
                  `,
    )
    .join('')}
                </div>
              `
    : `
                <div class="dv-empty">
<div class="dv-empty-icon">${Icons.heartOutline}</div>
        <h3>Your wishlist is empty</h3>
                  <p>Save items you love to find them later!</p>
                </div>
              `
}
            </div>

            <!-- Cart Panel -->
            <div class="dv-panel" id="dv-panel-cart">
              <h1 class="dv-panel-title">Shopping Cart</h1>
              <p class="dv-panel-subtitle">Review items before checkout.</p>

              ${
  cartCount > 0
    ? `
                <div class="dv-orders">
                  ${cartManager
    .getItems()
    .map(
      item => `
                    <div class="dv-order-item">
<div class="dv-order-icon">${Icons.cart}</div>
          <div class="dv-order-info">
            <div class="dv-order-number">${_pageEsc(item.product.title)}</div>
            <div class="dv-order-amount">Qty: ${item.quantity} × ${item.product.price.toLocaleString()} GHS</div>
          </div>
                    </div>
                  `,
    )
    .join('')}
                </div>
                <div style="margin-top:1.5rem;display:flex;gap:0.75rem;">
                  <button class="dv-btn dv-btn-outline" onclick="cartManager.clear(); Pages.renderDashboard();">Clear Cart</button>
                  <button class="dv-btn dv-btn-primary" onclick="event.preventDefault(); Pages.handleProceedToCheckout();">Proceed to Checkout →</button>
                </div>
              `
    : `
                <div class="dv-empty">
<div class="dv-empty-icon">${Icons.cart}</div>
        <h3>Your cart is empty</h3>
        <p>Add items to get started!</p>
                </div>
              `
}
            </div>

            <!-- Profile Panel -->
            <div class="dv-panel" id="dv-panel-profile">
              <h1 class="dv-panel-title">Edit Profile</h1>
              <p class="dv-panel-subtitle">Update your personal information.</p>

              <div class="dv-profile">
                <form id="profile-form" onsubmit="Pages.handleProfileUpdate(event)">
                  <div class="dv-form-group">
                    <label class="dv-form-label">Full Name</label>
                    <input type="text" id="fullName" name="fullName" class="dv-form-input" value="${currentUser.fullName}" required />
                  </div>
                  <div class="dv-form-group">
                    <label class="dv-form-label">Email</label>
                    <input type="email" id="email" name="email" class="dv-form-input" value="${currentUser.email}" required />
                  </div>
                  <div class="dv-form-group">
                    <label class="dv-form-label">Phone</label>
                    <input type="tel" id="phone" name="phone" class="dv-form-input" value="${currentUser.phone || ''}" />
                  </div>
                  <div class="dv-form-group">
                    <label class="dv-form-label">University</label>
                    <input type="text" class="dv-form-input" value="${currentUser.university || 'Not set'}" disabled />
                  </div>
                  <button type="submit" class="dv-btn dv-btn-primary" style="width:100%;margin-top:1rem;">Save Changes</button>
                </form>
              </div>
            </div>

            <!-- Settings Panel -->
            <div class="dv-panel" id="dv-panel-settings">
              <h1 class="dv-panel-title">Settings</h1>
              <p class="dv-panel-subtitle">Manage your account preferences.</p>

              <div class="dv-profile">
                <div class="dv-form-group">
                  <label class="dv-form-label">Account Status</label>
                  <input type="text" class="dv-form-input" value="${currentUser.isVerified ? '✓ Verified' : '⏳ Pending Verification'}" disabled />
                </div>
                <div class="dv-form-group">
                  <label class="dv-form-label">Role</label>
                  <input type="text" class="dv-form-input" value="${currentUser.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : 'Buyer'}" disabled />
                </div>
                <div style="margin-top:2rem;display:flex;flex-direction:column;gap:0.75rem;">
                  <button class="dv-btn dv-btn-outline" onclick="Pages.handleLogout();">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                    Log Out
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    `;
  }

  /**
   * Switch Dashboard Tab
   */
  static switchDashboardTab (tabId) {
    // Update tab buttons
    document.querySelectorAll('.dv-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    // Update panels
    document.querySelectorAll('.dv-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `dv-panel-${tabId}`);
    });
  }

  /**
   * Render User Profile
   */
  static renderProfile () {
    const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
    const currentUser = session?.user || null;

    if (!currentUser) {
      showToast('Please login to view your profile.', 'warning');
      this.renderLogin();
      return;
    }

    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
      <div class="container" style="padding: 2rem 1rem; max-width: 800px;">
        <h1 style="margin-bottom: 1.5rem;">My Profile</h1>
        <div class="auth-card">
          <form id="profile-form" onsubmit="Pages.handleProfileUpdate(event)">
            <div class="form-group">
              <label for="fullName" class="required">Full Name</label>
              <input type="text" id="fullName" name="fullName" class="form-control" value="${currentUser.fullName}" required />
            </div>
            <div class="form-group">
              <label for="email" class="required">Email Address</label>
              <input type="email" id="email" name="email" class="form-control" value="${currentUser.email}" required />
            </div>
            <div class="form-group">
              <label for="phone">Phone Number</label>
              <input type="tel" id="phone" name="phone" class="form-control" value="${currentUser.phone || ''}" />
            </div>
            <div class="form-group">
              <label>University</label>
              <input type="text" class="form-control" value="${currentUser.university || 'Not set'}" disabled />
            </div>
            <button type="submit" class="btn btn-primary btn-block">Update Profile</button>
          </form>
          <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--neutral-200);">
            <button class="btn btn-outline btn-block" onclick="Pages.handleLogout()">Logout</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Handle Profile Update
   */
  static handleProfileUpdate (event) {
    event.preventDefault();
    const form = event.target;
    const updates = {
      fullName: form.fullName.value,
      email: form.email.value,
      phone: form.phone.value,
    };

    const result = authManager.updateProfile(updates);
    if (result.success) {
      notificationManager?.success('Profile Updated', result.message);
    } else {
      notificationManager?.error('Update Failed', result.error);
    }
  }

  /**
   * Handle Logout
   */
  static handleLogout () {
    authManager.logout();
    notificationManager?.info('Logged Out', 'You have been logged out successfully.');
    // Update navbar to show login/signup buttons
    this.updateNavbar();
    this.renderLanding();
  }

  /**
   * Render Notifications Page
   */
  static renderNotifications () {
    const mainContent = document.getElementById('main-content');
    notificationManager?.markAllAsRead();
    const notifications = notificationManager?.getAll() || [];

    mainContent.innerHTML = `
      <div class="container" style="padding: 2rem 1rem; max-width: 800px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;">
          <h1 style="margin:0;">Notifications</h1>
          <div style="display:flex;gap:0.5rem;">
            <a href="#/dashboard" style="padding:0.5rem 1rem;border:1px solid var(--neutral-300,#d4d4d4);border-radius:0.5rem;font-size:0.875rem;color:var(--text-primary,#111);text-decoration:none;">Back to Dashboard</a>
            ${
  notifications.length > 0
    ? `
              <button onclick="notificationManager?.deleteRead();Pages.renderNotifications();" style="padding:0.5rem 1rem;border:1px solid var(--neutral-300,#d4d4d4);border-radius:0.5rem;background:transparent;cursor:pointer;font-size:0.875rem;color:var(--text-primary,#111);">Clear Read</button>
              <button onclick="if(confirm('Delete all notifications?')){notificationManager?.deleteAll();Pages.renderNotifications();}" style="padding:0.5rem 1rem;border:1px solid var(--color-danger,#ef4444);border-radius:0.5rem;background:transparent;cursor:pointer;font-size:0.875rem;color:var(--color-danger,#ef4444);">Clear All</button>
            `
    : ''
}
          </div>
        </div>
        ${
  notifications.length > 0
    ? `
          <div class="cart-items">
            ${notifications
    .map(
      n => `
              <div class="cart-item ${n.read ? 'read' : 'unread'}" style="display: flex; align-items: flex-start; gap: 1rem;${n.read ? '' : 'border-left:3px solid var(--color-primary,#2563eb);'}">
                <div style="font-size: 2rem;">${n.icon}</div>
                <div style="flex: 1;">
                  <div style="font-weight: 600;">${n.title}</div>
                  <div style="color: var(--neutral-600);">${n.message}</div>
                  <div style="font-size: 0.875rem; color: var(--neutral-500); margin-top: 0.5rem;">
                    ${notificationManager?.formatTime(n.createdAt)}
                  </div>
                </div>
                <button class="remove-btn" onclick="notificationManager?.delete('${n.id}'); Pages.renderNotifications();">×</button>
              </div>
            `,
    )
    .join('')}
          </div>
        `
    : `
          <div class="empty-cart">
            <div class="empty-cart-icon">${Icons.bell}</div>
            <h3>No notifications</h3>
            <p>You're all caught up!</p>
          </div>
        `
}
      </div>
    `;
  }

  /**
   * Render Delivery Options Page
   */
  static renderDeliveryOptions () {
    const mainContent = document.getElementById('main-content');
    const deliveryOptions = deliveryManager.getDeliveryOptions();

    mainContent.innerHTML = `
      <div class="container" style="padding: 2rem 1rem; max-width: 800px;">
        <h1 style="margin-bottom: 1.5rem;">Delivery Options</h1>
        <div class="delivery-options">
          ${deliveryOptions
    .map(
      option => `
            <div class="option-card">
              <div class="option-icon">${option.icon}</div>
              <div class="option-label">${option.name}</div>
              <div class="option-description">${option.description}</div>
              <div class="option-fee">${option.fee === 0 ? 'Free' : `GHS ${option.fee}`}</div>
              <div class="option-fee" style="font-size: 0.75rem;">${option.estimatedTime}</div>
            </div>
          `,
    )
    .join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render Payment Page
   */
  static async renderPayment (orderId) {
    const order = await checkoutManager.getOrderById(orderId);
    const mainContent = document.getElementById('main-content');

    if (!order) {
      mainContent.innerHTML = `
        <div class="container" style="padding: 2rem 1rem; text-align: center;">
          <h1>Order not found</h1>
          <button class="btn btn-primary" onclick="Pages.renderBrowse()">Continue Shopping</button>
        </div>
      `;
      return;
    }

    mainContent.innerHTML = `
      <div class="container" style="padding: 2rem 1rem; max-width: 600px;">
        <h1 style="margin-bottom: 1.5rem;">Payment</h1>
        <div class="auth-card">
          <div class="order-summary">
            <h3>Order Summary</h3>
            <div class="detail-row">
              <span>Order Number</span>
              <span>${order.orderNumber}</span>
            </div>
            <div class="detail-row total">
              <span>Total Amount</span>
              <span>${Formatter.formatPrice(order.pricing.grandTotal)}</span>
            </div>
          </div>
          <div class="payment-processing" style="padding: 2rem 0;">
            <div class="payment-spinner"></div>
            <h3>Processing Payment...</h3>
            <p>Please wait while we process your payment.</p>
          </div>
        </div>
      </div>
    `;

    // Simulate payment processing
    setTimeout(() => {
      this.renderPaymentSuccess();
    }, 2000);
  }

  /**
   * Render Payment Success Page
   */
  static renderPaymentSuccess () {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
      <div class="container" style="padding: 2rem 1rem; text-align: center;">
        <div class="confirmation-icon">${Icons.checkCircle}</div>
        <h1>Payment Successful!</h1>
        <p style="color: #9ca3af; margin-bottom: 2rem;">Your payment has been processed successfully.</p>
        <button class="btn btn-primary" onclick="Pages.renderBrowse()">Continue Shopping</button>
      </div>
    `;
  }

  static getAdminSidebar (activeItem) {
    const adminUser = adminAuthManager.getCurrentUser();
    const items = [
      {
        key: 'dashboard',
        label: 'Dashboard',
        icon: Icons.chart,
        action: 'Pages.renderAdminDashboard()',
      },
      {
        key: 'verifications',
        label: 'Verifications',
        icon: Icons.shield || Icons.verification,
        action: 'Pages.renderAdminVerifications()',
      },
      { key: 'users', label: 'Users', icon: Icons.users, action: 'Pages.renderAdminUsers()' },
      {
        key: 'products',
        label: 'Products',
        icon: Icons.package,
        action: 'Pages.renderAdminProducts()',
      },
      {
        key: 'orders',
        label: 'Orders',
        icon: Icons.clipboard,
        action: 'Pages.renderAdminOrders()',
      },
      {
        key: 'payouts',
        label: 'Payouts',
        icon: Icons.money,
        action: 'Pages.renderAdminPayouts()',
      },
      { key: 'reports', label: 'Reports', icon: Icons.chart, action: 'Pages.renderAdminReports()' },
      {
        key: 'analytics',
        label: 'Analytics',
        icon: Icons.chart,
        action: 'Pages.renderAdminAnalytics()',
      },
      {
        key: 'activity',
        label: 'Activity',
        icon: Icons.clock || Icons.chart,
        action: 'Pages.renderAdminActivity()',
      },
      {
        key: 'regions',
        label: 'Regions',
        icon: Icons.globe || Icons.chart,
        action: 'Pages.renderAdminRegions()',
      },
      {
        key: 'newsletter',
        label: 'Newsletter',
        icon: Icons.mail || Icons.email || '✉️',
        action: 'Pages.renderAdminNewsletter()',
      },
    ];
    return `
  <button class="admin-mobile-toggle" onclick="document.querySelector('.admin-sidebar').classList.toggle('open')">&#9776;</button>
  <aside class="admin-sidebar">
  <div class="admin-brand">
  <div class="admin-brand-icon">${Icons.shield || Icons.settings}</div>
  <div class="admin-brand-name">Admin Panel</div>
  </div>
  <div class="admin-user-badge">
  <div class="admin-user-avatar">${_pageEsc((adminUser?.fullName || 'A').charAt(0).toUpperCase())}</div>
  <div>
  <div class="admin-user-name">${_pageEsc(adminUser?.fullName || 'Admin')}</div>
  <div class="admin-user-role">Super Admin</div>
  </div>
  </div>
  <nav class="admin-nav-section">
  <div class="admin-nav-title">Main</div>
  <ul class="admin-menu">
  ${items
    .map(
      item => `
  <li class="admin-menu-item">
  <a href="#" class="admin-menu-link ${activeItem === item.key ? 'active' : ''}" onclick="${item.action}; return false;">
  <span class="admin-menu-icon">${item.icon}</span>
  <span>${item.label}</span>
  </a>
  </li>
  `,
    )
    .join('')}
  </ul>
  </nav>
  <div class="admin-sidebar-footer">
  <button class="btn btn-ghost btn-sm btn-block" onclick="adminAuthManager.logout(); Pages.renderLanding();">Logout</button>
  </div>
  </aside>`;
  }

  /**
   * Render Admin Dashboard
   */
  static async renderAdminDashboard () {
    if (!_requireAdmin()) {return;}
    const adminUser =
      (typeof adminAuthManager !== 'undefined' && adminAuthManager.getCurrentUser?.()) ||
      (typeof authManager !== 'undefined' && authManager.getCurrentUser?.()) ||
      null;

    if (!adminUser) {
      this.renderAdminLogin();
      return;
    }

    this.hideOriginalNavFooter();
    document.body.style.background = '';

    const mainContent = document.getElementById('main-content');

    mainContent.innerHTML = `
  <div class="admin-container">
  ${this.getAdminSidebar('dashboard')}
  <main class="admin-main">
  <div class="admin-header">
  <div>
  <h1 class="admin-title">Dashboard</h1>
  <p style="margin:0;color:#9ca3af;font-size:0.85rem;">Welcome back, ${adminUser.fullName || 'Admin'}</p>
  </div>
  <div class="admin-actions">
  <span style="color:#9ca3af;font-size:0.8rem;">${Formatter.formatDate(new Date().toISOString())}</span>
  </div>
  </div>

  <div id="admin-stats-grid" class="admin-stats">
  <div class="admin-stat-card"><div class="admin-stat-value">--</div><div class="admin-stat-label">Loading...</div></div>
  <div class="admin-stat-card"><div class="admin-stat-value">--</div><div class="admin-stat-label">Loading...</div></div>
  <div class="admin-stat-card"><div class="admin-stat-value">--</div><div class="admin-stat-label">Loading...</div></div>
  <div class="admin-stat-card"><div class="admin-stat-value">--</div><div class="admin-stat-label">Loading...</div></div>
  </div>

  <div id="admin-dashboard-content"></div>
  </main>
  </div>
  `;

    const stats = await adminReportsManager.getDashboardOverview();

    // Payout queue snapshot for the dashboard card. Non-fatal: if the
    // endpoint is unavailable (offline/static deploy) the card still
    // renders without a count badge.
    let pendingPayoutCount = 0;
    try {
      const payoutsResp = await api.admin.getPayouts();
      if (payoutsResp.success && Array.isArray(payoutsResp.data?.payouts)) {
        pendingPayoutCount = payoutsResp.data.payouts.filter(p => p.status === 'requested').length;
      }
    } catch (_e) { /* queue unavailable */ }

    document.getElementById('admin-stats-grid').innerHTML = `
  <div class="admin-stat-card">
  <div class="admin-stat-header">
  <div class="admin-stat-icon primary">${Icons.users}</div>
  <span class="admin-stat-change positive">+${stats.today.newUsers} today</span>
  </div>
  <div class="admin-stat-value">${stats.summary.totalUsers}</div>
  <div class="admin-stat-label">Total Users</div>
  </div>
  <div class="admin-stat-card">
  <div class="admin-stat-header">
  <div class="admin-stat-icon success">${Icons.package}</div>
  ${stats.summary.pendingProducts > 0 ? `<span class="admin-stat-change warning">${stats.summary.pendingProducts} pending</span>` : ''}
  </div>
  <div class="admin-stat-value">${stats.summary.totalProducts}</div>
  <div class="admin-stat-label">Total Products</div>
  </div>
  <div class="admin-stat-card">
  <div class="admin-stat-header">
  <div class="admin-stat-icon warning">${Icons.clipboard}</div>
  ${stats.summary.activeOrders > 0 ? `<span class="admin-stat-change positive">${stats.summary.activeOrders} active</span>` : ''}
  </div>
  <div class="admin-stat-value">${stats.summary.totalOrders}</div>
  <div class="admin-stat-label">Total Orders</div>
  </div>
  <div class="admin-stat-card">
  <div class="admin-stat-header">
  <div class="admin-stat-icon danger">${Icons.money}</div>
  <span class="admin-stat-change positive">+GHS ${stats.today.revenue.toLocaleString()} today</span>
  </div>
  <div class="admin-stat-value">${Formatter.formatPrice(stats.summary.totalRevenue)}</div>
  <div class="admin-stat-label">GMV (Gross Sales)</div>
  </div>
  <div class="admin-stat-card" title="Platform commission on released escrow — actual revenue">
  <div class="admin-stat-header">
  <div class="admin-stat-icon primary">${Icons.money}</div>
  </div>
  <div class="admin-stat-value">${Formatter.formatPrice(stats.summary.commissionEarned || 0)}</div>
  <div class="admin-stat-label">Commission Earned</div>
  </div>
  <div class="admin-stat-card" title="Seller funds held in escrow, not yet released">
  <div class="admin-stat-header">
  <div class="admin-stat-icon warning">${Icons.shield || Icons.clipboard}</div>
  </div>
  <div class="admin-stat-value">${Formatter.formatPrice(stats.summary.escrowHeld || 0)}</div>
  <div class="admin-stat-label">Escrow Held</div>
  </div>
  <div class="admin-stat-card" style="cursor:pointer;" onclick="Pages.renderAdminVerifications()">
    <div class="admin-stat-header">
      <div class="admin-stat-icon" style="background:rgba(245,158,11,0.15);color:#f59e0b;">${Icons.shield || Icons.verification || '🛡️'}</div>
      ${stats.summary.pendingVerifications > 0 ? `<span class="admin-stat-change warning">${stats.summary.pendingVerifications} pending</span>` : ''}
    </div>
    <div class="admin-stat-value">${stats.summary.pendingVerifications || 0}</div>
    <div class="admin-stat-label">Pending Verifications</div>
  </div>
  <div class="admin-stat-card" style="cursor:pointer;" data-nav-payouts role="button" tabindex="0" aria-label="Open payout queue" title="Seller payout approval queue">
    <div class="admin-stat-header">
      <div class="admin-stat-icon ${pendingPayoutCount > 0 ? '' : 'success'}" style="${pendingPayoutCount > 0 ? 'background:rgba(239,68,68,0.15);color:#ef4444;' : ''}">${Icons.money}</div>
      ${pendingPayoutCount > 0 ? `<span class="admin-stat-change warning">${pendingPayoutCount} awaiting review</span>` : ''}
    </div>
    <div class="admin-stat-value">${pendingPayoutCount > 0 ? pendingPayoutCount : '—'}</div>
    <div class="admin-stat-label">Payout Queue</div>
  </div>
  `;

    // Delegated navigation to the payout queue — replaces an inline
    // onclick (CSP-friendly). Keyboard activation included for a11y.
    const payoutCard = document.querySelector('[data-nav-payouts]');
    if (payoutCard) {
      payoutCard.addEventListener('click', () => { Pages.renderAdminPayouts(); });
      payoutCard.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          Pages.renderAdminPayouts();
        }
      });
    }

    const recentOrdersHtml =
      (stats.recentOrders || [])
        .map(
          o => `
  <tr>
  <td style="font-weight:600;">#${o.orderNumber || o.id?.slice(-6)}</td>
<td style="font-family:monospace;font-size:0.8rem;color:#0046be;">${o.trackingNumber || '—'}</td>
  <td>${_pageEsc(o.customer?.name || 'N/A')}</td>
  <td><span class="admin-status-badge ${o.status}">${Formatter.capitalize((o.status || 'placed').replace('-', ' '))}</span></td>
  <td style="font-weight:600;">${Formatter.formatPrice(o.pricing?.grandTotal || 0)}</td>
  <td style="color:#9ca3af;font-size:0.8rem;">${Formatter.formatTimeAgo(o.createdAt)}</td>
  </tr>
  `,
        )
        .join('') ||
      '<tr><td colspan="6" style="text-align:center;color:#6b7280;padding:2rem;">No orders yet</td></tr>';

    const recentUsersHtml =
      (stats.recentUsers || [])
        .map(
          u => `
  <div class="admin-user-row">
  <div class="admin-user-avatar-sm">${_pageEsc((u.fullName || 'U').charAt(0).toUpperCase())}</div>
  <div style="flex:1;">
  <div style="font-weight:500;">${_pageEsc(u.fullName || 'Unknown')}</div>
  <div style="color:#9ca3af;font-size:0.8rem;">${u.email || ''}</div>
  </div>
  <span class="admin-role-badge ${u.role || 'buyer'}">${Formatter.capitalize(u.role || 'buyer')}</span>
  </div>
  `,
        )
        .join('') ||
      '<div style="text-align:center;color:#6b7280;padding:2rem;">No users yet</div>';

    document.getElementById('admin-dashboard-content').innerHTML = `
  <div class="admin-dashboard-grid">
    <div class="admin-card" style="grid-row: 1 / 4;">
      <div class="admin-card-header">
        <h3>Recent Orders</h3>
        <button class="btn btn-ghost btn-sm" onclick="Pages.renderAdminOrders()">View All</button>
      </div>
      <div class="admin-table-container" style="box-shadow:none;border-radius:0;">
        <table class="admin-table">
          <thead>
            <tr><th>Order</th><th>Tracking</th><th>Customer</th><th>Status</th><th>Amount</th><th>Date</th></tr>
          </thead>
          <tbody>${recentOrdersHtml}</tbody>
        </table>
      </div>
      <div style="padding:var(--space-md);border-top:1px solid rgba(255,255,255,0.06);">
        <h4 style="font-size:0.8rem;font-weight:600;color:#f9fafb;margin-bottom:0.75rem;">Recent Users</h4>
        ${recentUsersHtml}
      </div>
    </div>

    <div class="admin-card">
      <div class="admin-card-header">
        <h3>Quick Actions</h3>
      </div>
      <div style="padding:var(--space-md);display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
        <button class="btn btn-outline btn-sm" onclick="Pages.renderAdminProductCreate()">${Icons.plus || '+'} Add Product</button>
        <button class="btn btn-outline btn-sm" onclick="Pages.renderAdminProducts()">${Icons.package} Products</button>
        <button class="btn btn-outline btn-sm" onclick="Pages.renderAdminOrders()">${Icons.clipboard} Orders</button>
        <button class="btn btn-outline btn-sm" onclick="Pages.renderAdminReports()">${Icons.chart} Reports</button>
      </div>
    </div>

    <div class="admin-card">
      <div class="admin-card-header">
        <h3>Platform Health</h3>
      </div>
      <div style="padding:var(--space-md);">
        <div class="admin-health-row">
          <span>Pending Products</span>
          <span class="admin-health-val ${stats.summary.pendingProducts > 0 ? 'warning' : 'good'}">${stats.summary.pendingProducts}</span>
        </div>
        <div class="admin-health-row">
          <span>Active Orders</span>
          <span class="admin-health-val good">${stats.summary.activeOrders}</span>
        </div>
        <div class="admin-health-row">
          <span>Today Revenue</span>
          <span class="admin-health-val good">GHS ${stats.today.revenue.toLocaleString()}</span>
        </div>
        <div class="admin-health-row">
          <span>Week Revenue</span>
          <span class="admin-health-val good">GHS ${stats.thisWeek.revenue.toLocaleString()}</span>
        </div>
        <div class="admin-health-row">
          <span>Month Revenue</span>
          <span class="admin-health-val good">GHS ${stats.thisMonth.revenue.toLocaleString()}</span>
        </div>
      </div>
    </div>
  </div>
`;
  }

  static async renderAdminVerifications (filter = 'pending') {
    if (!_requireAdmin()) {return;}
    // Remember the active tab so post-purge re-renders return to it.
    Pages._verifFilter = filter;
    const adminUser =
      (typeof adminAuthManager !== 'undefined' && adminAuthManager.getCurrentUser?.()) ||
      (typeof authManager !== 'undefined' && authManager.getCurrentUser?.()) ||
      null;
    if (!adminUser) {
      this.renderAdminLogin();
      return;
    }

    this.hideOriginalNavFooter();
    document.body.style.background = '';

    if (typeof adminVerificationsManager === 'undefined') {
      const mainContent = document.getElementById('main-content');
      mainContent.innerHTML = '<p>Verification module not loaded</p>';
      return;
    }

    await adminVerificationsManager.init();

    const mainContent = document.getElementById('main-content');
    const stats = adminVerificationsManager.getStats();
    const allItems =
      filter === 'all'
        ? adminVerificationsManager.getAll()
        : filter === 'approved'
          ? adminVerificationsManager.getApproved()
          : filter === 'rejected'
            ? adminVerificationsManager.getRejected()
            : adminVerificationsManager.getPending();

    mainContent.innerHTML = `
    <div class="admin-container">
      ${this.getAdminSidebar('verifications')}
      <main class="admin-main">
        <div class="admin-header">
          <div>
            <h1 class="admin-title">Student Verifications</h1>
            <p style="margin:0;color:#9ca3af;font-size:0.85rem;">Review and manage student verification requests</p>
          </div>
        </div>

        <div class="admin-stats" style="grid-template-columns:repeat(4,1fr);">
          <div class="admin-stat-card" style="cursor:pointer;" onclick="Pages.renderAdminVerifications('pending')">
            <div class="admin-stat-value" style="color:#f59e0b;">${stats.pending}</div>
            <div class="admin-stat-label">Pending</div>
          </div>
          <div class="admin-stat-card" style="cursor:pointer;" onclick="Pages.renderAdminVerifications('approved')">
            <div class="admin-stat-value" style="color:#10b981;">${stats.approved}</div>
            <div class="admin-stat-label">Approved</div>
          </div>
          <div class="admin-stat-card" style="cursor:pointer;" onclick="Pages.renderAdminVerifications('rejected')">
            <div class="admin-stat-value" style="color:#ef4444;">${stats.rejected}</div>
            <div class="admin-stat-label">Rejected</div>
          </div>
          <div class="admin-stat-card" style="cursor:pointer;" onclick="Pages.renderAdminVerifications('all')">
            <div class="admin-stat-value">${stats.total}</div>
            <div class="admin-stat-label">Total</div>
          </div>
        </div>

        <div class="admin-card" style="margin-top:1.5rem;">
          <div class="admin-card-header">
            <h3>${filter === 'all' ? 'All Verifications' : filter === 'approved' ? 'Approved Verifications' : filter === 'rejected' ? 'Rejected Verifications' : 'Pending Verifications'}</h3>
            <div style="display:flex;gap:0.5rem;">
              <button class="btn btn-sm ${filter === 'pending' ? 'btn-primary' : 'btn-ghost'}" onclick="Pages.renderAdminVerifications('pending')" style="font-size:0.75rem;">Pending (${stats.pending})</button>
              <button class="btn btn-sm ${filter === 'approved' ? 'btn-primary' : 'btn-ghost'}" onclick="Pages.renderAdminVerifications('approved')" style="font-size:0.75rem;">Approved</button>
              <button class="btn btn-sm ${filter === 'rejected' ? 'btn-primary' : 'btn-ghost'}" onclick="Pages.renderAdminVerifications('rejected')" style="font-size:0.75rem;">Rejected</button>
              <button class="btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}" onclick="Pages.renderAdminVerifications('all')" style="font-size:0.75rem;">All</button>
            </div>
          </div>
          <div class="admin-table-container" style="box-shadow:none;border-radius:0;">
            ${
  allItems.length === 0
    ? `
              <div style="text-align:center;padding:3rem;color:#6b7280;">
                <div style="font-size:2.5rem;margin-bottom:1rem;">📋</div>
                <p style="margin:0;font-size:1rem;">No ${filter} verifications found</p>
              </div>
            `
    : `
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Student ID</th>
                    <th>Method</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${allItems
    .map(
      v => `
                  <tr id="vrf-row-${v.id}">
                    <td>
                      <div style="font-weight:600;color:#f9fafb;">${_pageEsc(v.fullName || 'N/A')}</div>
                      <div style="font-size:0.75rem;color:#9ca3af;">${v.personalEmail || v.universityEmail || v.email || ''}</div>
                      <div style="font-size:0.75rem;color:#6b7280;">${v.phone || ''}</div>
                    </td>
                    <td style="font-family:monospace;color:#60a5fa;">${v.studentId || 'N/A'}</td>
                    <td>
                      <span style="display:inline-flex;align-items:center;gap:0.35rem;padding:0.25rem 0.5rem;border-radius:9999px;font-size:0.7rem;font-weight:600;
                        ${
  v.verificationMethod === 'email'
    ? 'background:rgba(59,130,246,0.15);color:#60a5fa;'
    : 'background:rgba(245,158,11,0.15);color:#f59e0b;'
}">
                        ${v.verificationMethod === 'email' ? '📧 Email' : '📄 Document'}
                      </span>
                      <div style="font-size:0.7rem;color:#6b7280;margin-top:0.25rem;">Level ${v.level || 'N/A'}${v.hall ? ' · ' + v.hall : ''}</div>
                    </td>
                    <td style="font-size:0.8rem;color:#9ca3af;">${Formatter.formatTimeAgo(v.submittedAt)}</td>
                    <td>
                      <span class="admin-status-badge ${v.status === 'approved' ? 'delivered' : v.status === 'rejected' ? 'cancelled' : 'placed'}"
                        style="text-transform:capitalize;">${v.status}</span>
                      ${v.reviewNotes ? `<div style="font-size:0.7rem;color:#9ca3af;margin-top:0.25rem;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${v.reviewNotes.replace(/"/g, '&quot;')}">💬 ${_pageEsc(v.reviewNotes)}</div>` : ''}
                    </td>
                    <td>
                      <div style="display:flex;gap:0.35rem;flex-wrap:wrap;">
                        <button class="btn btn-sm" onclick="Pages.viewVerificationDetail('${v.id}')" style="padding:3px 8px;font-size:11px;background:#374151;color:#e5e7eb;border:none;cursor:pointer;">👁 View</button>
                        ${
  v.status === 'pending'
    ? `
                          <button class="btn btn-sm" onclick="Pages.approveVerification('${v.id}')" style="padding:3px 8px;font-size:11px;background:#059669;color:#fff;border:none;cursor:pointer;">✓ Approve</button>
                          <button class="btn btn-sm" onclick="Pages.rejectVerification('${v.id}')" style="padding:3px 8px;font-size:11px;background:#dc2626;color:#fff;border:none;cursor:pointer;">✕ Reject</button>
                        `
    : ''
}
                      </div>
                    </td>
                  </tr>
                  `,
    )
    .join('')}
                </tbody>
              </table>
            `
}
          </div>
        </div>
      </main>
    </div>`;
  }

  // ============================================
  // PAYOUT APPROVAL QUEUE (escrow Phase 3)
  // Seller withdrawal requests. Approve = funds check + ledger write +
  // manual settlement mark; Reject = requires a stored reason.
  // ============================================

  static _payoutStatusClass (status) {
    // Maps payout states onto existing admin-status-badge classes.
    const badgeMap = {
      paid: 'delivered',
      failed: 'cancelled',
      processing: 'in_transit',
      approved: 'in_transit',
    };
    return badgeMap[status] || 'placed';
  }

  static async renderAdminPayouts (filter) {
    if (!_requireAdmin()) {return;}
    const adminUser =
      (typeof adminAuthManager !== 'undefined' && adminAuthManager.getCurrentUser?.()) ||
      null;
    if (!adminUser) {
      this.renderAdminLogin();
      return;
    }

    this.hideOriginalNavFooter();
    document.body.style.background = '';

    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
      <div class="admin-container">
        ${this.getAdminSidebar('payouts')}
        <main class="admin-main">
          <div class="admin-header">
            <div>
              <h1 class="admin-title">Seller Payouts</h1>
              <p style="margin:0;color:#9ca3af;font-size:0.85rem;">Review and settle seller withdrawal requests</p>
            </div>
          </div>
          <div class="admin-stat-card"><div class="admin-stat-value">--</div><div class="admin-stat-label">Loading...</div></div>
        </main>
      </div>
    `;

    // One fetch for the whole queue (backend caps page size); counts and
    // filtering are derived client-side so tab switches don't refetch.
    let payouts = [];
    let loadError = null;
    try {
      const resp = await api.admin.getPayouts({ limit: 200 });
      if (resp.success && Array.isArray(resp.data?.payouts)) {
        payouts = resp.data.payouts;
      } else {
        loadError = resp.error || 'Failed to load payout queue.';
      }
    } catch (err) {
      loadError = err.message || 'Failed to load payout queue.';
    }

    this._payoutFilter = filter || this._payoutFilter || 'requested';
    const activeFilter = this._payoutFilter;

    const counts = { requested: 0, paid: 0, failed: 0 };
    for (const p of payouts) {
      if (counts[p.status] !== undefined) { counts[p.status]++; }
    }
    const visible = activeFilter === 'all' ? payouts : payouts.filter(p => p.status === activeFilter);

    const statusTabs = [
      { key: 'requested', label: `Requested (${counts.requested})` },
      { key: 'paid', label: `Paid (${counts.paid})` },
      { key: 'failed', label: `Rejected (${counts.failed})` },
      { key: 'all', label: `All (${payouts.length})` },
    ]
      .map(
        t => `
            <button class="btn btn-sm ${activeFilter === t.key ? 'btn-primary' : 'btn-ghost'}" data-payout-filter="${t.key}" style="font-size:0.75rem;">${t.label}</button>`,
      )
      .join('');

    const rows =
      visible
        .map(
          p => `
                  <tr>
                    <td>
                      <div style="font-weight:600;color:#f9fafb;">${_pageEsc(p.seller?.fullName || 'Unknown seller')}</div>
                      <div style="font-size:0.75rem;color:#9ca3af;">${_pageEsc(p.seller?.email || '')}</div>
                      <div style="font-size:0.75rem;color:#6b7280;">${_pageEsc(p.seller?.phone || '')}</div>
                    </td>
                    <td style="font-weight:600;">${Formatter.formatPrice(p.amount || 0)}</td>
                    <td>${_pageEsc(Formatter.capitalize(p.method || ''))}</td>
                    <td style="font-family:monospace;font-size:0.8rem;color:#60a5fa;">${_pageEsc(p.destination || '')}</td>
                    <td style="font-size:0.8rem;color:#9ca3af;">${Formatter.formatTimeAgo(p.requestedAt)}</td>
                    <td>
                      <span class="admin-status-badge ${this._payoutStatusClass(p.status)}" style="text-transform:capitalize;">${_pageEsc(p.status)}</span>
                      ${p.failureReason ? `<div style="font-size:0.7rem;color:#f87171;margin-top:0.25rem;max-width:160px;">${_pageEsc(p.failureReason)}</div>` : ''}
                      ${p.processedAt ? `<div style="font-size:0.7rem;color:#6b7280;margin-top:0.25rem;">${Formatter.formatTimeAgo(p.processedAt)}</div>` : ''}
                    </td>
                    <td>
                      ${
  p.status === 'requested'
    ? `
                        <div style="display:flex;gap:0.35rem;flex-wrap:wrap;">
                          <button class="btn btn-sm" data-payout-action="approve" data-id="${_pageEsc(p.id)}" aria-label="Approve payout"
                            style="padding:3px 8px;font-size:11px;background:#059669;color:#fff;border:none;cursor:pointer;">✓ Approve</button>
                          <button class="btn btn-sm" data-payout-action="reject" data-id="${_pageEsc(p.id)}" aria-label="Reject payout"
                            style="padding:3px 8px;font-size:11px;background:#dc2626;color:#fff;border:none;cursor:pointer;">✕ Reject</button>
                        </div>
                      `
    : ''
}
                    </td>
                  </tr>
                  `,
        )
        .join('') ||
      `<tr><td colspan="7" style="text-align:center;color:#6b7280;padding:2rem;">No ${activeFilter === 'all' ? '' : `${_pageEsc(activeFilter)} `}payout requests</td></tr>`;

    mainContent.innerHTML = `
      <div class="admin-container">
        ${this.getAdminSidebar('payouts')}
        <main class="admin-main">
          <div class="admin-header">
            <div>
              <h1 class="admin-title">Seller Payouts</h1>
              <p style="margin:0;color:#9ca3af;font-size:0.85rem;">
                Approving marks the payout PAID for manual settlement and writes the ledger entry.
              </p>
            </div>
          </div>

          ${loadError ? `<div style="background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.4);color:#f87171;padding:0.75rem 1rem;border-radius:0.5rem;margin-bottom:1rem;font-size:0.85rem;">${_pageEsc(loadError)} Offline or server unreachable.</div>` : ''}

          <div class="admin-card">
            <div class="admin-card-header">
              <h3>Payout Requests</h3>
              <div style="display:flex;gap:0.5rem;" id="admin-payout-filters">${statusTabs}</div>
            </div>
            <div class="admin-table-container" style="box-shadow:none;border-radius:0;" id="admin-payouts-table">
              ${
  visible.length === 0 && payouts.length > 0
    ? `
                <div style="text-align:center;padding:3rem;color:#6b7280;">
                  <div style="font-size:2.5rem;margin-bottom:1rem;">💸</div>
                  <p style="margin:0;font-size:1rem;">No ${activeFilter === 'all' ? '' : `${_pageEsc(activeFilter)} `}payout requests</p>
                </div>
              `
    : `
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Seller</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Destination</th>
                      <th>Requested</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              `
}
            </div>
          </div>
        </main>
      </div>
    `;

    // Event delegation on stable parents — no new inline handlers (CSP).
    mainContent.querySelector('#admin-payout-filters').addEventListener('click', e => {
      const btn = e.target.closest('[data-payout-filter]');
      if (btn) { Pages.renderAdminPayouts(btn.dataset.payoutFilter); }
    });

    mainContent.querySelector('#admin-payouts-table').addEventListener('click', e => {
      const btn = e.target.closest('[data-payout-action]');
      if (!btn) { return; }
      const id = btn.dataset.id;
      if (btn.dataset.payoutAction === 'approve') {
        void Pages._approvePayout(id);
      } else if (btn.dataset.payoutAction === 'reject') {
        Pages._openRejectPayoutModal(id);
      }
    });
  }

  static async _approvePayout (id) {
    if (!_requireAdmin()) {return;}
    // TODO: security review — money-moving action; confirm guards against
    // accidental double-click but real protection is the backend's
    // status-guarded transition (409 on already-handled requests).
    if (!window.confirm('Approve this payout?\n\nIt will be marked PAID for manual settlement and a negative ledger entry will be recorded for the seller.')) {
      return;
    }
    try {
      const resp = await api.admin.approvePayout(id);
      if (resp.success) {
        showToast('Payout approved and marked paid', 'success');
      } else {
        showToast(resp.error || 'Failed to approve payout', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to approve payout', 'error');
    }
    await this.renderAdminPayouts();
  }

  static _openRejectPayoutModal (id) {
    if (!_requireAdmin()) {return;}

    const overlay = document.createElement('div');
    overlay.id = 'payout-reject-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:2000;padding:2rem;';
    // Static markup only — no interpolated data, safe to build via HTML.
    overlay.innerHTML = `
      <div role="dialog" aria-modal="true" aria-labelledby="payout-reject-title" style="background:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:0.75rem;max-width:420px;width:100%;padding:1.5rem;">
        <h3 id="payout-reject-title" style="margin:0 0 0.5rem;color:#f9fafb;">Reject payout request</h3>
        <p style="margin:0 0 1rem;color:#9ca3af;font-size:0.85rem;">Rejection is final — the seller would need to submit a new request. The reason is kept in the payout record.</p>
        <textarea id="payout-reject-reason" maxlength="300" rows="3" placeholder="Reason (min 3 characters)"
          style="width:100%;background:#1f2937;border:1px solid rgba(255,255,255,0.15);border-radius:0.5rem;color:#e5e7eb;padding:0.6rem;font-size:0.85rem;resize:vertical;"></textarea>
        <p id="payout-reject-error" role="alert" style="display:none;color:#f87171;font-size:0.78rem;margin:0.5rem 0 0;"></p>
        <div style="display:flex;justify-content:flex-end;gap:0.5rem;margin-top:1rem;">
          <button type="button" data-payout-modal-cancel class="btn btn-ghost btn-sm">Cancel</button>
          <button type="button" id="payout-reject-confirm" class="btn btn-sm" style="background:#dc2626;color:#fff;border:none;">Reject request</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = () => {
      document.removeEventListener('keydown', escListener);
      overlay.remove();
    };
    const escListener = e => {
      if (e.key === 'Escape') {close();}
    };
    document.addEventListener('keydown', escListener);

    overlay.addEventListener('click', e => {
      if (e.target === overlay) {close();}
    });
    overlay.querySelector('[data-payout-modal-cancel]').addEventListener('click', close);

    const confirmBtn = overlay.querySelector('#payout-reject-confirm');
    const errorEl = overlay.querySelector('#payout-reject-error');
    confirmBtn.addEventListener('click', async () => {
      const reason = overlay.querySelector('#payout-reject-reason').value.trim();
      if (reason.length < 3) {
        errorEl.textContent = 'Please enter a rejection reason of at least 3 characters.';
        errorEl.style.display = 'block';
        return;
      }
      confirmBtn.disabled = true;
      try {
        const resp = await api.admin.rejectPayout(id, reason);
        if (resp.success) {
          showToast('Payout request rejected', 'success');
        } else {
          showToast(resp.error || 'Failed to reject payout', 'error');
        }
        close();
        await Pages.renderAdminPayouts();
      } catch (err) {
        confirmBtn.disabled = false;
        errorEl.textContent = err.message || 'Failed to reject payout.';
        errorEl.style.display = 'block';
      }
    });

    overlay.querySelector('#payout-reject-reason').focus();
  }

  static async viewVerificationDetail (id) {
    if (typeof adminVerificationsManager === 'undefined') {
      showToast('Verification module not loaded', 'error');
      return;
    }
    const v = adminVerificationsManager.getById(id);
    if (!v) {
      showToast('Verification not found', 'error');
      return;
    }

    // Fresh signed URLs on EVERY open — never cached, never persisted.
    let docsState = { documents: [], purged: false, purgeScheduledFor: null };
    try {
      const resp = await api.verification.getDocuments(v.id);
      if (resp.success && resp.data) {
        docsState = resp.data;
      }
    } catch (_) { /* non-fatal: render modal without doc section */ }

    const esc = v2 => _pageEsc(String(v2 === null || v2 === undefined ? '' : v2));
    let docsSection;
    if (docsState.purged || (!docsState.documents.length && docsState.purgeScheduledFor)) {
      docsSection = `
        <div style="padding:1rem;text-align:center;color:#6b7280;border:1px dashed rgba(255,255,255,0.15);border-radius:0.5rem;">
          🗑 Documents permanently deleted${v.reviewedAt ? ` (decision ${esc(Formatter.formatDate(v.reviewedAt))})` : ''}
        </div>`;
    } else if (docsState.documents.length > 0) {
      const items = docsState.documents.map(d => {
        if (d.mimeType === 'application/pdf') {
          return `<a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer" data-doc-link style="display:block;padding:0.5rem;background:#1f2937;border-radius:0.5rem;color:#60a5fa;font-size:0.85rem;">📄 ${esc(d.fileName)}</a>`;
        }
        return `<img src="${esc(d.url)}" alt="${esc(d.fileName)}" style="max-width:100%;max-height:280px;display:block;margin:0.5rem auto;border-radius:0.5rem;" />`;
      }).join('');
      const purgeNote = docsState.purgeScheduledFor
        ? `<div style="font-size:0.75rem;color:#f59e0b;margin-top:0.5rem;">⏳ Auto-deletes ${esc(Formatter.formatDate(docsState.purgeScheduledFor))}</div>`
        : '';
      const purgeBtn = adminAuthManager.getCurrentUser()?.role === 'admin'
        ? `<button type="button" data-purge-docs="${esc(v.id)}" style="margin-top:0.5rem;padding:4px 10px;font-size:11px;background:#dc2626;color:#fff;border:none;border-radius:4px;cursor:pointer;">🗑 Purge now</button>`
        : '';
      docsSection = `
        <div style="border:1px solid rgba(255,255,255,0.1);border-radius:0.5rem;padding:0.75rem;">
          ${items}
          ${purgeNote}
          ${purgeBtn}
        </div>`;
    } else {
      docsSection = `
        <div style="padding:1rem;text-align:center;color:#6b7280;border:1px dashed rgba(255,255,255,0.15);border-radius:0.5rem;">
          No documents attached to this request
        </div>`;
    }

    const overlay = document.createElement('div');
    overlay.id = 'vrf-detail-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:2000;padding:2rem;';

    overlay.innerHTML = `
    <div style="background:#1f2937;border:1px solid rgba(255,255,255,0.1);border-radius:1rem;width:100%;max-width:600px;max-height:85vh;overflow-y:auto;padding:2rem;">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:1.5rem;">
        <div>
          <h2 style="color:#f9fafb;margin:0 0 0.25rem;font-size:1.25rem;">Verification Details</h2>
          <span class="admin-status-badge ${v.status === 'approved' ? 'delivered' : v.status === 'rejected' ? 'cancelled' : 'placed'}" style="text-transform:capitalize;">${v.status}</span>
        </div>
        <button onclick="document.getElementById('vrf-detail-overlay').remove()" style="background:transparent;border:none;color:#9ca3af;cursor:pointer;font-size:1.25rem;padding:0.25rem;">✕</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
        <div><div style="font-size:0.7rem;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.25rem;">Full Name</div><div style="color:#f9fafb;font-weight:500;">${_pageEsc(v.fullName || 'N/A')}</div></div>
        <div><div style="font-size:0.7rem;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.25rem;">Student ID</div><div style="color:#60a5fa;font-family:monospace;font-weight:500;">${_pageEsc(v.studentId || 'N/A')}</div></div>
        <div><div style="font-size:0.7rem;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.25rem;">Email</div><div style="color:#f9fafb;">${v.personalEmail || v.universityEmail || v.email || 'N/A'}</div></div>
        <div><div style="font-size:0.7rem;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.25rem;">Phone</div><div style="color:#f9fafb;">${v.phone || 'N/A'}</div></div>
        <div><div style="font-size:0.7rem;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.25rem;">Level</div><div style="color:#f9fafb;">Level ${v.level || 'N/A'}</div></div>
        <div><div style="font-size:0.7rem;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.25rem;">Hall</div><div style="color:#f9fafb;">${v.hall || 'N/A'}</div></div>
        <div><div style="font-size:0.7rem;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.25rem;">Method</div><div style="color:#f9fafb;">${v.verificationMethod === 'email' ? '📧 University Email' : '📄 Document Upload'}</div></div>
        <div><div style="font-size:0.7rem;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.25rem;">Submitted</div><div style="color:#f9fafb;font-size:0.85rem;">${Formatter.formatDate(v.submittedAt)}</div></div>
        ${v.reviewedBy ? `<div><div style="font-size:0.7rem;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.25rem;">Reviewed By</div><div style="color:#f9fafb;">${v.reviewedBy}</div></div>` : ''}
        ${v.reviewedAt ? `<div><div style="font-size:0.7rem;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.25rem;">Reviewed At</div><div style="color:#f9fafb;font-size:0.85rem;">${Formatter.formatDate(v.reviewedAt)}</div></div>` : ''}
        ${v.reviewNotes ? `<div style="grid-column:1/-1;"><div style="font-size:0.7rem;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.25rem;">Review Notes</div><div style="color:#f9fafb;background:#111827;padding:0.75rem;border-radius:0.5rem;font-size:0.85rem;">${_pageEsc(v.reviewNotes)}</div></div>` : ''}
      </div>

      <div style="margin-bottom:1.5rem;">
        <h4 style="color:#f9fafb;margin:0 0 0.5rem;font-size:0.95rem;">Verification documents</h4>
        ${docsSection}
      </div>

      ${
  v.status === 'pending'
    ? `
      <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:1.5rem;">
        <div style="margin-bottom:1rem;">
          <label style="font-size:0.8rem;color:#9ca3af;display:block;margin-bottom:0.35rem;">Review Notes (optional)</label>
          <textarea id="vrf-review-notes-${v.id}" rows="3" placeholder="Add notes about this verification..." style="width:100%;background:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:0.5rem;color:#f9fafb;padding:0.75rem;font-size:0.85rem;resize:vertical;font-family:inherit;"></textarea>
        </div>
        <div style="display:flex;gap:0.75rem;">
          <button onclick="Pages.approveVerification('${v.id}'); document.getElementById('vrf-detail-overlay').remove();" style="flex:1;padding:0.75rem;background:#059669;color:#fff;border:none;border-radius:0.5rem;cursor:pointer;font-weight:600;font-size:0.9rem;">✓ Approve Verification</button>
          <button onclick="Pages.rejectVerification('${v.id}'); document.getElementById('vrf-detail-overlay').remove();" style="flex:1;padding:0.75rem;background:#dc2626;color:#fff;border:none;border-radius:0.5rem;cursor:pointer;font-weight:600;font-size:0.9rem;">✕ Reject Verification</button>
        </div>
      </div>`
    : ''
}
    </div>`;

    document.body.appendChild(overlay);

    // Signed URLs expire after 300s; refetch fresh ones once on load error.
    // (Capture phase — IMG error events do not bubble.)
    let refetched = false;
    overlay.addEventListener('error', e => {
      if (refetched || e.target.tagName !== 'IMG') { return; }
      refetched = true;
      void Pages.viewVerificationDetail(id);
    }, true);

    // Single delegated handler for the whole overlay: backdrop click-to-close
    // (merged from the former inline onclick) plus the admin "Purge now"
    // action. No new inline handlers (CSP).
    overlay.addEventListener('click', async e => {
      if (e.target === overlay) { overlay.remove(); return; }
      const purgeBtn = e.target.closest('[data-purge-docs]');
      if (!purgeBtn) { return; }
      const vid = purgeBtn.dataset.purgeDocs;
      if (!window.confirm('Permanently delete all documents for this request now? This cannot be undone.')) { return; }
      purgeBtn.disabled = true;
      try {
        const resp = await api.verification.purgeDocuments(vid);
        if (resp.success) {
          showToast('Documents permanently deleted', 'success');
          overlay.remove();
          Pages.renderAdminVerifications(Pages._verifFilter || 'pending');
        } else {
          showToast(resp.error || 'Failed to delete documents', 'error');
          purgeBtn.disabled = false;
        }
      } catch (err) {
        showToast(err.message || 'Failed to delete documents', 'error');
        purgeBtn.disabled = false;
      }
    });
  }

  static approveVerification (id) {
    if (typeof adminVerificationsManager === 'undefined') {
      showToast('Verification module not loaded', 'error');
      return;
    }
    const notesEl = document.getElementById(`vrf-review-notes-${id}`);
    const notes = notesEl ? notesEl.value.trim() : '';
    const result = adminVerificationsManager.approve(id, notes);
    if (result.success) {
      showToast(`Student ${result.data.fullName} has been verified successfully!`, 'success');
      this.renderAdminVerifications();
    } else {
      showToast(result.error || 'Failed to approve verification', 'error');
    }
  }

  static rejectVerification (id) {
    if (typeof adminVerificationsManager === 'undefined') {
      showToast('Verification module not loaded', 'error');
      return;
    }
    const notesEl = document.getElementById(`vrf-review-notes-${id}`);
    let notes = notesEl ? notesEl.value.trim() : '';

    if (!notes) {
      const reason = prompt(
        'Please provide a reason for rejection (this will be visible to the student):',
      );
      if (reason === null) {return;}
      notes = reason;
    }

    const result = adminVerificationsManager.reject(id, notes);
    if (result.success) {
      showToast(`Verification for ${result.data.fullName} has been rejected.`, 'info');
      this.renderAdminVerifications();
    } else {
      showToast(result.error || 'Failed to reject verification', 'error');
    }
  }

  /**
   * Render Admin Login
   */
  static renderAdminLogin () {
    this.hideOriginalNavFooter();
    document.body.style.background = '';
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
  <div class="admin-container" style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem;">
    <div style="background:var(--admin-bg-elev2,#1f2937);border:1px solid var(--admin-border,rgba(255,255,255,0.1));border-radius:var(--radius-xl,1rem);padding:var(--space-2xl,2rem);width:100%;max-width:400px;box-shadow:var(--shadow-xl);">
      <div style="text-align:center;margin-bottom:2rem;">
        <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,var(--primary,#0046be),var(--primary-hover,#003399));color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:1.25rem;margin-bottom:1rem;">U</div>
        <h2 style="color:var(--admin-text-strong,#f9fafb);margin:0;">Admin Login</h2>
        <p style="color:var(--admin-text-muted,#9ca3af);margin:0.5rem 0 0;font-size:0.875rem;">Sign in to access the admin panel</p>
      </div>
      <form id="admin-login-form">
        <div class="form-group">
          <label for="admin-email" class="required" style="color:var(--admin-text,#d1d5db);">Email</label>
          <input type="email" id="admin-email" name="email" class="form-control" required style="background:var(--admin-bg,#111827);border-color:var(--admin-border-strong,rgba(255,255,255,0.1));color:var(--admin-text-strong,#f9fafb);" />
        </div>
        <div class="form-group">
          <label for="admin-password" class="required" style="color:var(--admin-text,#d1d5db);">Password</label>
          <input type="password" id="admin-password" name="password" class="form-control" required style="background:var(--admin-bg,#111827);border-color:var(--admin-border-strong,rgba(255,255,255,0.1));color:var(--admin-text-strong,#f9fafb);" />
        </div>
        <button type="submit" class="btn btn-primary btn-block" style="background:var(--primary,#0046be);border-color:var(--primary,#0046be);">Login as Admin</button>
      </form>
      <div style="text-align:center;margin-top:1.5rem;">
        <a href="#/" style="color:var(--admin-text-muted,#9ca3af);font-size:0.875rem;">Back to Home</a>
      </div>
    </div>
  </div>
  `;
    // Wire submit via addEventListener (no inline handler — CSP-friendly).
    const form = document.getElementById('admin-login-form');
    if (form) {
      form.addEventListener('submit', e => Pages.handleAdminLogin(e));
    }
  }

  /**
   * Handle Admin Login
   */
  static async handleAdminLogin (event) {
    event.preventDefault();
    const form = event.target;
    const result = await adminAuthManager.login(form.email.value, form.password.value);

    if (result.success) {
      notificationManager?.success('Login Successful', 'Welcome to Admin Panel');
      Pages.renderAdminDashboard();
    } else {
      notificationManager?.error('Login Failed', result.error);
    }
  }

  /**
   * Render Admin Users Page
   */
  static async renderAdminUsers () {
    if (!_requireAdmin()) {return;}
    this.hideOriginalNavFooter();
    document.body.style.background = '';
    const mainContent = document.getElementById('main-content');

    mainContent.innerHTML = `
  <div class="admin-container">
  ${this.getAdminSidebar('users')}
  <main class="admin-main">
  <div class="admin-header">
  <h1 class="admin-title">User Management</h1>
  </div>
  <div class="admin-card">
  <div class="admin-card-header"><h3>Loading users...</h3></div>
  <div style="padding:2rem;text-align:center;color:#9ca3af;">Loading...</div>
  </div>
  </main>
  </div>`;

    await adminUsersManager.loadUsers();
    const users = adminUsersManager.getAllUsers();

    const tableBody = document.querySelector('.admin-card');
    if (tableBody) {
      tableBody.outerHTML = `
  <div class="admin-table-container">
  <table class="admin-table">
  <thead>
  <tr>
  <th>User</th>
  <th>Email</th>
  <th>University</th>
  <th>Role</th>
  <th>Status</th>
  <th>Actions</th>
  </tr>
  </thead>
  <tbody>
  ${users
    .map(
      user => `
  <tr>
  <td>
  <div class="user-cell">
  <div class="admin-user-avatar-sm">${_pageEsc((user.fullName || 'U').charAt(0).toUpperCase())}</div>
  <div class="user-info">
  <div class="user-name">${_pageEsc(user.fullName)}</div>
  </div>
  </div>
  </td>
  <td>${_pageEsc(user.email)}</td>
  <td>${_pageEsc(user.university || '-')}</td>
  <td><span class="admin-role-badge ${_pageEsc(user.role)}">${_pageEsc(user.role)}</span></td>
  <td>
  <span class="admin-status-badge ${user.isSuspended ? 'cancelled' : 'delivered'}">
  ${user.isSuspended ? 'Suspended' : 'Active'}
  </span>
  </td>
  <td>
  <div class="table-actions">
  ${
  user.role === 'admin'
    ? ''
    : user.isSuspended
      ? `<button class="btn btn-sm btn-success" style="padding: 4px 8px; font-size: 12px;" data-action="admin-unban" data-user-id="${_pageEsc(user.id)}">Unban</button>`
      : `<button class="btn btn-sm btn-danger" style="padding: 4px 8px; font-size: 12px;" data-action="admin-ban" data-user-id="${_pageEsc(user.id)}">Ban</button>`
}
  </div>
  </td>
  </tr>
  `,
    )
    .join('')}
  </tbody>
  </table>
  </div>`;

    // Delegated click handler for the Ban/Unban buttons. Replaces the
    // old inline onclick="Pages.adminBanUser('${user.id}')" pattern,
    // which interpolated a raw backend string into a JS string literal
    // inside an HTML attribute — triple context-breakout risk.
    // tableBody was replaced via outerHTML above, so re-query the fresh
    // .admin-table-container node (the original reference is detached).
    const freshTable = mainContent.querySelector('.admin-table-container');
    if (freshTable) {
      freshTable.addEventListener('click', ev => {
        const btn = ev.target.closest('[data-action]');
        if (!btn) {return;}
        const userId = btn.dataset.userId || '';
        if (btn.dataset.action === 'admin-ban') {
          Pages.adminBanUser(userId);
        } else if (btn.dataset.action === 'admin-unban') {
          Pages.adminUnbanUser(userId);
        }
      });
    }
  }
}

  /**
   * Render Admin Products Page
   */
  static async renderAdminProducts () {
    if (!_requireAdmin()) {return;}
    let products = adminProductsManager.getAllProducts();
    if (typeof api !== 'undefined' && !api.isStaticDeploy && window._backendAvailable) {
      try {
        const resp = await api.admin.getProducts({ limit: 100 });
        if (resp.success && resp.data && resp.data.products) {
          const backendProducts = resp.data.products;
          if (backendProducts.length > 0) {
            const localIds = new Set(products.map(p => p.id));
            const merged = [...backendProducts];
            for (const lp of products) {
              if (!localIds.has(lp.id) && !backendProducts.some(bp => bp.id === lp.id)) {
                merged.push(lp);
              }
            }
            products = merged;
          }
        }
      } catch (_) {
        console.warn('pages: mergeLocalProducts failed:', _);
      }
    }
    this.hideOriginalNavFooter();
    document.body.style.background = '';
    const mainContent = document.getElementById('main-content');

    mainContent.innerHTML = `
  <div class="admin-container">
  ${this.getAdminSidebar('products')}
  <main class="admin-main">
  <div class="admin-header">
  <h1 class="admin-title">Product Management</h1>
  <div class="admin-actions">
  <button class="btn btn-primary" onclick="Pages.renderAdminProductCreate()" style="padding:0.5rem 1.25rem;font-size:0.875rem;">+ Add Product</button>
  </div>
  </div>
  <div class="admin-table-container">
  <table class="admin-table">
  <thead>
  <tr>
  <th>Product</th>
  <th>Category</th>
  <th>Price</th>
  <th>Seller</th>
  <th>Status</th>
  <th>Actions</th>
  </tr>
  </thead>
  <tbody>
  ${products
    .map(
      product => `
  <tr>
  <td>
  <div class="product-cell">
  <img src="${product.images?.[0] || '/assets/images/products/no-image.svg'}" alt="${product.title}" class="product-image-small" loading="lazy" onerror="this.src='/assets/images/products/no-image.svg'" />
  <span>${_pageEsc(product.title)}</span>
  </div>
  </td>
  <td>${Formatter.capitalize(product.category)}</td>
  <td>${Formatter.formatPrice(product.price)}</td>
  <td>${_pageEsc(product.seller?.fullName || product.sellerName || product.seller?.name || product.seller || 'Unknown')}</td>
  <td>
  <span class="admin-status-badge ${product.status === 'pending' ? 'placed' : 'delivered'}">
  ${product.status || 'active'}
  </span>
  </td>
              <td>
                <div class="table-actions">
                  ${
  product.status === 'pending'
    ? `
                  <button class="btn btn-sm btn-success" style="padding: 4px 8px; font-size: 12px;" onclick="Pages.adminApproveProduct('${product.id}')">Approve</button>
                  <button class="btn btn-sm btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="Pages.adminRejectProduct('${product.id}')">Reject</button>
                  `
    : ''
}
                  <button class="btn btn-sm" style="padding:4px 8px;font-size:12px;background:#2563eb;color:#fff;border:none;" onclick="Pages.renderAdminProductEdit('${product.id}')">Edit</button>
                  <button class="btn btn-sm btn-danger" style="padding: 4px 8px; font-size: 12px; background:#dc2626; color:#fff; border:none;" onclick="Pages.adminDeleteProduct('${product.id}')">Delete</button>
                </div>
              </td>
  </tr>
  `,
    )
    .join('')}
  </tbody>
  </table>
  </div>
  </main>
  </div>
  `;
  }

  /**
   * Render Admin Orders Page
   */
  static async renderAdminOrders () {
    if (!_requireAdmin()) {return;}
    this.hideOriginalNavFooter();
    document.body.style.background = '';
    const mainContent = document.getElementById('main-content');

    mainContent.innerHTML = `
  <div class="admin-container">
  ${this.getAdminSidebar('orders')}
  <main class="admin-main">
  <div class="admin-header">
  <h1 class="admin-title">Order Management</h1>
  </div>
  <div class="admin-card">
  <div class="admin-card-header"><h3>Loading orders...</h3></div>
  <div style="padding:2rem;text-align:center;color:#9ca3af;">Loading...</div>
  </div>
  </main>
  </div>`;

    const orders = await adminOrdersManager.getAllOrders();

    const card = document.querySelector('.admin-card');
    if (card) {
      card.outerHTML = `
  <div class="admin-table-container">
  <table class="admin-table">
  <thead>
  <tr>
          <th>Order #</th>
          <th>Tracking</th>
          <th>Customer</th>
  <th>Total</th>
  <th>Payment</th>
  <th>Status</th>
  <th>Date</th>
  <th>Actions</th>
  </tr>
  </thead>
  <tbody>
  ${orders
    .map(
      order => `
  <tr>
  <td><strong>${_pageEsc(order.orderNumber || '')}</strong></td>
<td style="font-family:monospace;font-size:0.8rem;color:#0046be;">${_pageEsc(order.trackingNumber || '—')}</td>
  <td>${_pageEsc(order.customer?.name || 'N/A')}</td>
  <td>${Formatter.formatPrice(order.pricing?.grandTotal ?? 0)}</td>
  <td>${_pageEsc(Formatter.capitalize(order.payment?.mode || '') || '—')}</td>
  <td><span class="admin-status-badge ${_pageEsc(order.status || '')}">${_pageEsc(Formatter.capitalize(order.status || '') || '—')}</span></td>
  <td>${Formatter.formatDate(order.createdAt)}</td>
  <td>
  <div class="table-actions">
  <button class="table-action-btn view" title="View">${Icons.view}</button>
  </div>
  </td>
  </tr>
  `,
    )
    .join('')}
  </tbody>
  </table>
  </div>`;
    }
  }

  /**
   * Render Admin Regions Page
   */
  static renderAdminRegions () {
    if (!_requireAdmin()) {return;}
    const regions = regionManager.getAllRegions();
    this.hideOriginalNavFooter();
    document.body.style.background = '';
    const mainContent = document.getElementById('main-content');

    mainContent.innerHTML = `
  <div class="admin-container">
  ${this.getAdminSidebar('regions')}
  <main class="admin-main">
          <div class="admin-header">
            <h1 class="admin-title">Regional Management</h1>
          </div>
          <div class="admin-table-container">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Region</th>
                  <th>Capital</th>
                  <th>Universities</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${regions
    .map(
      region => `
                  <tr>
                    <td>${region.name}</td>
                    <td>${region.capital}</td>
                    <td>${region.universities.length}</td>
                    <td>
                      <div class="table-actions">
                        <button class="table-action-btn edit" title="Edit">${Icons.edit}</button>
                      </div>
                    </td>
                  </tr>
                `,
    )
    .join('')}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    `;
  }

  /**
   * Render Admin Reports Page
   */
  static async renderAdminReports () {
    if (!_requireAdmin()) {return;}
    this.hideOriginalNavFooter();
    document.body.style.background = '';
    const mainContent = document.getElementById('main-content');

    mainContent.innerHTML = `
  <div class="admin-container">
  ${this.getAdminSidebar('reports')}
  <main class="admin-main">
  <div class="admin-header">
  <h1 class="admin-title">Analytics & Reports</h1>
  </div>
  <div style="padding:2rem;text-align:center;color:#9ca3af;">Loading reports...</div>
  </main>
  </div>`;

    const stats = await adminReportsManager.getDashboardOverview();

    const mainEl = document.querySelector('.admin-main');
    if (mainEl) {
      mainEl.innerHTML = `
  <div class="admin-header">
  <h1 class="admin-title">Analytics & Reports</h1>
  </div>
  <div class="admin-dashboard-grid">
  <div class="admin-card">
  <div class="admin-card-header"><h3>Sales Report</h3></div>
  <div style="padding:20px;">
  <div class="admin-health-row"><span>Total Revenue</span><span class="admin-health-val good">GHS ${stats.summary.totalRevenue.toLocaleString()}</span></div>
  <div class="admin-health-row"><span>Total Orders</span><span class="admin-health-val good">${stats.summary.totalOrders}</span></div>
  <div class="admin-health-row"><span>Avg Order Value</span><span class="admin-health-val good">GHS ${stats.summary.totalOrders > 0 ? Math.round(stats.summary.totalRevenue / stats.summary.totalOrders).toLocaleString() : 0}</span></div>
  </div>
  </div>
  <div class="admin-card">
  <div class="admin-card-header"><h3>User Report</h3></div>
  <div style="padding:20px;">
  <div class="admin-health-row"><span>Total Users</span><span class="admin-health-val good">${stats.summary.totalUsers}</span></div>
  <div class="admin-health-row"><span>New This Month</span><span class="admin-health-val good">${stats.thisMonth.newUsers || 0}</span></div>
  </div>
  </div>
  <div class="admin-card">
  <div class="admin-card-header"><h3>Product Report</h3></div>
  <div style="padding:20px;">
  <div class="admin-health-row"><span>Total Products</span><span class="admin-health-val good">${stats.summary.totalProducts}</span></div>
  <div class="admin-health-row"><span>Pending Approval</span><span class="admin-health-val warning">${stats.summary.pendingProducts || 0}</span></div>
  </div>
  </div>
  </div>`;
    }
  }

  // ==========================================
  // ADMIN ACTION HANDLERS
  // ==========================================

  /**
   * Approve a product
   */
  static async adminApproveProduct (productId) {
    if (!confirm('Are you sure you want to approve this product?')) {
      return;
    }
    try {
      if (typeof api !== 'undefined' && !api.isStaticDeploy && window._backendAvailable) {
        await api.request('/admin/products/' + productId + '/approve', { method: 'PUT' });
      } else {
        await productsManager.approveProduct(productId);
      }
      showToast('Product approved successfully', 'success');
      this.renderAdminProducts();
    } catch (e) {
      showToast(e.message || 'Failed to approve product', 'error');
    }
  }

  static async adminRejectProduct (productId) {
    const reason = prompt('Please enter a reason for rejection:');
    if (!reason) {
      return;
    }
    try {
      if (typeof api !== 'undefined' && !api.isStaticDeploy && window._backendAvailable) {
        await api.request('/admin/products/' + productId + '/reject', {
          method: 'PUT',
          body: JSON.stringify({ reason }),
        });
      } else {
        await productsManager.rejectProduct(productId, reason);
      }
      showToast('Product rejected successfully', 'info');
      this.renderAdminProducts();
    } catch (e) {
      showToast(e.message || 'Failed to reject product', 'error');
    }
  }

  static async adminDeleteProduct (productId) {
    if (!confirm('Are you sure you want to delete this product? This cannot be undone.')) {
      return;
    }
    try {
      let deleted = false;
      if (typeof api !== 'undefined' && !api.isStaticDeploy && window._backendAvailable) {
        try {
          await api.admin.deleteProduct(productId);
          deleted = true;
        } catch (apiErr) {
          console.warn('API admin delete failed:', apiErr.message);
          deleted = true;
        }
      } else {
        deleted = true;
      }
      if (deleted) {
        productsManager.products = productsManager.products.filter(p => p.id !== productId);
        productsManager.filteredProducts = productsManager.filteredProducts.filter(
          p => p.id !== productId,
        );
        productsManager._persistLocalProducts();
        showToast('Product deleted successfully', 'success');
        this.renderAdminProducts();
      } else {
        showToast('Failed to delete product', 'error');
      }
    } catch (e) {
      showToast(e.message || 'Failed to delete product', 'error');
    }
  }

  /**
   * Ban a user
   */
  static async adminBanUser (userId) {
    const reason = prompt('Please enter a reason for banning this user:');
    if (!reason) {
      return;
    }
    try {
      if (typeof api !== 'undefined' && !api.isStaticDeploy && window._backendAvailable) {
        // Use api.admin.banUser (js/utils/api.js) which itself applies
        // encodeURIComponent to the id — no need to encode here. Double
        // encoding (% -> %25) would break backend path matching. The
        // backend also enforces validateObjectId (admin.routes.js) as
        // a second line of defense.
        await api.admin.banUser(userId, reason);
      } else {
        authManager.banUser(userId, reason);
      }
      showToast('User has been banned', 'success');
      this.renderAdminUsers();
    } catch (e) {
      showToast(e.message || 'Failed to ban user', 'error');
    }
  }

  static async adminUnbanUser (userId) {
    if (!confirm('Are you sure you want to unban this user?')) {
      return;
    }
    try {
      if (typeof api !== 'undefined' && !api.isStaticDeploy && window._backendAvailable) {
        await api.admin.unbanUser(userId);
      } else {
        authManager.unbanUser(userId);
      }
      showToast('User has been unbanned', 'success');
      this.renderAdminUsers();
    } catch (e) {
      showToast(e.message || 'Failed to unban user', 'error');
    }
  }

  static async renderAdminActivity () {
    if (!_requireAdmin()) {return;}
    this.hideOriginalNavFooter();
    document.body.style.background = '';
    const mainContent = document.getElementById('main-content');

    mainContent.innerHTML = `
  <div class="admin-container">
  ${this.getAdminSidebar('activity')}
  <main class="admin-main">
          <div class="admin-header">
            <h1 class="admin-title">Activity Monitor</h1>
            <div class="admin-actions">
              <select id="activity-filter-action" onchange="Pages._loadActivityLogs()" class="admin-select-filter">
                <option value="">All Actions</option>
                <option value="login">Login</option>
                <option value="signup">Signup</option>
                <option value="purchase">Purchase</option>
                <option value="product_create">Product Created</option>
                <option value="product_update">Product Updated</option>
                <option value="product_delete">Product Deleted</option>
                <option value="admin_ban">User Banned</option>
                <option value="admin_approve">Product Approved</option>
                <option value="admin_reject">Product Rejected</option>
                <option value="password_change">Password Change</option>
              </select>
              <select id="activity-filter-severity" onchange="Pages._loadActivityLogs()" class="admin-select-filter">
                <option value="">All Severity</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div id="activity-stats-cards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:1.5rem;"></div>
          <div class="admin-table-container">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody id="activity-logs-tbody">
                <tr><td colspan="5" style="text-align:center;padding:2rem;">Loading activity logs...</td></tr>
              </tbody>
            </table>
          </div>
          <div style="margin-top:1rem;text-align:center;">
            <button class="btn btn-outline" onclick="Pages._loadActivityLogs()" style="margin-right:0.5rem;">Refresh</button>
            <button class="btn btn-outline" id="activity-load-more" onclick="Pages._loadMoreActivity()" style="display:none;">Load More</button>
          </div>
        </main>
      </div>
    `;

    this._activityPage = 1;
    this._loadActivityLogs();
  }

  static async _loadActivityLogs () {
    const actionFilter = document.getElementById('activity-filter-action')?.value || '';
    const severityFilter = document.getElementById('activity-filter-severity')?.value || '';
    const tbody = document.getElementById('activity-logs-tbody');
    const statsCards = document.getElementById('activity-stats-cards');

    if (!tbody) {
      return;
    }
    this._activityPage = 1;

    try {
      const params = { page: this._activityPage, limit: 50 };
      if (actionFilter) {
        params.action = actionFilter;
      }
      if (severityFilter) {
        params.severity = severityFilter;
      }

      const [logsRes, statsRes, onlineRes] = await Promise.all([
        api.admin.getActivity(params).catch(() => ({ success: false })),
        api.admin.getActivityStats().catch(() => ({ success: false })),
        api.admin.getOnlineUsers().catch(() => ({ success: false })),
      ]);

      if (statsRes.success && statsRes.data) {
        const s = statsRes.data;
        statsCards.innerHTML = `
          <div class="admin-stat-card"><div class="admin-stat-value">${s.totalToday || 0}</div><div class="admin-stat-label">Events Today</div></div>
          <div class="admin-stat-card"><div class="admin-stat-value">${s.totalThisWeek || 0}</div><div class="admin-stat-label">Events This Week</div></div>
          <div class="admin-stat-card"><div class="admin-stat-value">${onlineRes.success ? onlineRes.data.onlineCount : '?'}</div><div class="admin-stat-label">Online Now</div></div>
        `;
      }

      if (logsRes.success && logsRes.data) {
        this._renderActivityRows(logsRes.data.logs || [], tbody);
        const moreBtn = document.getElementById('activity-load-more');
        if (moreBtn) {
          moreBtn.style.display = logsRes.data.page < logsRes.data.pages ? '' : 'none';
        }
      } else {
        tbody.innerHTML =
          '<tr><td colspan="5" style="text-align:center;padding:2rem;">Could not load activity logs from server. Showing local activity.</td></tr>';
        const localActivities = adminAuthManager.getActivityLog().slice(0, 50);
        const localRows = localActivities
          .map(
            a => `
          <tr>
            <td>${_pageEsc(new Date(a.timestamp).toLocaleString())}</td>
            <td>Admin</td>
            <td>${_pageEsc(a.action)}</td>
            <td>${_pageEsc(JSON.stringify(a.details || {}).substring(0, 80))}</td>
            <td><span style="padding:2px 8px;border-radius:4px;font-size:0.75rem;background:rgba(0,70,190,0.15);color:#93c5fd;">info</span></td>
          </tr>
        `,
          )
          .join('');
        tbody.innerHTML =
          localRows ||
          '<tr><td colspan="5" style="text-align:center;padding:2rem;">No activity records found.</td></tr>';
      }
    } catch (error) {
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--color-danger);">Error loading activity logs.</td></tr>';
    }
  }

  static async _loadMoreActivity () {
    this._activityPage = (this._activityPage || 1) + 1;
    const actionFilter = document.getElementById('activity-filter-action')?.value || '';
    const severityFilter = document.getElementById('activity-filter-severity')?.value || '';
    const tbody = document.getElementById('activity-logs-tbody');

    try {
      const params = { page: this._activityPage, limit: 50 };
      if (actionFilter) {
        params.action = actionFilter;
      }
      if (severityFilter) {
        params.severity = severityFilter;
      }

      const res = await api.admin.getActivity(params);
      if (res.success && res.data) {
        this._renderActivityRows(res.data.logs || [], tbody, true);
        const moreBtn = document.getElementById('activity-load-more');
        if (moreBtn) {
          moreBtn.style.display = res.data.page < res.data.pages ? '' : 'none';
        }
      }
    } catch (error) {
      showToast('Failed to load more logs', 'error');
    }
  }

  static _renderActivityRows (logs, tbody, append = false) {
    const severityColors = {
      info: 'background:rgba(0,70,190,0.15);color:#93c5fd;',
      warning: 'background:rgba(245,158,11,0.15);color:#fbbf24;',
      critical: 'background:rgba(239,68,68,0.15);color:#f87171;',
    };

    const actionLabels = {
      login: 'Login',
      logout: 'Logout',
      signup: 'Signup',
      purchase: 'Purchase',
      product_create: 'Product Created',
      product_update: 'Product Updated',
      product_delete: 'Product Deleted',
      review_create: 'Review Created',
      message_send: 'Message Sent',
      wishlist_add: 'Wishlist Add',
      profile_update: 'Profile Updated',
      password_change: 'Password Changed',
      admin_ban: 'User Banned',
      admin_approve: 'Product Approved',
      admin_reject: 'Product Rejected',
      search: 'Search',
    };

    const rows = (logs || [])
      .map(log => {
        const time = new Date(log.createdAt).toLocaleString();
        const user = log.userName || log.userEmail || 'System';
        const action = actionLabels[log.action] || log.action;
        const details = log.details ? JSON.stringify(log.details).substring(0, 100) : '-';
        const severity = log.severity || 'info';
        const sevStyle = severityColors[severity] || severityColors.info;

        return `<tr>
        <td style="white-space:nowrap;font-size:0.85rem;">${_pageEsc(time)}</td>
        <td>${_pageEsc(user)}</td>
        <td><strong>${_pageEsc(action)}</strong></td>
        <td style="font-size:0.85rem;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${_pageEsc(details)}">${_pageEsc(details)}</td>
        <td><span style="padding:2px 8px;border-radius:4px;font-size:0.75rem;${sevStyle}">${_pageEsc(severity)}</span></td>
      </tr>`;
      })
      .join('');

    if (append) {
      tbody.insertAdjacentHTML('beforeend', rows);
    } else {
      tbody.innerHTML =
        rows ||
        '<tr><td colspan="5" style="text-align:center;padding:2rem;">No activity records found.</td></tr>';
    }
  }

  // Render the conditional sub-options block for the admin product form.
  // For `fashion`: a Male/Female/Unisex radio group (product.gender).
  // For categories with a subcategories list: a subcategory <select>
  // (product.subcategory). Categories with neither render nothing.
  // `values` may contain { gender, subcategory } for pre-selection (Edit).
  static _renderAdminProductSubOptions (categoryId, values = {}) {
    const meta = Pages.ADMIN_CATEGORY_META.find(m => m.id === categoryId);
    if (!meta) {return '';}
    const parts = [];
    if (meta.hasGender) {
      const cur = values.gender || 'unisex';
      const opts = ['male', 'female', 'unisex']
        .map(
          g =>
            `<label style="display:inline-flex;align-items:center;gap:.35rem;"><input type="radio" name="gender" value="${g}" ${g === cur ? 'checked' : ''}> ${g.charAt(0).toUpperCase() + g.slice(1)}</label>`,
        )
        .join(' ');
      parts.push(`
        <div style="margin-bottom:.75rem;">
          <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Gender *</label>
          <div style="display:flex;gap:1rem;flex-wrap:wrap;">${opts}</div>
        </div>`);
    }
    if (meta.subcategories && meta.subcategories.length > 0) {
      const cur = values.subcategory || '';
      const opts = [`<option value="">— Select ${_pageEsc(meta.label)} subcategory —</option>`]
        .concat(
          meta.subcategories.map(
            s =>
              `<option value="${_pageEsc(s)}" ${s === cur ? 'selected' : ''}>${_pageEsc(s)}</option>`,
          ),
        )
        .join('');
      parts.push(`
        <div>
          <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Subcategory${meta.hasGender ? '' : ' *'}</label>
          <select name="subcategory" class="admin-form-select">${opts}</select>
        </div>`);
    }
    return parts.join('');
  }

  // Wire up the admin product form: category-change listener that re-renders
  // the sub-options block, drop-zone + image-preview event delegation (no
  // inline handlers — CSP-friendly), max-5 warning, and the manual-URL
  // textarea sync. Used by both Create and Edit forms.
  static _wireAdminProductForm (form) {
    const categorySelect = form.querySelector('[name="category"]');
    const subHost = form.querySelector('#admin-sub-options-host');
    const refreshSub = () => {
      if (!subHost) {return;}
      const cur = {};
      const g = form.querySelector('[name="gender"]:checked');
      if (g) {cur.gender = g.value;}
      const sc = form.querySelector('[name="subcategory"]');
      if (sc) {cur.subcategory = sc.value;}
      subHost.innerHTML = Pages._renderAdminProductSubOptions(categorySelect.value, cur);
    };
    if (categorySelect && subHost) {
      categorySelect.addEventListener('change', refreshSub);
      refreshSub();
    }
    Pages._wireImageDropZone(form);
  }

  // Attach event listeners to the drop-zone + file input + image-preview
  // grid + manual-URL textarea inside an admin product form. Replaces the
  // previous inline onclick/ondrag*/onchange/oninput handlers (CSP: a
  // strict Content-Security-Policy blocks inline handlers, and AGENTS.md
  // forbids adding new ones). Uses event delegation on the preview grid so
  // the × button's handler does not depend on a stale pending-image index.
  static _wireImageDropZone (form) {
    const dropZone = form.querySelector('#image-drop-zone');
    const fileInput = form.querySelector('#image-file-input');
    const previewGrid = form.querySelector('#image-preview-grid');
    const urlTextarea = form.querySelector('#image-url-textarea');
    if (!dropZone || !fileInput || !previewGrid) {return;}

    const openPicker = e => {
      // Avoid re-opening when the file input itself was the click target.
      if (e.target === fileInput) {return;}
      fileInput.click();
    };
    dropZone.addEventListener('click', openPicker);

    dropZone.addEventListener('dragover', e => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--primary,#3b82f6)';
      dropZone.style.background = 'rgba(0,70,190,0.08)';
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = 'var(--admin-border,#4b5563)';
      dropZone.style.background = '';
    });
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--admin-border,#4b5563)';
      dropZone.style.background = '';
      Pages._handleImageFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', () => {
      Pages._handleImageFiles(fileInput.files);
      // Reset so picking the same file twice still fires change.
      fileInput.value = '';
    });
    // Delegation: a click bubbling to the grid that originated on a
    // .remove-pending-image button removes the closest preview wrapper and
    // re-syncs _pendingImageFiles by matching the wrapper's data-index
    //_at_ attach time. We avoid stale indexOf by re-deriving the index
    // from the wrappers themselves.
    previewGrid.addEventListener('click', ev => {
      const btn = ev.target.closest('.remove-pending-image');
      if (!btn) {return;}
      ev.preventDefault();
      const wrapper = btn.closest('[data-pending-index]');
      if (!wrapper) {return;}
      const idx = Number(wrapper.dataset.pendingIndex);
      if (Number.isInteger(idx) && idx >= 0 && idx < Pages._pendingImageFiles.length) {
        Pages._pendingImageFiles.splice(idx, 1);
      }
      wrapper.remove();
      // Re-index remaining wrappers so future removals still match.
      Array.from(previewGrid.querySelectorAll('[data-pending-index]')).forEach((w, i) => {
        w.dataset.pendingIndex = String(i);
      });
      Pages._syncImageUrls();
    });
    if (urlTextarea) {
      urlTextarea.addEventListener('input', () => Pages._syncImageUrls());
    }
  }

  static renderAdminProductCreate () {
    if (!_requireAdmin()) {return;}
    this._pendingImageFiles = [];
    this._uploadedImageUrls = [];
    this.hideOriginalNavFooter();
    document.body.style.background = '';
    const mainContent = document.getElementById('main-content');
    const categories = Pages.ADMIN_CATEGORY_META;
    const conditions = Pages.ADMIN_CONDITIONS;

    mainContent.innerHTML = `
  <div class="admin-container">
  ${this.getAdminSidebar('products')}
  <main class="admin-main">
          <div class="admin-header">
            <h1 class="admin-title">Add New Product</h1>
            <button class="btn btn-outline" data-action="back-to-products">Back to Products</button>
          </div>
          <form id="admin-product-form" style="max-width:700px;">
            <div style="display:grid;gap:1rem;">
              <div>
                <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Title *</label>
                <input type="text" name="title" required class="admin-form-input" placeholder="e.g. MacBook Pro 2021">
              </div>
              <div>
                <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Description *</label>
                <textarea name="description" required rows="4" class="admin-form-input" placeholder="Describe the item..."></textarea>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div>
                  <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Price (GHS) *</label>
                  <input type="number" name="price" required min="1" class="admin-form-input" placeholder="0">
                </div>
                <div>
                  <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Category *</label>
                  <select name="category" required class="admin-form-select">
                    ${categories.map(c => `<option value="${_pageEsc(c.id)}">${_pageEsc(c.label)}</option>`).join('')}
                  </select>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div>
                  <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Condition *</label>
                  <select name="condition" required class="admin-form-select">
                    ${conditions.map(c => `<option value="${_pageEsc(c)}">${c.charAt(0).toUpperCase() + c.slice(1)}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label style="display:block;margin-bottom:0.25rem;font-weight:600;">University</label>
                  <input type="text" name="university" class="admin-form-input" placeholder="Leave blank for your university">
                </div>
              </div>
              <div id="admin-sub-options-host"></div>
              <div>
                <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Product Images</label>
                <div id="image-drop-zone" style="border:2px dashed var(--admin-border,#4b5563);border-radius:8px;padding:2rem;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;position:relative;">
                  <input type="file" id="image-file-input" multiple accept="image/png,image/jpeg,image/webp,image/gif" style="display:none">
                  <svg style="width:2rem;height:2rem;margin:0 auto .5rem;display:block;opacity:.5;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <p style="margin:0;color:var(--admin-muted,#9ca3af);font-size:.9rem;">Drag & drop images here, or <span style="color:var(--primary,#3b82f6);text-decoration:underline;">browse</span></p>
                  <p style="margin:.25rem 0 0;color:var(--admin-muted,#6b7280);font-size:.75rem;">PNG, JPG, WEBP — max 5 files</p>
                </div>
                <div id="image-preview-grid" style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem;"></div>
                <input type="hidden" name="images" id="image-urls-input">
                <details style="margin-top:.75rem;">
                  <summary style="cursor:pointer;color:var(--admin-muted,#9ca3af);font-size:.8rem;">Or paste image URLs manually</summary>
                  <textarea id="image-url-textarea" rows="3" class="admin-form-input" style="margin-top:.5rem;" placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"></textarea>
                </details>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div>
                  <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Delivery Modes</label>
                  <div style="display:flex;gap:1rem;flex-wrap:wrap;">
                    <label><input type="checkbox" name="deliveryModes" value="bolt"> Bolt</label>
                    <label><input type="checkbox" name="deliveryModes" value="yango"> Yango</label>
                    <label><input type="checkbox" name="deliveryModes" value="inperson"> In-Person</label>
                  </div>
                </div>
                <div>
                  <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Payment Modes</label>
                  <div style="display:flex;gap:1rem;flex-wrap:wrap;">
                    <label><input type="checkbox" name="paymentModes" value="momo"> MoMo</label>
                    <label><input type="checkbox" name="paymentModes" value="telecel"> Telecel</label>
                    <label><input type="checkbox" name="paymentModes" value="bank"> Bank</label>
                    <label><input type="checkbox" name="paymentModes" value="cash"> Cash</label>
                  </div>
                </div>
              </div>
              <div style="margin-top:1rem;">
                <button type="submit" class="btn btn-primary" style="padding:0.75rem 2rem;">Create Product</button>
              </div>
            </div>
          </form>
        </main>
      </div>
    `;
    const form = document.getElementById('admin-product-form');
    this._wireAdminProductForm(form);
    // The "Back to Products" button (pages.js:5260) lives in the
    // `admin-header` div which is a SIBLING of the form, not a descendant.
    // `form.querySelector('[data-action="back-to-products"]')` returns null
    // (it only matches descendants) and `null.addEventListener(...)` throws
    // `Cannot read properties of null (reading 'addEventListener')`. That
    // crash also prevents the form's submit handler at line ~5344 from being
    // wired, so clicking "Create Product" falls back to the form's default
    // GET-submit which pollinates the URL bar with `?title=...&images=`
    // and reloads the page ad infinitum. Fix: query from `mainContent`
    // (the parent that contains BOTH the admin-header and the form) instead
    // of from `form`.
    mainContent
      .querySelector('[data-action="back-to-products"]')
      .addEventListener('click', () => Pages.renderAdminProducts());
    form.addEventListener('submit', e => Pages._handleAdminProductCreate(e));
  }

  static _pendingImageFiles = [];
  static _uploadedImageUrls = [];

  static _filesToDataUris (files) {
    return Promise.all(
      files.map(file => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = function () {
            const img = new Image();
            img.onload = function () {
              const MAX_DIM = 600;
              let w = img.width;
              let h = img.height;
              if (w > MAX_DIM || h > MAX_DIM) {
                const scale = MAX_DIM / Math.max(w, h);
                w = Math.round(w * scale);
                h = Math.round(h * scale);
              }
              const canvas = document.createElement('canvas');
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, w, h);
              resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
          };
        });
      })
    );
  }
  static async renderAdminNewsletter () {
    if (!_requireAdmin()) {return;}
    this.hideOriginalNavFooter();
    document.body.style.background = '';
    const mainContent = document.getElementById('main-content');

    mainContent.innerHTML = `
  <div class="admin-container">
  ${this.getAdminSidebar('newsletter')}
  <main class="admin-main">
    <div class="admin-header">
      <h1 class="admin-title">Newsletter Campaigns</h1>
    </div>
    <div id="newsletter-content" style="padding: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.25rem;">Subscriber Stats</h2>
          <p style="color: #9ca3af; font-size: 0.875rem;">Manage your email subscribers and send campaigns</p>
        </div>
        <button class="btn btn-primary" onclick="Pages.showNewsletterCampaignModal()">Create Campaign</button>
      </div>

      <div class="admin-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div class="admin-stat-card" id="stat-total">
          <div class="admin-stat-value">--</div>
          <div class="admin-stat-label">Total Subscribers</div>
        </div>
        <div class="admin-stat-card" id="stat-active">
          <div class="admin-stat-value">--</div>
          <div class="admin-stat-label">Active</div>
        </div>
        <div class="admin-stat-card" id="stat-pending">
          <div class="admin-stat-value">--</div>
          <div class="admin-stat-label">Pending</div>
        </div>
        <div class="admin-stat-card" id="stat-unsubscribed">
          <div class="admin-stat-value">--</div>
          <div class="admin-stat-label">Unsubscribed</div>
        </div>
      </div>

      <div class="admin-card" style="margin-bottom: 2rem;">
        <div class="admin-card-header">
          <h3>Recent Campaigns</h3>
        </div>
        <div style="padding: 1.5rem;">
          <div class="admin-table-container">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Sent</th>
                  <th>Recipients</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="campaigns-table-body">
                <tr><td colspan="4" style="text-align: center; color: #9ca3af;">Loading campaigns...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="admin-card">
        <div class="admin-card-header">
          <h3>Subscribers</h3>
        </div>
        <div style="padding: 1.5rem;">
          <div class="admin-table-container">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Subscribed</th>
                </tr>
              </thead>
              <tbody id="subscribers-table-body">
                <tr><td colspan="4" style="text-align: center; color: #9ca3af;">Loading subscribers...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </main>
  </div>
`;

    this._loadNewsletterStats();
    this._loadNewsletterCampaigns();
    this._loadNewsletterSubscribers();
  }

  static async _loadNewsletterStats () {
    try {
      const response = await api.get('/newsletter/stats');
      if (response.success) {
        const { total, active, pending, unsubscribed, bounced } = response.data;
        document.getElementById('stat-total').querySelector('.admin-stat-value').textContent = total?.toLocaleString() || '0';
        document.getElementById('stat-active').querySelector('.admin-stat-value').textContent = active?.toLocaleString() || '0';
        document.getElementById('stat-pending').querySelector('.admin-stat-value').textContent = pending?.toLocaleString() || '0';
        document.getElementById('stat-unsubscribed').querySelector('.admin-stat-value').textContent = (unsubscribed + bounced)?.toLocaleString() || '0';
      }
    } catch (error) {
      console.error('Failed to load newsletter stats:', error);
    }
  }

  static async _loadNewsletterCampaigns () {
    try {
      const response = await api.get('/newsletter/campaigns');
      if (response.success) {
        const tbody = document.getElementById('campaigns-table-body');
        if (response.data.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #9ca3af;">No campaigns sent yet</td></tr>';
          return;
        }
        tbody.innerHTML = response.data.map(c => `
          <tr>
            <td>${c.subject}</td>
            <td>${c.sent_at ? new Date(c.sent_at).toLocaleDateString() : '—'}</td>
            <td>${(c.recipient_count || 0).toLocaleString()}</td>
            <td><span class="status-badge status-delivered">Sent</span></td>
          </tr>
        `).join('');
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    }
  }

  static async _loadNewsletterSubscribers () {
    try {
      const response = await api.get('/newsletter/stats');
      // We'll use the stats endpoint for now; a proper subscribers list endpoint would be better
      const tbody = document.getElementById('subscribers-table-body');
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #9ca3af;">Use API for full subscriber list</td></tr>';
    } catch (error) {
      console.error('Failed to load subscribers:', error);
    }
  }

  static showNewsletterCampaignModal () {
    const modalHtml = `
      <div class="modal-overlay" id="newsletter-campaign-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
        <div class="modal" style="background: white; border-radius: 12px; width: 100%; max-width: 700px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
          <div class="modal-header" style="padding: 1.5rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="font-size: 1.25rem; font-weight: 600;">Create Email Campaign</h2>
            <button class="btn btn-ghost" onclick="Pages.closeNewsletterCampaignModal()" style="padding: 0.5rem;">${Icons.close || '×'}</button>
          </div>
          <div class="modal-body" style="padding: 1.5rem;">
            <div style="margin-bottom: 1rem;">
              <label style="display: block; font-weight: 500; margin-bottom: 0.5rem;">Subject *</label>
              <input type="text" id="campaign-subject" class="input" placeholder="e.g., New Arrivals This Week!" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 8px; font-size: 1rem;">
            </div>
            <div style="margin-bottom: 1rem;">
              <label style="display: block; font-weight: 500; margin-bottom: 0.5rem;">HTML Content *</label>
              <textarea id="campaign-content" class="input" placeholder="Enter HTML content..." style="width: 100%; min-height: 300px; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 8px; font-family: monospace; font-size: 0.875rem; resize: vertical;"></textarea>
            </div>
            <div style="margin-bottom: 1rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: #6b7280;">
                <input type="checkbox" id="campaign-test" style="width: 16px; height: 16px;"> Send test email to me first
              </label>
              <input type="email" id="campaign-test-email" class="input" placeholder="Test email address" style="width: 100%; max-width: 300px; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 8px; font-size: 1rem; margin-top: 0.5rem; display: none;">
            </div>
          </div>
          <div class="modal-footer" style="padding: 1.5rem; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 1rem;">
            <button class="btn btn-ghost" onclick="Pages.closeNewsletterCampaignModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Pages.sendNewsletterCampaign()">Send Campaign</button>
          </div>
        </div>
      </div>
    `;

    const existing = document.getElementById('newsletter-campaign-modal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('campaign-test').addEventListener('change', e => {
      document.getElementById('campaign-test-email').style.display = e.target.checked ? 'block' : 'none';
    });
  }

  static closeNewsletterCampaignModal () {
    const modal = document.getElementById('newsletter-campaign-modal');
    if (modal) modal.remove();
  }

  static async sendNewsletterCampaign () {
    const subject = document.getElementById('campaign-subject').value.trim();
    const htmlContent = document.getElementById('campaign-content').value.trim();
    const isTest = document.getElementById('campaign-test').checked;
    const testEmail = document.getElementById('campaign-test-email').value.trim();

    if (!subject || !htmlContent) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    if (isTest && !testEmail) {
      showToast('Please enter a test email address', 'error');
      return;
    }

    const sendBtn = document.querySelector('#newsletter-campaign-modal .btn-primary');
    const originalText = sendBtn.textContent;
    sendBtn.disabled = true;
    sendBtn.textContent = isTest ? 'Sending Test...' : 'Sending...';

    try {
      const response = await api.post('/newsletter/campaign', {
        subject,
        htmlContent,
        testEmail: isTest ? testEmail : undefined,
      });

      if (response.success) {
        showToast(isTest ? 'Test email sent!' : `Campaign sent to ${response.data.sent} subscribers`, 'success');
        this.closeNewsletterCampaignModal();
        this._loadNewsletterCampaigns();
        this._loadNewsletterStats();
      } else {
        throw new Error(response.error || 'Failed to send campaign');
      }
    } catch (error) {
      showToast('Failed to send campaign: ' + error.message, 'error');
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = originalText;
    }
  }
  static _handleImageDrop (event) {
    const files = event.dataTransfer.files;
    this._handleImageFiles(files);
  }

  static _handleImageFiles (fileList) {
    // HEIC/HEIF are accepted by no browser's Image decoder and would fail
    // silently at upload time. They were previously in the allowed list
    // — dropped until a converter is wired in.
    const isImageLike = f => f.type.startsWith('image/');
    const room = 5 - this._pendingImageFiles.length;
    if (room <= 0) {
      if (typeof showToast === 'function') {
        showToast('You can upload at most 5 images. Remove one first.', 'warning');
      }
      return;
    }
    const dropped = Array.from(fileList).filter(f => !isImageLike(f));
    if (dropped.length > 0 && typeof showToast === 'function') {
      showToast(
        `${dropped.length} file(s) skipped — not images (HEIC is not supported).`,
        'warning',
      );
    }
    const files = Array.from(fileList).filter(isImageLike).slice(0, room);
    if (files.length === 0) {
      return;
    }
    // If the user provided more images than we have room for, tell them.
    const remainingWanted = Array.from(fileList).filter(isImageLike).length - files.length;
    if (remainingWanted > 0 && typeof showToast === 'function') {
      showToast(
        `Only ${files.length} of ${Array.from(fileList).filter(isImageLike).length} image(s) added — max 5 per product.`,
        'warning',
      );
    }
    this._pendingImageFiles.push(...files);
    const grid = document.getElementById('image-preview-grid');
    files.forEach(file => {
      const startIdx = this._pendingImageFiles.length - 1;
      const reader = new FileReader();
      reader.onload = e => {
        const wrapper = document.createElement('div');
        wrapper.style.cssText =
          'position:relative;width:80px;height:80px;border-radius:6px;overflow:hidden;border:1px solid var(--admin-border,#374151);';
        // Capture the index at attach time. Event delegation in
        // _wireImageDropZone re-indexes wrappers on removal so this stays
        // accurate.
        wrapper.dataset.pendingIndex = String(startIdx);
        // data: URLs are produced locally by FileReader — sanitize anyway
        // for defense-in-depth (a strict sanitizeUrl still accepts data:*).
        const safeSrc = _pageSafeUrl(e.target.result);
        wrapper.innerHTML = `<img src="${safeSrc}" style="width:100%;height:100%;object-fit:cover"><button type="button" class="remove-pending-image" aria-label="Remove image" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,.7);color:#fff;border:none;border-radius:50%;width:18px;height:18px;cursor:pointer;font-size:12px;line-height:18px;text-align:center;padding:0;">&times;</button>`;
        grid.appendChild(wrapper);
        // Re-index after every append so each wrapper knows its real index.
        Array.from(grid.querySelectorAll('[data-pending-index]')).forEach((w, i) => {
          w.dataset.pendingIndex = String(i);
        });
      };
      reader.readAsDataURL(file);
    });
    this._syncImageUrls();
  }

  // Legacy entry point — kept so older callers (if any) keep working.
  // Inline handlers used to call this with (btn, index); the new
  // delegated handler in _wireImageDropZone handles removal directly.
  static _removeImage (btn, index) {
    if (Number.isInteger(index) && index >= 0 && index < this._pendingImageFiles.length) {
      this._pendingImageFiles.splice(index, 1);
    }
    const wrapper = btn.parentElement;
    if (wrapper) {
      wrapper.remove();
      const grid = document.getElementById('image-preview-grid');
      if (grid) {
        Array.from(grid.querySelectorAll('[data-pending-index]')).forEach((w, i) => {
          w.dataset.pendingIndex = String(i);
        });
      }
    }
    this._syncImageUrls();
  }

  static _syncImageUrls () {
    const textarea = document.getElementById('image-url-textarea');
    const hidden = document.getElementById('image-urls-input');
    const manualUrls = (textarea?.value || '')
      .split('\n')
      .map(u => u.trim())
      .filter(Boolean);
    const all = [...this._uploadedImageUrls, ...manualUrls];
    if (hidden) {
      hidden.value = all.join('\n');
    }
  }

  static async _handleAdminProductCreate (event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    const deliveryModes = formData.getAll('deliveryModes');
    const paymentModes = formData.getAll('paymentModes');

    let images = [];
    let uploadAborted = false;
    if (this._pendingImageFiles.length > 0) {
      try {
        const uploadResult = await api.upload.images(this._pendingImageFiles);
        if (uploadResult.success && uploadResult.urls) {
          images = uploadResult.urls;
          this._uploadedImageUrls = images;
          // Surface per-file failures so the user knows some images didn't
          // make it (Cloudinary occasionally rejects specific files for
          // format/corruption reasons while accepting the rest).
          if (uploadResult.failures && uploadResult.failures.length > 0) {
            const names = uploadResult.failures.map(f => f.filename || 'unknown').join(', ');
            showToast(
              `${uploadResult.failures.length} image(s) failed: ${names}. ${uploadResult.urls.length} uploaded.`,
              'warning',
            );
          }
        } else {
          if (uploadResult.isAuthError) {
            showToast('Session expired — please log in again', 'error');
            if (typeof authManager !== 'undefined' && authManager.clearSession)
            {authManager.clearSession();}
            if (typeof navigateTo === 'function') {navigateTo('login');}
            return;
          }
          showToast(
            'Image upload failed: ' +
              (uploadResult.error || 'Unknown error. Check your internet connection.'),
            'error',
          );
          uploadAborted = true;
        }
      } catch (uploadErr) {
        showToast('Image upload failed: ' + uploadErr.message, 'error');
        uploadAborted = true;
      }
    }

    const manualUrls = (document.getElementById('image-url-textarea')?.value || '')
      .split('\n')
      .map(u => u.trim())
      .filter(Boolean);
    images = [...images, ...manualUrls];

    const currentUser =
      typeof authManager !== 'undefined' && authManager.getCurrentUser
        ? authManager.getCurrentUser()
        : null;

    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      price: Number(formData.get('price')),
      category: formData.get('category'),
      condition: formData.get('condition'),
      gender: formData.get('gender') || undefined,
      subcategory: formData.get('subcategory') || undefined,
      images:
        uploadAborted && this._pendingImageFiles.length > 0
          ? []
          : images.length > 0
            ? images
            : ['/assets/images/products/no-image.svg'],
      deliveryModes,
      paymentModes,
      seller: currentUser?.id || 'admin',
      sellerName: currentUser?.fullName || currentUser?.name || 'Admin',
      sellerRating: currentUser?.rating || 5,
      university: formData.get('university')?.trim() || currentUser?.university || '',
      status: 'active',
    };
    // Remove empty optional fields so the backend doesn't persist "undefined".
    if (!data.gender) {delete data.gender;}
    if (!data.subcategory) {delete data.subcategory;}

    if (uploadAborted && this._pendingImageFiles.length > 0 && manualUrls.length === 0) {
      if (!confirm('Image upload failed. Create product without images?')) {
        return;
      }
      data.images = ['/assets/images/products/no-image.svg'];
    }

    try {
      const result = await api.admin.createProduct(data);
      if (result.success) {
        if (result.data) {
          const p = result.data;
          p._id = p._id || p.id;
          if (!productsManager.products.find(x => x.id === p.id || x._id === p._id)) {
            productsManager.products.unshift(p);
            productsManager.filteredProducts = [...productsManager.products];
            productsManager._persistLocalProducts();
          }
        }
        showToast('Product created successfully', 'success');
        this.renderAdminProducts();
      } else if (result.isOffline) {
        const fallbackResult = await productsManager.addProduct(data);
        if (fallbackResult.success) {
          showToast('Product created locally', 'success');
          this.renderAdminProducts();
        } else {
          showToast(fallbackResult.error || 'Failed to create product', 'error');
        }
      } else {
        throw new Error(result.error || 'Failed to create product');
      }
    } catch (error) {
      if (error.isAuthError || error.status === 401) {
        showToast('Session expired — please log in again', 'error');
        if (typeof authManager !== 'undefined' && authManager.clearSession)
        {authManager.clearSession();}
        if (typeof navigateTo === 'function') {navigateTo('login');}
        return;
      }
      const fallbackResult = await productsManager.addProduct(data);
      if (fallbackResult.success) {
        showToast('Product created locally', 'success');
        this.renderAdminProducts();
      } else {
        showToast(fallbackResult.error || 'Failed to create product', 'error');
      }
    }
  }

  static async renderAdminProductEdit (productId) {
    if (!_requireAdmin()) {return;}
    this._pendingImageFiles = [];
    this._uploadedImageUrls = [];
    this.hideOriginalNavFooter();
    document.body.style.background = '';
    const mainContent = document.getElementById('main-content');

    let product;
    try {
      const res = await api.products.get(productId);
      product = res.data || res;
    } catch (e) {
      mainContent.innerHTML =
        '<div class="admin-container" style="padding:2rem;color:var(--admin-danger,#f87171);">Failed to load product.</div>';
      return;
    }

    const categories = Pages.ADMIN_CATEGORY_META;
    const conditions = Pages.ADMIN_CONDITIONS;
    // Escape every value we interpolate into HTML. URLs come from the
    // backend response and could include breakout payloads if any
    // upstream write path was compromised. data-url is the sanitized URL;
    // we do NOT inline the URL into JS code (no onclick="...,'url'").
    const safeProductId = _pageEsc(productId);
    const existingImageWrappers = (product.images || []).map(url => {
      const safeUrl = _pageSafeUrl(url);
      // Store the URL in a data attribute so the delegated remove handler
      // can read it without us ever inlining it into a JS string.
      const attr = safeUrl.replace(/"/g, '"');
      return `<div class="existing-image-wrapper" data-url="${attr}" style="position:relative;width:80px;height:80px;border-radius:6px;overflow:hidden;border:1px solid var(--admin-border,#374151);display:inline-block;margin-right:.5rem;margin-bottom:.5rem;"><img src="${attr}" alt="product image" style="width:100%;height:100%;object-fit:cover"><button type="button" class="remove-existing-image" aria-label="Remove image" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,.7);color:#fff;border:none;border-radius:50%;width:18px;height:18px;cursor:pointer;font-size:12px;line-height:18px;text-align:center;padding:0;">&times;</button></div>`;
    });
    const existingImages = existingImageWrappers.join('');
    this._uploadedImageUrls = [...(product.images || [])];

    const deliveryChecked = mode => ((product.deliveryModes || []).includes(mode) ? 'checked' : '');
    const paymentChecked = mode => ((product.paymentModes || []).includes(mode) ? 'checked' : '');

    mainContent.innerHTML = `
      <div class="admin-container">
        ${this.getAdminSidebar('products')}
        <div class="admin-main">
          <div class="admin-header">
            <h1 class="admin-title">Edit Product</h1>
            <button class="btn btn-outline" data-action="back-to-products">Back to Products</button>
          </div>
          <form id="admin-product-edit-form" data-product-id="${safeProductId}" style="max-width:700px;">
            <div style="display:grid;gap:1rem;">
              <div>
                <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Title *</label>
                <input type="text" name="title" required class="admin-form-input" value="${_pageEsc(product.title || '')}">
              </div>
              <div>
                <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Description *</label>
                <textarea name="description" required rows="4" class="admin-form-input">${_pageEsc(product.description || '')}</textarea>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div>
                  <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Price (GHS) *</label>
                  <input type="number" name="price" required min="1" class="admin-form-input" value="${_pageEsc(product.price || '')}">
                </div>
                <div>
                  <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Category *</label>
                  <select name="category" required class="admin-form-select">
                    ${categories.map(c => `<option value="${_pageEsc(c.id)}" ${product.category === c.id ? 'selected' : ''}>${_pageEsc(c.label)}</option>`).join('')}
                  </select>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div>
                  <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Condition *</label>
                  <select name="condition" required class="admin-form-select">
                    ${conditions.map(c => `<option value="${_pageEsc(c)}" ${product.condition === c ? 'selected' : ''}>${c.charAt(0).toUpperCase() + c.slice(1)}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label style="display:block;margin-bottom:0.25rem;font-weight:600;">University</label>
                  <input type="text" name="university" class="admin-form-input" value="${_pageEsc(product.university || '')}">
                </div>
              </div>
              <div id="admin-sub-options-host"></div>
              <div>
                <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Current Images</label>
                <div id="existing-images-grid">${existingImages || '<span style="color:var(--admin-muted,#6b7280);font-size:.85rem;">No images</span>'}</div>
              </div>
              <div>
                <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Add New Images</label>
                <div id="image-drop-zone" style="border:2px dashed var(--admin-border,#4b5563);border-radius:8px;padding:2rem;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;">
                  <input type="file" id="image-file-input" multiple accept="image/png,image/jpeg,image/webp,image/gif" style="display:none">
                  <p style="margin:0;color:var(--admin-muted,#9ca3af);font-size:.9rem;">Drag & drop or <span style="color:var(--primary,#3b82f6);text-decoration:underline;">browse</span> to add more images</p>
                </div>
                <div id="image-preview-grid" style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem;"></div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div>
                  <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Delivery Modes</label>
                  <div style="display:flex;gap:1rem;flex-wrap:wrap;">
                    <label><input type="checkbox" name="deliveryModes" value="bolt" ${deliveryChecked('bolt')}> Bolt</label>
                    <label><input type="checkbox" name="deliveryModes" value="yango" ${deliveryChecked('yango')}> Yango</label>
                    <label><input type="checkbox" name="deliveryModes" value="inperson" ${deliveryChecked('inperson')}> In-Person</label>
                  </div>
                </div>
                <div>
                  <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Payment Modes</label>
                  <div style="display:flex;gap:1rem;flex-wrap:wrap;">
                    <label><input type="checkbox" name="paymentModes" value="momo" ${paymentChecked('momo')}> MoMo</label>
                    <label><input type="checkbox" name="paymentModes" value="telecel" ${paymentChecked('telecel')}> Telecel</label>
                    <label><input type="checkbox" name="paymentModes" value="bank" ${paymentChecked('bank')}> Bank</label>
                    <label><input type="checkbox" name="paymentModes" value="cash" ${paymentChecked('cash')}> Cash</label>
                  </div>
                </div>
              </div>
              <div style="margin-top:1rem;">
                <button type="submit" class="btn btn-primary" style="padding:0.75rem 2rem;">Save Changes</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
    const form = document.getElementById('admin-product-edit-form');
    // Wire sub-options + image drop-zone using the existing form helpers.
    // We seed the sub-options with the product's current gender/subcategory
    // so the initial render reflects saved state.
    const subHost = form.querySelector('#admin-sub-options-host');
    const categorySelect = form.querySelector('[name="category"]');
    const refreshSub = () => {
      if (!subHost) {return;}
      const cur = { gender: product.gender, subcategory: product.subcategory };
      subHost.innerHTML = Pages._renderAdminProductSubOptions(categorySelect.value, cur);
      // After rendering, capture any new values so a later category re-select
      // preserves the user's latest input.
      const g = form.querySelector('[name="gender"]:checked');
      if (g) {product.gender = g.value;}
      const sc = form.querySelector('[name="subcategory"]');
      if (sc) {product.subcategory = sc.value;}
    };
    if (categorySelect && subHost) {
      categorySelect.addEventListener('change', refreshSub);
      refreshSub();
    }
    Pages._wireImageDropZone(form);
    // Same null-querySelector bug as renderAdminProductCreate (pages.js:5341-5343):
    // the [data-action="back-to-products"] button lives in admin-header (a
    // sibling of the form), so query it from `mainContent` not `form`.
    mainContent
      .querySelector('[data-action="back-to-products"]')
      .addEventListener('click', () => Pages.renderAdminProducts());
    // Delegated removal of existing (already-uploaded) images.
    const existingGrid = form.querySelector('#existing-images-grid');
    if (existingGrid) {
      existingGrid.addEventListener('click', ev => {
        const btn = ev.target.closest('.remove-existing-image');
        if (!btn) {return;}
        ev.preventDefault();
        const wrapper = btn.closest('.existing-image-wrapper');
        if (!wrapper) {return;}
        const url = wrapper.dataset.url || '';
        // Remove from pending upload list and DOM.
        Pages._uploadedImageUrls = Pages._uploadedImageUrls.filter(u => u !== url);
        wrapper.remove();
      });
    }
    form.addEventListener('submit', e => {
      const id = form.dataset.productId || '';
      Pages._handleAdminProductEdit(e, id);
    });
  }

  static _removeExistingImage (btn, url) {
    this._uploadedImageUrls = this._uploadedImageUrls.filter(u => u !== url);
    btn.parentElement.remove();
  }

  static async _handleAdminProductEdit (event, productId) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    let newUrls = [];
    if (this._pendingImageFiles.length > 0) {
      try {
        const uploadResult = await api.upload.images(this._pendingImageFiles);
        if (uploadResult.success && uploadResult.urls) {
          newUrls = uploadResult.urls;
          if (uploadResult.failures && uploadResult.failures.length > 0) {
            const names = uploadResult.failures.map(f => f.filename || 'unknown').join(', ');
            showToast(
              `${uploadResult.failures.length} image(s) failed: ${names}. ${uploadResult.urls.length} uploaded.`,
              'warning',
            );
          }
        } else {
          showToast('Image upload failed: ' + (uploadResult.error || 'Unknown error'), 'error');
        }
      } catch (uploadErr) {
        showToast('Image upload failed: ' + uploadErr.message, 'error');
      }
    }

    const images = [...this._uploadedImageUrls, ...newUrls];
    const deliveryModes = formData.getAll('deliveryModes');
    const paymentModes = formData.getAll('paymentModes');

    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      price: Number(formData.get('price')),
      category: formData.get('category'),
      condition: formData.get('condition'),
      gender: formData.get('gender') || undefined,
      subcategory: formData.get('subcategory') || undefined,
      images: images.length > 0 ? images : ['/assets/images/products/no-image.svg'],
      deliveryModes,
      paymentModes,
    };
    // Drop empty optional fields so the backend can distinguish "unset"
    // from "explicitly cleared".
    if (!data.gender) {delete data.gender;}
    if (!data.subcategory) {delete data.subcategory;}

    const university = formData.get('university')?.trim();
    if (university) {
      data.university = university;
    }

    try {
      const result = await api.admin.updateProduct(productId, data);
      if (result.success) {
        const localProduct = productsManager.products.find(
          p => p.id === productId || p._id === productId,
        );
        if (localProduct && result.data) {
          Object.assign(localProduct, result.data, { updatedAt: new Date().toISOString() });
          productsManager.filteredProducts = [...productsManager.products];
          productsManager._persistLocalProducts();
        }
        showToast('Product updated successfully', 'success');
        this.renderAdminProducts();
      } else if (result.isOffline) {
        const localProduct = productsManager.products.find(p => p.id === productId);
        if (localProduct) {
          Object.assign(localProduct, data, { updatedAt: new Date().toISOString() });
          productsManager.filteredProducts = [...productsManager.products];
          productsManager._persistLocalProducts();
          showToast('Product updated locally', 'success');
          this.renderAdminProducts();
        } else {
          showToast('Product not found for local update', 'error');
        }
      } else {
        showToast(result.error || 'Failed to update product', 'error');
      }
    } catch (error) {
      const localProduct = productsManager.products.find(p => p.id === productId);
      if (localProduct) {
        Object.assign(localProduct, data, { updatedAt: new Date().toISOString() });
        productsManager.filteredProducts = [...productsManager.products];
        productsManager._persistLocalProducts();
        showToast('Product updated locally', 'success');
        this.renderAdminProducts();
      } else {
        showToast(error.message || 'Failed to update product', 'error');
      }
    }
  }

  static async renderAdminAnalytics () {
    if (!_requireAdmin()) {return;}
    this.hideOriginalNavFooter();
    document.body.style.background = '';
    const mainContent = document.getElementById('main-content');

    mainContent.innerHTML = `
      <div class="admin-container">
        ${this.getAdminSidebar('analytics')}
        <main class="admin-main">
          <div class="admin-header">
            <h1 class="admin-title">Analytics</h1>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;max-width:1100px;">
            <div style="background:#1f2937;border-radius:8px;padding:1.25rem;">
              <h3 style="margin:0 0 .75rem;font-size:.95rem;color:#d1d5db;">Revenue (Last 30 Days)</h3>
              <canvas id="analytics-revenue-chart" height="220"></canvas>
            </div>
            <div style="background:#1f2937;border-radius:8px;padding:1.25rem;">
              <h3 style="margin:0 0 .75rem;font-size:.95rem;color:#d1d5db;">Orders by Status</h3>
              <canvas id="analytics-orders-chart" height="220"></canvas>
            </div>
            <div style="background:#1f2937;border-radius:8px;padding:1.25rem;">
              <h3 style="margin:0 0 .75rem;font-size:.95rem;color:#d1d5db;">Products by Category</h3>
              <canvas id="analytics-categories-chart" height="220"></canvas>
            </div>
            <div style="background:#1f2937;border-radius:8px;padding:1.25rem;">
              <h3 style="margin:0 0 .75rem;font-size:.95rem;color:#d1d5db;">New Users (Last 30 Days)</h3>
              <canvas id="analytics-users-chart" height="220"></canvas>
            </div>
          </div>
          <div style="background:#1f2937;border-radius:8px;padding:1.25rem;max-width:1100px;margin-top:1.5rem;">
            <h3 style="margin:0 0 .75rem;font-size:.95rem;color:#d1d5db;">Top Selling Products</h3>
            <div id="analytics-top-products" style="color:#9ca3af;font-size:.85rem;">Loading...</div>
          </div>
        </main>
      </div>
    `;

    try {
      let d;
      if (typeof api !== 'undefined' && !api.isStaticDeploy && window._backendAvailable) {
        const result = await api.admin.getAnalytics();
        if (!result.success) {
          throw new Error(result.error || 'Failed to load analytics');
        }
        d = result.data;
      } else {
        const days = Array.from({ length: 30 }, (_, i) => {
          const dt = new Date();
          dt.setDate(dt.getDate() - (29 - i));
          return dt.toISOString().slice(0, 10);
        });
        d = {
          revenue: days.map(dt => ({ date: dt, revenue: Math.floor(Math.random() * 500 + 100) })),
          orderStatus: [
            { status: 'completed', count: 23 },
            { status: 'pending', count: 5 },
            { status: 'placed', count: 8 },
            { status: 'cancelled', count: 2 },
            { status: 'shipped', count: 4 },
            { status: 'delivered', count: 11 },
          ],
          categories: (typeof productsManager !== 'undefined'
            ? Object.entries(
              productsManager.products.reduce((m, p) => {
                m[p.category] = (m[p.category] || 0) + 1;
                return m;
              }, {}),
            )
            : [
              ['electronics', 2],
              ['hostel-items', 2],
              ['appliances', 1],
              ['textbooks', 1],
              ['accessories', 1],
              ['fashion', 1],
            ]
          ).map(([category, count]) => ({ category, count })),
          users: days.map(dt => ({ date: dt, count: Math.floor(Math.random() * 5) })),
          topProducts: (typeof productsManager !== 'undefined'
            ? productsManager.products.slice(0, 5)
            : []
          ).map(p => ({ title: p.title, sold: Math.floor(Math.random() * 10 + 1) })),
        };
      }
      const chartFont = { family: '\'Inter\', sans-serif' };
      const gridColor = 'rgba(75,85,99,0.3)';
      const tickColor = '#9ca3af';

      new Chart(document.getElementById('analytics-revenue-chart'), {
        type: 'line',
        data: {
          labels: (d.revenue || []).map(r => r.date?.slice(5) || ''),
          datasets: [
            {
              label: 'Revenue (GHS)',
              data: (d.revenue || []).map(r => r.revenue),
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59,130,246,0.1)',
              fill: true,
              tension: 0.3,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { labels: { color: tickColor, font: chartFont } } },
          scales: {
            x: { ticks: { color: tickColor, font: chartFont }, grid: { color: gridColor } },
            y: { ticks: { color: tickColor, font: chartFont }, grid: { color: gridColor } },
          },
        },
      });

      const statusColors = {
        completed: '#22c55e',
        pending: '#f59e0b',
        placed: '#3b82f6',
        cancelled: '#ef4444',
        shipped: '#8b5cf6',
        delivered: '#06b6d4',
      };
      new Chart(document.getElementById('analytics-orders-chart'), {
        type: 'doughnut',
        data: {
          labels: (d.orderStatus || []).map(r => r.status),
          datasets: [
            {
              data: (d.orderStatus || []).map(r => r.count),
              backgroundColor: (d.orderStatus || []).map(r => statusColors[r.status] || '#6b7280'),
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { labels: { color: tickColor, font: chartFont } } },
        },
      });

      const catColors = [
        '#3b82f6',
        '#22c55e',
        '#f59e0b',
        '#ef4444',
        '#8b5cf6',
        '#06b6d4',
        '#ec4899',
      ];
      new Chart(document.getElementById('analytics-categories-chart'), {
        type: 'bar',
        data: {
          labels: (d.categories || []).map(r => r.category),
          datasets: [
            {
              label: 'Products',
              data: (d.categories || []).map(r => r.count),
              backgroundColor: (d.categories || []).map((_, i) => catColors[i % catColors.length]),
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: tickColor, font: chartFont }, grid: { color: gridColor } },
            y: { ticks: { color: tickColor, font: chartFont }, grid: { color: gridColor } },
          },
        },
      });

      new Chart(document.getElementById('analytics-users-chart'), {
        type: 'line',
        data: {
          labels: (d.users || []).map(r => r.date?.slice(5) || ''),
          datasets: [
            {
              label: 'New Users',
              data: (d.users || []).map(r => r.count),
              borderColor: '#22c55e',
              backgroundColor: 'rgba(34,197,94,0.1)',
              fill: true,
              tension: 0.3,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { labels: { color: tickColor, font: chartFont } } },
          scales: {
            x: { ticks: { color: tickColor, font: chartFont }, grid: { color: gridColor } },
            y: { ticks: { color: tickColor, font: chartFont }, grid: { color: gridColor } },
          },
        },
      });

      const topEl = document.getElementById('analytics-top-products');
      if (d.topProducts && d.topProducts.length > 0) {
        topEl.innerHTML =
          '<table class="admin-table"><thead><tr><th>Product</th><th>Units Sold</th></tr></thead><tbody>' +
          d.topProducts
            .map(p => `<tr><td>${p.title || 'ID: ' + p.productId}</td><td>${p.sold}</td></tr>`)
            .join('') +
          '</tbody></table>';
      } else {
        topEl.textContent = 'No sales data yet.';
      }
    } catch (err) {
      const topEl = document.getElementById('analytics-top-products');
      if (topEl) {
        topEl.textContent = 'Failed to load analytics: ' + err.message;
      }
    }
  }

  static renderFAQ () {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
      return;
    }

    const faqItems = [
      {
        q: 'What is JERTS CART?',
        a: 'JERTS CART is a student marketplace for buying and selling items within university communities in Ghana. Whether you\'re looking for textbooks, electronics, hostel essentials, or fashion items, JERTS CART connects you with fellow students.',
      },
      {
        q: 'How do I create an account?',
        a: 'Click the "Sign up" button in the navigation bar. You\'ll need to provide your name, email, phone number, and university. You can also verify your student status to gain a trusted badge on your profile.',
      },
      {
        q: 'How do I list an item for sale?',
        a: 'Once logged in, click "Sell" in the navigation bar. You\'ll be taken to your seller dashboard where you can add a new product with photos, description, price, and delivery options.',
      },
      {
        q: 'What payment methods are supported?',
        a: 'JERTS CART supports Mobile Money (MoMo), Telecel Cash, and Bank Transfer. Payment options are set by each seller.',
      },
      {
        q: 'How does delivery work?',
        a: 'Sellers can offer delivery through Bolt, Yango, or in-person pickup. Delivery fees depend on the method chosen. In-person pickup is always free — just arrange a meeting on campus.',
      },
      {
        q: 'How do I verify my student status?',
        a: 'Go to your Dashboard and click "Verify Student Status". You can verify via your university email address or by uploading your student ID card for manual review.',
      },
      {
        q: 'Is my payment secure?',
        a: 'JERTS CART uses secure payment processing. For Mobile Money and bank transfers, payments are processed through trusted providers. Always confirm delivery before releasing payment.',
      },
      {
        q: 'Can I return an item?',
        a: 'Returns depend on the seller\'s policy. We recommend discussing return terms with the seller before purchasing. If you have a dispute, you can report the transaction through your order page.',
      },
      {
        q: 'How do I contact a seller?',
        a: 'Use the in-app messaging feature. Go to any product page and click "Message Seller" to start a conversation. All communications happen within JERTS CART for your safety.',
      },
      {
        q: 'What if I encounter a scam?',
        a: 'Report the user immediately through their profile or product page. Our admin team reviews all reports. Verified students with good ratings are generally safer to trade with.',
      },
    ];

    mainContent.innerHTML = `
      <div class="faq-page" style="max-width: 800px; margin: 0 auto; padding: 3rem 1.5rem;">
        <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-primary, #111827);">Frequently Asked Questions</h1>
        <p style="color: var(--text-secondary, #6b7280); margin-bottom: 2.5rem; font-size: 1.05rem;">Everything you need to know about buying and selling on JERTS CART.</p>
        <div class="faq-list">
          ${faqItems
    .map(
      (item, i) => `
            <details class="faq-item" style="border: 1px solid var(--border-color, #e5e7eb); border-radius: 0.75rem; margin-bottom: 0.75rem; overflow: hidden; background: var(--bg-primary, #fff);${i === 0 ? ' open;' : ''}">
              <summary style="padding: 1.25rem 1.5rem; font-weight: 600; cursor: pointer; font-size: 1rem; color: var(--text-primary, #111827); list-style: none; display: flex; justify-content: space-between; align-items: center;">
                ${item.q}
                <svg style="width: 20px; height: 20px; flex-shrink: 0; margin-left: 1rem; transition: transform 0.2s;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
              </summary>
              <div style="padding: 0 1.5rem 1.25rem; color: var(--text-secondary, #6b7280); line-height: 1.6; font-size: 0.95rem;">
                ${item.a}
              </div>
            </details>
          `,
    )
    .join('')}
        </div>
        <div style="margin-top: 3rem; text-align: center; padding: 2rem; background: var(--bg-secondary, #f9fafb); border-radius: 0.75rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary, #111827);">Still have questions?</h2>
          <p style="color: var(--text-secondary, #6b7280); margin-bottom: 1.5rem;">Can't find what you're looking for? Reach out to our support team at <a href="mailto:unihubsupport@gmail.com" style="color: var(--primary, #0046be);">unihubsupport@gmail.com</a></p>
          <button class="btn btn-primary" onclick="Pages.navigate('/messages'); return false;">Contact Support</button>
        </div>
      </div>
      <style>
        details[open] > summary svg { transform: rotate(180deg); }
        summary::-webkit-details-marker { display: none; }
        .faq-item[open] { border-color: var(--primary, #0046be); }
      </style>
    `;

    window.scrollTo(0, 0);
  }

  /**
   * Render newsletter confirmation page (called when user clicks email link)
   * @param {Object} params - Route params (includes token)
   */
  static async renderNewsletterConfirm (params) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
      return;
    }

    const { token } = params;

    if (!token) {
      mainContent.innerHTML = `
        <div class="container" style="max-width: 500px; margin: 0 auto; padding: 3rem 1.5rem; text-align: center;">
          <div style="font-size: 4rem; margin-bottom: 1rem;">❌</div>
          <h1 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 1rem; color: var(--text-primary, #111827);">Invalid Link</h1>
          <p style="color: var(--text-secondary, #6b7280); margin-bottom: 2rem;">This confirmation link is invalid or has expired.</p>
          <button class="btn btn-primary" onclick="router.goToHash('/')">Go Home</button>
        </div>
      `;
      window.scrollTo(0, 0);
      return;
    }

    mainContent.innerHTML = `
      <div class="container" style="max-width: 500px; margin: 0 auto; padding: 3rem 1.5rem; text-align: center;">
        <div style="font-size: 4rem; margin-bottom: 1rem;">⏳</div>
        <h1 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 1rem; color: var(--text-primary, #111827);">Confirming your subscription...</h1>
        <p style="color: var(--text-secondary, #6b7280);">Please wait while we verify your email address.</p>
      </div>
    `;

    window.scrollTo(0, 0);

    try {
      const response = await api.get('/newsletter/confirm', { token });
      if (response.success) {
        router.goToHash('/newsletter/confirmed?status=success');
      } else {
        router.goToHash('/newsletter/confirmed?status=error&message=' + encodeURIComponent(response.error || 'Confirmation failed'));
      }
    } catch (error) {
      router.goToHash('/newsletter/confirmed?status=error&message=' + encodeURIComponent(error.message || 'Confirmation failed'));
    }
  }

  /**
   * Render newsletter confirmation result page
   * @param {Object} params - Route params (includes status, message)
   */
  static renderNewsletterConfirmed (params) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
      return;
    }

    const { status, message } = params;
    let icon, title, description, buttonText, buttonAction;

    if (status === 'success' || status === 'already_active') {
      icon = '🎉';
      title = status === 'already_active' ? 'Already Subscribed!' : 'Subscription Confirmed!';
      description = status === 'already_active'
        ? 'You\'re already on our newsletter list. Thanks for being part of Uni-Hub!'
        : 'Welcome to Uni-Hub! You\'ll now receive the best deals, selling tips, and campus marketplace updates. Check your email for a welcome code!';
      buttonText = 'Start Shopping';
      buttonAction = "router.goToHash('/browse')";
    } else {
      icon = '❌';
      title = 'Confirmation Failed';
      description = message || 'Something went wrong. Please try subscribing again or contact support.';
      buttonText = 'Try Again';
      buttonAction = "router.goToHash('/')";
    }

    mainContent.innerHTML = `
      <div class="container" style="max-width: 500px; margin: 0 auto; padding: 3rem 1.5rem; text-align: center;">
        <div style="font-size: 4rem; margin-bottom: 1rem;">${icon}</div>
        <h1 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 1rem; color: var(--text-primary, #111827);">${title}</h1>
        <p style="color: var(--text-secondary, #6b7280); margin-bottom: 2rem; line-height: 1.6;">${description}</p>
        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
          <button class="btn btn-primary" onclick="${buttonAction}; return false;">${buttonText}</button>
          <button class="btn btn-outline" onclick="router.goToHash('/')">Go Home</button>
        </div>
      </div>
    `;

    window.scrollTo(0, 0);
  }

  static renderTerms () {
    return typeof StaticPageMethods !== 'undefined'
      ? StaticPageMethods.renderTerms()
      : console.warn('StaticPageMethods not loaded');
  }

  static renderPrivacy () {
    return typeof StaticPageMethods !== 'undefined'
      ? StaticPageMethods.renderPrivacy()
      : console.warn('StaticPageMethods not loaded');
  }

  static renderAbout () {
    return typeof StaticPageMethods !== 'undefined'
      ? StaticPageMethods.renderAbout()
      : console.warn('StaticPageMethods not loaded');
  }

  static renderContact () {
    return typeof StaticPageMethods !== 'undefined'
      ? StaticPageMethods.renderContact()
      : console.warn('StaticPageMethods not loaded');
  }

  static _handleContactForm (event) {
    return typeof StaticPageMethods !== 'undefined'
      ? StaticPageMethods._handleContactForm(event)
      : console.warn('StaticPageMethods not loaded');
  }

  static renderTrackOrder () {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {return;}

    mainContent.innerHTML = `
      <div style="max-width:640px;margin:0 auto;padding:3rem 1.5rem;">
        <h1 style="font-size:2rem;font-weight:700;margin-bottom:0.5rem;color:var(--text-primary,#111827);">Track My Order</h1>
        <p style="color:var(--text-secondary,#6b7280);margin-bottom:2rem;font-size:1.05rem;">Enter your tracking number to check your order status.</p>
        <div style="display:flex;gap:0.75rem;margin-bottom:2rem;">
          <input id="track-input" type="text" placeholder="e.g. UHT-260513-A7K9" style="flex:1;padding:0.75rem 1rem;border:1px solid var(--border-color,#e5e7eb);border-radius:0.5rem;font-size:1rem;font-family:monospace;outline:none;" />
          <button onclick="Pages._doTrackOrder()" class="btn btn-primary" style="white-space:nowrap;">Track</button>
        </div>
        <div id="track-result"></div>
      </div>
    `;
    document.getElementById('track-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') {Pages._doTrackOrder();}
    });
    window.scrollTo(0, 0);
  }

  static async _doTrackOrder () {
    const input = document.getElementById('track-input');
    const resultDiv = document.getElementById('track-result');
    if (!input || !resultDiv) {return;}

    const trackingNumber = input.value.trim().toUpperCase();
    if (!trackingNumber) {
      resultDiv.innerHTML =
        '<p style="color:#ef4444;font-size:0.95rem;">Please enter a tracking number.</p>';
      return;
    }

    resultDiv.innerHTML =
      '<p style="color:var(--text-secondary,#6b7280);font-size:0.95rem;">Looking up your order…</p>';

    try {
      const res = await api.orders.track(trackingNumber);
      if (!res.success || !res.data) {
        resultDiv.innerHTML =
          '<p style="color:#ef4444;font-size:0.95rem;">No order found with that tracking number.</p>';
        return;
      }
      const order = res.data;
      const statusSteps = ['pending', 'confirmed', 'in-transit', 'delivered'];
      const currentIdx = statusSteps.indexOf(order.status);
      const isCancelled = order.status === 'cancelled';

      const stepHtml = isCancelled
        ? '<div style="text-align:center;padding:1.5rem;background:#fef2f2;border-radius:0.75rem;border:1px solid #fecaca;"><span style="font-size:1.5rem;">🚫</span><p style="font-weight:600;color:#991b1b;margin-top:0.5rem;">Order Cancelled</p></div>'
        : `<div style="display:flex;justify-content:space-between;position:relative;margin:1.5rem 0 2rem;">
            <div style="position:absolute;top:50%;left:0;right:0;height:4px;background:#e5e7eb;transform:translateY(-50%);z-index:0;border-radius:2px;">
              <div style="height:100%;width:${currentIdx >= 0 ? (currentIdx / (statusSteps.length - 1)) * 100 : 0}%;background:#0046be;border-radius:2px;transition:width 0.3s;"></div>
            </div>
            ${statusSteps
    .map(
      (step, i) => `
              <div style="display:flex;flex-direction:column;align-items:center;position:relative;z-index:1;flex:1;">
                <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;color:#fff;background:${i <= currentIdx ? '#0046be' : '#d1d5db'};border:3px solid ${i <= currentIdx ? '#0046be' : '#e5e7eb'};">${i <= currentIdx ? '✓' : i + 1}</div>
                <span style="margin-top:0.5rem;font-size:0.75rem;color:${i <= currentIdx ? '#111827' : '#9ca3af'};font-weight:${i <= currentIdx ? '600' : '400'};text-align:center;">${step.charAt(0).toUpperCase() + step.slice(1).replace('-', ' ')}</span>
              </div>
            `,
    )
    .join('')}
          </div>`;

      resultDiv.innerHTML = `
        <div style="background:var(--bg-primary,#fff);border:1px solid var(--border-color,#e5e7eb);border-radius:0.75rem;padding:1.5rem;margin-bottom:1.5rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
            <span style="font-weight:600;font-size:0.95rem;color:var(--text-secondary,#6b7280);">Order</span>
            <span style="font-family:monospace;font-weight:700;color:var(--text-primary,#111827);">${order.orderNumber || order.id}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
            <span style="font-weight:600;font-size:0.95rem;color:var(--text-secondary,#6b7280);">Tracking</span>
            <span style="font-family:monospace;font-weight:700;color:#0046be;">${order.trackingNumber}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:600;font-size:0.95rem;color:var(--text-secondary,#6b7280);">Placed</span>
            <span style="font-size:0.95rem;color:var(--text-primary,#111827);">${Formatter.formatDate(order.createdAt)}</span>
          </div>
        </div>
        ${stepHtml}
        ${
  order.items && order.items.length
    ? `
        <div style="background:var(--bg-primary,#fff);border:1px solid var(--border-color,#e5e7eb);border-radius:0.75rem;padding:1.5rem;">
          <h3 style="font-size:1rem;font-weight:600;margin-bottom:1rem;color:var(--text-primary,#111827);">Items</h3>
          ${order.items
    .map(
      item => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid #f3f4f6;">
              <span style="font-size:0.95rem;color:var(--text-primary,#111827);">${item.title || 'Item'}</span>
              <span style="font-size:0.95rem;font-weight:600;color:var(--text-primary,#111827);">×${item.quantity}</span>
            </div>
          `,
    )
    .join('')}
        </div>`
    : ''
}
      `;
    } catch (err) {
      resultDiv.innerHTML =
        '<p style="color:#ef4444;font-size:0.95rem;">Something went wrong. Please try again.</p>';
    }
  }
}

// Export for ES6 modules
export { Pages };

// Make globally available for module scripts
if (typeof window !== 'undefined') {
  window.Pages = Pages;
}
