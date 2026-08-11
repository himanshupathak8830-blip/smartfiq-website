const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
  try {
    const users = await userService.listUsers();
    res.json({
      success: true,
      data: users
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve users.'
    });
  }
});

router.post('/', requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const newUser = await userService.createUser(req.body, req.user);
    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: newUser
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to create user.'
    });
  }
});

router.patch('/:id', requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const updated = await userService.updateUser(req.params.id, req.body, req.user);
    res.json({
      success: true,
      message: 'User updated successfully.',
      data: updated
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to update user.'
    });
  }
});

module.exports = router;
