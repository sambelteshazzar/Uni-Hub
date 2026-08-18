const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  subscribe,
  confirm,
  unsubscribe,
  getStats,
  sendCampaign,
  getCampaigns,
} = require('../controllers/newsletter.controller');

const newsletterLimiter = require('express-rate-limit')({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many subscription attempts, please try again later.' },
});

router.post('/subscribe', newsletterLimiter, subscribe);
router.get('/confirm', confirm);
router.post('/unsubscribe', unsubscribe);

router.use(protect, authorize('admin'));

router.get('/stats', getStats);
router.get('/campaigns', getCampaigns);
router.post('/campaign', sendCampaign);

module.exports = router;