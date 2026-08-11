const googleSheetsService = require('./googleSheets');
const securityLogService = require('./securityLogService');
const { generatePortfolioId } = require('../utils/idGenerator');

const DEFAULT_PORTFOLIO = [
  {
    id: 'PRT-001',
    project_name: 'WhatsApp AI Customer Support Bot',
    slug: 'whatsapp-ai-customer-support-bot',
    category: 'AI Automation',
    description: 'Autonomous WhatsApp agent resolving order inquiries, refunds, and FAQs with zero human overhead.',
    image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    client_link: 'https://smartfiq.website/case-studies',
    display_order: 1,
    is_featured: true
  },
  {
    id: 'PRT-002',
    project_name: 'Lead Extraction & Email Enrichment Agent',
    slug: 'lead-extraction-email-enrichment-agent',
    category: 'Lead Automation',
    description: 'Automated scraping and LLM email enrichment pipeline driving 140+ qualified sales calls monthly.',
    image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    client_link: 'https://smartfiq.website/case-studies',
    display_order: 2,
    is_featured: true
  },
  {
    id: 'PRT-003',
    project_name: 'Executive BI Dashboard & ETL Pipeline',
    slug: 'executive-bi-dashboard-etl-pipeline',
    category: 'Analytics & BI',
    description: 'Real-time executive Looker Studio dashboard connecting distributed SQL and sheet databases.',
    image_url: 'https://assets.qlik.com/image/upload/w_2378/q_auto/qlik/glossary/dashboard-examples/seo-hero-dashboard-examples_uyouwd.png',
    client_link: 'https://smartfiq.website/case-studies',
    display_order: 3,
    is_featured: true
  }
];

class PortfolioService {
  async listPortfolio() {
    try {
      const res = await googleSheetsService.listPortfolio();
      if (res && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch (err) {
      console.warn('[PortfolioService List Notice]', err.message);
    }
    return DEFAULT_PORTFOLIO;
  }

  async createPortfolio(itemData, adminUser) {
    const id = generatePortfolioId();
    const newRecord = {
      id,
      project_name: itemData.project_name || 'New Project',
      slug: itemData.slug || (itemData.project_name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category: itemData.category || 'AI Automation',
      description: itemData.description || '',
      image_url: itemData.image_url || '',
      client_link: itemData.client_link || '',
      display_order: itemData.display_order || 1,
      is_featured: itemData.is_featured !== undefined ? itemData.is_featured : true,
      created_at: new Date().toISOString()
    };

    await googleSheetsService.createPortfolio(newRecord);

    await securityLogService.createLog({
      user_id: adminUser ? adminUser.id : 'SYSTEM',
      username: adminUser ? adminUser.username : 'System',
      action: 'CREATE_PORTFOLIO',
      target_type: 'PORTFOLIO',
      target_id: id,
      details: `Created portfolio project ${newRecord.project_name}`
    });

    return newRecord;
  }

  async updatePortfolio(id, updateData, adminUser) {
    const res = await googleSheetsService.updatePortfolio(id, updateData);

    await securityLogService.createLog({
      user_id: adminUser ? adminUser.id : 'SYSTEM',
      username: adminUser ? adminUser.username : 'System',
      action: 'UPDATE_PORTFOLIO',
      target_type: 'PORTFOLIO',
      target_id: id,
      details: `Updated portfolio item ${id}`
    });

    return res;
  }

  async deletePortfolio(id, adminUser) {
    const res = await googleSheetsService.deletePortfolio(id);

    await securityLogService.createLog({
      user_id: adminUser ? adminUser.id : 'SYSTEM',
      username: adminUser ? adminUser.username : 'System',
      action: 'DELETE_PORTFOLIO',
      target_type: 'PORTFOLIO',
      target_id: id,
      details: `Deleted portfolio item ${id}`
    });

    return res;
  }
}

module.exports = new PortfolioService();
