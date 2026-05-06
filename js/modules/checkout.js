/* exported checkoutManager */
// ============================================
// CHECKOUT MODULE - Order Processing
// ============================================

function getDeliveryFees () {
  if (typeof DELIVERY_MODES === 'undefined') {
    return { bolt: 15, yango: 12, inperson: 0 };
  }
  return {
    [DELIVERY_MODES.BOLT]: 15,
    [DELIVERY_MODES.YANGO]: 12,
    [DELIVERY_MODES.IN_PERSON]: 0,
  };
}

const _cartManager = typeof cartManager !== 'undefined' ? cartManager : null;
const _api = typeof api !== 'undefined' ? api : null;
const _StorageManager = typeof StorageManager !== 'undefined' ? StorageManager : null;
const _STORAGE_KEYS = typeof STORAGE_KEYS !== 'undefined' ? STORAGE_KEYS : null;
const _STORAGE_KEY_PREFIX = typeof STORAGE_KEY_PREFIX !== 'undefined' ? STORAGE_KEY_PREFIX : 'unihub_';
const _ORDER_STATUS = typeof ORDER_STATUS !== 'undefined' ? ORDER_STATUS : { PLACED: 'placed', CONFIRMED: 'confirmed', IN_TRANSIT: 'in_transit', DELIVERED: 'delivered', CANCELLED: 'cancelled' };
const _DELIVERY_MODES = typeof DELIVERY_MODES !== 'undefined' ? DELIVERY_MODES : { BOLT: 'bolt', YANGO: 'yango', IN_PERSON: 'in_person' };
const _PAYMENT_MODES = typeof PAYMENT_MODES !== 'undefined' ? PAYMENT_MODES : { CASH: 'cash', MOMO: 'momo', TELECEL: 'telecel', BANK: 'bank' };
const _Validator = typeof Validator !== 'undefined' ? Validator : {
  isValidPhone: (p) => /^[\d\s+()-]{7,15}$/.test(p),
};

class CheckoutManager {
  constructor () {
    this.ORDER_STORAGE_KEY = `${_STORAGE_KEY_PREFIX}orders`;
    this.useBackend = true; // Backend API enabled
    this.DELIVERY_FEES = getDeliveryFees();
  }

  /**
   * Create a new order from cart
   * @param {Object} checkoutData - Checkout form data
   * @returns {Object} - Order result
   */
  async createOrder (checkoutData) {
    // Validate cart first
    const cartValidation = _cartManager.validate();
    if (!cartValidation.valid) {
      return {
        success: false,
        error: cartValidation.message,
      };
    }

    // Validate checkout data
    const dataValidation = this.validateCheckoutData(checkoutData);
    if (!dataValidation.valid) {
      return {
        success: false,
        error: dataValidation.message,
      };
    }

    // Get current user from session (authManager storage format)
    const session = _StorageManager.get(_STORAGE_KEYS.CURRENT_USER, true);
    const currentUser = session?.user || null;
    if (!currentUser) {
      return {
        success: false,
        error: 'You must be logged in to place an order',
      };
    }

    // Try backend first
    if (this.useBackend) {
      try {
        // Map frontend payment/delivery modes to backend format
        const orderData = {
          items: _cartManager.getItems().map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            variant: item.variant || null,
          })),
          deliveryMode: checkoutData.deliveryMode,
          deliveryAddress: checkoutData.deliveryAddress,
          deliveryInstructions: checkoutData.deliveryInstructions,
          paymentMode: checkoutData.paymentMode,
          phone: checkoutData.phone || currentUser.phone,
        };

        const response = await _api.orders.create(orderData);

        if (response.success) {
          _cartManager.clear();
          return {
            success: true,
            message: 'Order placed successfully!',
            order: response.data,
          };
        }
      } catch (error) {
        // Backend unavailable - use local fallback
      }
    }

    // Local fallback
    const cartSummary = _cartManager.getSummary();
    const deliveryFee = this.calculateDeliveryFee(checkoutData.deliveryMode, cartSummary.subtotal);
    const grandTotal = cartSummary.subtotal + deliveryFee;

    const order = {
      id: this.generateOrderId(),
      orderNumber: this.generateOrderNumber(),
      userId: currentUser.id,
      customer: {
        name: currentUser.fullName,
        email: currentUser.email,
        phone: checkoutData.phone || currentUser.phone,
        university: currentUser.university,
      },
  items: _cartManager.getItems().map(item => ({
  productId: item.product.id,
  title: item.product.title,
  price: item.product.price + (item.variant ? item.variant.price || 0 : 0),
  quantity: item.quantity,
  seller: item.product.seller,
  image: item.product.images[0],
  variant: item.variant || null,
  })),
      pricing: {
        subtotal: cartSummary.subtotal,
        deliveryFee: deliveryFee,
        grandTotal: grandTotal,
        currency: 'GHS',
      },
      delivery: {
        mode: checkoutData.deliveryMode,
        address: checkoutData.deliveryAddress,
        instructions: checkoutData.deliveryInstructions,
      },
      payment: {
        mode: checkoutData.paymentMode,
        status: 'pending',
      },
      status: _ORDER_STATUS.PLACED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.saveOrder(order);
  _cartManager.clear();

  return {
      success: true,
      message: 'Order placed successfully!',
      order: order,
    };
  }

  /**
   * Validate checkout form data
   * @param {Object} data - Checkout data
   * @returns {Object} - Validation result
   */
  validateCheckoutData (data) {
    if (!data.deliveryMode) {
      return { valid: false, message: 'Please select a delivery method' };
    }

    if (!data.paymentMode) {
      return { valid: false, message: 'Please select a payment method' };
    }

    if (!data.deliveryAddress || data.deliveryAddress.trim() === '') {
      return { valid: false, message: 'Please enter a delivery address' };
    }

    if (data.phone && !_Validator.isValidPhone(data.phone)) {
      return { valid: false, message: 'Please enter a valid phone number' };
    }

    return { valid: true, message: 'Checkout data is valid' };
  }

  /**
   * Calculate delivery fee based on mode
   * @param {string} mode - Delivery mode
   * @param {number} subtotal - Order subtotal
   * @returns {number} - Delivery fee
   */
  calculateDeliveryFee (mode, _subtotal) {
    return this.DELIVERY_FEES[mode] ?? this.DELIVERY_FEES[_DELIVERY_MODES.IN_PERSON] ?? 0;
  }

  /**
   * Generate unique order ID
   * @returns {string}
   */
  generateOrderId () {
    return `order_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Generate human-readable order number
   * @returns {string}
   */
  generateOrderNumber () {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `UH-${year}${month}${day}-${random}`;
  }

  /**
   * Save order to storage
   * @param {Object} order - Order object
   */
  saveOrder (order) {
    const orders = this.getAllOrders();
    orders.unshift(order); // Add to beginning
    _StorageManager.set(this.ORDER_STORAGE_KEY, orders);
  }

  /**
   * Get all orders for current user
   * @returns {Array}
   */
  async getAllOrders () {
    // Try backend first
    if (this.useBackend) {
      try {
        const response = await _api.orders.getMyOrders();
        if (response.success) {
          return response.data.orders || response.data || [];
        }
      } catch (error) {
        // Backend unavailable - use local fallback
      }
    }

    // Local fallback
    const orders = _StorageManager.get(this.ORDER_STORAGE_KEY, true);
    return orders || [];
  }

  /**
   * Get orders by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>}
   */
  async getUserOrders (userId) {
    const orders = await this.getAllOrders();
    return orders.filter(order => order.userId === userId);
  }

  /**
   * Get order by ID
   * @param {string} orderId - Order ID
   * @returns {Promise<Object|null>}
   */
  async getOrderById (orderId) {
    const orders = await this.getAllOrders();
    return orders.find(order => order.id === orderId) || null;
  }

  /**
   * Update order status
   * @param {string} orderId - Order ID
   * @param {string} status - New status
   * @returns {Promise<Object>} - Result
   */
  async updateOrderStatus (orderId, status) {
    const orders = await this.getAllOrders();
    const orderIndex = orders.findIndex(order => order.id === orderId);

    if (orderIndex === -1) {
      return {
        success: false,
        message: 'Order not found',
      };
    }

    orders[orderIndex].status = status;
    orders[orderIndex].updatedAt = new Date().toISOString();

    _StorageManager.set(this.ORDER_STORAGE_KEY, orders);

    return {
      success: true,
      message: 'Order status updated',
      order: orders[orderIndex],
    };
  }

  /**
   * Get order status options
   * @returns {Array}
   */
  getStatusOptions () {
    return [
      { value: _ORDER_STATUS.PLACED, label: 'Order Placed', color: '#6366f1' },
      { value: _ORDER_STATUS.CONFIRMED, label: 'Confirmed', color: '#10b981' },
      { value: _ORDER_STATUS.IN_TRANSIT, label: 'In Transit', color: '#f59e0b' },
      { value: _ORDER_STATUS.DELIVERED, label: 'Delivered', color: '#10b981' },
      { value: _ORDER_STATUS.CANCELLED, label: 'Cancelled', color: '#ef4444' },
    ];
  }

  /**
   * Get delivery mode options
   * @returns {Array}
   */
  getDeliveryModeOptions () {
    return [
      {
        value: _DELIVERY_MODES.IN_PERSON,
        label: 'In-Person Pickup',
        fee: this.DELIVERY_FEES[_DELIVERY_MODES.IN_PERSON] ?? 0,
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V8a2 2 0 012-2h14a2 2 0 012 2v13"/><path d="M9 21V12h6v9"/><path d="M1 21h22"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
      },
      {
        value: _DELIVERY_MODES.YANGO,
        label: 'Yango Delivery',
        fee: this.DELIVERY_FEES[_DELIVERY_MODES.YANGO] ?? 12,
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 002 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
      },
      {
        value: _DELIVERY_MODES.BOLT,
        label: 'Bolt Delivery',
        fee: this.DELIVERY_FEES[_DELIVERY_MODES.BOLT] ?? 15,
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1"/><path d="M12 17V5"/><path d="M5 17a2 2 0 104 0"/><path d="M15 17a2 2 0 104 0"/></svg>',
      },
    ];
  }

  /**
   * Get payment mode options
   * @returns {Array}
   */
  getPaymentModeOptions () {
    return [
      { value: _PAYMENT_MODES.CASH, label: 'Cash on Delivery', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><line x1="6" y1="12" x2="6.01" y2="12"/><line x1="18" y1="12" x2="18.01" y2="12"/></svg>' },
      { value: _PAYMENT_MODES.MOMO, label: 'MTN Mobile Money', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>' },
      { value: _PAYMENT_MODES.TELECEL, label: 'Telecel Cash', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 6h.01"/><path d="M8 10h8"/><path d="M8 14h8"/><path d="M8 18h4"/></svg>' },
      { value: _PAYMENT_MODES.BANK, label: 'Bank Transfer', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M3 10h18"/><path d="M12 3l9 7H3l9-7z"/><path d="M5 10v11"/><path d="M10 10v11"/><path d="M14 10v11"/><path d="M19 10v11"/></svg>' },
    ];
  }

  /**
   * Process payment (placeholder for real integration)
   * @param {string} orderId - Order ID
   * @param {string} paymentMode - Payment method
   * @returns {Promise<Object>} - Payment result
   */
  async processPayment (orderId, paymentMode) {
    const order = await this.getOrderById(orderId);

    if (!order) {
      return {
        success: false,
        error: 'Order not found',
      };
    }

    // For cash on delivery, mark as confirmed immediately
    if (paymentMode === _PAYMENT_MODES.CASH) {
      this.updateOrderStatus(orderId, _ORDER_STATUS.CONFIRMED);

      // Create delivery record if deliveryManager is available
      if (typeof deliveryManager !== 'undefined') {
        deliveryManager.createDelivery(order, order.delivery.mode, {
          address: order.delivery.address,
          instructions: order.delivery.instructions,
        });
      }

      return {
        success: true,
        message: 'Cash payment confirmed - Pay on delivery',
        transactionId: `cash_${Date.now()}`,
      };
    }

    // Simulate mobile money/bank transfer processing
    return new Promise(resolve => {
      setTimeout(() => {
        const paymentSuccess = Math.random() > 0.1; // 90% success rate simulation

        if (paymentSuccess) {
          this.updateOrderStatus(orderId, _ORDER_STATUS.CONFIRMED);

          // Create delivery record if deliveryManager is available
          if (typeof deliveryManager !== 'undefined') {
            deliveryManager.createDelivery(order, order.delivery.mode, {
              address: order.delivery.address,
              instructions: order.delivery.instructions,
            });
          }

          resolve({
            success: true,
            message: 'Payment successful',
            transactionId: `txn_${Date.now()}`,
          });
        } else {
          resolve({
            success: false,
            error: 'Payment failed. Please try again.',
          });
        }
      }, 2000); // Simulate 2s processing time
    });
  }

  /**
   * Cancel order
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} - Result
   */
  async cancelOrder (orderId) {
    const order = await this.getOrderById(orderId);

    if (!order) {
      return {
        success: false,
        error: 'Order not found',
      };
    }

    if (order.status === ORDER_STATUS.DELIVERED) {
      return {
        success: false,
        error: 'Cannot cancel a delivered order',
      };
    }

    return this.updateOrderStatus(orderId, ORDER_STATUS.CANCELLED);
  }
}

// Create singleton instance
const checkoutManager = new CheckoutManager();

export { CheckoutManager, checkoutManager };

// Make globally available for module scripts
if (typeof window !== 'undefined') {
  window.checkoutManager = checkoutManager;
}
