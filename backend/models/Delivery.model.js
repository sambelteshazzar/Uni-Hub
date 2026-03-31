/**
 * ============================================
 * Delivery Model
 * ============================================
 */

const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  // Delivery Identification
  deliveryNumber: {
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

  // Delivery Details
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

  // Delivery Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'picked-up', 'in-transit', 'delivered', 'cancelled', 'failed'],
    default: 'pending',
  },

  // Location Tracking
  location: {
    latitude: Number,
    longitude: Number,
    lastUpdated: Date,
  },

  // Delivery Agent (for future use)
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  agentName: String,
  agentPhone: String,

  // Status History
  statusHistory: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: String,
    location: {
      latitude: Number,
      longitude: Number,
    },
  }],

  // Timestamps
  pickedUpAt: Date,
  deliveredAt: Date,
}, {
  timestamps: true,
});

// Indexes for faster queries
deliverySchema.index({ orderId: 1 });
deliverySchema.index({ userId: 1, createdAt: -1 });
deliverySchema.index({ status: 1 });
deliverySchema.index({ agentId: 1 });

// Generate delivery number before saving
deliverySchema.pre('save', async function(next) {
  if (this.isNew && !this.deliveryNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.deliveryNumber = `DEL-${year}${month}${day}-${random}`;
  }
  next();
});

// Static method to get deliveries by user
deliverySchema.statics.getByUser = function(userId) {
  return this.find({ userId }).populate('orderId').sort({ createdAt: -1 });
};

// Static method to get deliveries by order
deliverySchema.statics.getByOrder = function(orderId) {
  return this.find({ orderId }).sort({ createdAt: -1 });
};

// Static method to get deliveries by status
deliverySchema.statics.getByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

// Method to update delivery status
deliverySchema.methods.updateStatus = function(newStatus, note = '') {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    note,
    location: this.location,
  });

  // Set timestamp for specific statuses
  if (newStatus === 'picked-up' && !this.pickedUpAt) {
    this.pickedUpAt = new Date();
  } else if (newStatus === 'delivered' && !this.deliveredAt) {
    this.deliveredAt = new Date();
  }

  this.updatedAt = new Date();
  return this.save();
};

// Method to update location
deliverySchema.methods.updateLocation = function(latitude, longitude) {
  this.location = {
    latitude,
    longitude,
    lastUpdated: new Date(),
  };
  return this.save();
};

const Delivery = mongoose.model('Delivery', deliverySchema);

module.exports = Delivery;
