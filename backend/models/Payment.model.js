/**
 * ============================================
 * Payment Model
 * ============================================
 */

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // Payment Identification
  paymentNumber: {
    type: String,
    unique: true,
  },

  // Order Reference
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },

  // User Reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Payment Details
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: 'GHS',
  },

  // Payment Method
  mode: {
    type: String,
    required: true,
    enum: ['momo', 'telecel', 'bank', 'cash'],
  },

  // Payment Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },

  // Transaction Details
  transactionId: {
    type: String,
    unique: true,
    sparse: true,
  },
  providerReference: String,

  // Timestamps
  paidAt: Date,
  verifiedAt: Date,
  refundedAt: Date,
  refundReason: String,
}, {
  timestamps: true,
});

// Indexes for faster queries
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ transactionId: 1 });

// Generate payment number before saving
paymentSchema.pre('save', async function(next) {
  if (this.isNew && !this.paymentNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.paymentNumber = `PAY-${year}${month}${day}-${random}`;
  }
  next();
});

// Static method to get payments by user
paymentSchema.statics.getByUser = function(userId) {
  return this.find({ userId }).populate('orderId').sort({ createdAt: -1 });
};

// Static method to get payments by order
paymentSchema.statics.getByOrder = function(orderId) {
  return this.find({ orderId }).sort({ createdAt: -1 });
};

// Method to mark payment as completed
paymentSchema.methods.complete = function(transactionId) {
  this.status = 'completed';
  this.transactionId = transactionId;
  this.paidAt = new Date();
  return this.save();
};

// Method to mark payment as failed
paymentSchema.methods.fail = function() {
  this.status = 'failed';
  return this.save();
};

// Method to mark payment as refunded
paymentSchema.methods.refund = function(reason) {
  this.status = 'refunded';
  this.refundReason = reason;
  this.refundedAt = new Date();
  return this.save();
};

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
