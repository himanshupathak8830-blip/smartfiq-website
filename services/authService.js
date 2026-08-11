const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const googleSheetsService = require('./googleSheets');
const securityLogService = require('./securityLogService');

class AuthService {
  async login({ username, password, ip_address, user_agent }) {
    if (!username || !password) {
      throw new Error('Username and password are required.');
    }

    const cleanUsername = username.trim().toLowerCase();

    // Default admin fallback password hash for first boot / bootstrap
    let user = null;
    try {
      const res = await googleSheetsService.findUserByUsername(cleanUsername);
      if (res && res.data) {
        user = res.data;
      }
    } catch (err) {
      console.warn('[AuthService] Sheet lookup notice:', err.message);
    }

    // Default bootstrap superadmin credentials if Google Sheets user list is empty
    if (!user && cleanUsername === 'smartfiq') {
      const bootstrapHash = await bcrypt.hash('Smartfiq#Sec2026!Admin', 10);
      user = {
        user_id: 'USR-000001',
        username: 'smartfiq',
        password_hash: bootstrapHash,
        email: 'admin@smartfiq.website',
        full_name: 'SmartFiQ Super Admin',
        role: 'SUPER_ADMIN',
        permissions: 'all',
        status: 'Active'
      };
    }

    if (!user) {
      await securityLogService.createLog({
        user_id: 'UNKNOWN',
        username: cleanUsername,
        action: 'LOGIN_FAILED',
        target_type: 'AUTH',
        target_id: '-',
        details: 'Invalid username credentials',
        ip_address,
        user_agent,
        status: 'FAILED'
      });
      throw new Error('Invalid username or password.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await securityLogService.createLog({
        user_id: user.user_id || 'UNKNOWN',
        username: cleanUsername,
        action: 'LOGIN_FAILED',
        target_type: 'AUTH',
        target_id: user.user_id || '-',
        details: 'Incorrect password entered',
        ip_address,
        user_agent,
        status: 'FAILED'
      });
      throw new Error('Invalid username or password.');
    }

    const tokenPayload = {
      id: user.user_id,
      username: user.username,
      email: user.email,
      name: user.full_name,
      role: user.role || 'ADMIN',
      isSuperAdmin: (user.role || '').toUpperCase() === 'SUPER_ADMIN'
    };

    const token = jwt.sign(tokenPayload, env.JWT_SECRET, { expiresIn: '7d' });

    await securityLogService.createLog({
      user_id: user.user_id,
      username: user.username,
      action: 'LOGIN',
      target_type: 'AUTH',
      target_id: user.user_id,
      details: `Admin login successful as ${user.role}`,
      ip_address,
      user_agent,
      status: 'SUCCESS'
    });

    return {
      token,
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        name: user.full_name,
        role: user.role,
        isSuperAdmin: tokenPayload.isSuperAdmin
      }
    };
  }
}

module.exports = new AuthService();
