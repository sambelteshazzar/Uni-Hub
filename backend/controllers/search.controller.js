const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { db, mapProductRow, parseJson } = require('../utils/db');

function escapeRegex (str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

exports.advancedSearch = asyncHandler(async (req, res) => {
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

  if (query && query.length >= 3) {
    filter.$or = [
      { title: { $regex: escapeRegex(query) } },
      { description: { $regex: escapeRegex(query) } },
      { category: { $regex: escapeRegex(query) } },
    ];
  } else if (query) {
    filter.$or = [
      { title: { $regex: escapeRegex(query) } },
      { description: { $regex: escapeRegex(query) } },
      { category: { $regex: escapeRegex(query) } },
    ];
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

  const results = await db('products').find(filter, { sort: sortOption, limit, skip });
  const totalResults = await db('products').countDocuments(filter);

  const totalPages = Math.ceil(totalResults / limit);

  const data = await Promise.all(results.map(async p => {
    const seller = await db('users').findById(p.seller);
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
  }));

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
});

exports.getSuggestions = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.json({ success: true, data: [] });
  }

  const products = await db('products').find(
    { status: 'active', title: { $regex: escapeRegex(q) } },
    { limit: 10, sort: { views: -1 } },
  );

  const suggestions = [];
  const titleSet = new Set();
  products.forEach(p => {
    const images = parseJson(p.images) || [];
    if (!titleSet.has(p.title.toLowerCase())) {
      titleSet.add(p.title.toLowerCase());
      suggestions.push({
        title: p.title,
        price: p.price,
        image: images[0] || null,
        category: p.category,
      });
    }
    const words = p.title.split(/\s+/);
    words.forEach(word => {
      if (word.toLowerCase().startsWith(q.toLowerCase()) && word.length > 2 && !titleSet.has(word.toLowerCase())) {
        titleSet.add(word.toLowerCase());
        suggestions.push({ title: word, price: null, image: null, category: null });
      }
    });
  });

  res.json({
    success: true,
    data: suggestions.slice(0, 8),
  });
});

exports.getTrending = asyncHandler(async (req, res) => {
  const trending = await db('products').rawAll(
    'SELECT category as _id, SUM(views) as count FROM products WHERE status = ? GROUP BY category ORDER BY count DESC LIMIT 5',
    ['active'],
  );

  const data = trending.map(t => t._id);

  res.json({
    success: true,
    data: data.length > 0 ? data : ['electronics', 'textbooks', 'appliances', 'fashion', 'accessories'],
  });
});

exports.getSearchHistory = asyncHandler(async (req, res) => {
  const history = await db('search_history').find(
    { user: req.user.id },
    { sort: { createdAt: -1 }, limit: 10 },
  );

  const data = history.map(h => h.query);

  res.json({
    success: true,
    data,
  });
});

exports.addSearchHistory = asyncHandler(async (req, res) => {
  const { query } = req.body;

  if (!query || !query.trim()) {
    throw new ApiError(400, 'Query is required');
  }

  const trimmed = query.trim();
  const existing = await db('search_history').findOne({ user: req.user.id, query: trimmed });

  if (existing) {
    await db('search_history').updateById(existing.id, { createdAt: new Date().toISOString() });
  } else {
    await db('search_history').create({ user: req.user.id, query: trimmed });
  }

  const count = await db('search_history').countDocuments({ user: req.user.id });
  if (count > 10) {
    const oldest = await db('search_history').find(
      { user: req.user.id },
      { sort: { createdAt: 1 }, limit: count },
    );
    if (oldest.length > 10) {
      const toDelete = oldest.slice(10).map(o => o.id);
      for (const id of toDelete) {
        await db('search_history').deleteById(id);
      }
    }
  }

  res.status(201).json({
    success: true,
    message: 'Search added to history',
  });
});

exports.clearSearchHistory = asyncHandler(async (req, res) => {
  await db('search_history').deleteMany({ user: req.user.id });

  res.json({
    success: true,
    message: 'Search history cleared',
  });
});

exports.removeSearchHistoryItem = asyncHandler(async (req, res) => {
  const { query } = req.params;

  await db('search_history').deleteOne({
    user: req.user.id,
    query: decodeURIComponent(query),
  });

  res.json({
    success: true,
    message: 'Search removed from history',
  });
});
