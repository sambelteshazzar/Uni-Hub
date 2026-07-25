/* eslint-disable no-unused-vars */

class BrowsePage {
  constructor() {
    this.state = {
      categories: [],
      conditions: [],
      universities: [],
      selectedCategories: [],
      selectedConditions: [],
      selectedUniversities: [],
      priceRange: { min: 0, max: Infinity },
      sortBy: 'newest',
      searchQuery: '',
      currentPage: 1,
      pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
      viewMode: 'grid',
      mobileDrawerOpen: false,
      totalProducts: 0,
      selectedGender: null,
    };
    this._categories = [
      { id: 'appliances', name: 'Appliances', icon: 'settings' },
      { id: 'hostel-items', name: 'Hostel Items', icon: 'home' },
      { id: 'accessories', name: 'Accessories', icon: 'bag' },
      { id: 'textbooks', name: 'Textbooks', icon: 'books' },
      { id: 'electronics', name: 'Electronics', icon: 'laptop' },
      { id: 'fashion', name: 'Fashion', icon: 'shirt' },
      { id: 'thrifts', name: 'Thrifts', icon: 'gift' },
    ];
    this._conditions = [
      { id: 'new', name: 'New' },
      { id: 'like-new', name: 'Like New' },
      { id: 'excellent', name: 'Excellent' },
      { id: 'good', name: 'Good' },
      { id: 'fair', name: 'Fair' },
    ];
    this._sortOptions = [
      { value: 'newest', label: 'Newest First' },
      { value: 'price-low', label: 'Price: Low to High' },
      { value: 'price-high', label: 'Price: High to Low' },
      { value: 'popular', label: 'Most Popular' },
      { value: 'rating', label: 'Best Rated' },
    ];
    this._allProducts = [];
    this._filteredProducts = [];
  }

  async render(filters = {}) {
    Pages.showOriginalNavFooter();
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = this.renderSkeleton();

    await productsManager.init();

    // Reset the browse-page filter state derived from URL params each
    // time we render. Use object-literal key presence so "absent" (i.e.
    // `#/browse` with no query string) clears stale state from a prior
    // visit; an explicit `undefined`/`null`/`''` value also clears it.
    if ('category' in filters && filters.category) {
      productsManager.filter({ category: filters.category });
      this.state.selectedCategories = [filters.category];
    } else {
      productsManager.currentFilters.category = null;
      this.state.selectedCategories = [];
    }

    if ('search' in filters && filters.search) {
      productsManager.filter({ searchQuery: filters.search });
      this.state.searchQuery = filters.search;
    } else {
      productsManager.currentFilters.searchQuery = '';
      this.state.searchQuery = '';
    }

    if ('university' in filters && filters.university) {
      productsManager.filter({ university: filters.university });
      this.state.selectedUniversities = [filters.university];
    } else {
      const selectedUniversity = StorageManager.get(STORAGE_KEYS.SELECTED_UNIVERSITY);
      if (selectedUniversity) {
        productsManager.filter({ university: selectedUniversity });
        this.state.selectedUniversities = [selectedUniversity];
      } else {
        productsManager.currentFilters.university = null;
        this.state.selectedUniversities = [];
      }
    }

    // Gender sub-filter (only relevant under the Fashion category).
    if ('gender' in filters && filters.gender) {
      this.state.selectedGender = filters.gender;
    } else {
      this.state.selectedGender = null;
    }

    // Re-apply after explicit filter resets so filteredProducts stays in sync.
    productsManager.applyFilters();

    this._allProducts = productsManager.getAll();
    this._buildFilterCounts();
    this._syncFiltersFromManager();

    const paginatedData = await this._fetchPaginatedData(1);
    this.state.totalProducts = paginatedData.totalProducts || paginatedData.total || this._filteredProducts.length;

    mainContent.innerHTML = this.renderHTML(paginatedData);

    if (filters.search) {
      const searchInput = document.getElementById('browse-search-input');
      if (searchInput) searchInput.value = filters.search;
    }
  }

  _syncFiltersFromManager() {
    const cf = productsManager.currentFilters;
    if (cf.category && !this.state.selectedCategories.includes(cf.category)) {
      this.state.selectedCategories = [cf.category];
    }
    if (cf.condition) {
      this.state.selectedConditions = Array.isArray(cf.condition) ? [...cf.condition] : [cf.condition];
    }
    if (cf.priceRange) {
      this.state.priceRange = { ...cf.priceRange };
    }
    if (cf.sortBy) {
      this.state.sortBy = cf.sortBy;
    }
    if (cf.searchQuery) {
      this.state.searchQuery = cf.searchQuery;
    }
    this._filteredProducts = productsManager.filteredProducts || [...this._allProducts];
  }

  async _fetchPaginatedData(page) {
    if (productsManager._backendAvailable) {
      const serverData = await productsManager.fetchPage(page);
      if (serverData) {
        return serverData;
      }
    }
    return productsManager.getPaginated(page);
  }

  _buildFilterCounts() {
    this.state.categories = this._categories.map(cat => ({
      ...cat,
      count: this._allProducts.filter(p => p.category === cat.id).length,
    }));
    this.state.conditions = this._conditions.map(cond => ({
      ...cond,
      count: this._allProducts.filter(p => p.condition === cond.id).length,
    }));
    const uniCounts = {};
    this._allProducts.forEach(p => {
      if (p.university) uniCounts[p.university] = (uniCounts[p.university] || 0) + 1;
    });
    this.state.universities = Object.keys(uniCounts)
      .sort()
      .map(id => ({ id, name: id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' '), count: uniCounts[id] }));
  }

  renderSkeleton() {
    return `
    <div class="browse-page">
      <div class="browse-hero" style="min-height:180px;">
        <div class="browse-hero-content" style="max-width:var(--max-content-width);margin:0 auto;width:100%;padding:0 var(--space-xl);">
          <div class="browse-hero-text" style="opacity:0.6;">
            <div class="skeleton" style="height:12px;width:120px;background:rgba(255,255,255,0.15);border-radius:100px;margin-bottom:1rem;"></div>
            <div class="skeleton" style="height:36px;width:320px;background:rgba(255,255,255,0.15);border-radius:8px;margin-bottom:0.75rem;"></div>
            <div class="skeleton" style="height:18px;width:260px;background:rgba(255,255,255,0.1);border-radius:4px;margin-bottom:1.5rem;"></div>
            <div style="display:flex;gap:0.75rem;">
              <div class="skeleton" style="height:40px;width:140px;background:rgba(255,206,0,0.15);border-radius:10px;"></div>
              <div class="skeleton" style="height:40px;width:120px;background:rgba(255,255,255,0.1);border-radius:10px;"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="browse-categories"><div class="browse-categories-scroll">${Array(6).fill('').map(() => '<div class="browse-skeleton" style="height:2.25rem;width:90px;flex-shrink:0;"></div>').join('')}</div></div>
      <div class="browse-breadcrumb"><div class="browse-breadcrumb-inner"><div class="browse-skeleton" style="height:16px;width:180px;border-radius:4px;"></div></div></div>
      <div class="browse-page-inner">
        <aside class="browse-sidebar">
          ${Array(3).fill('').map(() => `<div class="browse-filter-group"><div class="browse-skeleton" style="height:14px;width:80px;margin-bottom:12px;"></div>${Array(4).fill('').map(() => '<div class="browse-skeleton" style="height:20px;width:90%;margin-bottom:6px;"></div>').join('')}</div>`).join('')}
        </aside>
        <div class="browse-main">
          <div class="browse-toolbar"><div class="browse-skeleton" style="height:40px;width:100%;max-width:420px;border-radius:6px;"></div></div>
          <div class="browse-product-grid browse-skeleton-grid">
            ${Array(6).fill('').map(() => `<div style="background:#fff;"><div class="browse-skeleton" style="aspect-ratio:1;border-radius:0;"></div><div style="padding:12px 16px 16px;"><div class="browse-skeleton" style="height:10px;width:40%;margin-bottom:6px;"></div><div class="browse-skeleton" style="height:14px;width:100%;margin-bottom:6px;"></div><div class="browse-skeleton" style="height:20px;width:50%;margin-bottom:8px;"></div><div class="browse-skeleton" style="height:34px;width:100%;"></div></div></div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
  }

  renderHTML(paginatedData) {
    const products = paginatedData.products || [];
    const totalProducts = this.state.totalProducts;
    const maxPrice = this._allProducts.length > 0 ? Math.max(...this._allProducts.map(p => p.price)) : 0;

    return `
    <div class="browse-page">
      ${this.renderHero()}
      ${this.renderCategoryBar()}
      ${this.renderBreadcrumb()}
      <div class="browse-page-inner">
        ${this.renderSidebar(maxPrice)}
        ${this.renderMobileDrawer(maxPrice)}
        <div class="browse-mobile-overlay" id="browse-mobile-overlay" onclick="BrowsePage.closeMobileDrawer()"></div>
        <main class="browse-main">
          ${this.renderToolbar(products.length, totalProducts)}
          ${this.renderActiveFilters()}
          ${this.renderProductGrid(products)}
          ${this.renderLoadMore(paginatedData)}
          ${this.renderPagination(paginatedData)}
        </main>
      </div>
    </div>`;
  }

  renderHero() {
    const totalProducts = this.state.totalProducts || this._allProducts.length;
    const featured = this._allProducts.slice(0, 6);
    return `
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
              <div class="browse-hero-stat-icon">${Icons.package || ''}</div>
              <span><span class="browse-hero-stat-strong">${totalProducts}+</span> Items listed</span>
            </div>
            <div class="browse-hero-stat">
              <div class="browse-hero-stat-icon">${Icons.graduation || ''}</div>
              <span><span class="browse-hero-stat-strong">Verified</span> Students only</span>
            </div>
            <div class="browse-hero-stat">
              <div class="browse-hero-stat-icon">${Icons.truck || ''}</div>
              <span><span class="browse-hero-stat-strong">Campus</span> Delivery available</span>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

renderBreadcrumb() {
const categoryLabel = this.state.selectedCategories.length === 1
? this.state.selectedCategories[0].charAt(0).toUpperCase() + this.state.selectedCategories[0].slice(1).replace(/-/g, ' ')
: '';
return `
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
${categoryLabel ? `<li class="browse-breadcrumb-item">
<span class="browse-breadcrumb-arrow"></span>
<span class="browse-breadcrumb-current">${categoryLabel}</span>
</li>` : `<li class="browse-breadcrumb-item">
<span class="browse-breadcrumb-arrow"></span>
<span class="browse-breadcrumb-current">All Products</span>
</li>`}
</ol>
</div>
</nav>`;
}

renderCategoryBar() {
const allActive = this.state.selectedCategories.length === 0;
return `
<div class="browse-categories">
<div class="browse-categories-scroll">
<button class="category-pill ${allActive ? 'active' : ''}" onclick="BrowsePage.clearCategoryFilters()">All<span class="pill-count">${this._allProducts.length}</span></button>
${this.state.categories.map(cat => `
<button class="category-pill ${this.state.selectedCategories.includes(cat.id) ? 'active' : ''}" onclick="BrowsePage.selectCategory('${cat.id}')">${cat.name}<span class="pill-count">${cat.count}</span></button>
`).join('')}
</div>
${this._renderGenderSubBar()}
</div>`;
}

// Sub-bar of male/female pills, only shown when Fashion is the active
// category (the only apparel category for now).
_renderGenderSubBar() {
  if (!this.state.selectedCategories.includes('fashion')) return '';
  const active = this.state.selectedGender || 'all';
  const maleCount = this._allProducts.filter(p => p.category === 'fashion' && (p.gender || 'unisex') === 'male').length;
  const femaleCount = this._allProducts.filter(p => p.category === 'fashion' && (p.gender || 'unisex') === 'female').length;
  const unisexCount = this._allProducts.filter(p => p.category === 'fashion' && (p.gender || 'unisex') === 'unisex').length;
  return `
  <div class="browse-subcategories" role="group" aria-label="Filter fashion by gender">
    <button class="subcategory-pill ${active === 'all' ? 'active' : ''}" onclick="BrowsePage.selectGender('all')">All<span class="pill-count">${this._allProducts.filter(p => p.category === 'fashion').length}</span></button>
    <button class="subcategory-pill ${active === 'male' ? 'active' : ''}" onclick="BrowsePage.selectGender('male')">Male<span class="pill-count">${maleCount}</span></button>
    <button class="subcategory-pill ${active === 'female' ? 'active' : ''}" onclick="BrowsePage.selectGender('female')">Female<span class="pill-count">${femaleCount}</span></button>
    <button class="subcategory-pill ${active === 'unisex' ? 'active' : ''}" onclick="BrowsePage.selectGender('unisex')">Unisex<span class="pill-count">${unisexCount}</span></button>
  </div>`;
}

// Category pill click: navigate to #/browse?category=X. The hashchange
// fires the router, which re-renders BrowsePage with the new filter.
// This makes the click feel like a "real" navigation (URL changes,
// back/forward work, shareable link) rather than an in-place state
// mutation. Clear filters by sending the user back to plain /browse.
selectCategory(catId) {
  if (this.state.selectedCategories.includes(catId)) {
    // Already selected -> deselect -> go back to /browse.
    Pages.navigate('#/browse');
  } else {
    Pages.navigate(`#/browse?category=${encodeURIComponent(catId)}`);
  }
}

selectGender(gender) {
  this.state.selectedGender = gender === 'all' ? null : gender;
  this.applyFilters();
}

clearCategoryFilters() {
  this.state.selectedCategories = [];
  this.state.selectedGender = null;
  Pages.navigate('#/browse');
}

renderSidebar(maxPrice) {
    const priceMin = this.state.priceRange.min > 0 ? this.state.priceRange.min : '';
    const priceMax = this.state.priceRange.max < Infinity ? this.state.priceRange.max : '';
    const sliderLeft = maxPrice > 0 ? (this.state.priceRange.min / maxPrice) * 100 : 0;
    const sliderRight = maxPrice > 0 ? (this.state.priceRange.max < Infinity ? (this.state.priceRange.max / maxPrice) * 100 : 100) : 100;

    return `
      <aside class="browse-sidebar">
        <div class="browse-filter-group">
          <div class="browse-filter-group-title">Category</div>
          ${this.state.categories.map(cat => `
            <div class="browse-filter-option">
              <input type="checkbox" id="browse-cat-${cat.id}" ${this.state.selectedCategories.includes(cat.id) ? 'checked' : ''} onchange="BrowsePage.toggleCategory('${cat.id}')">
              <label for="browse-cat-${cat.id}">${cat.name}</label>
              <span class="browse-filter-count">${cat.count}</span>
            </div>
          `).join('')}
        </div>

        <div class="browse-filter-group">
          <div class="browse-filter-group-title">Price Range</div>
          <div class="browse-price-inputs">
            <input type="number" class="browse-price-input" id="browse-price-min" placeholder="Min" value="${priceMin}" min="0">
            <span class="browse-price-separator">-</span>
            <input type="number" class="browse-price-input" id="browse-price-max" placeholder="Max" value="${priceMax}" min="0">
          </div>
          <div class="browse-price-slider-track">
            <div class="browse-price-slider-fill" style="left:${sliderLeft}%;width:${sliderRight - sliderLeft}%;"></div>
          </div>
          <button class="browse-price-apply-btn" onclick="BrowsePage.applyPriceFilter()">Apply</button>
        </div>

        <div class="browse-filter-group">
          <div class="browse-filter-group-title">
            Condition
            ${this.state.selectedConditions.length > 0 ? `<span class="browse-filter-group-count">${this.state.selectedConditions.length} selected</span>` : ''}
          </div>
          ${this.state.conditions.map(cond => `
            <div class="browse-filter-option">
              <input type="checkbox" id="browse-cond-${cond.id}" ${this.state.selectedConditions.includes(cond.id) ? 'checked' : ''} onchange="BrowsePage.toggleCondition('${cond.id}')">
              <label for="browse-cond-${cond.id}">${cond.name}</label>
              <span class="browse-filter-count">${cond.count}</span>
            </div>
          `).join('')}
        </div>

        ${this.state.universities.length > 0 ? `
        <div class="browse-filter-group">
          <div class="browse-filter-group-title">University</div>
          ${this.state.universities.slice(0, 8).map(uni => `
            <div class="browse-filter-option">
              <input type="checkbox" id="browse-uni-${uni.id}" ${this.state.selectedUniversities.includes(uni.id) ? 'checked' : ''} onchange="BrowsePage.toggleUniversity('${uni.id}')">
              <label for="browse-uni-${uni.id}">${uni.name}</label>
              <span class="browse-filter-count">${uni.count}</span>
            </div>
          `).join('')}
        </div>
        ` : ''}

        <button class="browse-clear-filters-btn" onclick="BrowsePage.clearFilters()">Clear All Filters</button>
      </aside>`;
  }

  renderMobileDrawer(maxPrice) {
    const priceMin = this.state.priceRange.min > 0 ? this.state.priceRange.min : '';
    const priceMax = this.state.priceRange.max < Infinity ? this.state.priceRange.max : '';

    return `
      <div class="browse-mobile-drawer" id="browse-mobile-drawer">
        <div class="browse-mobile-drawer-header">
          <span class="browse-mobile-drawer-title">Filters</span>
          <button class="browse-mobile-drawer-close" onclick="BrowsePage.closeMobileDrawer()">&times;</button>
        </div>
        ${this.renderSidebar(maxPrice)}
      </div>`;
  }

renderToolbar(showing, total) {
return `
<div class="browse-toolbar">
<button class="browse-mobile-filter-btn" onclick="BrowsePage.openMobileDrawer()">
<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="16" height="16"><path d="M3 4h18M6 12h12M9 20h6"/></svg>
Filters
</button>
<div class="browse-search">
<svg class="browse-search-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="18" height="18"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
<input type="text" class="browse-search-input" id="browse-search-input" placeholder="Search products..." value="${this.state.searchQuery}" onkeyup="BrowsePage.handleSearchKeyup(event)">
</div>
<span class="browse-results-count"><strong>${showing}</strong> of <strong>${total}</strong> results</span>
<div class="browse-toolbar-right">
<div class="browse-sort">
<span class="browse-sort-label">Sort by</span>
<select class="browse-sort-select" id="browse-sort-select" onchange="BrowsePage.sortBy(this.value)">
${this._sortOptions.map(opt => `<option value="${opt.value}" ${this.state.sortBy === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
</select>
</div>
<div class="browse-view-toggle">
<button class="browse-view-btn ${this.state.viewMode === 'grid' ? 'active' : ''}" onclick="BrowsePage.toggleView('grid')" title="Grid view">
<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="16" height="16"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
</button>
<button class="browse-view-btn ${this.state.viewMode === 'list' ? 'active' : ''}" onclick="BrowsePage.toggleView('list')" title="List view">
<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="16" height="16"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
</button>
</div>
</div>
</div>`;
  }

  renderActiveFilters() {
    const chips = [];

    this.state.selectedCategories.forEach(catId => {
      const cat = this.state.categories.find(c => c.id === catId);
      if (cat) chips.push({ label: cat.name, type: 'category', value: catId });
    });

    this.state.selectedConditions.forEach(condId => {
      const cond = this.state.conditions.find(c => c.id === condId);
      if (cond) chips.push({ label: cond.name, type: 'condition', value: condId });
    });

    this.state.selectedUniversities.forEach(uniId => {
      const uni = this.state.universities.find(u => u.id === uniId);
      if (uni) chips.push({ label: uni.name, type: 'university', value: uniId });
    });

    if (this.state.priceRange.min > 0 || this.state.priceRange.max < Infinity) {
      const minLabel = this.state.priceRange.min > 0 ? `GHS ${this.state.priceRange.min}` : 'GHS 0';
      const maxLabel = this.state.priceRange.max < Infinity ? `GHS ${this.state.priceRange.max}` : '';
      chips.push({ label: `${minLabel} - ${maxLabel || 'Any'}`, type: 'price', value: 'price' });
    }

    if (chips.length === 0) return '';

    return `
      <div class="browse-active-filters">
        ${chips.map(chip => `
          <span class="browse-filter-chip">
            ${chip.label}
            <button class="browse-filter-chip-remove" onclick="BrowsePage.removeFilter('${chip.type}', '${chip.value}')">&times;</button>
          </span>
        `).join('')}
        <button class="browse-filter-chip-clear" onclick="BrowsePage.clearFilters()">Clear All</button>
      </div>`;
  }

  renderProductGrid(products) {
    if (products.length === 0) {
      return `
        <div class="browse-empty">
          <div class="browse-empty-icon">${Icons.search || ''}</div>
          <h3>No products found</h3>
          <p>Try adjusting your filters or search for something else</p>
          <button class="browse-empty-btn" onclick="BrowsePage.clearFilters()">Clear Filters</button>
        </div>`;
    }

    return `
      <div class="browse-product-grid ${this.state.viewMode === 'list' ? 'list-view' : ''}" id="browse-product-grid">
        ${products.map(product => this.renderProductCard(product)).join('')}
      </div>`;
  }

  renderProductCard(product) {
    const isInWishlist = productsManager.isInWishlist?.(product.id) || false;
    const _bsn2 = product.seller?.fullName || product.sellerName || product.seller?.name || 'Seller';
    const initials = _bsn2
      .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const conditionLabel = Pages.formatConditionLabel(product.condition || 'good');
    const categoryLabel = product.category
      ? product.category.charAt(0).toUpperCase() + product.category.slice(1).replace(/-/g, ' ')
      : 'Item';
    const sellerRating = product.seller?.rating || product.sellerRating || null;

    return `
    <div class="browse-product-card" onclick="Pages.renderProductDetail('${product.id}')">
      <div class="browse-product-image-wrap">
        <img src="${product.images?.[0] || '/assets/images/products/no-image.svg'}" alt="${product.title}" loading="lazy" onerror="this.src='/assets/images/products/no-image.svg';this.onerror=null;">
        <div class="browse-product-badges">
          <span class="browse-product-badge ${product.condition || 'good'}">${conditionLabel}</span>
        </div>
        <button class="browse-product-wishlist-btn ${isInWishlist ? 'active' : ''}" onclick="event.stopPropagation(); Pages.toggleWishlist(event, '${product.id}')">
          ${isInWishlist ? (Icons.heart || '') : (Icons.heartOutline || '')}
        </button>
      </div>
      <div class="browse-product-info">
        <div class="browse-product-category">${categoryLabel}</div>
        <h3 class="browse-product-title">${product.title}</h3>
        <div class="browse-product-price">GH₵ ${product.price?.toLocaleString() || '0'}</div>
        <div class="browse-product-seller">
          <div class="browse-product-seller-avatar">${initials}</div>
          <span class="browse-product-seller-name">${product.seller?.fullName || product.sellerName || product.seller?.name || 'Unknown'}</span>
          ${sellerRating ? `<span class="browse-product-seller-rating">${Icons.star || ''} ${sellerRating}</span>` : ''}
        </div>
        <button class="browse-product-add-cart-btn" onclick="event.stopPropagation(); cartManager?.add(${JSON.stringify(product).replace(/"/g, '&quot;')}); Pages.updateCartBadge();">Add to Cart</button>
      </div>
    </div>`;
  }

  renderLoadMore(paginatedData) {
    if (!paginatedData || paginatedData.totalPages <= 1) return '';
    if (paginatedData.currentPage >= paginatedData.totalPages) return '';
    return `
      <div class="browse-load-more">
        <button class="browse-load-more-btn" onclick="BrowsePage.loadMore()">Load More Products</button>
      </div>`;
  }

  renderPagination(paginatedData) {
    if (!paginatedData || paginatedData.totalPages <= 1) return '';
    const pages = [];
    const current = paginatedData.currentPage;
    const total = paginatedData.totalPages;

    pages.push(1);
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    if (total > 1) pages.push(total);

    return `
      <div class="browse-pagination">
        <button class="browse-page-btn" onclick="BrowsePage.goToPage(${current - 1})" ${current <= 1 ? 'disabled style="opacity:0.4;pointer-events:none;"' : ''}>&laquo;</button>
        ${pages.map(p => p === '...'
          ? '<span style="padding:0 4px;color:var(--neutral-400);">...</span>'
          : `<button class="browse-page-btn ${p === current ? 'active' : ''}" onclick="BrowsePage.goToPage(${p})">${p}</button>`
        ).join('')}
        <button class="browse-page-btn" onclick="BrowsePage.goToPage(${current + 1})" ${current >= total ? 'disabled style="opacity:0.4;pointer-events:none;"' : ''}>&raquo;</button>
      </div>`;
  }

  toggleCategory(catId) {
    const idx = this.state.selectedCategories.indexOf(catId);
    if (idx > -1) {
      this.state.selectedCategories.splice(idx, 1);
    } else {
      this.state.selectedCategories.push(catId);
    }
    this.applyFilters();
  }

  toggleCondition(condId) {
    const idx = this.state.selectedConditions.indexOf(condId);
    if (idx > -1) {
      this.state.selectedConditions.splice(idx, 1);
    } else {
      this.state.selectedConditions.push(condId);
    }
    this.applyFilters();
  }

  toggleUniversity(uniId) {
    const idx = this.state.selectedUniversities.indexOf(uniId);
    if (idx > -1) {
      this.state.selectedUniversities.splice(idx, 1);
    } else {
      this.state.selectedUniversities.push(uniId);
    }
    this.applyFilters();
  }

  applyPriceFilter() {
    const minEl = document.getElementById('browse-price-min') || document.querySelector('#browse-mobile-drawer #browse-price-min');
    const maxEl = document.getElementById('browse-price-max') || document.querySelector('#browse-mobile-drawer #browse-price-max');
    const min = minEl?.value ? parseInt(minEl.value) : 0;
    const max = maxEl?.value ? parseInt(maxEl.value) : Infinity;
    this.state.priceRange = { min, max };
    this.applyFilters();
  }

  async applyFilters() {
    if (this.state.selectedCategories.length > 0) {
      productsManager.filter({ category: this.state.selectedCategories[0] });
    } else {
      productsManager.currentFilters.category = null;
      productsManager.applyFilters();
    }

    productsManager.filter({
      condition: this.state.selectedConditions.length > 0 ? [...this.state.selectedConditions] : null,
      priceRange: { ...this.state.priceRange },
      sortBy: this.state.sortBy,
      searchQuery: this.state.searchQuery || '',
      gender: this.state.selectedGender || null,
    });

    if (this.state.selectedUniversities.length > 0) {
      productsManager.filter({ university: this.state.selectedUniversities[0] });
    } else {
      productsManager.currentFilters.university = null;
      productsManager.applyFilters();
    }

    this._filteredProducts = productsManager.filteredProducts || [];
    this.state.totalProducts = this._filteredProducts.length;

    const paginatedData = await this._fetchPaginatedData(1);
    this.state.totalProducts = paginatedData.totalProducts || this.state.totalProducts;
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = this.renderHTML(paginatedData);
    }
  }

  async clearFilters() {
    this.state.selectedCategories = [];
    this.state.selectedConditions = [];
    this.state.selectedUniversities = [];
    this.state.priceRange = { min: 0, max: Infinity };
    this.state.sortBy = 'newest';
    this.state.searchQuery = '';
    this.state.currentPage = 1;
    this.state.selectedGender = null;
    productsManager.resetFilters();
    this._filteredProducts = productsManager.filteredProducts || [...this._allProducts];
    this.state.totalProducts = this._filteredProducts.length;
    const paginatedData = await this._fetchPaginatedData(1);
    this.state.totalProducts = paginatedData.totalProducts || this.state.totalProducts;
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = this.renderHTML(paginatedData);
    }
  }

  async sortBy(field) {
    this.state.sortBy = field;
    productsManager.filter({ sortBy: field });
    this._filteredProducts = productsManager.filteredProducts || [];
    this.state.totalProducts = this._filteredProducts.length;
    const paginatedData = await this._fetchPaginatedData(1);
    this.state.totalProducts = paginatedData.totalProducts || this.state.totalProducts;
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = this.renderHTML(paginatedData);
    }
  }

  toggleView(mode) {
    this.state.viewMode = mode;
    const grid = document.getElementById('browse-product-grid');
    if (grid) {
      grid.classList.toggle('list-view', mode === 'list');
    }
    document.querySelectorAll('.browse-view-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.browse-view-btn[onclick="BrowsePage.toggleView('${mode}')"]`);
    if (activeBtn) activeBtn.classList.add('active');
  }

  async loadMore() {
    this.state.currentPage += 1;
    const paginatedData = await this._fetchPaginatedData(this.state.currentPage);
    const grid = document.getElementById('browse-product-grid');
    if (grid && paginatedData.products.length > 0) {
      const newCards = paginatedData.products.map(p => this.renderProductCard(p)).join('');
      grid.insertAdjacentHTML('beforeend', newCards);
      const loadMoreSection = document.querySelector('.browse-load-more');
      if (paginatedData.currentPage >= paginatedData.totalPages && loadMoreSection) {
        loadMoreSection.remove();
      }
      const paginationSection = document.querySelector('.browse-pagination');
      if (paginationSection) {
        paginationSection.outerHTML = this.renderPagination(paginatedData);
      }
    }
  }

  async goToPage(page) {
    const paginatedData = await this._fetchPaginatedData(page);
    if (paginatedData.products.length === 0 && page > 1) return;
    this.state.currentPage = page;
    this.state.totalProducts = paginatedData.totalProducts || this.state.totalProducts;
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = this.renderHTML(paginatedData);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  handleSearchKeyup(event) {
    if (event.key === 'Enter') {
      const query = event.target.value.trim();
      this.searchProducts(query);
    }
  }

  async searchProducts(query) {
    this.state.searchQuery = query;
    productsManager.filter({ searchQuery: query });
    this._filteredProducts = productsManager.filteredProducts || [];
    this.state.totalProducts = this._filteredProducts.length;
    const paginatedData = await this._fetchPaginatedData(1);
    this.state.totalProducts = paginatedData.totalProducts || this.state.totalProducts;
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = this.renderHTML(paginatedData);
    }
  }

  removeFilter(type, value) {
    if (type === 'category') {
      const idx = this.state.selectedCategories.indexOf(value);
      if (idx > -1) this.state.selectedCategories.splice(idx, 1);
    } else if (type === 'condition') {
      const idx = this.state.selectedConditions.indexOf(value);
      if (idx > -1) this.state.selectedConditions.splice(idx, 1);
    } else if (type === 'university') {
      const idx = this.state.selectedUniversities.indexOf(value);
      if (idx > -1) this.state.selectedUniversities.splice(idx, 1);
    } else if (type === 'price') {
      this.state.priceRange = { min: 0, max: Infinity };
    }
    this.applyFilters();
  }

  openMobileDrawer() {
    this.state.mobileDrawerOpen = true;
    const drawer = document.getElementById('browse-mobile-drawer');
    const overlay = document.getElementById('browse-mobile-overlay');
    if (drawer) {
      drawer.style.display = 'block';
      requestAnimationFrame(() => drawer.classList.add('open'));
    }
    if (overlay) {
      overlay.style.display = 'block';
      requestAnimationFrame(() => overlay.classList.add('open'));
    }
    document.body.style.overflow = 'hidden';
  }

  closeMobileDrawer() {
    this.state.mobileDrawerOpen = false;
    const drawer = document.getElementById('browse-mobile-drawer');
    const overlay = document.getElementById('browse-mobile-overlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (drawer) drawer.style.display = '';
      if (overlay) overlay.style.display = '';
    }, 250);
  }
}

const browsePage = new BrowsePage();

const BrowsePageMethods = {
renderBrowse(filters) { return browsePage.render(filters); },
filterByCategory(catId) { return browsePage.selectCategory(catId); },
selectCategory(catId) { return browsePage.selectCategory(catId); },
selectGender(gender) { return browsePage.selectGender(gender); },
applyBrowseFilters() { return browsePage.applyFilters(); },
applyPriceFilter() { return browsePage.applyPriceFilter(); },
clearCategoryFilters() { return browsePage.clearCategoryFilters(); },
resetConditionFilter() { browsePage.state.selectedConditions = []; return browsePage.applyFilters(); },
resetPriceFilter() { browsePage.state.priceRange = { min: 0, max: Infinity }; return browsePage.applyFilters(); },
toggleCategory(catId) { return browsePage.selectCategory(catId); },
toggleMobileFilters() { return browsePage.state.mobileDrawerOpen ? browsePage.closeMobileDrawer() : browsePage.openMobileDrawer(); },
setRatingFilter(rating) { productsManager.filter({ minRating: rating }); return browsePage.render(); },
renderProductCardModern(product) { return browsePage.renderProductCard(product); },
renderBBProductCard(product) { return browsePage.renderProductCard(product); },
renderProductCard(product) { return browsePage.renderProductCard(product); },
renderProductDetail(productId) { return Pages.renderProductDetail(productId); },
renderBrowseProducts() { return browsePage.applyFilters(); },
renderRecentlyViewedSection() { return ''; },
};

window.BrowsePageMethods = BrowsePageMethods;
window.BrowsePage = browsePage;
