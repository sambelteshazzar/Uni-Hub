// ============================================
// ADMIN PRODUCTS MODULE - Product Moderation
// ============================================
/* exported adminProductsManager */

class AdminProductsManager {
  constructor () {
    this.MODERATION_STORAGE_KEY = `${STORAGE_KEY_PREFIX}product_moderation`;
  }

  /**
   * Get all products (including flagged)
   * @returns {Array}
   */
  getAllProducts () {
    return productsManager.getAll();
  }

  /**
   * Get product by ID
   * @param {string} productId - Product ID
   * @returns {Object|null}
   */
  getProductById (productId) {
    return productsManager.getById(productId);
  }

  /**
   * Flag product for review
   * @param {string} productId - Product ID
   * @param {string} reason - Reason for flagging
   * @returns {Object}
   */
  flagProduct (productId, reason) {
    const product = this.getProductById(productId);

    if (!product) {
      return {
        success: false,
        error: 'Product not found',
      };
    }

    const flag = {
      id: `flag_${Date.now()}`,
      productId: productId,
      reason: reason,
      flaggedAt: new Date().toISOString(),
      status: 'pending',
    };

    const flags = this.getFlags();
    flags.push(flag);
    StorageManager.set(this.MODERATION_STORAGE_KEY, flags);

    adminAuthManager.logActivity('Product flagged', { productId, reason });

    return {
      success: true,
      message: 'Product flagged for review',
      flag: flag,
    };
  }

  /**
   * Get all flags
   * @returns {Array}
   */
  getFlags () {
    const flags = StorageManager.get(this.MODERATION_STORAGE_KEY, true);
    return flags || [];
  }

  /**
   * Get flagged products
   * @returns {Array}
   */
  getFlaggedProducts () {
    const flags = this.getFlags().filter(f => f.status === 'pending');
    return flags.map(flag => ({
      flag: flag,
      product: this.getProductById(flag.productId),
    }));
  }

  /**
   * Approve flagged product
   * @param {string} flagId - Flag ID
   * @returns {Object}
   */
  approveFlag (flagId) {
    const flags = this.getFlags();
    const index = flags.findIndex(f => f.id === flagId);

    if (index === -1) {
      return {
        success: false,
        error: 'Flag not found',
      };
    }

    flags[index].status = 'approved';
    flags[index].resolvedAt = new Date().toISOString();
    StorageManager.set(this.MODERATION_STORAGE_KEY, flags);

    adminAuthManager.logActivity('Flag approved', { flagId });

    return {
      success: true,
      message: 'Flag approved',
    };
  }

  /**
   * Reject flagged product (remove product)
   * @param {string} flagId - Flag ID
   * @returns {Object}
   */
  rejectFlag (flagId) {
    const flags = this.getFlags();
    const index = flags.findIndex(f => f.id === flagId);

    if (index === -1) {
      return {
        success: false,
        error: 'Flag not found',
      };
    }

    const flag = flags[index];
    flags[index].status = 'rejected';
    flags[index].resolvedAt = new Date().toISOString();
    StorageManager.set(this.MODERATION_STORAGE_KEY, flags);

    // Remove the product
    this.deleteProduct(flag.productId);

    adminAuthManager.logActivity('Flag rejected - product removed', {
      flagId,
      productId: flag.productId,
    });

    return {
      success: true,
      message: 'Flag rejected - product removed',
    };
  }

  /**
   * Delete product
   * @param {string} productId - Product ID
   * @returns {Object}
   */
  deleteProduct (productId) {
    const products = this.getAllProducts();
    const index = products.findIndex(p => p.id === productId);

    if (index === -1) {
      return {
        success: false,
        error: 'Product not found',
      };
    }

    products.splice(index, 1);
    // In production, this would call API to delete
    // For now, just log the action
    adminAuthManager.logActivity('Product deleted', { productId });

    return {
      success: true,
      message: 'Product deleted successfully',
    };
  }

  /**
   * Update product
   * @param {string} productId - Product ID
   * @param {Object} updates - Updates to apply
   * @returns {Object}
   */
  updateProduct (productId, updates) {
    const product = this.getProductById(productId);

    if (!product) {
      return {
        success: false,
        error: 'Product not found',
      };
    }

    // Apply updates
    const updatedProduct = {
      ...product,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    adminAuthManager.logActivity('Product updated', { productId, updates });

    return {
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct,
    };
  }

  /**
   * Get products by seller
   * @param {string} sellerId - Seller ID
   * @returns {Array}
   */
  getProductsBySeller (sellerId) {
    return this.getAllProducts().filter(p => p.seller.id === sellerId);
  }

  /**
   * Get products by category
   * @param {string} category - Category ID
   * @returns {Array}
   */
  getProductsByCategory (category) {
    return this.getAllProducts().filter(p => p.category === category);
  }

  /**
   * Get products by university
   * @param {string} university - University ID
   * @returns {Array}
   */
  getProductsByUniversity (university) {
    return this.getAllProducts().filter(p => p.university === university);
  }

  /**
   * Search products
   * @param {string} query - Search query
   * @returns {Array}
   */
  searchProducts (query) {
    const normalizedQuery = query.toLowerCase();
    return this.getAllProducts().filter(
      p =>
        p.title.toLowerCase().includes(normalizedQuery) ||
        p.description.toLowerCase().includes(normalizedQuery),
    );
  }

  /**
   * Get product statistics
   * @returns {Object}
   */
  getStats () {
    const products = this.getAllProducts();
    const flags = this.getFlags();

    const categoryCount = {};
    const conditionCount = {};
    const universityCount = {};

    products.forEach(p => {
      categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
      conditionCount[p.condition] = (conditionCount[p.condition] || 0) + 1;
      universityCount[p.university] = (universityCount[p.university] || 0) + 1;
    });

    return {
      totalProducts: products.length,
      totalFlags: flags.length,
      pendingFlags: flags.filter(f => f.status === 'pending').length,
      categoryCount: categoryCount,
      conditionCount: conditionCount,
      universityCount: universityCount,
    };
  }

  /**
   * Get recent products
   * @param {number} limit - Number of products
   * @returns {Array}
   */
  getRecentProducts (limit = 10) {
    return this.getAllProducts()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  /**
   * Bulk delete products
   * @param {Array} productIds - Product IDs to delete
   * @returns {Object}
   */
  bulkDelete (productIds) {
    let deleted = 0;
    let failed = 0;

    productIds.forEach(id => {
      const result = this.deleteProduct(id);
      if (result.success) {
        deleted++;
      } else {
        failed++;
      }
    });

    adminAuthManager.logActivity('Bulk delete products', {
      count: productIds.length,
      deleted,
      failed,
    });

    return {
      success: true,
      message: `Deleted ${deleted} products, ${failed} failed`,
      deleted: deleted,
      failed: failed,
    };
  }

  /**
   * Export products to CSV (placeholder)
   * @returns {string}
   */
  exportToCSV () {
    const products = this.getAllProducts();
    const headers = [
      'ID', 'Title', 'Price', 'Category', 'Condition', 'Seller', 'University', 'Created',
    ];
    const rows = products.map(p => [
      p.id, p.title, p.price, p.category, p.condition, p.seller.name, p.university, p.createdAt,
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    this._downloadCSV(csvContent, 'uni-hub-products.csv');
    return csvContent;
  }

  _downloadCSV (csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
}

// Create singleton instance
const adminProductsManager = new AdminProductsManager();

// Export to window for cross-module access
window.adminProductsManager = adminProductsManager;
if (typeof dispatchEvent !== 'undefined') {
  dispatchEvent(new Event('module-loaded', { detail: 'AdminProductsManager' }));
}
