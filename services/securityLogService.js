const googleSheetsService = require('./googleSheets');
const { generateLogId } = require('../utils/idGenerator');

class SecurityLogService {
  async createLog({
    user_id = 'SYSTEM',
    username = 'System',
    action = 'ACTION',
    target_type = 'SYSTEM',
    target_id = '-',
    details = '',
    ip_address = '127.0.0.1',
    user_agent = 'Unknown',
    status = 'SUCCESS'
  }) {
    const logData = {
      log_id: generateLogId(),
      timestamp: new Date().toISOString(),
      user_id: user_id || 'SYSTEM',
      username: username || 'System',
      action: action || 'ACTION',
      target_type: target_type || 'SYSTEM',
      target_id: target_id || '-',
      details: details || '',
      ip_address: ip_address || '127.0.0.1',
      user_agent: user_agent || 'Unknown',
      status: status || 'SUCCESS'
    };

    try {
      await googleSheetsService.createSecurityLog(logData);
    } catch (err) {
      console.error('[SecurityLogService Error]', err.message);
    }
    return logData;
  }

  async listLogs() {
    try {
      const res = await googleSheetsService.listSecurityLogs();
      return res.data || [];
    } catch (err) {
      console.error('[SecurityLogService List Error]', err.message);
      return [];
    }
  }
}

module.exports = new SecurityLogService();
