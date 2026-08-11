const googleSheetsService = require('./googleSheets');
const securityLogService = require('./securityLogService');
const { generateAppointmentId } = require('../utils/idGenerator');

class AppointmentService {
  async createAppointment(data) {
    if (!data.client_name || !data.email) {
      throw new Error('Client name and email are required to book an appointment.');
    }

    const id = generateAppointmentId();
    const now = new Date().toISOString();

    const record = {
      id,
      lead_id: data.lead_id || '',
      client_name: data.client_name || data.name || 'Client',
      email: data.email,
      phone: data.phone || '',
      service: data.service || 'AI Strategy Consultation',
      meeting_type: data.meeting_type || 'Google Meet',
      appointment_date: data.appointment_date || data.date || now,
      status: 'Confirmed',
      notes: data.notes || data.message || '',
      created_at: now
    };

    await googleSheetsService.createAppointment(record);
    return record;
  }

  async listAppointments() {
    try {
      const res = await googleSheetsService.listAppointments();
      return res.data || [];
    } catch (err) {
      console.error('[AppointmentService List Error]', err.message);
      return [];
    }
  }

  async updateAppointment(id, updateData, adminUser) {
    const res = await googleSheetsService.updateAppointment(id, updateData);

    await securityLogService.createLog({
      user_id: adminUser ? adminUser.id : 'SYSTEM',
      username: adminUser ? adminUser.username : 'System',
      action: 'UPDATE_APPOINTMENT',
      target_type: 'APPOINTMENT',
      target_id: id,
      details: `Updated appointment status to ${updateData.status || 'updated'}`
    });

    return res;
  }
}

module.exports = new AppointmentService();
