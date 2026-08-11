const express = require('express');
const router = express.Router();
const cmsService = require('../services/cmsService');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Public Services Listing
router.get('/services', async (req, res) => {
  try {
    const services = await cmsService.getServices();
    res.json({
      success: true,
      data: services
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve services.'
    });
  }
});

// Public Settings & Global CMS Config
router.get('/settings', async (req, res) => {
  try {
    const settings = await cmsService.getSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve CMS settings.'
    });
  }
});

// Protected Admin Settings Update
router.post('/settings', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
  try {
    const result = await cmsService.updateSettings(req.body, req.user);
    res.json({
      success: true,
      message: 'Global CMS settings updated successfully.',
      data: result
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to update CMS settings.'
    });
  }
});

// Admin Stats Endpoint
router.get('/stats', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      totalLeads: 42,
      dailyVisitors: 128,
      monthlyVisitors: 3450,
      indianVisitors: 2890,
      internationalVisitors: 560,
      humanPercentage: '92%',
      botPercentage: '8%',
      systemHealth: 'Operational (Google Sheets Engine)'
    }
  });
});

// Admin Charts Analytics Endpoint
router.get('/charts', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      visitors: [320, 450, 510, 480, 600, 520, 570],
      leads: [5, 8, 12, 7, 15, 9, 11]
    }
  });
});

module.exports = router;
