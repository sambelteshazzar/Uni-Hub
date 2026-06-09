/**
* ============================================
* Product Routes
* ============================================
*/

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { uploadMultiple, uploadMultipleMemory } = require('../middleware/upload.middleware');
const { validateObjectId } = require('../middleware/sanitize.middleware');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  uploadImages,
  getProductColors,
  addProductColor,
  updateProductColor,
  deleteProductColor,
} = require('../controllers/product.controller');

router.get('/', getProducts);
router.get('/:id/colors', validateObjectId, getProductColors);
router.get('/:id', validateObjectId, getProduct);

router.post('/', protect, authorize('admin'), createProduct);
router.post('/upload', protect, authorize('admin'), uploadMultipleMemory('images', 5), uploadImages);
router.post('/:id/images', validateObjectId, protect, uploadMultiple('images', 5), uploadProductImages);
router.post('/:id/colors', validateObjectId, protect, addProductColor);
router.put('/:id/colors/:colorId', validateObjectId, protect, updateProductColor);
router.delete('/:id/colors/:colorId', validateObjectId, protect, deleteProductColor);
router.put('/:id', validateObjectId, protect, authorize('admin'), updateProduct);
router.delete('/:id', validateObjectId, protect, authorize('admin'), deleteProduct);

module.exports = router;
