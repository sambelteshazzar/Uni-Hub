const Wishlist = require('../models/Wishlist.model');
const Product = require('../models/Product.model');

async function getWishlist (req, res) {
  try {
    const wishlistItems = await Wishlist.find({ user: req.user._id })
      .populate('product')
      .sort({ createdAt: -1 });

    const products = wishlistItems
      .filter(item => item.product)
      .map(item => {
        const p = item.product.toObject();
        p.id = p._id.toString();
        delete p.__v;
        return p;
      });

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

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    const existing = await Wishlist.findOne({
      user: req.user._id,
      product: productId,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Product already in wishlist',
      });
    }

    await Wishlist.create({
      user: req.user._id,
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

    const result = await Wishlist.deleteOne({
      user: req.user._id,
      product: productId,
    });

    if (result.deletedCount === 0) {
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
    await Wishlist.deleteMany({ user: req.user._id });

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
