/**
 * ============================================
 * Product Routes
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { uploadMultiple } = require('../middleware/upload.middleware');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts,
  uploadProductImages,
} = require('../controllers/product.controller');

// Public routes
router.get('/', getProducts);
router.get('/:id', getProduct);

// Protected routes
router.post('/', protect, createProduct);
router.post('/:id/images', protect, uploadMultiple('images', 5), uploadProductImages);
router.get('/seller/my-products', protect, getMyProducts);
router.put('/:id', protect, updateProduct);
router.delete('/:id', protect, deleteProduct);

module.exports = router;
