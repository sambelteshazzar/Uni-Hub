const Product = require('../models/Product.model');
const SearchHistory = require('../models/SearchHistory.model');
const { escapeRegex } = require('../middleware/sanitize.middleware');

async function advancedSearch (req, res) {
  try {
    const {
      query,
      university,
      category,
      conditions,
      priceMin,
      priceMax,
      sortBy,
      page = 1,
      pageSize = 12,
    } = req.query;

    const filter = { status: 'active' };

    if (query) {
      if (query.length >= 3) {
        filter.$text = { $search: query };
      } else {
        const regex = new RegExp(escapeRegex(query), 'i');
        filter.$or = [
          { title: regex },
          { description: regex },
          { category: regex },
        ];
      }
    }

    if (university) {
      filter.university = university;
    }

    if (category) {
      filter.category = category;
    }

    if (conditions) {
      const conditionArr = conditions.split(',').map(c => c.trim()).filter(Boolean);
      if (conditionArr.length > 0) {
        filter.condition = { $in: conditionArr };
      }
    }

    if (priceMin || priceMax) {
      filter.price = {};
      if (priceMin) filter.price.$gte = parseFloat(priceMin);
      if (priceMax) filter.price.$lte = parseFloat(priceMax);
    }

    let sortOption = { createdAt: -1 };
    if (sortBy === 'price-low') sortOption = { price: 1 };
    else if (sortBy === 'price-high') sortOption = { price: -1 };
    else if (sortBy === 'rating') sortOption = { sellerRating: -1 };
    else if (sortBy === 'popular') sortOption = { views: -1 };

    const pageNum = Math.max(1, parseInt(page));
    const limit = Math.min(100, Math.max(1, parseInt(pageSize)));
    const skip = (pageNum - 1) * limit;

    const [results, totalResults] = await Promise.all([
      Product.find(filter)
        .populate('seller', 'fullName rating')
        .sort(sortOption)
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalResults / limit);

    const data = results.map(p => {
      const obj = p.toObject();
      obj.id = obj._id.toString();
      if (obj.seller && typeof obj.seller === 'object') {
        obj.seller.id = obj.seller._id.toString();
        obj.seller.name = obj.seller.fullName;
        obj.seller.rating = obj.seller.rating || 0;
        delete obj.seller._id;
        delete obj.seller.fullName;
      }
      delete obj.__v;
      return obj;
    });

    res.json({
      success: true,
      data: {
        results: data,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalResults,
          pageSize: limit,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
        filters: { query, university, category, conditions, priceMin, priceMax, sortBy },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Search failed',
    });
  }
}

async function getSuggestions (req, res) {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const regex = new RegExp(escapeRegex(q), 'i');

    const products = await Product.find({
      status: 'active',
      title: regex,
    })
      .select('title -_id')
      .limit(10);

    const titleSet = new Set();
    products.forEach(p => {
      titleSet.add(p.title);
      const words = p.title.split(/\s+/);
      words.forEach(word => {
        if (word.toLowerCase().startsWith(q.toLowerCase())) {
          titleSet.add(word);
        }
      });
    });

    const suggestions = Array.from(titleSet).slice(0, 5);

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get suggestions',
    });
  }
}

async function getTrending (req, res) {
  try {
    const trending = await Product.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: '$views' } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const data = trending.map(t => t._id);

    res.json({
      success: true,
      data: data.length > 0 ? data : ['electronics', 'textbooks', 'appliances', 'fashion', 'accessories'],
    });
  } catch (error) {
    res.json({
      success: true,
      data: ['electronics', 'textbooks', 'appliances', 'fashion', 'accessories'],
    });
  }
}

async function getSearchHistory (req, res) {
  try {
    const history = await SearchHistory.find({ user: req.user._id })
      .select('query -_id')
      .sort({ createdAt: -1 })
      .limit(10);

    const data = history.map(h => h.query);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get search history',
    });
  }
}

async function addSearchHistory (req, res) {
  try {
    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Query is required',
      });
    }

    await SearchHistory.findOneAndUpdate(
      { user: req.user._id, query: query.trim() },
      { createdAt: new Date() },
      { upsert: true, new: true },
    );

    const count = await SearchHistory.countDocuments({ user: req.user._id });
    if (count > 10) {
      const oldest = await SearchHistory.find({ user: req.user._id })
        .sort({ createdAt: 1 })
        .skip(10);
      if (oldest.length > 0) {
        await SearchHistory.deleteMany({
          _id: { $in: oldest.map(o => o._id) },
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Search added to history',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to add search history',
    });
  }
}

async function clearSearchHistory (req, res) {
  try {
    await SearchHistory.deleteMany({ user: req.user._id });

    res.json({
      success: true,
      message: 'Search history cleared',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear search history',
    });
  }
}

async function removeSearchHistoryItem (req, res) {
  try {
    const { query } = req.params;

    await SearchHistory.deleteOne({
      user: req.user._id,
      query: decodeURIComponent(query),
    });

    res.json({
      success: true,
      message: 'Search removed from history',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to remove search from history',
    });
  }
}

module.exports = {
  advancedSearch,
  getSuggestions,
  getTrending,
  getSearchHistory,
  addSearchHistory,
  clearSearchHistory,
  removeSearchHistoryItem,
};
