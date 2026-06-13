const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { db, mapProductRow } = require('../utils/db');
const logActivity = require('../utils/logActivity');

async function populateCreator(product) {
  const creator = await db('users').findById(product.seller);
  if (creator) {
    product.seller = {
      _id: creator.id,
      id: creator.id,
      fullName: creator.fullName,
      rating: creator.rating,
      avatar: creator.avatar,
    };
  }
  product._id = product.id;
  return product;
}

async function populateCreatorDetail(product) {
  const creator = await db('users').findById(product.seller);
  if (creator) {
    product.seller = {
      _id: creator.id,
      id: creator.id,
      fullName: creator.fullName,
      email: creator.email,
      phone: creator.phone,
      rating: creator.rating,
      avatar: creator.avatar,
      university: creator.university,
    };
  }
  product._id = product.id;
  return product;
}

function getPublicProduct(product) {
  product._id = product.id;
  delete product.__v;
  return product;
}

/**
 * @desc Get all products with filtering, sorting, pagination
 * @route GET /api/products
 * @access Public
 */
exports.getProducts = asyncHandler(async (req, res) => {
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

  if (category) { query.category = category; }
  if (condition) { query.condition = condition; }
  if (university) { query.university = university; }
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) { query.price.$gte = Number(minPrice); }
    if (maxPrice) { query.price.$lte = Number(maxPrice); }
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
  const total = await db('products').countDocuments(query);
  const pages = Math.ceil(total / limit);

  // Execute query
  const products = await db('products').find(query, { sort: sortOptions, limit: Number(limit), skip });

  const populated = await Promise.all(products.map(p => populateCreator(p)));

  res.json({
    success: true,
    data: {
      products: populated,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages,
      },
    },
  });
});

/**
 * @desc Get single product by ID
 * @route GET /api/products/:id
 * @access Public
 */
exports.getProduct = asyncHandler(async (req, res) => {
  const product = await db('products').findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Increment view count
  await db('products').updateById(product.id, { views: (product.views || 0) + 1 });

  const populated = await populateCreatorDetail(product);

  res.json({
    success: true,
    data: getPublicProduct(populated),
  });
});

/**
 * @desc Create new product
 * @route POST /api/products
 * @access Private
 */
exports.createProduct = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    price,
    category,
    condition,
    variants,
    images,
    deliveryModes,
    paymentModes,
  } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    throw new ApiError(400, 'Title is required (at least 3 characters)');
  }

  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    throw new ApiError(400, 'Description is required (at least 10 characters)');
  }

  if (price === undefined || typeof price !== 'number' || price <= 0) {
    throw new ApiError(400, 'A valid price greater than 0 is required');
  }

  if (price > 100000) {
    throw new ApiError(400, 'Price cannot exceed 100,000 GHS');
  }

  const allowedCategories = ['appliances', 'hostel-items', 'accessories', 'textbooks', 'electronics', 'fashion', 'thrifts'];
  if (!category || !allowedCategories.includes(category)) {
    throw new ApiError(400, 'Valid category is required');
  }

  const allowedConditions = ['new', 'like-new', 'good', 'fair', 'excellent'];
  if (!condition || !allowedConditions.includes(condition)) {
    throw new ApiError(400, 'Valid condition is required');
  }

  if (images && !Array.isArray(images)) {
    throw new ApiError(400, 'Images must be an array');
  }

  if (images && images.length > 5) {
    throw new ApiError(400, 'Maximum 5 images allowed');
  }

  if (deliveryModes && !Array.isArray(deliveryModes)) {
    throw new ApiError(400, 'Delivery modes must be an array');
  }

  if (paymentModes && !Array.isArray(paymentModes)) {
    throw new ApiError(400, 'Payment modes must be an array');
  }

  // Create product
  const product = await db('products').create({
    title,
    description,
    price,
    category,
    condition,
    variants,
    images,
    deliveryModes,
    paymentModes,
    seller: req.user.id,
    sellerName: req.user.fullName,
    sellerRating: req.user.rating,
    university: req.user.university,
  });

  await logActivity('product_create', req.user, { productId: product.id, title: product.title, category: product.category, price: product.price }, 'info', req);

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: getPublicProduct(product),
  });
});

/**
 * @desc Update product
 * @route PUT /api/products/:id
 * @access Private (owner only)
 */
exports.updateProduct = asyncHandler(async (req, res) => {
  let product = await db('products').findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Check ownership
  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to update this product');
  }

  // Update fields
  const allowedFields = ['title', 'description', 'price', 'category', 'condition', 'variants', 'images', 'deliveryModes', 'paymentModes', 'status'];
  const updates = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  await db('products').updateById(product.id, updates);

  product = await db('products').findById(product.id);

  await logActivity('product_update', req.user, { productId: product.id, title: product.title, updatedFields: Object.keys(req.body).filter(k => allowedFields.includes(k)) }, 'info', req);

  res.json({
    success: true,
    message: 'Product updated successfully',
    data: getPublicProduct(product),
  });
});

/**
 * @desc Delete product
 * @route DELETE /api/products/:id
 * @access Private (owner only)
 */
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await db('products').findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Check ownership
  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to delete this product');
  }

  await db('products').deleteById(product.id);

  await logActivity('product_delete', req.user, { productId: req.params.id, title: product.title }, 'warning', req);

  res.json({
    success: true,
    message: 'Product deleted successfully',
  });
});

exports.uploadProductImages = asyncHandler(async (req, res) => {
  const product = await db('products').findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to update this product');
  }

  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, 'No images uploaded');
  }

  const { uploadStream } = require('../utils/cloudinary.util');
  const uploadedUrls = [];

  for (const file of req.files) {
    try {
      const result = await uploadStream(file.buffer);
      uploadedUrls.push(result.secure_url);
    } catch (error) {
      console.error(`Failed to upload ${file.originalname}:`, error.message);
    }
  }

  if (uploadedUrls.length === 0) {
    throw new ApiError(500, 'Failed to upload any images');
  }

  const maxImages = 5;
  const currentCount = (product.images || []).length;
  let newImages;
  if (currentCount + uploadedUrls.length > maxImages) {
    newImages = [...(product.images || []), ...uploadedUrls.slice(0, maxImages - currentCount)];
  } else {
    newImages = [...(product.images || []), ...uploadedUrls];
  }
  await db('products').updateById(product.id, { images: newImages });

  res.json({
    success: true,
    message: `${uploadedUrls.length} image(s) uploaded successfully`,
    data: {
      images: uploadedUrls,
      totalImages: newImages.length,
    },
  });
});

exports.getProductColors = asyncHandler(async (req, res) => {
  const product = await db('products').findById(req.params.id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  const colors = await db('product_colors').find({ product_id: req.params.id });
  res.json({ success: true, data: { colors } });
});

exports.addProductColor = asyncHandler(async (req, res) => {
  const product = await db('products').findById(req.params.id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized');
  }
  const { color_name, color_hex, image_url, stock } = req.body;
  if (!color_name || !color_hex) {
    throw new ApiError(400, 'color_name and color_hex are required');
  }
  const crypto = require('crypto');
  const color = await db('product_colors').create({
    id: crypto.randomUUID(),
    product_id: req.params.id,
    color_name,
    color_hex,
    image_url: image_url || '',
    stock: stock || 0,
  });
  res.status(201).json({ success: true, data: { color } });
});

exports.updateProductColor = asyncHandler(async (req, res) => {
  const color = await db('product_colors').findById(req.params.colorId);
  if (!color || color.product_id !== req.params.id) {
    throw new ApiError(404, 'Color not found');
  }
  const product = await db('products').findById(req.params.id);
  if (product && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized');
  }
  const allowed = ['color_name', 'color_hex', 'image_url', 'stock'];
  const updates = {};
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  await db('product_colors').updateById(req.params.colorId, updates);
  const updated = await db('product_colors').findById(req.params.colorId);
  res.json({ success: true, data: { color: updated } });
});

exports.deleteProductColor = asyncHandler(async (req, res) => {
  const color = await db('product_colors').findById(req.params.colorId);
  if (!color || color.product_id !== req.params.id) {
    throw new ApiError(404, 'Color not found');
  }
  const product = await db('products').findById(req.params.id);
  if (product && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized');
  }
  await db('product_colors').deleteById(req.params.colorId);
  res.json({ success: true, message: 'Color deleted' });
});

exports.uploadImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, 'No images uploaded');
  }

  const { uploadStream } = require('../utils/cloudinary.util');
  const uploadedUrls = [];

  for (const file of req.files) {
    try {
      const result = await uploadStream(file.buffer);
      uploadedUrls.push(result.secure_url);
    } catch (error) {
      console.error(`Failed to upload ${file.originalname}:`, error.message);
    }
  }

  if (uploadedUrls.length === 0) {
    throw new ApiError(500, 'Failed to upload any images');
  }

  res.json({
    success: true,
    message: `${uploadedUrls.length} image(s) uploaded successfully`,
    urls: uploadedUrls,
  });
});