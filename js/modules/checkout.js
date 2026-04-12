/* exported checkoutManager */
// ============================================
// CHECKOUT MODULE - Order Processing
// ============================================

import StorageManager from '../utils/storage.js';
import Validator from '../utils/validation.js';
import api from '../utils/api.js';
import { STORAGE_KEYS, DELIVERY_MODES, ORDER_STATUS, PAYMENT_MODES, STORAGE_KEY_PREFIX } from '../utils/constants.js';
import cartManager from './cart.js';

// Delivery fees configuration
const DELIVERY_FEES = {
  [DELIVERY_MODES.BOLT]: 15,
  [DELIVERY_MODES.YANGO]: 12,
  [DELIVERY_MODES.IN_PERSON]: 0,
};

export class CheckoutManager {
  constructor () {
    this.ORDER_STORAGE_KEY = `${STORAGE_KEY_PREFIX}orders`;
    this.useBackend = true; // Backend API enabled
  }

  /**
   * Create a new order from cart
   * @param {Object} checkoutData - Checkout form data
   * @returns {Object} - Order result
   */
  async createOrder (checkoutData) {
    // Validate cart first
    const cartValidation = cartManager.validate();
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

    // Get current user
    const currentUser = StorageManager.get(STORAGE_KEYS.CURRENT_USER, true);
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
          items: cartManager.getItems().map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          deliveryMode: checkoutData.deliveryMode,
          deliveryAddress: checkoutData.deliveryAddress,
          deliveryInstructions: checkoutData.deliveryInstructions,
          paymentMode: checkoutData.paymentMode,
          phone: checkoutData.phone || currentUser.phone,
        };

        const response = await api.orders.create(orderData);

        if (response.success) {
          // Clear cart after successful order
          cartManager.clear();
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
    const cartSummary = cartManager.getSummary();
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
      items: cartManager.getItems().map(item => ({
        productId: item.product.id,
        title: item.product.title,
        price: item.product.price,
        quantity: item.quantity,
        seller: item.product.seller,
        image: item.product.images[0],
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
      status: ORDER_STATUS.PLACED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.saveOrder(order);
    cartManager.clear();

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

    if (data.phone && !Validator.isValidPhone(data.phone)) {
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
    return DELIVERY_FEES[mode] ?? DELIVERY_FEES[DELIVERY_MODES.IN_PERSON];
  }

  /**
   * Generate unique order ID
   * @returns {string}
   */
  generateOrderId () {
    return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate human-readable order number
   * @returns {string}
   */
  generateOrderNumber () {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
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
    StorageManager.set(this.ORDER_STORAGE_KEY, orders);
  }

  /**
   * Get all orders for current user
   * @returns {Array}
   */
  async getAllOrders () {
    // Try backend first
    if (this.useBackend) {
      try {
        const response = await api.orders.getMyOrders();
        if (response.success) {
          return response.data.orders || response.data || [];
        }
      } catch (error) {
        // Backend unavailable - use local fallback
      }
    }

    // Local fallback
    const orders = StorageManager.get(this.ORDER_STORAGE_KEY, true);
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

    StorageManager.set(this.ORDER_STORAGE_KEY, orders);

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
      { value: ORDER_STATUS.PLACED, label: 'Order Placed', color: '#6366f1' },
      { value: ORDER_STATUS.CONFIRMED, label: 'Confirmed', color: '#10b981' },
      { value: ORDER_STATUS.IN_TRANSIT, label: 'In Transit', color: '#f59e0b' },
      { value: ORDER_STATUS.DELIVERED, label: 'Delivered', color: '#10b981' },
      { value: ORDER_STATUS.CANCELLED, label: 'Cancelled', color: '#ef4444' },
    ];
  }

  /**
   * Get delivery mode options
   * @returns {Array}
   */
  getDeliveryModeOptions () {
    return [
      {
        value: DELIVERY_MODES.IN_PERSON,
        label: 'In-Person Pickup',
        fee: DELIVERY_FEES[DELIVERY_MODES.IN_PERSON],
        icon: '🏪',
      },
      {
        value: DELIVERY_MODES.YANGO,
        label: 'Yango Delivery',
        fee: DELIVERY_FEES[DELIVERY_MODES.YANGO],
        icon: '🚗',
      },
      {
        value: DELIVERY_MODES.BOLT,
        label: 'Bolt Delivery',
        fee: DELIVERY_FEES[DELIVERY_MODES.BOLT],
        icon: '🚙',
      },
    ];
  }

  /**
   * Get payment mode options
   * @returns {Array}
   */
  getPaymentModeOptions () {
    return [
      { value: PAYMENT_MODES.CASH, label: 'Cash on Delivery', icon: '💵' },
      { value: PAYMENT_MODES.MOMO, label: 'MTN Mobile Money', icon: '📱' },
      { value: PAYMENT_MODES.TELECEL, label: 'Telecel Cash', icon: '📲' },
      { value: PAYMENT_MODES.BANK, label: 'Bank Transfer', icon: '🏦' },
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
    if (paymentMode === PAYMENT_MODES.CASH) {
      this.updateOrderStatus(orderId, ORDER_STATUS.CONFIRMED);

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
          this.updateOrderStatus(orderId, ORDER_STATUS.CONFIRMED);

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
export default new CheckoutManager();
