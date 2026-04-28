const { db, generateId } = require('../utils/db');

function logActivity (action, user, details = {}, severity = 'info', req = null) {
  try {
    const logData = {
      id: generateId(),
      action,
      details: details ? JSON.stringify(details) : null,
      severity,
    };

    if (user) {
      logData.user = user.id || user._id;
      logData.userEmail = user.email;
      logData.userName = user.fullName;
      logData.userRole = user.role;
      logData.university = user.university;
    }

    if (req) {
      logData.ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
      logData.userAgent = req.headers['user-agent'];
    }

    db('activity_logs').create(logData);
  } catch (error) {
    console.error('Activity log error:', error.message);
  }
}

module.exports = logActivity;
