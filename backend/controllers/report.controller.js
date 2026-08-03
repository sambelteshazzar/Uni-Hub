const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { db, fromBool, parseJson, mapProductRow, mapOrderRow } = require('../utils/db');

exports.getDashboardStats = asyncHandler(async (req, res) => {
  const totalUsers = await db('users').countDocuments();
  const totalProducts = await db('products').countDocuments();
  const totalOrders = await db('orders').countDocuments();

  const ordersByStatus = await db('orders').rawAll(
    'SELECT status as _id, COUNT(*) as count FROM orders GROUP BY status',
  );

  const revenueRow = await db('orders').rawGet(
    'SELECT SUM(pricing_grandTotal) as total FROM orders WHERE status = \'delivered\'',
  );

  const recentOrders = await db('orders').find({}, { sort: { createdAt: -1 }, limit: 10 });
  const populatedRecentOrders = await Promise.all(recentOrders.map(async o => {
    const user = await db('users').findById(o.userId);
    const items = await db('order_items').find({ orderId: o.id });
    const mapped = mapOrderRow(o);
    return {
      ...mapped,
      _id: mapped.id,
      userId: user ? { id: user.id, fullName: user.fullName, email: user.email } : o.userId,
      items,
    };
  }));

  const topProducts = await db('products').find({ status: 'sold' }, { sort: { createdAt: -1 }, limit: 10 });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const newUsers = await db('users').countDocuments({
    createdAt: { $gte: sevenDaysAgo.toISOString() },
  });

  res.json({
    success: true,
    data: {
      overview: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue: revenueRow.total || 0,
        newUsersLast7Days: newUsers,
      },
      ordersByStatus: ordersByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      recentOrders: populatedRecentOrders,
      topProducts,
    },
  });
});

exports.getSalesReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy } = req.query;

  const allowedGroupBy = { day: '%Y-%m-%d', week: '%Y-%W', month: '%Y-%m' };
  const groupFormat = allowedGroupBy[groupBy] || allowedGroupBy.day;

  let sql = 'SELECT strftime(?, createdAt) as _id, SUM(pricing_grandTotal) as totalSales, COUNT(*) as orderCount FROM orders';
  const params = [groupFormat];

  const conditions = [];
  if (startDate) {
    conditions.push('createdAt >= ?');
    params.push(new Date(startDate).toISOString());
  }
  if (endDate) {
    conditions.push('createdAt <= ?');
    params.push(new Date(endDate).toISOString());
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' GROUP BY _id ORDER BY _id ASC';

  const salesData = await db('orders').rawAll(sql, ...params);

  res.json({
    success: true,
    data: {
      sales: salesData,
      period: { startDate, endDate, groupBy },
    },
  });
});

exports.getProductReport = asyncHandler(async (req, res) => {
  const { category, university, status } = req.query;

  const query = {};
  if (category) { query.category = category; }
  if (university) { query.university = university; }
  if (status) { query.status = status; }

  const products = await db('products').find(query, { sort: { createdAt: -1 } });

  const populatedProducts = await Promise.all(products.map(async p => {
    const seller = await db('users').findById(p.seller);
    return {
      ...mapProductRow(p),
      seller: seller ? { id: seller.id, fullName: seller.fullName, email: seller.email, rating: seller.rating } : p.seller,
    };
  }));

  const totalProducts = products.length;
  const soldProducts = products.filter(p => p.status === 'sold').length;
  const activeProducts = products.filter(p => p.status === 'active').length;

  res.json({
    success: true,
    data: {
      products: populatedProducts,
      stats: {
        total: totalProducts,
        sold: soldProducts,
        active: activeProducts,
      },
    },
  });
});

exports.getUserReport = asyncHandler(async (req, res) => {
  const { role, university, isVerified } = req.query;

  const query = {};
  if (role) { query.role = role; }
  if (university) { query.university = university; }
  if (isVerified !== undefined) { query.isVerified = isVerified === 'true' ? 1 : 0; }

  const users = await db('users').find(query, { sort: { createdAt: -1 } });

  const sanitizedUsers = users.map(u => {
    const { password, ...rest } = u;
    return rest;
  });

  res.json({
    success: true,
    data: {
      users: sanitizedUsers,
      total: sanitizedUsers.length,
    },
  });
});
