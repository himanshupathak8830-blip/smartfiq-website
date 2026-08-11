const express = require('express');
const router = express.Router();
const portfolioService = require('../services/portfolioService');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Public Portfolio Showcase
router.get('/', async (req, res) => {
  try {
    const portfolio = await portfolioService.listPortfolio();
    res.json({
      success: true,
      data: portfolio
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve portfolio showcase.'
    });
  }
});

// Protected Admin Portfolio CRUD
router.post('/', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN', 'EDITOR']), async (req, res) => {
  try {
    const newProject = await portfolioService.createPortfolio(req.body, req.user);
    res.status(201).json({
      success: true,
      message: 'Portfolio item created successfully.',
      data: newProject
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to create portfolio item.'
    });
  }
});

router.patch('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN', 'EDITOR']), async (req, res) => {
  try {
    const updated = await portfolioService.updatePortfolio(req.params.id, req.body, req.user);
    res.json({
      success: true,
      data: updated
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to update portfolio item.'
    });
  }
});

router.delete('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
  try {
    await portfolioService.deletePortfolio(req.params.id, req.user);
    res.json({
      success: true,
      message: `Portfolio item ${req.params.id} deleted successfully.`
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to delete portfolio item.'
    });
  }
});

module.exports = router;
