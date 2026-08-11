const env = require('../config/env');

class GoogleSheetsService {
  constructor() {
    this.endpointUrl = env.GOOGLE_SHEETS_URL;
    this.secret = env.GOOGLE_SHEETS_SECRET;
  }

  async sendRequest(payload) {
    if (!this.endpointUrl) {
      console.warn('[GoogleSheetsService] GOOGLE_SHEETS_URL missing');
      return { success: true, message: 'Google Sheets URL missing' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(this.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload),
        redirect: 'follow',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      try {
        return JSON.parse(responseText);
      } catch (parseErr) {
        return { success: true, message: responseText };
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('[GoogleSheetsService Notice]', err.message);
      return { success: true, warning: err.message };
    }
  }

  // --- LEADS ---
  async createLead(leadData) {
    return this.sendRequest({
      type: 'lead',
      action: 'create',
      target: 'Leads',
      ...leadData
    });
  }

  async listLeads() {
    return this.sendRequest({
      type: 'lead',
      action: 'list',
      target: 'Leads'
    });
  }

  async getLead(lead_id) {
    return this.sendRequest({
      type: 'lead',
      action: 'get',
      target: 'Leads',
      lead_id
    });
  }

  async updateLead(lead_id, updateData) {
    return this.sendRequest({
      type: 'lead',
      action: 'update',
      target: 'Leads',
      lead_id,
      ...updateData
    });
  }

  async deleteLead(lead_id) {
    return this.sendRequest({
      type: 'lead',
      action: 'delete',
      target: 'Leads',
      lead_id
    });
  }

  // --- USERS ---
  async createUser(userData) {
    return this.sendRequest({
      type: 'user',
      action: 'create',
      target: 'Users',
      ...userData
    });
  }

  async listUsers() {
    return this.sendRequest({
      type: 'user',
      action: 'list',
      target: 'Users'
    });
  }

  async getUser(user_id) {
    return this.sendRequest({
      type: 'user',
      action: 'get',
      target: 'Users',
      user_id
    });
  }

  async findUserByUsername(username) {
    return this.sendRequest({
      type: 'user',
      action: 'findByUsername',
      target: 'Users',
      username
    });
  }

  async updateUser(user_id, updateData) {
    return this.sendRequest({
      type: 'user',
      action: 'update',
      target: 'Users',
      user_id,
      ...updateData
    });
  }

  // --- SECURITY LOGS ---
  async createSecurityLog(logData) {
    return this.sendRequest({
      type: 'security',
      action: 'create',
      target: 'Security_Logs',
      ...logData
    });
  }

  async listSecurityLogs() {
    return this.sendRequest({
      type: 'security',
      action: 'list',
      target: 'Security_Logs'
    });
  }

  // --- VISITORS ---
  async upsertVisitor(visitorData) {
    return this.sendRequest({
      type: 'visitor',
      action: 'upsert',
      target: 'Visitors',
      ...visitorData
    });
  }

  async getVisitorBySession(session_id) {
    return this.sendRequest({
      type: 'visitor',
      action: 'getBySession',
      target: 'Visitors',
      session_id
    });
  }

  async listVisitors() {
    return this.sendRequest({
      type: 'visitor',
      action: 'list',
      target: 'Visitors'
    });
  }

  // --- PORTFOLIO ---
  async listPortfolio() {
    return this.sendRequest({
      type: 'portfolio',
      action: 'list',
      target: 'Portfolio'
    });
  }

  async createPortfolio(itemData) {
    return this.sendRequest({
      type: 'portfolio',
      action: 'create',
      target: 'Portfolio',
      ...itemData
    });
  }

  async updatePortfolio(id, itemData) {
    return this.sendRequest({
      type: 'portfolio',
      action: 'update',
      target: 'Portfolio',
      id,
      ...itemData
    });
  }

  async deletePortfolio(id) {
    return this.sendRequest({
      type: 'portfolio',
      action: 'delete',
      target: 'Portfolio',
      id
    });
  }

  // --- APPOINTMENTS ---
  async listAppointments() {
    return this.sendRequest({
      type: 'appointment',
      action: 'list',
      target: 'Appointments'
    });
  }

  async createAppointment(appointmentData) {
    return this.sendRequest({
      type: 'appointment',
      action: 'create',
      target: 'Appointments',
      ...appointmentData
    });
  }

  async updateAppointment(id, updateData) {
    return this.sendRequest({
      type: 'appointment',
      action: 'update',
      target: 'Appointments',
      id,
      ...updateData
    });
  }

  // --- CMS & SETTINGS ---
  async getCmsSettings() {
    return this.sendRequest({
      type: 'cms',
      action: 'get',
      target: 'Settings'
    });
  }

  async updateCmsSettings(settingsData) {
    return this.sendRequest({
      type: 'cms',
      action: 'update',
      target: 'Settings',
      ...settingsData
    });
  }
}

module.exports = new GoogleSheetsService();
