const express = require('express');
const { protect, requireVerified } = require('../middleware/auth.middleware');
const { auditMutation } = require('../middleware/audit.middleware');
const { getMyBalance, requestPayout, getMyPayouts } = require('../controllers/ledger.controller');

const router = express.Router();

router.get('/balance', protect, getMyBalance);

// Payout requests — verified sellers only; audited server-side.
router.post('/payouts', protect, requireVerified, auditMutation('payout_request'), requestPayout);
router.get('/payouts', protect, getMyPayouts);

module.exports = router;
