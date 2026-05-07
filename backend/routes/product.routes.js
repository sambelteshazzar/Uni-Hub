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
  getProductColors,
  addProductColor,
  updateProductColor,
  deleteProductColor,
} = require('../controllers/product.controller');

router.get('/', getProducts);
router.get('/seller/my-products', protect, getMyProducts);
router.get('/:id/colors', validateObjectId, getProductColors);
router.get('/:id', validateObjectId, getProduct);

router.post('/', protect, createProduct);
router.post('/:id/images', validateObjectId, protect, uploadMultiple('images', 5), uploadProductImages);
router.post('/:id/colors', validateObjectId, protect, addProductColor);
router.put('/:id/colors/:colorId', validateObjectId, protect, updateProductColor);
router.delete('/:id/colors/:colorId', validateObjectId, protect, deleteProductColor);
router.put('/:id', validateObjectId, protect, updateProduct);
router.delete('/:id', validateObjectId, protect, deleteProduct);

module.exports = router;
