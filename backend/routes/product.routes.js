/**
 * ============================================
 * Product Routes
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { uploadMultiple } = require('../middleware/upload.middleware');
const { validateObjectId } = require('../middleware/sanitize.middleware');
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
router.get('/seller/my-products', protect, getMyProducts);
router.get('/:id', validateObjectId, getProduct);

// Protected routes
router.post('/', protect, createProduct);
router.post('/:id/images', validateObjectId, protect, uploadMultiple('images', 5), uploadProductImages);
router.put('/:id', validateObjectId, protect, updateProduct);
router.delete('/:id', validateObjectId, protect, deleteProduct);

module.exports = router;
