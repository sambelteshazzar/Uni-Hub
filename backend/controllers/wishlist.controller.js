const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { db, mapProductRow } = require('../utils/db');

exports.getWishlist = asyncHandler(async (req, res) => {
  const wishlistItems = await db('wishlists').find(
    { user: req.user.id },
    { sort: { createdAt: -1 } },
  );

  const products = [];
  for (const item of wishlistItems) {
    const product = await db('products').findById(item.product);
    if (product) {
      products.push({
        ...product,
        id: product.id || product._id,
      });
    }
  }

  res.json({
    success: true,
    data: products,
  });
});

exports.addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const product = await db('products').findById(productId);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const existing = await db('wishlists').findOne({
    user: req.user.id,
    product: productId,
  });

  if (existing) {
    throw new ApiError(409, 'Product already in wishlist');
  }

  await db('wishlists').create({
    user: req.user.id,
    product: productId,
  });

  res.status(201).json({
    success: true,
    message: 'Product added to wishlist',
  });
});

exports.removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const result = await db('wishlists').deleteOne({
    user: req.user.id,
    product: productId,
  });

  if (result === 0) {
    throw new ApiError(404, 'Product not found in wishlist');
  }

  res.json({
    success: true,
    message: 'Product removed from wishlist',
  });
});

exports.clearWishlist = asyncHandler(async (req, res) => {
  await db('wishlists').deleteMany({ user: req.user.id });

  res.json({
    success: true,
    message: 'Wishlist cleared',
  });
});