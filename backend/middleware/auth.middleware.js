const jwt = require('jsonwebtoken');
const { db, mapUserRow } = require('../utils/db');
const { setUserContext } = require('../utils/sentry');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = db('users').findById(decoded.id);

      if (!user) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }

  const mapped = mapUserRow(user);
  delete mapped.password;
  delete mapped.resetToken;
  delete mapped.resetTokenExpiry;
  delete mapped.passwordChangedAt;
  delete mapped.bannedBy;
  mapped._id = mapped.id;
  req.user = mapped;

  setUserContext(req.user);

  if (!mapped.isActive) {
    return res.status(401).json({ success: false, error: 'Account is deactivated' });
  }

  if (mapped.isSuspended) {
    return res.status(401).json({ success: false, error: 'Account is suspended' });
  }

      const fiveMinAgo = Date.now() - 5 * 60 * 1000;
      if (!mapped.lastLogin || new Date(mapped.lastLogin).getTime() < fiveMinAgo) {
        db('users').updateById(mapped.id, { lastLogin: new Date().toISOString() });
      }

      next();
    } catch (error) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Authentication error' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: `User role '${req.user.role}' is not authorized to access this route` });
    }
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = db('users').findById(decoded.id);
        if (user) {
          const mapped = mapUserRow(user);
          delete mapped.password;
          delete mapped.resetToken;
          delete mapped.resetTokenExpiry;
          delete mapped.passwordChangedAt;
          delete mapped.bannedBy;
          mapped._id = mapped.id;
          req.user = mapped;
        } else {
          req.user = null;
        }
      } catch (error) {
        req.user = null;
      }
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = { protect, authorize, optionalAuth };
