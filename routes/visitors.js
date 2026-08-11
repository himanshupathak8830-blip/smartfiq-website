const express = require('express');
const router = express.Router();
const visitorService = require('../services/visitorService');
const { trackingLimiter } = require('../middleware/rateLimiter');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Public tracking endpoint (Beacon / Page Exit / Scroll Event)
router.post(['/track', '/analytics'], trackingLimiter, async (req, res) => {
  try {
    const result = await visitorService.trackVisitorEvent(req, req.body);
    res.json({
      success: true,
      session_id: result.session_id
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: 'Tracking event recording error'
    });
  }
});

// Protected Admin Visitors list
router.get(['/', '/admin/visitors'], authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const visitors = await visitorService.listVisitors();
    res.json({
      success: true,
      data: visitors
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve visitor analytics.'
    });
  }
});

module.exports = router;
