const { db, mapProductRow } = require('../utils/db');

async function getWishlist (req, res) {
  try {
    const wishlistItems = db('wishlists').find(
      { user: req.user.id },
      { sort: { createdAt: -1 } },
    );

    const products = [];
    for (const item of wishlistItems) {
      const product = db('products').findById(item.product);
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
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wishlist',
    });
  }
}

async function addToWishlist (req, res) {
  try {
    const { productId } = req.params;

    const product = db('products').findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    const existing = db('wishlists').findOne({
      user: req.user.id,
      product: productId,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Product already in wishlist',
      });
    }

    db('wishlists').create({
      user: req.user.id,
      product: productId,
    });

    res.status(201).json({
      success: true,
      message: 'Product added to wishlist',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to add to wishlist',
    });
  }
}

async function removeFromWishlist (req, res) {
  try {
    const { productId } = req.params;

    const result = db('wishlists').deleteOne({
      user: req.user.id,
      product: productId,
    });

    if (result === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found in wishlist',
      });
    }

    res.json({
      success: true,
      message: 'Product removed from wishlist',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to remove from wishlist',
    });
  }
}

async function clearWishlist (req, res) {
  try {
    db('wishlists').deleteMany({ user: req.user.id });

    res.json({
      success: true,
      message: 'Wishlist cleared',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear wishlist',
    });
  }
}

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
};
