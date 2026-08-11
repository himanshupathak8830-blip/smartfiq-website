const jwt = require('jsonwebtoken');
const env = require('../config/env');

const ROLE_PERMISSIONS = {
  SUPER_ADMIN: ['all'],
  ADMIN: ['leads', 'visitors', 'appointments', 'cms', 'portfolio', 'security', 'users'],
  MANAGER: ['leads', 'appointments', 'visitors'],
  EDITOR: ['blog', 'portfolio', 'case_studies', 'cms'],
  VIEWER: ['read_only']
};

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.smartfiq_token) {
    token = req.cookies.smartfiq_token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication credentials were not provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Session expired or invalid token. Please log in again.'
    });
  }
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const userRole = (req.user.role || 'ADMIN').toUpperCase();
    if (userRole === 'SUPER_ADMIN') {
      return next();
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `Permission denied. Required role: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  ROLE_PERMISSIONS
};
