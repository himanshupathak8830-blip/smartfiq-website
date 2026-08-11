const bcrypt = require('bcryptjs');
const googleSheetsService = require('./googleSheets');
const securityLogService = require('./securityLogService');
const { generateUserId } = require('../utils/idGenerator');

class UserService {
  async createUser(userData, createdByAdmin) {
    if (!userData.username || !userData.password) {
      throw new Error('Username and password are required to create a user.');
    }

    const password_hash = await bcrypt.hash(userData.password, 10);
    const user_id = generateUserId();
    const now = new Date().toISOString();

    const newRecord = {
      user_id,
      username: userData.username.trim().toLowerCase(),
      password_hash,
      email: userData.email || `${userData.username}@smartfiq.website`,
      full_name: userData.full_name || userData.name || userData.username,
      role: (userData.role || 'ADMIN').toUpperCase(),
      permissions: userData.permissions || 'standard',
      status: userData.status || 'Active',
      created_by: createdByAdmin ? createdByAdmin.username : 'System',
      created_at: now,
      last_login: '',
      updated_at: now
    };

    await googleSheetsService.createUser(newRecord);

    await securityLogService.createLog({
      user_id: createdByAdmin ? createdByAdmin.id : 'SYSTEM',
      username: createdByAdmin ? createdByAdmin.username : 'System',
      action: 'CREATE_USER',
      target_type: 'USERS',
      target_id: user_id,
      details: `Created user ${newRecord.username} with role ${newRecord.role}`
    });

    return {
      user_id,
      username: newRecord.username,
      email: newRecord.email,
      full_name: newRecord.full_name,
      role: newRecord.role,
      status: newRecord.status
    };
  }

  async listUsers() {
    try {
      const res = await googleSheetsService.listUsers();
      const users = res.data || [];
      // Never return password_hash to callers
      return users.map(u => {
        const { password_hash, ...safeUser } = u;
        return safeUser;
      });
    } catch (err) {
      console.error('[UserService List Error]', err.message);
      return [];
    }
  }

  async updateUser(user_id, updateData, adminUser) {
    if (updateData.password) {
      updateData.password_hash = await bcrypt.hash(updateData.password, 10);
      delete updateData.password;
    }

    const res = await googleSheetsService.updateUser(user_id, {
      ...updateData,
      updated_at: new Date().toISOString()
    });

    await securityLogService.createLog({
      user_id: adminUser ? adminUser.id : 'SYSTEM',
      username: adminUser ? adminUser.username : 'System',
      action: 'UPDATE_USER',
      target_type: 'USERS',
      target_id: user_id,
      details: `Updated user profile/permissions for ${user_id}`
    });

    return res;
  }
}

module.exports = new UserService();
