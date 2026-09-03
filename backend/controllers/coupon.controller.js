/**
 * ============================================
 * Coupon Controller
 * Admin CRUD + public validation flow for promotional coupons.
 *
 * Schema (backend/config/database.js):
 *   id, code (unique), type ('percent'|'fixed'), value, min_order,
 *   max_uses (0 = unlimited), used_count, valid_from, valid_until,
 *   seller_id (null = store-wide), active, description,
 *   created_by, createdAt, updatedAt
 *
 * The `validate` route is the only one called by buyers (cart/checkout):
 * it returns the discount amount without mutating the coupon. `used_count`
 * is incremented when an order is placed (order.controller.js).
 * ============================================
 */

const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { db, generateId } = require('../utils/db');
const logActivity = require('../utils/logActivity');

// Compute the discount (in GHS) for a given subtotal. Floors at 0 and
// never exceeds the subtotal — so a 100% coupon makes the order free
// but can't go negative.
function computeDiscount (coupon, subtotal) {
  const sub = Math.max(0, Number(subtotal) || 0);
  if (coupon.type === 'percent') {
    return Math.min(sub, (sub * coupon.value) / 100);
  }
  // fixed
  return Math.min(sub, Number(coupon.value) || 0);
}

function isCouponLive (coupon, now = new Date()) {
  if (!coupon || !coupon.active) {return false;}
  if (coupon.valid_from && new Date(coupon.valid_from) > now) {return false;}
  if (coupon.valid_until && new Date(coupon.valid_until) < now) {return false;}
  if (coupon.max_uses && coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) {
    return false;
  }
  return true;
}

/**
 * @desc Validate a coupon code against a subtotal
 * @route POST /api/coupons/validate
 * @access Private
 * @body { code: string, subtotal: number }
 * Returns { coupon, discount } on success; throws 400 with a reason on failure.
 */
exports.validate = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body || {};
  if (!code || typeof code !== 'string') {
    throw new ApiError(400, 'Coupon code is required');
  }
  const normalizedCode = code.trim().toUpperCase();
  const sub = Number(subtotal);
  if (!Number.isFinite(sub) || sub <= 0) {
    throw new ApiError(400, 'A positive subtotal is required');
  }

  const coupon = await db('coupons').findOne({ code: normalizedCode });
  if (!coupon) {
    throw new ApiError(404, 'Coupon not found');
  }
  if (!isCouponLive(coupon)) {
    throw new ApiError(400, 'This coupon is no longer valid');
  }
  if (coupon.min_order && sub < coupon.min_order) {
    throw new ApiError(400, `Minimum order of GHS ${coupon.min_order.toFixed(2)} required`);
  }

  const discount = computeDiscount(coupon, sub);
  res.json({
    success: true,
    data: {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      min_order: coupon.min_order,
      discount,
      description: coupon.description,
    },
  });
});

/**
 * @desc List coupons (admin)
 * @route GET /api/admin/coupons
 * @access Private (admin)
 */
exports.list = asyncHandler(async (req, res) => {
  const coupons = await db('coupons').find({}, { sort: { createdAt: -1 } });
  res.json({ success: true, data: coupons });
});

/**
 * @desc Create a coupon (admin)
 * @route POST /api/admin/coupons
 * @access Private (admin)
 */
exports.create = asyncHandler(async (req, res) => {
  const {
    code,
    type,
    value,
    min_order,
    max_uses,
    valid_from,
    valid_until,
    seller_id,
    description,
    active,
  } = req.body || {};

  if (!code || typeof code !== 'string' || code.trim().length < 2) {
    throw new ApiError(400, 'Code is required (at least 2 characters)');
  }
  if (!['percent', 'fixed'].includes(type)) {
    throw new ApiError(400, 'Type must be \'percent\' or \'fixed\'');
  }
  const numValue = Number(value);
  if (!Number.isFinite(numValue) || numValue <= 0) {
    throw new ApiError(400, 'Value must be a positive number');
  }
  if (type === 'percent' && numValue > 100) {
    throw new ApiError(400, 'Percent coupons cannot exceed 100%');
  }

  const normalizedCode = code.trim().toUpperCase();
  const existing = await db('coupons').findOne({ code: normalizedCode });
  if (existing) {
    throw new ApiError(409, 'A coupon with this code already exists');
  }

  const coupon = await db('coupons').create({
    code: normalizedCode,
    type,
    value: numValue,
    min_order: Number(min_order) || 0,
    max_uses: Number(max_uses) || 0,
    used_count: 0,
    valid_from: valid_from || null,
    valid_until: valid_until || null,
    seller_id: seller_id || null,
    active: active === false ? 0 : 1,
    description: description || '',
    created_by: req.user?.id || null,
  });

  await logActivity(
    'coupon_create',
    req.user,
    { couponId: coupon.id, code: coupon.code, type, value: numValue },
    'info',
    req,
  );

  res.status(201).json({ success: true, data: coupon });
});

/**
 * @desc Update a coupon (admin)
 * @route PUT /api/admin/coupons/:id
 * @access Private (admin)
 */
exports.update = asyncHandler(async (req, res) => {
  const coupon = await db('coupons').findById(req.params.id);
  if (!coupon) {
    throw new ApiError(404, 'Coupon not found');
  }

  const updates = {};
  const allowed = ['type', 'value', 'min_order', 'max_uses', 'valid_from', 'valid_until', 'seller_id', 'description', 'active'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      if (key === 'active') {
        updates[key] = req.body[key] ? 1 : 0;
      } else if (['value', 'min_order', 'max_uses'].includes(key)) {
        updates[key] = Number(req.body[key]) || 0;
      } else {
        updates[key] = req.body[key];
      }
    }
  }
  // Don't allow changing code or used_count via update — codes are
  // identity, and used_count is mutated by order placement.
  if (updates.type && !['percent', 'fixed'].includes(updates.type)) {
    throw new ApiError(400, 'Type must be \'percent\' or \'fixed\'');
  }
  if (updates.value !== undefined && (!Number.isFinite(updates.value) || updates.value <= 0)) {
    throw new ApiError(400, 'Value must be a positive number');
  }
  if (updates.type === 'percent' && updates.value > 100) {
    throw new ApiError(400, 'Percent coupons cannot exceed 100%');
  }

  await db('coupons').updateById(coupon.id, updates);
  const updated = await db('coupons').findById(coupon.id);

  await logActivity(
    'coupon_update',
    req.user,
    { couponId: updated.id, code: updated.code, fields: Object.keys(updates) },
    'info',
    req,
  );

  res.json({ success: true, data: updated });
});

/**
 * @desc Delete a coupon (admin)
 * @route DELETE /api/admin/coupons/:id
 * @access Private (admin)
 */
exports.remove = asyncHandler(async (req, res) => {
  const coupon = await db('coupons').findById(req.params.id);
  if (!coupon) {
    throw new ApiError(404, 'Coupon not found');
  }
  await db('coupons').deleteById(coupon.id);
  await logActivity(
    'coupon_delete',
    req.user,
    { couponId: coupon.id, code: coupon.code, used_count: coupon.used_count },
    'warning',
    req,
  );
  res.json({ success: true });
});

exports.computeDiscount = computeDiscount;
exports.isCouponLive = isCouponLive;
exports._generateId = generateId;
