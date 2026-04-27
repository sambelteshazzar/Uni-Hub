const { ApiError, asyncHandler } = require('../utils/errorHandler');
/**
 * ============================================
 * Product Controller
 * CRUD operations for products
 * ============================================
 */

const Product = require('../models/Product.model');

/**
 * @desc    Get all products with filtering, sorting, pagination
 * @route   GET /api/products
 * @access  Public
 */
exports.getProducts = async (req, res) => {
  try {
    const {
      category,
      condition,
      university,
      minPrice,
      maxPrice,
      search,
      sortBy = 'createdAt',
      page = 1,
      limit = 12,
    } = req.query;

    // Build query
    const query = { status: 'active' };

    if (category) {query.category = category;}
    if (condition) {query.condition = condition;}
    if (university) {query.university = university;}
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) {query.price.$gte = Number(minPrice);}
      if (maxPrice) {query.price.$lte = Number(maxPrice);}
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Sorting
    let sortOptions = {};
    switch (sortBy) {
    case 'price-low':
      sortOptions = { price: 1 };
      break;
    case 'price-high':
      sortOptions = { price: -1 };
      break;
    case 'newest':
      sortOptions = { createdAt: -1 };
      break;
    default:
      sortOptions = { createdAt: -1 };
    }

    // Pagination
    const skip = (page - 1) * limit;
    const total = await Product.countDocuments(query);
    const pages = Math.ceil(total / limit);

    // Execute query
    const products = await Product.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .populate('seller', 'fullName rating avatar');

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages,
        },
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch products',
    });
  }
};

/**
 * @desc    Get single product by ID
 * @route   GET /api/products/:id
 * @access  Public
 */
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'fullName email phone rating avatar university');

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    // Increment view count
    await product.incrementViews();

    res.json({
      success: true,
      data: product.getPublicProduct(),
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch product',
    });
  }
};

/**
 * @desc    Create new product
 * @route   POST /api/products
 * @access  Private
 */
exports.createProduct = async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      category,
      condition,
      images,
      deliveryModes,
      paymentModes,
    } = req.body;

    // Create product
    const product = await Product.create({
      title,
      description,
      price,
      category,
      condition,
      images,
      deliveryModes,
      paymentModes,
      seller: req.user._id,
      sellerName: req.user.fullName,
      sellerRating: req.user.rating,
      university: req.user.university,
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product.getPublicProduct(),
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create product',
    });
  }
};

/**
 * @desc    Update product
 * @route   PUT /api/products/:id
 * @access  Private (owner only)
 */
exports.updateProduct = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    // Check ownership
    if (product.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this product',
      });
    }

    // Update fields
    const allowedFields = ['title', 'description', 'price', 'category', 'condition', 'images', 'deliveryModes', 'paymentModes', 'status'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    await product.save();

    product = await Product.findById(product._id);

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product.getPublicProduct(),
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update product',
    });
  }
};

/**
 * @desc    Delete product
 * @route   DELETE /api/products/:id
 * @access  Private (owner only)
 */
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    // Check ownership
    if (product.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this product',
      });
    }

    await product.deleteOne();

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete product',
    });
  }
};

/**
 * @desc    Get products by seller
 * @route   GET /api/products/seller/my-products
 * @access  Private
 */
exports.getMyProducts = async (req, res) => {
  try {
    const { status = 'active' } = req.query;

    const products = await Product.find({
      seller: req.user._id,
      status,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        products,
        total: products.length,
      },
    });
  } catch (error) {
    console.error('Get my products error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch products',
    });
  }
};

/**
 * @desc    Upload product images to Cloudinary
 * @route   POST /api/products/:id/images
 * @access  Private (Seller only)
 */
exports.uploadProductImages = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Check ownership
  if (product.seller.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorized to update this product');
  }

  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, 'No images uploaded');
  }

  // Upload each image to Cloudinary
  const { uploadImage } = require('../utils/cloudinary.util');
  const uploadedUrls = [];

    for (const file of req.files) {
      try {
        const result = await uploadImage(file.path);
        uploadedUrls.push(result.secure_url);
      } catch (error) {
        console.error(`Failed to upload ${file.originalname}:`, error.message);
      } finally {
        const fs = require('fs');
        try { fs.unlinkSync(file.path); } catch (e) { /* ignore cleanup errors */ }
      }
    }

    if (uploadedUrls.length === 0) {
      throw new ApiError(500, 'Failed to upload any images');
    }

    // Enforce max 5 images per product
    const maxImages = 5;
    const currentCount = (product.images || []).length;
    if (currentCount + uploadedUrls.length > maxImages) {
      product.images = [...(product.images || []), ...uploadedUrls.slice(0, maxImages - currentCount)];
    } else {
      product.images = [...(product.images || []), ...uploadedUrls];
    }
  await product.save();

  res.json({
    success: true,
    message: `${uploadedUrls.length} image(s) uploaded successfully`,
    data: {
      images: uploadedUrls,
      totalImages: product.images.length,
    },
  });
});
