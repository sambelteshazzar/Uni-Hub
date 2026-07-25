/* exported productsManager */
// ============================================
// PRODUCTS MODULE - Product Management
// Works with backend API with local fallback
// ============================================

class ProductsManager {
  constructor () {
    this.products = [];
    this.filteredProducts = [];
    this.currentFilters = {
      university: null,
      category: null,
      condition: null,
      priceRange: { min: 0, max: Infinity },
      searchQuery: '',
      sortBy: 'newest',
      gender: null,
    };
    this.currentPage = 1;
    this.pageSize = PAGINATION.DEFAULT_PAGE_SIZE;
    this.PRODUCTS_STORAGE_KEY = `${STORAGE_KEY_PREFIX}products`;
    this.wishlistKey = `${STORAGE_KEY_PREFIX}wishlist`;
    this.useBackend = true;
    this._backendAvailable = false;
    this._totalFromServer = 0;
    this._totalPagesFromServer = 0;
    this._lastServerPage = null;
  }

  /**
  * Initialize products
  */
  async init () {
    try {
      if (this.useBackend) {
        try {
          const data = await api.products.getAll({ limit: 100 });
          if (data.success && data.data && data.data.products) {
            this.products = data.data.products;
            this.filteredProducts = [...this.products];
            this._backendAvailable = true;
            window._backendAvailable = true;
            if (data.data.pagination) {
              this._totalFromServer = data.data.pagination.total;
              this._totalPagesFromServer = data.data.pagination.pages;
            }
            return;
          }
        } catch (_error) {
          // Backend unavailable - use local fallback
        }
      }

      const data = await api.loadJSON('data/products.json');
      this.products = data.products || [];
      this.filteredProducts = [...this.products];
    } catch (_error) {
      this.products = [];
      this.filteredProducts = [];
    }
    this._mergeLocalProducts();
  }

  _persistLocalProducts () {
    try {
      const seedId = /^prod-00[1-9]$/;
      const localProducts = this.products.filter(p => p.id && !seedId.test(p.id));
      const stored = StorageManager.set(this.PRODUCTS_STORAGE_KEY + '_local', localProducts);
      if (!stored) {
        this._persistToIndexedDB(localProducts);
      }
    } catch (_e) {
      this._persistToIndexedDB(this.products.filter(p => p.id && !/^prod-00[1-9]$/.test(p.id)));
    }
  }

  async _persistToIndexedDB (products) {
    try {
      const request = indexedDB.open('unihub_products', 1);
      request.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id' });
        }
      };
      request.onsuccess = e => {
        const db = e.target.result;
        const tx = db.transaction('products', 'readwrite');
        const store = tx.objectStore('products');
        for (const p of products) {
          store.put(p);
        }
      };
    } catch (_e) { console.warn('products: IndexedDB init failed:', _e); }
  }

  async _loadFromIndexedDB () {
    return new Promise(resolve => {
      try {
        const request = indexedDB.open('unihub_products', 1);
        request.onupgradeneeded = e => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('products')) {
            db.createObjectStore('products', { keyPath: 'id' });
          }
        };
        request.onsuccess = e => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('products')) { resolve([]); return; }
          const tx = db.transaction('products', 'readonly');
          const store = tx.objectStore('products');
          const getAll = store.getAll();
          getAll.onsuccess = () => resolve(getAll.result || []);
          getAll.onerror = () => resolve([]);
        };
        request.onerror = () => resolve([]);
      } catch (_e) { resolve([]); }
    });
  }

  _mergeLocalProducts () {
    try {
      const localProducts = StorageManager.get(this.PRODUCTS_STORAGE_KEY + '_local') || [];
      const existingIds = new Set(this.products.map(p => p.id));
      for (const lp of localProducts) {
        if (!existingIds.has(lp.id)) {
          this.products.push(lp);
          existingIds.add(lp.id);
        }
      }
      this._loadFromIndexedDB().then(idbProducts => {
        for (const ip of idbProducts) {
          if (!existingIds.has(ip.id)) {
            this.products.push(ip);
            existingIds.add(ip.id);
          }
        }
        if (idbProducts.length > 0) {
          this.filteredProducts = [...this.products];
        }
      });
      if (localProducts.length > 0) {
        this.filteredProducts = [...this.products];
      }
    } catch (_e) { console.warn('products: loadAll failed:', _e); }
  }

  /**
   * Fetch a specific page from the backend API (server-side pagination)
  */
  async fetchPage (page = 1, pageSize = null) {
    const size = pageSize || this.pageSize;
    const params = { page, limit: size };

    if (this.currentFilters.category) params.category = this.currentFilters.category;
    if (this.currentFilters.condition) {
      const conditions = Array.isArray(this.currentFilters.condition)
        ? this.currentFilters.condition.join(',')
        : this.currentFilters.condition;
      params.condition = conditions;
    }
    if (this.currentFilters.university) params.university = this.currentFilters.university;
    if (this.currentFilters.searchQuery) params.search = this.currentFilters.searchQuery;
    if (this.currentFilters.priceRange && (this.currentFilters.priceRange.min > 0 || this.currentFilters.priceRange.max < Infinity)) {
      if (this.currentFilters.priceRange.min > 0) params.minPrice = this.currentFilters.priceRange.min;
      if (this.currentFilters.priceRange.max < Infinity) params.maxPrice = this.currentFilters.priceRange.max;
    }
    if (this.currentFilters.sortBy && this.currentFilters.sortBy !== 'newest') {
      params.sortBy = this.currentFilters.sortBy;
    }

    try {
      const data = await api.products.getAll(params);
      if (data.success && data.data) {
        this._backendAvailable = true;
        window._backendAvailable = true;
        this._lastServerPage = page;
        if (data.data.pagination) {
          this._totalFromServer = data.data.pagination.total;
          this._totalPagesFromServer = data.data.pagination.pages;
        }
        return {
          products: data.data.products || [],
          currentPage: data.data.pagination?.page || page,
          totalPages: data.data.pagination?.pages || 1,
          totalProducts: data.data.pagination?.total || 0,
        };
      }
    } catch (_error) {
      // Fall through to client-side
    }

    this._backendAvailable = false;
    window._backendAvailable = false;
    return null;
  }

  /**
   * Get all products (local)
   */
  getAll () {
    return this.products;
  }

  /**
   * Get product by ID
   */
  getById (id) {
    return this.products.find(p => p.id === id) || null;
  }

  /**
   * Filter products
   */
  filter (filters) {
    if (filters.university !== undefined) {
      this.currentFilters.university = filters.university;
    }
    if (filters.category !== undefined) {
      this.currentFilters.category = filters.category;
    }
    if (filters.condition !== undefined) {
      this.currentFilters.condition = filters.condition;
    }
    if (filters.priceRange) {
      this.currentFilters.priceRange = filters.priceRange;
    }
    if (filters.searchQuery !== undefined) {
      this.currentFilters.searchQuery = filters.searchQuery;
    }
    if (filters.sortBy) {
      this.currentFilters.sortBy = filters.sortBy;
    }
    if (filters.gender !== undefined) {
      this.currentFilters.gender = filters.gender;
    }

    this.applyFilters();
  }

  /**
   * Apply filters to products
   */
  applyFilters () {
    let filtered = [...this.products];

    // University filter
    if (this.currentFilters.university) {
      filtered = filtered.filter(p => p.university === this.currentFilters.university);
    }

    // Category filter
    if (this.currentFilters.category) {
      filtered = filtered.filter(p => p.category === this.currentFilters.category);
    }

    // Gender sub-filter (only meaningful for fashion products; items
    // without an explicit `gender` field are treated as "unisex").
    if (this.currentFilters.gender) {
      const g = this.currentFilters.gender;
      filtered = filtered.filter(p => p.category !== 'fashion' || (p.gender || 'unisex') === g);
    }

    // Condition filter
    if (this.currentFilters.condition) {
      const conditions = Array.isArray(this.currentFilters.condition)
        ? this.currentFilters.condition
        : [this.currentFilters.condition];
      filtered = filtered.filter(p => conditions.includes(p.condition));
    }

    // Price range filter
    if (this.currentFilters.priceRange) {
      const { min, max } = this.currentFilters.priceRange;
      filtered = filtered.filter(p => p.price >= min && p.price <= max);
    }

    // Search filter
    if (this.currentFilters.searchQuery) {
      const query = this.currentFilters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        p => p.title.toLowerCase().includes(query) || p.description.toLowerCase().includes(query),
      );
    }

    // Sorting
    switch (this.currentFilters.sortBy) {
    case 'price-low':
      filtered.sort((a, b) => a.price - b.price);
      break;
    case 'price-high':
      filtered.sort((a, b) => b.price - a.price);
      break;
    case 'newest':
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    case 'rating':
      filtered.sort((a, b) => (b.seller?.rating || 0) - (a.seller?.rating || 0));
      break;
    }

    this.filteredProducts = filtered;
    this.currentPage = 1;
  }

  /**
   * Reset filters
   */
  resetFilters () {
    this.currentFilters = {
      university: null,
      category: null,
      condition: null,
      priceRange: { min: 0, max: Infinity },
      searchQuery: '',
      sortBy: 'newest',
      gender: null,
    };
    this.filteredProducts = [...this.products];
    this.currentPage = 1;
  }

  /**
  * Get paginated products
  * When backend is available, returns a promise for server-side pagination.
  * Falls back to client-side pagination otherwise.
  */
  getPaginated (page = 1) {
    this.currentPage = page;
    const start = (page - 1) * this.pageSize;
    const end = start + this.pageSize;
    const paginatedProducts = this.filteredProducts.slice(start, end);
    const totalPages = Math.max(1, Math.ceil(
      (this._backendAvailable && this._totalFromServer > 0 ? this._totalFromServer : this.filteredProducts.length) / this.pageSize
    ));
    const totalProducts = this._backendAvailable && this._totalFromServer > 0
      ? this._totalFromServer : this.filteredProducts.length;

    return {
      products: paginatedProducts,
      currentPage: page,
      totalPages,
      totalProducts,
    };
  }

  /**
   * Add product (to backend)
   */
  /**
   * Add product (to backend)
   */
  async addProduct (productData) {
    try {
      if (this.useBackend) {
        try {
          const data = await api.products.create(productData);
          if (data.success) {
            return {
              success: true,
              product: data.data,
            };
          }
          return {
            success: false,
            error: data.error || 'Failed to add product',
          };
        } catch (_error) {
          // Backend unavailable — local fallback
        }
      }

      const product = {
        id: `prod-${Date.now()}`,
        ...productData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.products.push(product);
      this.filteredProducts = [...this.products];
      this._persistLocalProducts();

      return {
        success: true,
        product,
      };
    } catch (error) {
      console.error('addProduct error:', error);
      return {
        success: false,
        error: error.message || 'Failed to add product',
      };
    }
  }

  /**
   * Update product
   */
  async updateProduct (productId, updates) {
    try {
      if (this.useBackend) {
        const data = await api.products.update(productId, updates);
        if (data.success) {
          return { success: true, product: data.data };
        }
        return { success: false, error: data.error || 'Failed to update product' };
      }

      const index = this.products.findIndex(p => p.id === productId);
      if (index === -1) {
        return { success: false, error: 'Product not found' };
      }
      this.products[index] = {
        ...this.products[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.filteredProducts = [...this.products];
      return { success: true, product: this.products[index] };
    } catch (error) {
      console.error('updateProduct error:', error);
      return { success: false, error: error.message || 'Failed to update product' };
    }
  }

  /**
   * Delete product
   */
  async deleteProduct (productId) {
    try {
      if (this.useBackend) {
        const data = await api.products.delete(productId);
        if (data.success || data.isOffline === undefined) {
          this.products = this.products.filter(p => p.id !== productId);
          this.filteredProducts = this.filteredProducts.filter(p => p.id !== productId);
          return { success: true };
        }
        return { success: false, error: data.error || 'Failed to delete product' };
      }

      this.products = this.products.filter(p => p.id !== productId);
      this.filteredProducts = this.filteredProducts.filter(p => p.id !== productId);
      return { success: true };
    } catch (error) {
      console.error('deleteProduct error:', error);
      return { success: false, error: error.message || 'Failed to delete product' };
    }
  }

  async approveProduct (productId) {
    const index = this.products.findIndex(p => p.id === productId);
    if (index === -1) return { success: false, error: 'Product not found' };
    this.products[index].status = 'approved';
    this.products[index].updatedAt = new Date().toISOString();
    this.filteredProducts = [...this.products];
    this._persistLocalProducts();
    return { success: true, product: this.products[index] };
  }

  async rejectProduct (productId, reason) {
    const index = this.products.findIndex(p => p.id === productId);
    if (index === -1) return { success: false, error: 'Product not found' };
    this.products[index].status = 'rejected';
    this.products[index].rejectionReason = reason || '';
    this.products[index].updatedAt = new Date().toISOString();
    this.filteredProducts = [...this.products];
    this._persistLocalProducts();
    return { success: true, product: this.products[index] };
  }

  /**
   * Track price drops for products
   */
  trackPriceDrops () {
    try {
      const key = `${STORAGE_KEY_PREFIX}price_history`;
      const history = StorageManager.get(key, true) || {};
      const priceDrops = [];

      this.products.forEach(product => {
        const currentPrice = product.price;
        const previous = history[product.id];

        if (previous && currentPrice < previous.price) {
          priceDrops.push({
            product,
            previousPrice: previous.price,
            currentPrice,
          });
        }

        history[product.id] = { price: currentPrice, updatedAt: Date.now() };
      });

      StorageManager.set(key, history);
      return priceDrops;
    } catch (error) {
      console.error('trackPriceDrops error:', error);
      return [];
    }
  }

  /**
   * Get price history for a product
   */
  getPriceHistory (productId) {
    try {
      const key = `${STORAGE_KEY_PREFIX}price_history`;
      const history = StorageManager.get(key, true) || {};
      return history[productId] || null;
    } catch (error) {
      console.error('getPriceHistory error:', error);
      return null;
    }
  }

  getWishlist () {
    try {
      return StorageManager.get(this.wishlistKey, true) || [];
    } catch (error) {
      console.error('getWishlist error:', error);
      return [];
    }
  }

  isInWishlist (productId) {
    const wishlist = this.getWishlist();
    return wishlist.some(item => (item.id || item) === productId);
  }

  addToWishlist (productId) {
    const wishlist = this.getWishlist();
    if (!this.isInWishlist(productId)) {
      const product = this.getById(productId);
      if (product) {
        wishlist.push(product);
      } else {
        wishlist.push({ id: productId });
      }
      StorageManager.set(this.wishlistKey, wishlist);
    }
    return wishlist;
  }

  removeFromWishlist (productId) {
    let wishlist = this.getWishlist();
    wishlist = wishlist.filter(item => (item.id || item) !== productId);
    StorageManager.set(this.wishlistKey, wishlist);
    return wishlist;
  }

  addToRecentlyViewed (productId) {
    try {
      const key = `${STORAGE_KEY_PREFIX}recently_viewed`;
      let viewed = StorageManager.get(key, true) || [];
      viewed = viewed.filter(id => id !== productId);
      viewed.unshift(productId);
      viewed = viewed.slice(0, 20);
      StorageManager.set(key, viewed);
    } catch (error) {
      console.error('addToRecentlyViewed error:', error);
    }
  }

  getRecentlyViewed () {
    try {
      const key = `${STORAGE_KEY_PREFIX}recently_viewed`;
      const ids = StorageManager.get(key, true) || [];
      return ids.map(id => this.getById(id)).filter(Boolean);
    } catch (error) {
      console.error('getRecentlyViewed error:', error);
    return [];
    }
  }

  trackWishlistPrices () {
    try {
      const wishlist = this.getWishlist();
      const priceDrops = [];
      const key = `${STORAGE_KEY_PREFIX}price_history`;
      const history = StorageManager.get(key, true) || {};

      wishlist.forEach(item => {
        const productId = item.id || item;
        const product = this.getById(productId);
        if (!product) { return; }
        const currentPrice = product.price;
        const previous = history[productId];
        if (previous && currentPrice < previous.price) {
          priceDrops.push({ product, previousPrice: previous.price, currentPrice });
        }
        history[productId] = { price: currentPrice, updatedAt: Date.now() };
      });

      StorageManager.set(key, history);
      return priceDrops;
    } catch (error) {
      console.error('trackWishlistPrices error:', error);
      return [];
    }
}

clearRecentlyViewed () {
    try {
      const key = `${STORAGE_KEY_PREFIX}recently_viewed`;
      StorageManager.set(key, []);
    } catch (error) {
      console.error('clearRecentlyViewed error:', error);
    }
  }
}

// Create singleton instance
const productsManager = new ProductsManager();

// Make globally available for module scripts
if (typeof window !== 'undefined') {
  window.productsManager = productsManager;
}

// Hostel-specific functionality extension
class HostelProductsManager {
  constructor () {
    this.baseManager = productsManager;
  }

  /**
   * Get hostel-specific products
   */
  getHostelProducts () {
    return this.baseManager.getAll().filter(p => p.category === CATEGORIES.HOSTEL_ITEMS);
  }

  /**
   * Add hostel product with validation
   */
  async addHostelProduct (productData) {
    // Validate hostel-specific fields
    if (!productData.university) {
      return {
        success: false,
        error: 'University is required for hostel items',
      };
    }

    if (!productData.condition) {
      return {
        success: false,
        error: 'Condition is required for hostel items',
      };
    }

    // Ensure it's marked as hostel category
    const hostelProductData = {
      ...productData,
      category: CATEGORIES.HOSTEL_ITEMS,
    };

    return this.baseManager.addProduct(hostelProductData);
  }

  /**
   * Get hostel products by university
   */
  getHostelProductsByUniversity (universityId) {
    return this.getHostelProducts().filter(p => p.university === universityId);
  }

  /**
   * Get featured hostel items
   */
  getFeaturedHostelItems () {
    return this.getHostelProducts()
      .filter(p => p.condition === PRODUCT_CONDITIONS.EXCELLENT)
      .sort((a, b) => b.price - a.price)
      .slice(0, 6);
  }
}

/* exported hostelProductsManager */
// Create hostel products manager instance
const _hostelProductsManager = new HostelProductsManager();

// Export for ES6 modules
export { ProductsManager, productsManager, HostelProductsManager, _hostelProductsManager as hostelProductsManager };

// Make globally available for module scripts
if (typeof window !== 'undefined') {
  window.productsManager = productsManager;
  window.hostelProductsManager = _hostelProductsManager;
}
