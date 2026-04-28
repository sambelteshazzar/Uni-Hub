const ActivityLog = require('../models/ActivityLog.model');

async function logActivity (action, user, details = {}, severity = 'info', req = null) {
  try {
    const logData = {
      action,
      details,
      severity,
    };

    if (user) {
      logData.user = user._id;
      logData.userEmail = user.email;
      logData.userName = user.fullName;
      logData.userRole = user.role;
      logData.university = user.university;
    }

    if (req) {
      logData.ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
      logData.userAgent = req.headers['user-agent'];
    }

    await ActivityLog.create(logData);
  } catch (error) {
    console.error('Activity log error:', error.message);
  }
}

module.exports = logActivity;
