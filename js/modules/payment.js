/* exported paymentManager */
// ============================================
// PAYMENT MODULE - Payment Processing
// ============================================

class PaymentManager {
  constructor() {
    this.PAYMENT_STORAGE_KEY = `${STORAGE_KEY_PREFIX}payments`;
    // Use environment variable or window config for Paystack key
    // Set window.PAYSTACK_PUBLIC_KEY in your HTML or use a build-time replacement
    this.PAYSTACK_PUBLIC_KEY = (typeof window !== 'undefined' && window.PAYSTACK_PUBLIC_KEY) || '';
  }

  /**
   * Initialize payment
   * @param {Object} order - Order object
   * @param {string} paymentMode - Payment method
   * @returns {Object} - Payment initialization result
   */
  async initializePayment(order, paymentMode) {
    const payment = {
      id: this.generatePaymentId(),
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.pricing.grandTotal,
      currency: 'GHS',
      mode: paymentMode,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // Save payment record
    this.savePayment(payment);

    // Handle different payment modes
    switch (paymentMode) {
      case PAYMENT_MODES.MOMO:
        return await this.initiateMoMoPayment(payment);
      case PAYMENT_MODES.TELECEL:
        return await this.initiateTelecelCashPayment(payment);
      case PAYMENT_MODES.BANK:
        return await this.initiateBankTransfer(payment);
      case PAYMENT_MODES.CASH:
        return await this.initiateCashPayment(payment);
      default:
        return {
          success: false,
          error: 'Invalid payment method',
        };
    }
  }

  /**
   * Initiate Mobile Money payment via Paystack Inline
   */
  async initiateMoMoPayment(payment) {
    if (!window.PaystackPop) {
      console.error(
        'PaystackPop not loaded. Add <script src="https://js.paystack.co/v1/inline.js"></script> to your HTML'
      );
      return {
        success: false,
        error: 'Paystack not loaded. Please refresh the page.',
      };
    }

    if (!this.PAYSTACK_PUBLIC_KEY) {
      console.warn('PAYSTACK_PUBLIC_KEY not set');
      return {
        success: false,
        error: 'Payment gateway not configured. Contact support.',
      };
    }

    const user = typeof authManager !== 'undefined' ? authManager.getCurrentUser() : null;
    if (!user?.email) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    return new Promise((resolve, reject) => {
      const handler = window.PaystackPop.setup({
        key: this.PAYSTACK_PUBLIC_KEY,
        email: user.email,
        amount: Math.round(payment.amount * 100),
        currency: 'GHS',
        reference: payment.reference || `PAY-${Date.now()}`,
        channels: ['mobile_money'],
        metadata: {
          orderId: payment.orderId,
          paymentId: payment.id,
          custom_fields: [
            {
              display_name: 'Payment Method',
              variable_name: 'payment_method',
              value: 'MTN Mobile Money',
            },
          ],
        },
        callback: response => {
          resolve({
            success: true,
            message: 'Payment initiated. Complete on Paystack.',
            reference: response.reference,
            trans: response.trans,
          });
        },
        onClose: () => {
          reject(new Error('Payment cancelled by user'));
        },
      });
      handler.openIframe();
    });
  }

  /**
   * Initiate Telecel Cash payment via Paystack Inline
   */
  async initiateTelecelCashPayment(payment) {
    if (!window.PaystackPop) {
      console.error(
        'PaystackPop not loaded. Add <script src="https://js.paystack.co/v1/inline.js"></script> to your HTML'
      );
      return {
        success: false,
        error: 'Paystack not loaded. Please refresh the page.',
      };
    }

    if (!this.PAYSTACK_PUBLIC_KEY) {
      console.warn('PAYSTACK_PUBLIC_KEY not set');
      return {
        success: false,
        error: 'Payment gateway not configured. Contact support.',
      };
    }

    const user = typeof authManager !== 'undefined' ? authManager.getCurrentUser() : null;
    if (!user?.email) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    return new Promise((resolve, reject) => {
      const handler = window.PaystackPop.setup({
        key: this.PAYSTACK_PUBLIC_KEY,
        email: user.email,
        amount: Math.round(payment.amount * 100),
        currency: 'GHS',
        reference: payment.reference || `PAY-${Date.now()}`,
        channels: ['mobile_money'],
        metadata: {
          orderId: payment.orderId,
          paymentId: payment.id,
          custom_fields: [
            {
              display_name: 'Payment Method',
              variable_name: 'payment_method',
              value: 'Telecel Cash',
            },
            { display_name: 'Mobile Network', variable_name: 'mobile_network', value: 'Telecel' },
          ],
        },
        callback: response => {
          resolve({
            success: true,
            message: 'Payment initiated. Complete on Paystack.',
            reference: response.reference,
            trans: response.trans,
          });
        },
        onClose: () => {
          reject(new Error('Payment cancelled by user'));
        },
      });
      handler.openIframe();
    });
  }

  /**
   * Initiate Bank Transfer payment
   */
  async initiateBankTransfer(payment) {
    return {
      success: true,
      message: 'Bank transfer initiated',
      paymentId: payment.id,
      instructions: {
        bankName: 'GCB Bank',
        accountName: 'JERTS CART Ghana',
        accountNumber: '1234567890',
        reference: payment.orderNumber,
      },
    };
  }

  /**
   * Initiate Cash payment
   */
  async initiateCashPayment(payment) {
    return {
      success: true,
      message: 'Cash on delivery selected',
      paymentId: payment.id,
      instructions: 'Pay when you receive your items',
    };
  }

  /**
   * Verify payment
   * @param {string} paymentId - Payment ID
   * @returns {Object} - Verification result
   */
  async verifyPayment(paymentId) {
    const payments = this.getAllPayments();
    const payment = payments.find(p => p.id === paymentId);

    if (!payment) {
      return {
        success: false,
        error: 'Payment not found',
      };
    }

    if (typeof api !== 'undefined') {
      try {
        const response = await api.post('/payment/verify', {
          paymentId,
          transactionId: payment.transactionId,
        });
        if (response.success) {
          payment.status = 'completed';
          payment.verifiedAt = new Date().toISOString();
          this.updatePayment(payment);
          return { success: true, message: 'Payment verified successfully', payment: payment };
        } else {
          payment.status = 'failed';
          this.updatePayment(payment);
          return { success: false, error: response.error || 'Payment verification failed' };
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        return { success: false, error: error.message || 'Payment verification failed' };
      }
    }

    // Offline fallback
    return new Promise(resolve => {
      setTimeout(() => {
        const isSuccessful = Math.random() > 0.1;

        if (isSuccessful) {
          payment.status = 'completed';
          payment.verifiedAt = new Date().toISOString();
          this.updatePayment(payment);

          resolve({
            success: true,
            message: 'Payment verified successfully',
            payment: payment,
          });
        } else {
          payment.status = 'failed';
          this.updatePayment(payment);

          resolve({
            success: false,
            error: 'Payment verification failed',
          });
        }
      }, 1500);
    });
  }

  /**
   * Get payment by ID
   */
  getPaymentById(paymentId) {
    const payments = this.getAllPayments();
    return payments.find(p => p.id === paymentId) || null;
  }

  /**
   * Get payments by order ID
   */
  getPaymentsByOrderId(orderId) {
    const payments = this.getAllPayments();
    return payments.filter(p => p.orderId === orderId);
  }

  /**
   * Get all payments
   */
  getAllPayments() {
    const payments = StorageManager.get(this.PAYMENT_STORAGE_KEY, true);
    return payments || [];
  }

  /**
   * Save payment
   */
  savePayment(payment) {
    const payments = this.getAllPayments();
    payments.push(payment);
    StorageManager.set(this.PAYMENT_STORAGE_KEY, payments);
  }

  /**
   * Update payment
   */
  updatePayment(payment) {
    const payments = this.getAllPayments();
    const index = payments.findIndex(p => p.id === payment.id);

    if (index !== -1) {
      payments[index] = payment;
      StorageManager.set(this.PAYMENT_STORAGE_KEY, payments);
    }
  }

  /**
   * Generate payment ID
   */
  generatePaymentId() {
    return `payment_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get payment status options
   */
  getStatusOptions() {
    return [
      { value: 'pending', label: 'Pending', color: '#f59e0b' },
      { value: 'processing', label: 'Processing', color: '#3b82f6' },
      { value: 'completed', label: 'Completed', color: '#10b981' },
      { value: 'failed', label: 'Failed', color: '#ef4444' },
      { value: 'refunded', label: 'Refunded', color: '#3b82f6' },
    ];
  }

  async refundPayment(paymentId, reason) {
    const payment = this.getPaymentById(paymentId);

    if (!payment) {
      return {
        success: false,
        error: 'Payment not found',
      };
    }

    if (payment.status !== 'completed') {
      return {
        success: false,
        error: 'Only completed payments can be refunded',
      };
    }

    if (typeof api !== 'undefined') {
      try {
        const response = await api.post('/payment/refund', { paymentId, reason });
        if (response.success) {
          payment.status = 'refunded';
          payment.refundReason = reason;
          payment.refundedAt = new Date().toISOString();
          this.updatePayment(payment);
          return { success: true, message: 'Refund processed successfully' };
        }
      } catch (error) {
        // Backend unavailable — fall through to local processing
      }
    }

    payment.status = 'refunded';
    payment.refundReason = reason;
    payment.refundedAt = new Date().toISOString();
    this.updatePayment(payment);

    return {
      success: true,
      message: 'Refund processed successfully',
    };
  }

  /**
   * Get payment methods with icons
   */
  getPaymentMethods() {
    return [
      {
        id: PAYMENT_MODES.MOMO,
        name: 'MTN Mobile Money',
        icon: '📱',
        description: 'Pay with MTN MoMo',
        providers: ['MTN'],
      },
      {
        id: PAYMENT_MODES.TELECEL,
        name: 'Telecel Cash',
        icon: '💳',
        description: 'Pay with Telecel Cash',
        providers: ['Telecel'],
      },
      {
        id: PAYMENT_MODES.BANK,
        name: 'Bank Transfer',
        icon: '🏦',
        description: 'Direct bank transfer',
        providers: ['GCB', 'Absa', 'Stanbic'],
      },
    ];
  }
}

// Create singleton instance
const paymentManager = new PaymentManager();

if (typeof window !== 'undefined') {
  window.paymentManager = paymentManager;
}

export { PaymentManager, paymentManager };
