const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  userEmail: String,
  userName: String,
  userRole: {
    type: String,
    enum: ['buyer', 'seller', 'admin'],
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login',
      'logout',
      'signup',
      'purchase',
      'product_create',
      'product_update',
      'product_delete',
      'review_create',
      'message_send',
      'wishlist_add',
      'profile_update',
      'password_change',
      'admin_ban',
      'admin_approve',
      'admin_reject',
      'search',
    ],
  },
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  university: String,
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info',
  },
}, {
  timestamps: true,
});

activityLogSchema.index({ user: 1 });
activityLogSchema.index({ action: 1 });
activityLogSchema.index({ createdAt: 1 });
activityLogSchema.index({ severity: 1 });
activityLogSchema.index({ user: 1, createdAt: -1 });

activityLogSchema.statics.getRecent = function (limit = 50) {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'name email');
};

activityLogSchema.statics.getByUser = function (userId, limit = 50) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

activityLogSchema.statics.getStats = function () {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  return this.aggregate([
    {
      $facet: {
        totalToday: [
          { $match: { createdAt: { $gte: startOfToday } } },
          { $count: 'count' },
        ],
        totalThisWeek: [
          { $match: { createdAt: { $gte: startOfWeek } } },
          { $count: 'count' },
        ],
        byAction: [
          { $group: { _id: '$action', count: { $sum: 1 } } },
        ],
        bySeverity: [
          { $group: { _id: '$severity', count: { $sum: 1 } } },
        ],
      },
    },
    {
      $project: {
        totalToday: { $arrayElemAt: ['$totalToday.count', 0] },
        totalThisWeek: { $arrayElemAt: ['$totalThisWeek.count', 0] },
        byAction: { $arrayToObject: { $map: { input: '$byAction', as: 'a', in: { k: '$$a._id', v: '$$a.count' } } } },
        bySeverity: { $arrayToObject: { $map: { input: '$bySeverity', as: 's', in: { k: '$$s._id', v: '$$s.count' } } } },
      },
    },
  ]);
};

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;
