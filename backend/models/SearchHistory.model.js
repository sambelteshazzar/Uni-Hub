const mongoose = require('mongoose');

const searchHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  query: {
    type: String,
    required: [true, 'Search query is required'],
    trim: true,
    maxlength: 200,
  },
}, {
  timestamps: true,
});

searchHistorySchema.index({ user: 1, createdAt: -1 });
searchHistorySchema.index({ user: 1, query: 1 }, { unique: true });

const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema);

module.exports = SearchHistory;
