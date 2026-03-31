/**
 * ============================================
 * Report Routes
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  getDashboardStats,
  getSalesReport,
  getProductReport,
  getUserReport,
} = require('../controllers/report.controller');

// All routes are protected and admin only
router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getDashboardStats);
router.get('/sales', getSalesReport);
router.get('/products', getProductReport);
router.get('/users', getUserReport);

module.exports = router;
