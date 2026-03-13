/* exported deliveryManager */
// ============================================
// DELIVERY MODULE - Delivery Management
// ============================================

class DeliveryManager {
  constructor () {
    this.DELIVERY_STORAGE_KEY = `${STORAGE_KEY_PREFIX}deliveries`;
  }

  /**
   * Get delivery options
   * @returns {Array} - Delivery options with fees and details
   */
  getDeliveryOptions () {
    return [
      {
        id: DELIVERY_MODES.IN_PERSON,
        name: 'In-Person Pickup',
        icon: '🏪',
        description: 'Meet the seller at a convenient location',
        fee: 0,
        estimatedTime: 'Immediate',
        available: true,
      },
      {
        id: DELIVERY_MODES.YANGO,
        name: 'Yango Delivery',
        icon: '🚗',
        description: 'Affordable delivery via Yango',
        fee: 12,
        estimatedTime: '2-4 hours',
        available: true,
      },
      {
        id: DELIVERY_MODES.BOLT,
        name: 'Bolt Delivery',
        icon: '🚙',
        description: 'Fast delivery via Bolt',
        fee: 15,
        estimatedTime: '1-2 hours',
        available: true,
      },
    ];
  }

  /**
   * Calculate delivery fee
   * @param {string} mode - Delivery mode
   * @param {number} subtotal - Order subtotal
   * @returns {number} - Delivery fee
   */
  calculateFee (mode, _subtotal = 0) {
    const options = this.getDeliveryOptions();
    const option = options.find(o => o.id === mode);
    return option ? option.fee : 0;
  }

  /**
   * Get estimated delivery time
   * @param {string} mode - Delivery mode
   * @returns {string} - Estimated time
   */
  getEstimatedTime (mode) {
    const options = this.getDeliveryOptions();
    const option = options.find(o => o.id === mode);
    return option ? option.estimatedTime : 'N/A';
  }

  /**
   * Create delivery record
   * @param {Object} order - Order object
   * @param {string} mode - Delivery mode
   * @param {Object} details - Delivery details
   * @returns {Object} - Delivery record
   */
  createDelivery (order, mode, details) {
    const delivery = {
      id: this.generateDeliveryId(),
      orderId: order.id,
      orderNumber: order.orderNumber,
      mode: mode,
      status: 'pending',
      address: details.address,
      instructions: details.instructions,
      fee: this.calculateFee(mode),
      estimatedTime: this.getEstimatedTime(mode),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.saveDelivery(delivery);
    return delivery;
  }

  /**
   * Update delivery status
   * @param {string} deliveryId - Delivery ID
   * @param {string} status - New status
   * @returns {Object} - Updated delivery
   */
  updateStatus (deliveryId, status) {
    const deliveries = this.getAllDeliveries();
    const index = deliveries.findIndex(d => d.id === deliveryId);

    if (index === -1) {
      return {
        success: false,
        error: 'Delivery not found',
      };
    }

    deliveries[index].status = status;
    deliveries[index].updatedAt = new Date().toISOString();

    if (status === 'delivered') {
      deliveries[index].deliveredAt = new Date().toISOString();
    }

    StorageManager.set(this.DELIVERY_STORAGE_KEY, deliveries);

    return {
      success: true,
      delivery: deliveries[index],
    };
  }

  /**
   * Get delivery by ID
   * @param {string} deliveryId - Delivery ID
   * @returns {Object|null}
   */
  getDeliveryById (deliveryId) {
    const deliveries = this.getAllDeliveries();
    return deliveries.find(d => d.id === deliveryId) || null;
  }

  /**
   * Get delivery by order ID
   * @param {string} orderId - Order ID
   * @returns {Object|null}
   */
  getDeliveryByOrderId (orderId) {
    const deliveries = this.getAllDeliveries();
    return deliveries.find(d => d.orderId === orderId) || null;
  }

  /**
   * Get all deliveries
   * @returns {Array}
   */
  getAllDeliveries () {
    const deliveries = StorageManager.get(this.DELIVERY_STORAGE_KEY, true);
    return deliveries || [];
  }

  /**
   * Save delivery
   * @param {Object} delivery - Delivery object
   */
  saveDelivery (delivery) {
    const deliveries = this.getAllDeliveries();
    deliveries.push(delivery);
    StorageManager.set(this.DELIVERY_STORAGE_KEY, deliveries);
  }

  /**
   * Generate delivery ID
   * @returns {string}
   */
  generateDeliveryId () {
    return `delivery_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get delivery status options
   * @returns {Array}
   */
  getStatusOptions () {
    return [
      { value: 'pending', label: 'Pending', color: '#f59e0b' },
      { value: 'confirmed', label: 'Confirmed', color: '#3b82f6' },
      { value: 'picked-up', label: 'Picked Up', color: '#8b5cf6' },
      { value: 'in-transit', label: 'In Transit', color: '#f59e0b' },
      { value: 'delivered', label: 'Delivered', color: '#10b981' },
      { value: 'failed', label: 'Failed', color: '#ef4444' },
    ];
  }

  /**
   * Track delivery
   * @param {string} deliveryId - Delivery ID
   * @returns {Object} - Tracking information
   */
  trackDelivery (deliveryId) {
    const delivery = this.getDeliveryById(deliveryId);

    if (!delivery) {
      return {
        success: false,
        error: 'Delivery not found',
      };
    }

    const statusSteps = [
      { status: 'pending', label: 'Order Placed', completed: true },
      {
        status: 'confirmed',
        label: 'Delivery Confirmed',
        completed: ['confirmed', 'picked-up', 'in-transit', 'delivered'].includes(delivery.status),
      },
      {
        status: 'picked-up',
        label: 'Picked Up',
        completed: ['picked-up', 'in-transit', 'delivered'].includes(delivery.status),
      },
      {
        status: 'in-transit',
        label: 'On the Way',
        completed: ['in-transit', 'delivered'].includes(delivery.status),
      },
      { status: 'delivered', label: 'Delivered', completed: delivery.status === 'delivered' },
    ];

    return {
      success: true,
      delivery: delivery,
      tracking: {
        currentStatus: delivery.status,
        steps: statusSteps,
        estimatedTime: delivery.estimatedTime,
        address: delivery.address,
      },
    };
  }

  /**
   * Get delivery modes for display
   * @returns {Array}
   */
  getDisplayModes () {
    return [
      {
        id: DELIVERY_MODES.IN_PERSON,
        name: 'In-Person Pickup',
        shortName: 'Pickup',
        icon: '🏪',
        color: '#10b981',
        description: 'Meet at a convenient location',
      },
      {
        id: DELIVERY_MODES.YANGO,
        name: 'Yango Delivery',
        shortName: 'Yango',
        icon: '🚗',
        color: '#3b82f6',
        description: 'Affordable & reliable',
      },
      {
        id: DELIVERY_MODES.BOLT,
        name: 'Bolt Delivery',
        shortName: 'Bolt',
        icon: '🚙',
        color: '#8b5cf6',
        description: 'Fast & convenient',
      },
    ];
  }

  /**
   * Validate delivery address
   * @param {string} address - Address to validate
   * @returns {Object}
   */
  validateAddress (address) {
    if (!address || address.trim().length < 10) {
      return {
        valid: false,
        error: 'Please enter a complete delivery address',
      };
    }

    return {
      valid: true,
      message: 'Address is valid',
    };
  }

  scheduleDelivery (deliveryId, scheduledTime) {
    const delivery = this.getDeliveryById(deliveryId);

    if (!delivery) {
      return {
        success: false,
        error: 'Delivery not found',
      };
    }

    delivery.scheduledTime = scheduledTime;
    delivery.updatedAt = new Date().toISOString();

    const deliveries = this.getAllDeliveries();
    const index = deliveries.findIndex(d => d.id === deliveryId);
    deliveries[index] = delivery;
    StorageManager.set(this.DELIVERY_STORAGE_KEY, deliveries);

    return {
      success: true,
      message: 'Delivery scheduled successfully',
      delivery: delivery,
    };
  }
}

// Create singleton instance
const deliveryManager = new DeliveryManager();

export { DeliveryManager, deliveryManager };

// Export to window for cross-module access
window.deliveryManager = deliveryManager;
if (typeof dispatchEvent !== 'undefined') {
  dispatchEvent(new Event('module-loaded', { detail: 'DeliveryManager' }));
}
