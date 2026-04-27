const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  advancedSearch,
  getSuggestions,
  getTrending,
  getSearchHistory,
  addSearchHistory,
  clearSearchHistory,
  removeSearchHistoryItem,
} = require('../controllers/search.controller');

router.get('/', advancedSearch);
router.get('/suggestions', getSuggestions);
router.get('/trending', getTrending);
router.get('/history', protect, getSearchHistory);
router.post('/history', protect, addSearchHistory);
router.delete('/history', protect, clearSearchHistory);
router.delete('/history/:query', protect, removeSearchHistoryItem);

module.exports = router;
