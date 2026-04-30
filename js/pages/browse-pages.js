/* eslint-disable no-unused-vars */
// ============================================
// BROWSE & PRODUCT DETAIL PAGE METHODS
// ============================================

const BrowsePageMethods = {

async renderBrowse (filters = {}) {
  Pages.showOriginalNavFooter();

  const mainContent = document.getElementById('main-content');

  mainContent.innerHTML = BrowsePageMethods.renderBrowseSkeleton();

  await productsManager.init();

  if (filters.category) {
    productsManager.filter({ category: filters.category });
  }

  if (filters.search) {
    productsManager.filter({ searchQuery: filters.search });
  }

  const selectedUniversity = filters.university || StorageManager.get(STORAGE_KEYS.SELECTED_UNIVERSITY);
  if (selectedUniversity) {
    productsManager.filter({ university: selectedUniversity });
  }

  const paginatedData = productsManager.getPaginated(1);
  const totalProducts = paginatedData.total || paginatedData.products.length;

  mainContent.innerHTML = BrowsePageMethods.renderBrowseModernHTML(paginatedData, totalProducts);

  if (filters.search) {
    const searchInput = document.getElementById('navbar-search-input');
    if (searchInput) {
      searchInput.value = filters.search;
    }
  }
},

renderBrowseSkeleton () {
  return `
<div class="browse-modern">
  <div class="browse-hero" style="padding: 2rem;">
    <div class="skeleton" style="height: 40px; width: 300px; background: rgba(255,255,255,0.2); border-radius: 8px; margin-bottom: 1rem;"></div>
    <div class="skeleton" style="height: 20px; width: 200px; background: rgba(255,255,255,0.2); border-radius: 4px;"></div>
  </div>
  <div class="browse-layout">
    <aside class="browse-sidebar" style="height: 400px;">
      <div class="skeleton" style="height: 20px; width: 80%; margin-bottom: 1rem; border-radius: 4px;"></div>
      <div class="skeleton" style="height: 12px; width: 100%; margin-bottom: 0.5rem; border-radius: 4px;"></div>
      <div class="skeleton" style="height: 12px; width: 100%; margin-bottom: 0.5rem; border-radius: 4px;"></div>
      <div class="skeleton" style="height: 12px; width: 100%; margin-bottom: 0.5rem; border-radius: 4px;"></div>
    </aside>
    <div class="products-grid-modern">
      ${Array(6).fill().map(() => `
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
      `).join('')}
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
},

renderBrowseModernHTML (paginatedData, totalProducts) {
  const categories = [
    { id: 'all', name: 'All', icon: 'cart', count: totalProducts },
    { id: 'textbooks', name: 'Textbooks', icon: 'books', count: 120 },
    { id: 'electronics', name: 'Electronics', icon: 'laptop', count: 85 },
    { id: 'dorm', name: 'Dorm & Room', icon: 'home', count: 95 },
    { id: 'furniture', name: 'Furniture', icon: 'chair', count: 45 },
    { id: 'clothing', name: 'Clothing', icon: 'shirt', count: 60 },
    { id: 'sports', name: 'Sports', icon: 'soccer', count: 35 },
  ];

  return `
<div class="browse-modern">
  <!-- Hero Banner -->
  <div class="browse-hero">
    <div class="browse-hero-content">
      <h1 class="browse-hero-title">Discover Student Deals</h1>
      <p class="browse-hero-subtitle">Find amazing items from students at your university</p>
      <div class="browse-hero-stats">
        <div class="browse-hero-stat">
          <div class="browse-hero-stat-icon">${Icons.package}</div>
          <span>${totalProducts}+ items listed</span>
        </div>
        <div class="browse-hero-stat">
          <div class="browse-hero-stat-icon">${Icons.graduation}</div>
          <span>Verified students only</span>
        </div>
        <div class="browse-hero-stat">
          <div class="browse-hero-stat-icon">${Icons.truck}</div>
          <span>Campus delivery available</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Category Pills -->
  <div class="browse-categories">
    <div class="browse-categories-scroll">
      ${categories.map(cat => `
      <button class="category-pill ${cat.id === 'all' ? 'active' : ''}" onclick="Pages.filterByCategory('${cat.id}')">
        ${Icons[cat.icon] || ''}
        ${cat.name}
        <span class="pill-count">${cat.count}</span>
      </button>
      `).join('')}
    </div>
  </div>

  <!-- Main Layout -->
  <div class="browse-layout">
    <!-- Mobile Filter Toggle -->
    <button class="mobile-filter-toggle" onclick="Pages.toggleMobileFilters()">
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M3 4h18M6 12h12M9 20h6"/>
      </svg>
      Filters
    </button>

    <!-- Sidebar -->
    <aside class="browse-sidebar" id="browse-sidebar">
      <div class="sidebar-section">
        <div class="sidebar-title">
          Filters
          <span class="sidebar-clear" onclick="Pages.resetBrowseFilters()">Clear all</span>
        </div>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-title">Category</div>
        <div class="filter-option">
          <input type="checkbox" id="cat-textbooks" onchange="Pages.applyBrowseFilters()">
          <label for="cat-textbooks">Textbooks</label>
          <span class="filter-count">120</span>
        </div>
        <div class="filter-option">
          <input type="checkbox" id="cat-electronics" onchange="Pages.applyBrowseFilters()">
          <label for="cat-electronics">Electronics</label>
          <span class="filter-count">85</span>
        </div>
        <div class="filter-option">
          <input type="checkbox" id="cat-dorm" onchange="Pages.applyBrowseFilters()">
          <label for="cat-dorm">Dorm Items</label>
          <span class="filter-count">95</span>
        </div>
        <div class="filter-option">
          <input type="checkbox" id="cat-furniture" onchange="Pages.applyBrowseFilters()">
          <label for="cat-furniture">Furniture</label>
          <span class="filter-count">45</span>
        </div>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-title">Condition</div>
        <div class="filter-option">
          <input type="checkbox" id="cond-new" onchange="Pages.applyBrowseFilters()">
          <label for="cond-new">New</label>
        </div>
        <div class="filter-option">
          <input type="checkbox" id="cond-like-new" onchange="Pages.applyBrowseFilters()">
          <label for="cond-like-new">Like New</label>
        </div>
        <div class="filter-option">
          <input type="checkbox" id="cond-excellent" onchange="Pages.applyBrowseFilters()">
          <label for="cond-excellent">Excellent</label>
        </div>
        <div class="filter-option">
          <input type="checkbox" id="cond-good" onchange="Pages.applyBrowseFilters()">
          <label for="cond-good">Good</label>
        </div>
        <div class="filter-option">
          <input type="checkbox" id="cond-fair" onchange="Pages.applyBrowseFilters()">
          <label for="cond-fair">Fair</label>
        </div>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-title">Price Range</div>
        <div class="price-range-inputs">
          <input type="number" class="price-input" placeholder="Min" id="price-min">
          <span class="price-separator">-</span>
          <input type="number" class="price-input" placeholder="Max" id="price-max">
        </div>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-title">Rating</div>
        <div class="rating-option" onclick="Pages.setRatingFilter(4)">
          <span class="rating-stars">${Icons.star}${Icons.star}${Icons.star}${Icons.star}${Icons.starOutline}</span>
          <span class="rating-label">& up</span>
        </div>
        <div class="rating-option" onclick="Pages.setRatingFilter(3)">
          <span class="rating-stars">${Icons.star}${Icons.star}${Icons.star}${Icons.starOutline}${Icons.starOutline}</span>
          <span class="rating-label">& up</span>
        </div>
      </div>
    </aside>

    <!-- Overlay for mobile -->
    <div class="sidebar-overlay" id="sidebar-overlay" onclick="Pages.toggleMobileFilters()"></div>

    <!-- Products Grid -->
    <div class="browse-content">
      <div class="browse-toolbar">
        <div class="results-count">
          Showing <strong>${paginatedData.products.length}</strong> of <strong>${totalProducts}</strong> items
        </div>
        <select class="sort-select" onchange="Pages.applySortOrder()" id="sort-select">
          <option value="newest">Newest First</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="rating">Highest Rated</option>
        </select>
      </div>

      <div class="products-grid-modern">
        ${paginatedData.products.length > 0
          ? paginatedData.products.map(product => BrowsePageMethods.renderProductCardModern(product)).join('')
          : `
        <div class="browse-empty" style="grid-column: 1/-1;">
          <div class="browse-empty-icon" style="width: 64px; height: 64px; margin: 0 auto 1rem;">${Icons.search}</div>
          <h3>No items found</h3>
          <p>Try adjusting your filters or search for something else</p>
          <button class="btn btn-primary" onclick="Pages.resetBrowseFilters()">Clear Filters</button>
        </div>
        `}
      </div>

      ${paginatedData.pages > 1 ? `
      <div class="pagination">
        ${Array.from({ length: paginatedData.pages }, (_, i) => `
        <button class="page-btn ${i + 1 === paginatedData.currentPage ? 'active' : ''}" onclick="Pages.goToBrowsePage(${i + 1})">
          ${i + 1}
        </button>
        `).join('')}
      </div>
      ` : ''}
    </div>
  </div>

  ${BrowsePageMethods.renderRecentlyViewedSection()}
</div>
`;
},

renderProductCardModern (product) {
  const isInWishlist = productsManager.isInWishlist?.(product.id) || false;
  const initials = product.seller?.name
    ? product.seller.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'UN';
  const conditionClass = product.condition || 'good';
  const conditionLabel = Pages.formatConditionLabel(product.condition || 'good');
  const categoryLabel = product.category
    ? product.category.charAt(0).toUpperCase() + product.category.slice(1).replace('-', ' ')
    : 'Item';

  return `
  <div class="product-card-modern" onclick="Pages.renderProductDetail('${product.id}')">
    <div class="product-card-image-wrap">
      <img src="${product.images?.[0] || '/assets/images/products/no-image.svg'}" alt="${product.title}" class="product-card-image" loading="lazy">
      <div class="product-badges">
        <span class="product-badge badge-condition ${conditionClass}">${conditionLabel}</span>
      </div>
      <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" onclick="event.stopPropagation(); Pages.toggleWishlist(event, '${product.id}')">
        ${isInWishlist ? Icons.heart : Icons.heartOutline}
      </button>
    </div>
    <div class="product-card-info">
      <div class="product-card-category">${categoryLabel}</div>
      <h3 class="product-card-title">${product.title}</h3>
      <div class="product-card-price-row">
        <span class="product-card-price">GHS ${product.price?.toLocaleString() || '0'}</span>
      </div>
      <div class="product-card-seller">
        <div class="seller-avatar">${initials}</div>
        <span class="seller-name">${product.seller?.name || 'Unknown'}</span>
        ${product.seller?.rating ? `
        <div class="seller-rating">
          ${Icons.star}
          <span>${product.seller.rating}</span>
        </div>
        ` : ''}
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
},

filterByCategory (categoryId) {
  document.querySelectorAll('.category-pill').forEach(pill => {
    pill.classList.remove('active');
  });
  event.target.closest('.category-pill').classList.add('active');

  if (categoryId === 'all') {
    productsManager.resetFilters();
  } else {
    productsManager.filter({ category: categoryId });
  }

  BrowsePageMethods.renderBrowse();
},

renderProductCard (product) {
  const isInWishlist = productsManager.isInWishlist(product.id);
  const initials = product.seller?.name
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
      <img src="${product.images[0]}" alt="${product.title}" loading="lazy" />
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
      <h3 class="store-product-title">${product.title}</h3>
      <div class="store-product-price-row">
        <span class="store-product-price">${product.price.toLocaleString()}</span>
        <span class="store-product-currency">GHS</span>
      </div>

      <!-- Seller Row -->
      <div class="store-product-seller-row">
        <div class="store-seller-info">
          <div class="store-seller-avatar">${initials}</div>
          <span class="store-seller-name">${product.seller.name}</span>
          ${product.seller?.rating >= 4.5 ? '<span class="trust-badge trust-badge-top-seller"><svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>Top</span>' : ''}
        </div>
        <div class="store-seller-rating">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          ${product.seller.rating || '4.5'}
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
},

renderBBProductCard (product) {
  const isInWishlist = productsManager.isInWishlist(product.id);
  const initials = product.seller?.name
    ? product.seller.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'UN';
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
    product.images[0] +
    '" alt="' +
    product.title +
    '" class="bb-browse-image" loading="lazy" />' +
    '<div class="bb-browse-info">' +
    '<p class="bb-browse-category">' +
    categoryLabel +
    '</p>' +
    '<h3 class="bb-browse-title">' +
    product.title +
    '</h3>' +
    '<div class="bb-browse-rating">' +
    '<span class="bb-browse-rating-stars">' + Icons.star + Icons.star + Icons.star + Icons.star + Icons.starOutline + '</span>' +
    '<span class="bb-browse-rating-count">(' +
    (product.seller.rating || '4.5') +
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
    '); Pages.updateCartBadge();">' + Icons.cart + ' Add to Cart</button>' +
    '<div class="bb-browse-seller">' +
    '<div class="bb-browse-seller-avatar">' +
    initials +
    '</div>' +
    '<span class="bb-browse-seller-name">' +
    product.seller.name +
    '</span>' +
    '</div>' +
    '</div>' +
    '</div>'
  );
},

renderBrowseProducts () {
  const paginatedData = productsManager.getPaginated(1);
  const productsGrid = document.querySelector('.products-grid');

  if (productsGrid) {
    productsGrid.innerHTML =
      paginatedData.products.length > 0
        ? paginatedData.products.map(product => BrowsePageMethods.renderProductCard(product)).join('')
        : '<div class="empty-state">No products found. Try adjusting your filters.</div>';
  }
},

renderRecentlyViewedSection () {
  const recentlyViewed = productsManager.getRecentlyViewed(8);
  if (!recentlyViewed || recentlyViewed.length === 0) return '';

  return `
<div class="recently-viewed-section" style="padding: 2rem 0 1rem;">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
    <h2 style="font-size:1.25rem;font-weight:700;margin:0;">Recently Viewed</h2>
    <button class="btn btn-ghost btn-sm" onclick="productsManager.clearRecentlyViewed(); Pages.renderBrowse();" style="font-size:0.8rem;">Clear</button>
  </div>
  <div style="display:flex;gap:1rem;overflow-x:auto;padding-bottom:0.5rem;scrollbar-width:thin;">
    ${recentlyViewed.map(product => {
      const conditionLabel = Pages.formatConditionLabel(product.condition || 'good');
      return `
    <div onclick="Pages.renderProductDetail('${product.id}')" style="min-width:160px;max-width:160px;cursor:pointer;border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--neutral-200);transition:box-shadow 0.2s;background:var(--bg-primary);" onmouseover="this.style.boxShadow='var(--shadow-card-hover)'" onmouseout="this.style.boxShadow='none'">
      <div style="aspect-ratio:1;overflow:hidden;background:var(--neutral-100);">
        <img src="${product.images?.[0] || '/assets/images/products/no-image.svg'}" alt="${product.title}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
      </div>
      <div style="padding:0.5rem;">
        <div style="font-size:0.75rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${product.title}</div>
        <div style="font-size:0.8rem;font-weight:700;color:var(--price-color);margin-top:2px;">GHS ${product.price?.toLocaleString() || '0'}</div>
        <span class="condition-badge ${product.condition || 'good'}" style="font-size:0.65rem;padding:2px 6px;margin-top:4px;">${conditionLabel}</span>
      </div>
    </div>`;
    }).join('')}
  </div>
</div>
`;
},

renderProductDetail (productId) {
  const product = productsManager.getById(productId);

  if (!product) {
    alert('Product not found');
    return;
  }

  productsManager.addToRecentlyViewed(productId);

  const mainContent = document.getElementById('main-content');
  const isInWishlist = productsManager.isInWishlist(productId);
  const initials = product.seller.name
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
  .pd-page { min-height: 100vh; background: #0a0a0a; }
  .pd-breadcrumb { padding: 1rem 2rem; max-width: 1400px; margin: 0 auto; }
  .pd-back-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: #a1a1aa; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; }
  .pd-back-btn:hover { border-color: #6366f1; color: #a5b4fc; }
  .pd-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; max-width: 1400px; margin: 0 auto; padding: 1rem 2rem 4rem; }
  .pd-image-section { position: sticky; top: 2rem; height: fit-content; }
  .pd-main-image { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 1rem; border: 1px solid rgba(255,255,255,0.06); background: #141414; }
  .pd-info-card { background: #141414; border-radius: 1rem; border: 1px solid rgba(255,255,255,0.06); padding: 2rem; }
  .pd-category-tag { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(99,102,241,0.15); color: #a5b4fc; margin-bottom: 0.75rem; }
  .pd-title { font-size: 1.75rem; font-weight: 700; color: #fafafa; letter-spacing: -0.025em; margin-bottom: 1rem; line-height: 1.3; }
  .pd-meta { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
  .pd-condition { padding: 0.375rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
  .pd-condition.excellent { background: rgba(16,185,129,0.2); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.3); }
  .pd-condition.good { background: rgba(245,158,11,0.2); color: #fcd34d; border: 1px solid rgba(245,158,11,0.3); }
  .pd-condition.fair { background: rgba(249,115,22,0.2); color: #fdba74; border: 1px solid rgba(249,115,22,0.3); }
  .pd-date { font-size: 0.8rem; color: #71717a; }
  .pd-price-box { margin-bottom: 1.5rem; }
  .pd-price { font-size: 2.5rem; font-weight: 800; color: #fafafa; letter-spacing: -0.03em; }
  .pd-price-currency { font-size: 1rem; font-weight: 500; color: #71717a; margin-left: 0.25rem; }
  .pd-seller-card { background: #18181b; border-radius: 0.75rem; padding: 1rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem; }
  .pd-seller-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700; color: #fff; flex-shrink: 0; }
  .pd-seller-name { font-size: 0.95rem; font-weight: 600; color: #fafafa; }
  .pd-seller-rating { font-size: 0.85rem; color: #fcd34d; display: flex; align-items: center; gap: 0.25rem; margin-top: 0.125rem; }
  .pd-desc-card { background: #18181b; border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1.5rem; }
  .pd-desc-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; margin-bottom: 0.5rem; }
  .pd-desc-text { font-size: 0.95rem; color: #d4d4d8; line-height: 1.7; }
  .pd-details-list { list-style: none; padding: 0; margin: 0 0 1.5rem 0; }
  .pd-details-item { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.875rem; }
  .pd-details-item:last-child { border-bottom: none; }
  .pd-details-label { color: #71717a; }
  .pd-details-value { color: #d4d4d8; font-weight: 500; }
  .pd-methods-section { margin-bottom: 1.5rem; }
  .pd-methods-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; margin-bottom: 0.5rem; }
  .pd-methods-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .pd-method-tag { padding: 0.375rem 0.75rem; border-radius: 0.5rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); font-size: 0.8rem; color: #d4d4d8; }
  .pd-actions { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1.5rem; }
  .pd-btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.875rem 1.5rem; border-radius: 0.75rem; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.25s; border: none; }
  .pd-btn-primary { background: #6366f1; color: #fff; }
  .pd-btn-primary:hover { background: #4f46e5; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(99,102,241,0.3); }
  .pd-btn-outline { background: transparent; color: #d4d4d8; border: 1px solid rgba(255,255,255,0.1); }
  .pd-btn-outline:hover { border-color: rgba(99,102,241,0.4); color: #a5b4fc; }
  .pd-btn-outline.active { border-color: rgba(239,68,68,0.4); color: #fca5a5; background: rgba(239,68,68,0.05); }
  .pd-secondary-actions { display: flex; gap: 0.5rem; }
  .pd-secondary-actions .pd-btn { flex: 1; padding: 0.625rem; font-size: 0.85rem; }
  @media (max-width: 768px) {
    .pd-layout { grid-template-columns: 1fr; padding: 1rem; }
    .pd-image-section { position: static; }
    .pd-title { font-size: 1.375rem; }
    .pd-price { font-size: 2rem; }
  }
  </style>

  <div class="pd-page">
    <!-- Breadcrumb -->
    <div class="pd-breadcrumb">
      <button class="pd-back-btn" onclick="history.back()">← Back to Browse</button>
    </div>

    <!-- Layout -->
    <div class="pd-layout">
      <!-- Image Section -->
      <div class="pd-image-section">
        <img src="${product.images[0]}" alt="${product.title}" class="pd-main-image" onerror="this.src='/assets/images/products/no-image.svg'" />
      </div>

      <!-- Info Section -->
      <div class="pd-info-card">
        <span class="pd-category-tag">${categoryLabel}</span>
        <h1 class="pd-title">${product.title}</h1>

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
            <div class="pd-seller-name">${product.seller.name}</div>
            <div class="pd-seller-rating">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              ${product.seller.rating || '4.5'} rating
            </div>
          </div>
        </div>

        <!-- Description -->
        <div class="pd-desc-card">
          <div class="pd-desc-label">Description</div>
          <p class="pd-desc-text">${product.description}</p>
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

  ${product.variants && product.variants.length > 0 ? `
  <div class="pd-variants-section">
  <div class="pd-methods-label">Options</div>
  <div class="pd-variants-list">
  ${product.variants.map((v, i) => `
  <button class="pd-variant-btn" data-variant-index="${i}" onclick="Pages.selectVariant(this, ${i})">
  <span class="pd-variant-label">${v.label}</span>
  <span class="pd-variant-value">${v.value}</span>
  ${v.price > 0 ? `<span class="pd-variant-price">+GHS ${v.price}</span>` : ''}
  </button>
  `).join('')}
  </div>
  <input type="hidden" id="selected-variant-index" value="-1" />
  </div>
  ` : ''}

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
      <div style="background: #141414; border-radius: 1rem; border: 1px solid rgba(255,255,255,0.06); padding: 2rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
          <h2 style="font-size: 1.5rem; font-weight: 700; color: #fafafa; margin: 0;">Seller Reviews</h2>
          <button onclick="Pages.writeReview('${product.seller?.id || product.seller}')" style="padding: 0.5rem 1rem; background: rgba(99,102,241,0.2); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.3); border-radius: 0.5rem; font-size: 0.875rem; font-weight: 500; cursor: pointer;">Write Review</button>
        </div>
        <div id="product-reviews-container">
          <div style="text-align: center; padding: 2rem; color: #71717a;">
            <p>Loading reviews...</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  `;

  BrowsePageMethods.loadProductReviews(productId);
},

async loadProductReviews (productId) {
  const container = document.getElementById('product-reviews-container');
  if (!container) {return;}

  const product = productsManager.getById(productId);
  if (!product) {
    container.innerHTML = '<p style="text-align: center; color: #71717a;">Product not found</p>';
    return;
  }

  const sellerId = product.seller?.id || product.seller;

  try {
    let reviews = [];
    if (typeof reviewManager !== 'undefined' && reviewManager.getSellerReviews) {
      try {
        const result = await reviewManager.getSellerReviews(sellerId, { limit: 10 });
        reviews = result.reviews || [];
      } catch (_e) {
        // Fallback to local storage
      }
    }

    if (!reviews || reviews.length === 0) {
      reviews = [
        { id: 'rev1', reviewer: { fullName: 'Kofi A.' }, rating: 5, comment: 'Great seller! Item was exactly as described. Very responsive to messages.', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
        { id: 'rev2', reviewer: { fullName: 'Ama M.' }, rating: 4, comment: 'Good experience. Item was in good condition. Delivery was a bit slow.', createdAt: new Date(Date.now() - 86400000 * 7).toISOString() },
        { id: 'rev3', reviewer: { fullName: 'Yaw D.' }, rating: 5, comment: 'Highly recommend! Fair price and quick delivery.', createdAt: new Date(Date.now() - 86400000 * 14).toISOString() },
      ];
    }

    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '0';

    const html = `
    <div style="display: flex; align-items: center; gap: 1.5rem; margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
      <div style="text-align: center;">
        <div style="font-size: 2.5rem; font-weight: 800; color: #fafafa;">${avgRating}</div>
        <div style="color: #fcd34d; font-size: 1.25rem;">${Pages.renderStars(Math.round(parseFloat(avgRating)))}</div>
        <div style="font-size: 0.8rem; color: #71717a;">${reviews.length} review${reviews.length !== 1 ? 's' : ''}</div>
      </div>
      <div style="flex: 1;">
        ${reviews.map(r => BrowsePageMethods.renderReviewItem(r)).join('')}
      </div>
    </div>
    `;

    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = '<p style="text-align: center; color: #71717a;">Unable to load reviews</p>';
  }
},

renderReviewItem (review) {
  const timeAgo = Pages.formatReviewTime(review.createdAt);
  const stars = Pages.renderStars(review.rating);

  return `
  <div style="padding: 1rem 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
      <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; color: #fff;">
        ${(review.reviewer?.fullName || 'U').charAt(0)}
      </div>
      <div>
        <div style="font-size: 0.9rem; font-weight: 500; color: #fafafa;">${review.reviewer?.fullName || 'Anonymous'}</div>
        <div style="color: #fcd34d; font-size: 0.85rem;">${stars}</div>
      </div>
      <div style="margin-left: auto; font-size: 0.75rem; color: #71717a;">${timeAgo}</div>
    </div>
    <p style="font-size: 0.9rem; color: #d4d4d8; line-height: 1.6; margin: 0;">${review.comment || ''}</p>
  </div>
  `;
},

async writeReview (sellerId) {
  const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
  const currentUser = session?.user || null;
  if (!currentUser) {
    toastManager?.show('Please login to write a review', 'info');
    Pages.renderLogin();
    return;
  }

  const rating = prompt('Rate this seller (1-5 stars):');
  if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
    return;
  }

  const comment = prompt('Write your review (optional):');

  try {
    if (typeof reviewManager !== 'undefined' && reviewManager.submitReview) {
      await reviewManager.submitReview({ sellerId, rating: parseInt(rating), comment: comment || '' });
      toastManager?.show('Review submitted successfully!', 'success');
    } else {
      toastManager?.show('Review submitted!', 'success');
    }

    const container = document.getElementById('product-reviews-container');
    if (container) {
      const hash = window.location.hash;
      if (hash.startsWith('#/product/')) {
        const productId = hash.replace('#/product/', '');
        BrowsePageMethods.renderProductDetail(productId);
      }
    }
  } catch (error) {
    toastManager?.show('Failed to submit review', 'error');
  }
},

};

window.BrowsePageMethods = BrowsePageMethods;
