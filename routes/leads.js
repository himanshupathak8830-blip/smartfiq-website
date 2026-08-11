const express = require('express');
const router = express.Router();
const leadService = require('../services/leadService');
const visitorService = require('../services/visitorService');
const { leadLimiter } = require('../middleware/rateLimiter');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Public lead submission endpoint (Form Submit)
router.post(['/', '/public'], leadLimiter, async (req, res) => {
  try {
    const visitor_session_id = req.cookies?.sf_visitor_session || req.body.visitor_session_id || '';
    const lead = await leadService.createLead(req.body, visitor_session_id);

    if (visitor_session_id && lead.lead_id) {
      visitorService.linkLeadToVisitor(visitor_session_id, lead.lead_id, lead.business_email);
    }

    res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully. Our team will contact you shortly.',
      data: {
        lead_id: lead.lead_id,
        full_name: lead.full_name,
        status: lead.status
      }
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to process inquiry submission.'
    });
  }
});

// Protected Admin Leads list
router.get('/', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const leads = await leadService.listLeads();
    res.json({
      success: true,
      data: leads
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve leads.'
    });
  }
});

// Protected Admin Lead Update
router.patch('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const result = await leadService.updateLead(req.params.id, req.body);
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to update lead.'
    });
  }
});

// Protected Admin Lead Delete
router.delete('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
  try {
    await leadService.deleteLead(req.params.id);
    res.json({
      success: true,
      message: `Lead ${req.params.id} deleted successfully.`
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to delete lead.'
    });
  }
});

module.exports = router;
