/**
 * ============================================
 * Product Model
 * ============================================
 */

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // Product Information
  title: {
    type: String,
    required: [true, 'Product title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },

  // Pricing
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  currency: {
    type: String,
    default: 'GHS',
  },

  // Categorization
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'appliances',
      'hostel-items',
      'accessories',
      'textbooks',
      'electronics',
      'fashion',
      'thrifts',
    ],
  },
  condition: {
    type: String,
    required: [true, 'Condition is required'],
    enum: ['fair', 'good', 'excellent'],
  },

  // Images
  images: [{
    type: String,
    required: true,
  }],

  // Seller Information
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sellerName: {
    type: String,
    required: true,
  },
  sellerRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },

  // University
  university: {
    type: String,
    required: [true, 'University is required'],
    trim: true,
  },

  // Delivery & Payment Options
  deliveryModes: [{
    type: String,
    enum: ['bolt', 'yango', 'inperson'],
  }],
  paymentModes: [{
    type: String,
    enum: ['momo', 'telecel', 'bank', 'cash'],
  }],

  // Status
  status: {
    type: String,
    enum: ['active', 'sold', 'inactive', 'reserved'],
    default: 'active',
  },

  // Engagement
  views: {
    type: Number,
    default: 0,
  },
  likes: {
    type: Number,
    default: 0,
  },

  // Timestamps
}, {
  timestamps: true,
});

// Indexes for faster queries
productSchema.index({ category: 1, status: 1 });
productSchema.index({ university: 1, status: 1 });
productSchema.index({ seller: 1 });
productSchema.index({ title: 'text', description: 'text' }); // For text search
productSchema.index({ createdAt: -1 }); // For sorting by newest

// Static method to get products by university
productSchema.statics.getByUniversity = function (universityId, status = 'active') {
  return this.find({ university: universityId, status });
};

// Static method to get products by seller
productSchema.statics.getBySeller = function (sellerId, status = 'active') {
  return this.find({ seller: sellerId, status });
};

// Method to increment view count
productSchema.methods.incrementViews = function () {
  this.views += 1;
  return this.save();
};

// Method to get public product data
productSchema.methods.getPublicProduct = function () {
  const product = this.toObject();
  delete product.__v;
  return product;
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
