const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authLimiter } = require('../middleware/rateLimiter');
const { authenticateToken } = require('../middleware/auth');
const { getClientIp } = require('../utils/visitorParser');

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const ip_address = getClientIp(req);
    const user_agent = req.headers['user-agent'] || 'Unknown';

    const result = await authService.login({
      username,
      password,
      ip_address,
      user_agent
    });

    // Set secure HttpOnly cookie for seamless session management
    res.cookie('smartfiq_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      token: result.token,
      user: result.user
    });
  } catch (err) {
    res.status(401).json({
      success: false,
      error: err.message
    });
  }
});

router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

router.post('/logout', (req, res) => {
  res.clearCookie('smartfiq_token');
  res.json({
    success: true,
    message: 'Logged out successfully.'
  });
});

module.exports = router;
