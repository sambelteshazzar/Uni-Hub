const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../utils/errorHandler');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  exportMyData,
  deleteMyAccount,
} = require('../controllers/user.controller');

router.get('/', protect, authorize('admin'), getUsers);
// Self-service account lifecycle (spec 2026-08-23). ORDERING IS LOAD-BEARING:
// these /me routes MUST stay above the parametric /:id block — Express
// matches in registration order, and DELETE /:id (admin-only) would
// otherwise capture DELETE /me.
router.get('/me/export', protect, asyncHandler(exportMyData));
router.delete('/me', protect, asyncHandler(deleteMyAccount));
router.get('/:id', protect, getUser);
router.put('/:id', protect, authorize('admin'), updateUser);
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;
