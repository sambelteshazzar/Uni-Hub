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
    };
    this.currentPage = 1;
    this.pageSize = PAGINATION.DEFAULT_PAGE_SIZE;
    this.PRODUCTS_STORAGE_KEY = `${STORAGE_KEY_PREFIX}products`;
    this.wishlistKey = `${STORAGE_KEY_PREFIX}wishlist`;
    this.useBackend = true; // Backend API enabled
  }

  /**
   * Initialize products
   */
  async init () {
    try {
      if (this.useBackend) {
        // Try to load from backend with short timeout
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout
          const response = await fetch(`${window.API_URL}/products?limit=100`, {
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data.products) {
              this.products = data.data.products;
              this.filteredProducts = [...this.products];
              return;
            }
          }
        } catch (_error) {
          // Backend unavailable or slow - use local fallback
        }
      }

      // Fallback to local JSON
      const data = await api.loadJSON('data/products.json');
      this.products = data.products || [];
      this.filteredProducts = [...this.products];
    } catch (_error) {
      // Silent fail - products will be empty
      this.products = [];
      this.filteredProducts = [];
    }
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
    };
    this.filteredProducts = [...this.products];
    this.currentPage = 1;
  }

  /**
   * Get paginated products
   */
  getPaginated (page = 1) {
    this.currentPage = page;
    const start = (page - 1) * this.pageSize;
    const end = start + this.pageSize;
    const paginatedProducts = this.filteredProducts.slice(start, end);

    return {
      products: paginatedProducts,
      currentPage: page,
      totalPages: Math.ceil(this.filteredProducts.length / this.pageSize),
      totalProducts: this.filteredProducts.length,
    };
  }

  /**
   * Add product (to backend)
   */
  async addProduct (productData) {
    try {
      if (this.useBackend) {
        try {
          const response = await api.products.create(productData);
          if (response.success) {
            // Add to local list
            this.products.unshift(response.data);
            this.filteredProducts = [...this.products];
            return {
              success: true,
              message: 'Product listed successfully!',
              product: response.data,
            };
          }
          return response;
        } catch (error) {
          // Backend not available - saving locally
        }
      }

      // Fallback to local storage
      const newProduct = {
        id: `prod_${Date.now()}`,
        ...productData,
        createdAt: new Date().toISOString(),
        status: 'active',
      };

      this.products.unshift(newProduct);
      this.filteredProducts = [...this.products];
      StorageManager.set(this.PRODUCTS_STORAGE_KEY, this.products);

      return {
        success: true,
        message: 'Product listed successfully!',
        product: newProduct,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to add product',
      };
    }
  }

  /**
   * Get products by seller
   */
  getBySeller (sellerId) {
    return this.products.filter(p => p.seller?.id === sellerId || p.seller === sellerId);
  }

  /**
   * Wishlist management
   */
  addToWishlist (productId) {
    const wishlist = StorageManager.get(this.wishlistKey, true) || [];
    if (!wishlist.includes(productId)) {
      wishlist.push(productId);
      StorageManager.set(this.wishlistKey, wishlist);
    }
  }

  removeFromWishlist (productId) {
    let wishlist = StorageManager.get(this.wishlistKey, true) || [];
    wishlist = wishlist.filter(id => id !== productId);
    StorageManager.set(this.wishlistKey, wishlist);
  }

  isInWishlist (productId) {
    const wishlist = StorageManager.get(this.wishlistKey, true) || [];
    return wishlist.includes(productId);
  }

  getWishlist () {
    const wishlist = StorageManager.get(this.wishlistKey, true) || [];
    return this.products.filter(p => wishlist.includes(p.id));
  }
}

// Create singleton instance
const productsManager = new ProductsManager();

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
