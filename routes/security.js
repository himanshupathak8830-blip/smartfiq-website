const express = require('express');
const router = express.Router();
const securityLogService = require('../services/securityLogService');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get(['/', '/logs'], authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
  try {
    const logs = await securityLogService.listLogs();
    res.json({
      success: true,
      data: logs
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security audit logs.'
    });
  }
});

module.exports = router;
