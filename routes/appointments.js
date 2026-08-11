const express = require('express');
const router = express.Router();
const appointmentService = require('../services/appointmentService');
const { leadLimiter } = require('../middleware/rateLimiter');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Public Appointment Consultation Booking
router.post('/', leadLimiter, async (req, res) => {
  try {
    const record = await appointmentService.createAppointment(req.body);
    res.status(201).json({
      success: true,
      message: 'Consultation booked successfully. We look forward to meeting with you.',
      data: record
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to book consultation appointment.'
    });
  }
});

// Protected Admin Appointments List
router.get('/', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const list = await appointmentService.listAppointments();
    res.json({
      success: true,
      data: list
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve appointments.'
    });
  }
});

// Protected Admin Appointment Update
router.patch('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const updated = await appointmentService.updateAppointment(req.params.id, req.body, req.user);
    res.json({
      success: true,
      data: updated
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to update appointment.'
    });
  }
});

module.exports = router;
