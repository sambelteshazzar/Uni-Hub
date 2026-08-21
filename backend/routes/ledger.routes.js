const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { getMyBalance } = require('../controllers/ledger.controller');

const router = express.Router();

router.get('/balance', protect, getMyBalance);

module.exports = router;
