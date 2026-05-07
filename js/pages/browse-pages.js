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

    if (filters.category) {
      productsManager.filter({ category: filters.category });
      this.state.selectedCategories = [filters.category];
    }
    if (filters.search) {
      productsManager.filter({ searchQuery: filters.search });
      this.state.searchQuery = filters.search;
    }
    if (filters.university) {
      productsManager.filter({ university: filters.university });
      this.state.selectedUniversities = [filters.university];
    }

    const selectedUniversity = filters.university || StorageManager.get(STORAGE_KEYS.SELECTED_UNIVERSITY);
    if (selectedUniversity && !filters.university) {
      productsManager.filter({ university: selectedUniversity });
      this.state.selectedUniversities = [selectedUniversity];
    }

    this._allProducts = productsManager.getAll();
    this._buildFilterCounts();
    this._syncFiltersFromManager();

    const paginatedData = productsManager.getPaginated(1);
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
        <div class="browse-breadcrumb"><div class="browse-breadcrumb-inner"><div class="browse-skeleton" style="height:14px;width:200px;"></div></div></div>
        <div class="browse-page-inner">
          <aside class="browse-sidebar">
            ${Array(4).fill('').map(() => `<div class="browse-filter-group"><div class="browse-skeleton" style="height:16px;width:80px;margin-bottom:12px;"></div>${Array(4).fill('').map(() => '<div class="browse-skeleton" style="height:24px;width:90%;margin-bottom:8px;"></div>').join('')}</div>`).join('')}
          </aside>
          <div class="browse-main">
            <div class="browse-toolbar"><div class="browse-skeleton" style="height:42px;width:100%;max-width:400px;"></div></div>
            <div class="browse-product-grid">
              ${Array(6).fill('').map(() => `<div class="browse-product-card"><div class="browse-product-image-wrap"><div class="browse-skeleton" style="width:100%;height:100%;aspect-ratio:1;"></div></div><div class="browse-product-info"><div class="browse-skeleton" style="height:12px;width:40%;margin-bottom:8px;"></div><div class="browse-skeleton" style="height:16px;width:100%;margin-bottom:8px;"></div><div class="browse-skeleton" style="height:20px;width:60%;"></div></div></div>`).join('')}
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

  renderBreadcrumb() {
    const categoryLabel = this.state.selectedCategories.length === 1
      ? this.state.selectedCategories[0].charAt(0).toUpperCase() + this.state.selectedCategories[0].slice(1).replace(/-/g, ' ')
      : '';
    return `
      <nav class="browse-breadcrumb">
        <div class="browse-breadcrumb-inner">
          <a href="#/" class="browse-breadcrumb-link">Home</a>
          <span class="browse-breadcrumb-sep">/</span>
          <a href="#/browse" class="browse-breadcrumb-link">Browse</a>
          ${categoryLabel ? `<span class="browse-breadcrumb-sep">/</span><span class="browse-breadcrumb-current">${categoryLabel}</span>` : '<span class="browse-breadcrumb-current">All Products</span>'}
        </div>
      </nav>`;
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
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 4h18M6 12h12M9 20h6"/></svg>
          Filters
        </button>
        <div class="browse-search">
          <svg class="browse-search-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" class="browse-search-input" id="browse-search-input" placeholder="Search products..." value="${this.state.searchQuery}" onkeyup="BrowsePage.handleSearchKeyup(event)">
        </div>
        <span class="browse-results-count">Showing <strong>${showing}</strong> of <strong>${total}</strong> products</span>
        <div class="browse-toolbar-right">
          <div class="browse-sort">
            <span class="browse-sort-label">Sort:</span>
            <select class="browse-sort-select" id="browse-sort-select" onchange="BrowsePage.sortBy(this.value)">
              ${this._sortOptions.map(opt => `<option value="${opt.value}" ${this.state.sortBy === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
            </select>
          </div>
          <div class="browse-view-toggle">
            <button class="browse-view-btn ${this.state.viewMode === 'grid' ? 'active' : ''}" onclick="BrowsePage.toggleView('grid')" title="Grid view">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            </button>
            <button class="browse-view-btn ${this.state.viewMode === 'list' ? 'active' : ''}" onclick="BrowsePage.toggleView('list')" title="List view">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
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
    const initials = product.seller?.name
      ? product.seller.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : 'UN';
    const conditionLabel = Pages.formatConditionLabel(product.condition || 'good');
    const categoryLabel = product.category
      ? product.category.charAt(0).toUpperCase() + product.category.slice(1).replace(/-/g, ' ')
      : 'Item';

    return `
      <div class="browse-product-card" onclick="Pages.renderProductDetail('${product.id}')">
        <div class="browse-product-image-wrap">
          <img src="${product.images?.[0] || '/assets/images/products/no-image.svg'}" alt="${product.title}" loading="lazy">
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
          <div class="browse-product-price">GHS ${product.price?.toLocaleString() || '0'}</div>
          <div class="browse-product-seller">
            <div class="browse-product-seller-avatar">${initials}</div>
            <span class="browse-product-seller-name">${product.seller?.name || 'Unknown'}</span>
            ${product.seller?.rating ? `<span style="font-size:var(--text-xs);color:var(--secondary);margin-left:auto;">${Icons.star || ''} ${product.seller.rating}</span>` : ''}
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

  applyFilters() {
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
    });

    if (this.state.selectedUniversities.length > 0) {
      productsManager.filter({ university: this.state.selectedUniversities[0] });
    } else {
      productsManager.currentFilters.university = null;
      productsManager.applyFilters();
    }

    this._filteredProducts = productsManager.filteredProducts || [];
    this.state.totalProducts = this._filteredProducts.length;

    const paginatedData = productsManager.getPaginated(1);
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = this.renderHTML(paginatedData);
    }
  }

  clearFilters() {
    this.state.selectedCategories = [];
    this.state.selectedConditions = [];
    this.state.selectedUniversities = [];
    this.state.priceRange = { min: 0, max: Infinity };
    this.state.sortBy = 'newest';
    this.state.searchQuery = '';
    this.state.currentPage = 1;
    productsManager.resetFilters();
    this._filteredProducts = productsManager.filteredProducts || [...this._allProducts];
    this.state.totalProducts = this._filteredProducts.length;
    const paginatedData = productsManager.getPaginated(1);
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = this.renderHTML(paginatedData);
    }
  }

  sortBy(field) {
    this.state.sortBy = field;
    productsManager.filter({ sortBy: field });
    this._filteredProducts = productsManager.filteredProducts || [];
    this.state.totalProducts = this._filteredProducts.length;
    const paginatedData = productsManager.getPaginated(1);
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

  loadMore() {
    this.state.currentPage += 1;
    const paginatedData = productsManager.getPaginated(this.state.currentPage);
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

  goToPage(page) {
    const paginatedData = productsManager.getPaginated(page);
    if (paginatedData.products.length === 0) return;
    this.state.currentPage = page;
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

  searchProducts(query) {
    this.state.searchQuery = query;
    productsManager.filter({ searchQuery: query });
    this._filteredProducts = productsManager.filteredProducts || [];
    this.state.totalProducts = this._filteredProducts.length;
    const paginatedData = productsManager.getPaginated(1);
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
  filterByCategory(catId) { return browsePage.toggleCategory(catId); },
  applyBrowseFilters() { return browsePage.applyFilters(); },
  applyPriceFilter() { return browsePage.applyPriceFilter(); },
  resetConditionFilter() { browsePage.state.selectedConditions = []; return browsePage.applyFilters(); },
  resetPriceFilter() { browsePage.state.priceRange = { min: 0, max: Infinity }; return browsePage.applyFilters(); },
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
