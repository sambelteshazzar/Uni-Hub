/**
 * User-facing support routes (spec 2026-09-24).
 * Mounted at /api/support/tickets behind `protect`. Rate limiters live
 * here — the same rationale as deletionOtpLimiter (user.routes.js):
 * feature-scoped, user+IP keyed, explicit MemoryStore so tests can
 * resetAll(). Admin routes reuse `replyLimiter` from this module (same
 * instance, same counter).
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth.middleware');
const { validateObjectId } = require('../middleware/sanitize.middleware');
const supportController = require('../controllers/support.controller');

const router = express.Router();

const ticketStore = new rateLimit.MemoryStore();
const replyStore = new rateLimit.MemoryStore();

// Handler mirrors deletionOtpLimiter: resetTime may be missing on some
// store responses, so fall back to the window size (defense in depth).
function limitHandler (req, res, _next, options) {
  const info = req.rateLimit || {};
  const resetMs =
    info.resetTime instanceof Date
      ? info.resetTime.getTime() - Date.now()
      : (options && options.windowMs) || 60 * 60 * 1000;
  res.status(429).json({
    success: false,
    error: 'Too many requests — please try again later.',
    retryAfterSeconds: Math.max(1, Math.ceil(resetMs / 1000)),
  });
}

const ticketLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: ticketStore,
  keyGenerator: req => `${(req.user && req.user.id) || 'anon'}:${req.ip}`,
  handler: limitHandler,
});

const replyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: replyStore,
  keyGenerator: req => `${(req.user && req.user.id) || 'anon'}:${req.ip}`,
  handler: limitHandler,
});

router.use(protect);

router.post('/', ticketLimiter, supportController.createTicket);
router.get('/', supportController.listTickets);
router.get('/:id', validateObjectId, supportController.getTicket);
router.post('/:id/replies', validateObjectId, replyLimiter, supportController.replyToTicket);

router.ticketStore = ticketStore;
router.replyStore = replyStore;
router.replyLimiter = replyLimiter;

module.exports = router;
