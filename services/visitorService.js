const googleSheetsService = require('./googleSheets');
const { generateVisitorId } = require('../utils/idGenerator');
const { parseVisitorInfo } = require('../utils/visitorParser');

class VisitorService {
  async trackVisitorEvent(req, payload = {}) {
    const parsed = parseVisitorInfo(req);
    const now = new Date().toISOString();

    let session_id = payload.session_id || req.cookies?.sf_visitor_session;
    if (!session_id) {
      session_id = `sf-${Math.abs(Date.now() + Math.floor(Math.random() * 1000000))}`;
    }

    const current_page = payload.current_page || payload.page || req.headers.referer || '/';

    const visitorRecord = {
      visitor_id: payload.visitor_id || generateVisitorId(),
      session_id,
      first_seen: payload.first_seen || now,
      last_active: now,
      ip_address: parsed.ip_address,
      country: parsed.country,
      country_code: parsed.country_code,
      country_type: parsed.country_type,
      city: parsed.city,
      region: parsed.region,
      timezone: parsed.timezone,
      isp: parsed.isp,
      visitor_type: parsed.visitor_type,
      is_bot: parsed.is_bot,
      bot_name: parsed.bot_name,
      bot_category: parsed.bot_category,
      device_type: parsed.device_type,
      device_model: parsed.device_model,
      browser: parsed.browser,
      os: parsed.os,
      entry_page: payload.entry_page || current_page,
      current_page,
      exit_page: current_page,
      session_duration: payload.session_duration || 0,
      scroll_pct: payload.scroll_pct || payload.max_scroll || 0,
      page_views: payload.page_views || 1,
      pages_visited: payload.pages_visited || current_page,
      referrer: req.headers.referer || '',
      landing_source: req.headers.referer ? 'Referral' : 'Direct',
      email: payload.email || '',
      lead_id: payload.lead_id || '',
      user_agent: parsed.user_agent
    };

    // Async upsert to Google Sheets to avoid blocking request path
    googleSheetsService.upsertVisitor(visitorRecord).catch(err => {
      console.warn('[VisitorService Upsert Notice]', err.message);
    });

    return { session_id, visitor: visitorRecord };
  }

  async listVisitors() {
    try {
      const res = await googleSheetsService.listVisitors();
      return res.data || [];
    } catch (err) {
      console.error('[VisitorService List Error]', err.message);
      return [];
    }
  }

  async linkLeadToVisitor(session_id, lead_id, email) {
    if (!session_id || !lead_id) return;
    try {
      await googleSheetsService.upsertVisitor({
        session_id,
        lead_id,
        email: email || '',
        last_active: new Date().toISOString()
      });
    } catch (err) {
      console.warn('[VisitorService Link Lead Error]', err.message);
    }
  }
}

module.exports = new VisitorService();
