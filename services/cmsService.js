const googleSheetsService = require('./googleSheets');
const securityLogService = require('./securityLogService');

const DEFAULT_SERVICES = [
  {
    id: 1,
    title: "AI Agent & Workflow Automation",
    slug: "ai-agent-workflow-automation",
    description: "Custom autonomous LLM agents and multi-step n8n/Python workflows that eliminate manual data entry, lead processing, and repetitive operations.",
    icon: "smart_toy",
    pricing_info: "Custom Enterprise Build",
    features: ["Autonomous Action Planning", "CRM & Webhook Integration", "24/7 Unattended Execution"],
    display_order: 1,
    is_active: true
  },
  {
    id: 2,
    title: "Voice & Calling AI",
    slug: "voice-calling-ai",
    description: "Human-grade conversational Voice AI bots that make outbound lead qualification calls, answer inbound inquiries, and schedule calendar appointments.",
    icon: "call",
    pricing_info: "Pay Per Qualified Call",
    features: ["Sub-500ms Response Latency", "CRM Sync & Call Summarization", "Multi-lingual Support"],
    display_order: 2,
    is_active: true
  },
  {
    id: 3,
    title: "WhatsApp & Omnichannel Bots",
    slug: "whatsapp-omnichannel-bots",
    description: "Official WhatsApp Business API bots integrated with Shopify, HubSpot, and custom databases to automate support and order tracking at 50,000+ MAU scale.",
    icon: "chat",
    pricing_info: "Monthly Scalable Tier",
    features: ["Shopify & WooCommerce Sync", "Instant Interactive FAQs", "Human Agent Handoff"],
    display_order: 3,
    is_active: true
  }
];

class CmsService {
  async getServices() {
    return DEFAULT_SERVICES;
  }

  async getSettings() {
    try {
      const res = await googleSheetsService.getCmsSettings();
      if (res && res.data) return res.data;
    } catch (err) {
      console.warn('[CmsService Get Notice]', err.message);
    }

    return {
      companyName: 'SmartFiQ',
      tagline: 'Engineering High-Concurrency AI Automation & Agentic Workflows',
      contactEmail: 'contact@smartfiq.website',
      contactPhone: '+91 99999 99999',
      primaryLocation: 'Delhi NCR, India',
      heroTitle: 'Transform Operations With Agentic AI Automation',
      heroSubtitle: 'We build autonomous AI agents, WhatsApp support bots, and executive BI dashboards to scale your business efficiency by 10x.'
    };
  }

  async updateSettings(settingsData, adminUser) {
    const res = await googleSheetsService.updateCmsSettings(settingsData);

    await securityLogService.createLog({
      user_id: adminUser ? adminUser.id : 'SYSTEM',
      username: adminUser ? adminUser.username : 'System',
      action: 'CMS_UPDATE',
      target_type: 'SETTINGS',
      target_id: 'CMS_GLOBAL',
      details: 'Updated global CMS settings & branding parameters'
    });

    return res;
  }
}

module.exports = new CmsService();
