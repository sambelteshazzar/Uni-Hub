/**
 * ============================================
 * Order Model
 * ============================================
 */

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Order Identification
  orderNumber: {
    type: String,
    unique: true,
    required: true,
    index: true, // Single index definition
  },

  // Customer Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  customer: {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    university: {
      type: String,
      required: true,
    },
  },

  // Order Items
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sellerName: String,
    image: String,
  }],

  // Pricing
  pricing: {
    subtotal: {
      type: Number,
      required: true,
    },
    deliveryFee: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'GHS',
    },
  },

  // Delivery Information
  delivery: {
    mode: {
      type: String,
      required: true,
      enum: ['bolt', 'yango', 'inperson'],
    },
    address: {
      type: String,
      required: true,
    },
    instructions: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'in-transit', 'delivered', 'cancelled'],
      default: 'pending',
    },
  },

  // Payment Information
  payment: {
    mode: {
      type: String,
      required: true,
      enum: ['momo', 'telecel', 'bank', 'cash'],
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    transactionId: String,
    paidAt: Date,
  },

  // Order Status
  status: {
    type: String,
    enum: ['placed', 'confirmed', 'in-transit', 'delivered', 'cancelled'],
    default: 'placed',
  },

  // Status History (for tracking changes)
  statusHistory: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: String,
  }],

  // Timestamps
}, {
  timestamps: true,
});

// Indexes for faster queries
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'payment.status': 1 });

// Generate order number before saving
orderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.orderNumber = `UH-${year}${month}${day}-${random}`;

    // Add initial status to history
    this.statusHistory.push({
      status: this.status,
      note: 'Order placed',
    });
  }
  next();
});

// Static method to get orders by user
orderSchema.statics.getByUser = function (userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Static method to get orders by status
orderSchema.statics.getByStatus = function (status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

// Method to update order status
orderSchema.methods.updateStatus = function (newStatus, note = '') {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    note,
  });
  this.updatedAt = new Date();
  return this.save();
};

// Method to mark payment as completed
orderSchema.methods.completePayment = function (transactionId) {
  this.payment.status = 'completed';
  this.payment.transactionId = transactionId;
  this.payment.paidAt = new Date();

  if (this.status === 'placed') {
    this.status = 'confirmed';
    this.statusHistory.push({
      status: 'confirmed',
      note: 'Payment confirmed',
    });
  }

  return this.save();
};

// Method to get public order data
orderSchema.methods.getPublicOrder = function () {
  const order = this.toObject();
  delete order.__v;
  return order;
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
