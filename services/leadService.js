const googleSheetsService = require('./googleSheets');
const { generateLeadId } = require('../utils/idGenerator');
const { validateLeadPayload } = require('../utils/validation');
const env = require('../config/env');

class LeadService {
  async sendTelegramAlert(lead) {
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;

    try {
      const text = 
        `🚨 New Lead Received! (SmartFiQ)\n\n` +
        `👤 Name: ${lead.full_name}\n` +
        `📧 Email: ${lead.business_email || 'N/A'}\n` +
        `📞 Phone: ${lead.phone_number || 'N/A'}\n` +
        `💰 Budget: ${lead.budget || 'N/A'}\n` +
        `📝 Requirement: ${lead.requirement_details || 'N/A'}\n` +
        `🌐 Source: ${lead.source || 'Website Form'}`;

      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text })
      });
    } catch (err) {
      console.warn('[Telegram Alert Warning]', err.message);
    }
  }

  async createLead(rawPayload, visitor_session_id = '') {
    const { isValid, errors, sanitized } = validateLeadPayload(rawPayload);
    if (!isValid) {
      throw new Error(errors.join(' '));
    }

    const lead_id = generateLeadId();
    const now = new Date().toISOString();

    const leadData = {
      lead_id,
      timestamp: now,
      full_name: sanitized.full_name,
      business_email: sanitized.business_email,
      phone_number: sanitized.phone_number,
      budget: sanitized.budget,
      requirement_details: sanitized.requirement_details,
      source: sanitized.source,
      status: 'New',
      priority: sanitized.business_email && sanitized.phone_number ? 'High' : 'Medium',
      assigned_to: 'Unassigned',
      country: rawPayload.country || 'Unknown',
      city: rawPayload.city || 'Unknown',
      visitor_session_id: visitor_session_id || rawPayload.visitor_session_id || '',
      created_at: now,
      updated_at: now
    };

    await googleSheetsService.createLead(leadData);
    this.sendTelegramAlert(leadData);

    return leadData;
  }

  async listLeads() {
    try {
      const res = await googleSheetsService.listLeads();
      return res.data || [];
    } catch (err) {
      console.error('[LeadService List Error]', err.message);
      return [];
    }
  }

  async updateLead(lead_id, updateData) {
    return googleSheetsService.updateLead(lead_id, {
      ...updateData,
      updated_at: new Date().toISOString()
    });
  }

  async deleteLead(lead_id) {
    return googleSheetsService.deleteLead(lead_id);
  }
}

module.exports = new LeadService();
