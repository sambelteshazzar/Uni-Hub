// ============================================
// CART MODULE - Shopping Cart Management
// ============================================

class CartManager {
  constructor () {
    this.items = [];
    this.load();
  }

  /**
   * Load cart from localStorage
   */
  load () {
    const cartData = StorageManager.get(STORAGE_KEYS.CART, true);
    this.items = cartData || [];
  }

  /**
   * Save cart to localStorage
   */
  save () {
    StorageManager.set(STORAGE_KEYS.CART, this.items);
  }

  /**
   * Get all cart items
   */
  getItems () {
    return this.items;
  }

  /**
   * Get cart item count
   */
  getCount () {
    return this.items.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * Get cart total price
   */
  getTotal () {
    return this.items.reduce((total, item) => total + item.product.price * item.quantity, 0);
  }

  /**
   * Add product to cart
   * @param {Object} product - Product object
   * @param {number} quantity - Quantity to add (default: 1)
   * @returns {Object} - Result with success status
   */
  add (product, quantity = 1) {
    // Check if product already in cart
    const existingIndex = this.items.findIndex((item) => item.product.id === product.id);

    if (existingIndex !== -1) {
      // Update quantity
      this.items[existingIndex].quantity += quantity;
      this.save();
      return {
        success: true,
        message: 'Quantity updated in cart',
        action: 'updated',
      };
    } else {
      // Add new item
      this.items.push({
        product: product,
        quantity: quantity,
        addedAt: new Date().toISOString(),
      });
      this.save();
      return {
        success: true,
        message: 'Added to cart',
        action: 'added',
      };
    }
  }

  /**
   * Remove product from cart
   * @param {string} productId - Product ID to remove
   * @returns {Object} - Result with success status
   */
  remove (productId) {
    const index = this.items.findIndex((item) => item.product.id === productId);

    if (index !== -1) {
      this.items.splice(index, 1);
      this.save();
      return {
        success: true,
        message: 'Removed from cart',
      };
    }

    return {
      success: false,
      message: 'Item not found in cart',
    };
  }

  /**
   * Update product quantity
   * @param {string} productId - Product ID
   * @param {number} quantity - New quantity
   * @returns {Object} - Result with success status
   */
  updateQuantity (productId, quantity) {
    const item = this.items.find((item) => item.product.id === productId);

    if (!item) {
      return {
        success: false,
        message: 'Item not found in cart',
      };
    }

    if (quantity <= 0) {
      return this.remove(productId);
    }

    item.quantity = quantity;
    this.save();

    return {
      success: true,
      message: 'Cart updated',
    };
  }

  /**
   * Increment item quantity
   * @param {string} productId - Product ID
   * @returns {Object} - Result with success status
   */
  increment (productId) {
    const item = this.items.find((item) => item.product.id === productId);

    if (item) {
      item.quantity += 1;
      this.save();
      return { success: true, message: 'Quantity increased' };
    }

    return { success: false, message: 'Item not found' };
  }

  /**
   * Decrement item quantity
   * @param {string} productId - Product ID
   * @returns {Object} - Result with success status
   */
  decrement (productId) {
    const item = this.items.find((item) => item.product.id === productId);

    if (item) {
      if (item.quantity > 1) {
        item.quantity -= 1;
        this.save();
        return { success: true, message: 'Quantity decreased' };
      } else {
        return this.remove(productId);
      }
    }

    return { success: false, message: 'Item not found' };
  }

  /**
   * Check if product is in cart
   * @param {string} productId - Product ID
   * @returns {boolean}
   */
  isInCart (productId) {
    return this.items.some((item) => item.product.id === productId);
  }

  /**
   * Get item quantity in cart
   * @param {string} productId - Product ID
   * @returns {number}
   */
  getQuantity (productId) {
    const item = this.items.find((item) => item.product.id === productId);
    return item ? item.quantity : 0;
  }

  /**
   * Clear entire cart
   */
  clear () {
    this.items = [];
    this.save();
  }

  /**
   * Get cart summary
   */
  getSummary () {
    const itemCount = this.getCount();
    const total = this.getTotal();
    const subtotal = total;
    const deliveryFee = 0; // Will be calculated during checkout
    const grandTotal = subtotal + deliveryFee;

    return {
      itemCount,
      subtotal,
      deliveryFee,
      grandTotal,
    };
  }

  /**
   * Validate cart before checkout
   * @returns {Object} - Validation result
   */
  validate () {
    if (this.items.length === 0) {
      return {
        valid: false,
        message: 'Your cart is empty',
      };
    }

    // Check if all products are still available
    for (const item of this.items) {
      if (!item.product || !item.product.id) {
        return {
          valid: false,
          message: 'Some items in your cart are no longer available',
        };
      }
    }

    return {
      valid: true,
      message: 'Cart is valid',
    };
  }
}

// Create singleton instance
const cartManager = new CartManager();
