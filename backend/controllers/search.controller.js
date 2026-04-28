const { db, mapProductRow, parseJson } = require('../utils/db');

function escapeRegex (str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
        filter.$or = [
          { title: { $regex: escapeRegex(query) } },
          { description: { $regex: escapeRegex(query) } },
          { category: { $regex: escapeRegex(query) } },
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
      if (priceMin) { filter.price.$gte = parseFloat(priceMin); }
      if (priceMax) { filter.price.$lte = parseFloat(priceMax); }
    }

    let sortOption = { createdAt: -1 };
    if (sortBy === 'price-low') { sortOption = { price: 1 }; }
    else if (sortBy === 'price-high') { sortOption = { price: -1 }; }
    else if (sortBy === 'rating') { sortOption = { sellerRating: -1 }; }
    else if (sortBy === 'popular') { sortOption = { views: -1 }; }

    const pageNum = Math.max(1, parseInt(page));
    const limit = Math.min(100, Math.max(1, parseInt(pageSize)));
    const skip = (pageNum - 1) * limit;

    const results = db('products').find(filter, { sort: sortOption, limit, skip });
    const totalResults = db('products').countDocuments(filter);

    const totalPages = Math.ceil(totalResults / limit);

    const data = results.map(p => {
      const seller = db('users').findById(p.seller);
      const obj = {
        ...p,
        id: p.id || p._id,
        seller: seller ? {
          id: seller.id,
          name: seller.fullName,
          rating: seller.rating || 0,
        } : null,
      };
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

    const products = db('products').find(
      { status: 'active', title: { $regex: escapeRegex(q) } },
      { limit: 10 },
    );

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
    const trending = db('products').db.prepare(
      `SELECT category as _id, SUM(views) as count FROM products WHERE status = ? GROUP BY category ORDER BY count DESC LIMIT 5`
    ).all('active');

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
    const history = db('search_history').find(
      { user: req.user.id },
      { sort: { createdAt: -1 }, limit: 10 },
    );

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

    const trimmed = query.trim();
    const existing = db('search_history').findOne({ user: req.user.id, query: trimmed });

    if (existing) {
      db('search_history').updateById(existing.id, { createdAt: new Date().toISOString() });
    } else {
      db('search_history').create({ user: req.user.id, query: trimmed });
    }

    const count = db('search_history').countDocuments({ user: req.user.id });
    if (count > 10) {
      const oldest = db('search_history').find(
        { user: req.user.id },
        { sort: { createdAt: 1 }, limit: count },
      );
      if (oldest.length > 10) {
        const toDelete = oldest.slice(10).map(o => o.id);
        for (const id of toDelete) {
          db('search_history').deleteById(id);
        }
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
    db('search_history').deleteMany({ user: req.user.id });

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

    db('search_history').deleteOne({
      user: req.user.id,
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
