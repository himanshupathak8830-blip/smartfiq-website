const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

let pool = null;
let usePostgres = false;

if (connectionString) {
  try {
    pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 10000
    });

    pool.on('error', (err) => {
      console.warn('PostgreSQL Pool Warning:', err.message);
    });

    usePostgres = true;
  } catch (err) {
    console.warn('⚠️ Could not initialize PostgreSQL pool. Falling back to JSON storage mode:', err.message);
    usePostgres = false;
  }
} else {
  console.warn('⚠️ DATABASE_URL environment variable is not set. Operating in JSON storage mode.');
}

// Memory JSON fallback storage for serverless environments without remote DB
const REPO_DB_FILE = path.join(__dirname, 'db.json');
const DB_FILE = process.env.VERCEL ? path.join('/tmp', 'db.json') : REPO_DB_FILE;

function getSeedData() {
  const passAdmin = bcrypt.hashSync('Smartfiq#Sec2026!Admin', 10);
  return {
    users: [
      { id: 1, username: 'smartfiq', password_hash: passAdmin, full_name: 'Super Admin', user_role: 'admin', is_super_admin: true, permissions: ['all'] }
    ],
    leads: [],
    appointments: [],
    blogs: [
      { id: 1, title: 'What is AI Automation and How Can It Grow Your Business?', slug: 'what-is-ai-automation-guide', readTime: '6 mins', excerpt: 'A breakdown of what AI automation means, the problems it solves, and how companies start.', coverImage: 'https://media.licdn.com/dms/image/v2/D4D12AQE-AiKp6gZZ9Q/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1727069319719?e=1787788800&v=beta&t=H-eMPdDuZMWH2koOoR1sE6Jsox4wQ8dGGg6QunL4lbM', status: 'Published' },
      { id: 2, title: 'How WhatsApp Automation Increases Sales by 300% in India', slug: 'whatsapp-automation-guide', readTime: '5 mins', excerpt: 'How small businesses use WhatsApp bots to handle orders and support.', coverImage: 'https://enterpriseautomation.in/wp-content/uploads/2026/08/How-WhatsApp-Automation-Can-Help-Small-Businesses-Increase-Conversions_enterpriseautomation-scaled.jpg', status: 'Published' },
      { id: 3, title: 'AI Voice Agents vs Human Support: ROI & Setup Guide', slug: 'ai-chatbots-vs-human-support', readTime: '7 mins', excerpt: 'Where chatbots outperform human agents, where they do not, and how to build a hybrid support model.', coverImage: 'https://www.nextiva.com/cdn-cgi/image/width=1300,format=auto/blog/wp-content/uploads/sites/10/2025/12/AI-Voice-Agent-Services-for-Businesses-1.webp', status: 'Published' },
      { id: 4, title: 'The Future of No-Code AI Automation for Enterprises', slug: 'ai-voice-agents-explained', readTime: '6 mins', excerpt: 'How AI phone agents are handling calls, bookings, and follow-ups.', coverImage: 'https://media.licdn.com/dms/image/v2/D4E12AQFNmb5Iel8ZCQ/article-cover_image-shrink_720_1280/B4EZY.jkqBHUAI-/0/1744806235909?e=1787788800&v=beta&t=hl-2NZrIHI8tu9WWMWMwAbqrhMC6kjvher3DM-eaFZs', status: 'Published' },
      { id: 5, title: 'Enterprise AI Security & Data Privacy Protocols', slug: 'top-processes-to-automate-with-ai', readTime: '8 mins', excerpt: 'Checklist of highest-ROI processes worth automating first.', coverImage: 'https://community.trustcloud.ai/kbuPFACeFReXReB/uploads/2025/04/Data-privacy-in-2025-What-lies-ahead-Trends-and-predictions.jpg', status: 'Published' }
    ],
    caseStudies: [
      { id: 1, title: 'WhatsApp Automation Case Study: Support at 50K+ MAU Scale', slug: 'whatsapp-automation-guide', client_name: 'E-Commerce Retail Co', problem: 'High customer support response times on WhatsApp.', solution: 'Deployed automated Meta WhatsApp Business API bot.', results: '93% response time reduction.' },
      { id: 2, title: 'Lead Extraction Agent: B2B Lead Enrichment', slug: 'lead-extraction-agent', client_name: 'B2B Sales Agency', problem: 'Manual lead enrichment burning 40+ hours per week.', solution: 'Custom web scraping agent with automated email validation.', results: '10,000+ leads processed weekly.' },
      { id: 3, title: 'Automated Data Modeling & Executive BI Dashboard', slug: 'data-modeling-bi-dashboard', client_name: 'Logistics Enterprise', problem: 'Siloed spreadsheet data delaying decision making.', solution: 'Power BI data pipeline with daily DAX metrics refresh.', results: 'Real-time executive visibility.' }
    ],
    portfolio: [
      { id: 1, title: '93% Lead Response Time Cut', desc: 'Automated WhatsApp AI Agent integrated with Hubspot CRM.', category: 'WhatsApp AI', image: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?q=80&w=600' },
      { id: 2, title: '80% Tickets Resolved Instantly', desc: 'Instagram Conversational DM workflow for support ticket automation.', category: 'Social Automation', image: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=600' },
      { id: 3, title: '140+ Meetings Booked Monthly', desc: 'AI Voice Agent connected to Calendly and automated Gmail followups.', category: 'Voice AI', image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=600' }
    ],
    services: [
      { id: 1, name: 'Website Development', slug: 'website-development', desc: 'Modern, responsive, high-converting websites tailored for your brand.', price: 'Starting at ₹14,999 / $199', icon: 'language', features: ['Responsive Design', 'SEO Optimized', 'High Conversion UI'] },
      { id: 2, name: 'WhatsApp Chatbot Setup', slug: 'whatsapp-chatbot-setup', desc: 'Automated 24/7 AI-driven customer support & lead capture on WhatsApp.', price: 'Starting at ₹9,999 / $129', icon: 'chat', features: ['24/7 AI Support', 'Instant Lead Capture', 'Custom Conversation Flows'] },
      { id: 3, name: 'Bulk WhatsApp Marketing Solutions', slug: 'bulk-whatsapp-marketing', desc: 'Reach 1000+ potential clients simultaneously with targeted campaigns.', price: 'Starting at ₹4,999 / $69', icon: 'campaign', features: ['Targeted Broadcasts', 'High Open Rates', 'Analytics & Tracking'] },
      { id: 4, name: 'Logo & Brand Identity Design', slug: 'logo-brand-identity', desc: 'High-impact logo design & visual identity to stand out from competitors.', price: 'Starting at ₹3,499 / $49', icon: 'palette', features: ['Custom Logo Design', 'Brand Guidelines', 'Social Media Assets'] },
      { id: 5, name: 'Digital Marketing & SEO', slug: 'digital-marketing-seo', desc: 'Rank higher on Google, boost traffic, and scale your online visibility.', price: 'Starting at ₹11,999/mo / $150/mo', icon: 'trending_up', features: ['Google Search Ranking', 'Content Strategy', 'Traffic Growth'] },
      { id: 6, name: 'AI Voice & Call Agents for Business', slug: 'ai-voice-agents', desc: 'Smart automated AI voice callers for inbound customer queries.', price: 'Starting at ₹19,999 / $249', icon: 'record_voice_over', features: ['Inbound & Outbound Calls', 'Humanlike Tone', 'CRM Sync'] },
      { id: 7, name: 'Custom CRM Systems', slug: 'custom-crm-systems', desc: 'Streamline lead management, client tracking, and sales pipelines.', price: 'Starting at ₹24,999 / $299', icon: 'grid_view', features: ['Lead Pipeline Management', 'Client Tracking', 'Automated Follow-ups'] },
      { id: 8, name: 'Gym Management System', slug: 'gym-management-system', desc: 'Complete software for member attendance, subscriptions, and automated reminders.', price: 'Starting at ₹14,999 / $199', icon: 'fitness_center', features: ['Member Attendance', 'Subscription Tracking', 'Automated Reminders'] }
    ],
    team: [
      { id: 1, name: 'Himanshu Pathak', role: 'Founder & Agentic AI App Developer', bio: 'Founder of SmartFiQ. Specializes in Agentic AI architecture, app development, LLM orchestration, and high-concurrency business automation.', image: 'https://media.licdn.com/dms/image/v2/D5603AQF3kYT7udRwtQ/profile-displayphoto-crop_800_800/B56Z335B8WIQAM-/0/1777980421180?e=1787788800&v=beta&t=fOfgwNLU04_HlzvnnW0mbeC1oncH36wdCeq2AXj2pcw', linkedin: 'https://www.linkedin.com/in/himanshu-pathak-33680b340', skills: ['Agentic AI', 'App Developer', 'AI Automation', 'LLMs'], revenue: '₹5.2L', leads: 42, attendance: '100%', kpi: '5.0/5' },
      { id: 2, name: 'Aman Saini', role: 'RAG, Gen AI & Agentic AI Specialist', bio: 'Specializes in Retrieval-Augmented Generation (RAG), Generative AI systems, Agentic AI workflows, and Data Science pipelines.', image: 'https://media.licdn.com/dms/image/v2/D5603AQGMA1kza26zGw/profile-displayphoto-crop_800_800/B56Z4afWPcK0AI-/0/1778560886838?e=1787788800&v=beta&t=zaAuHg11_MG7nNsOMpeXsm7Hopgtik57zG2_fpF9qJk', linkedin: 'https://www.linkedin.com/in/aman-saini-912850372', skills: ['RAG', 'Gen AI', 'Agentic AI', 'Data Science'], revenue: '₹3.8L', leads: 38, attendance: '99%', kpi: '4.9/5' },
      { id: 3, name: 'Amit Kumar', role: 'Python Developer & Web Scraping Specialist', bio: 'Specializes in Python backend development, large-scale web scraping, lead data extraction pipelines, and automated data processing.', image: 'https://media.licdn.com/dms/image/v2/D4D03AQGXcUYkF-KGxw/profile-displayphoto-crop_800_800/B4DZif6r_iHsAI-/0/1755029620435?e=1787788800&v=beta&t=Te_n4wEWpZkUdF0UNQNTw-phzA4eizSsm-pdxjE-wbU', linkedin: 'https://www.linkedin.com/in/amit-k-942b8b239', skills: ['Python', 'Web Scraping', 'Data Extraction', 'APIs'], revenue: '₹3.1L', leads: 29, attendance: '98%', kpi: '4.8/5' }
    ],
    cms: {
      brandName: 'Smartfiq',
      heroTitle: 'Automate Your <span class="lava-gradient-text">Operations</span> &amp; Cut Manual Workload by 80%',
      heroSubtitle: 'We build intelligent AI voice agents, WhatsApp automations, and custom CRM systems that work 24/7 to nurture leads, answer support, and scale revenue.',
      heroCtaText: 'Book Free AI Consultation'
    },
    proposals: [],
    invoices: [],
    securityLogs: [],
    visitors: []
  };
}

let memDb = getSeedData();

function readJsonDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {}
  return memDb;
}

function writeJsonDb(data) {
  memDb = data;
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {}
}

async function query(text, params) {
  if (!usePostgres || !pool) {
    throw new Error('PostgreSQL disabled');
  }
  const res = await pool.query(text, params);
  return res;
}

// -------------------------------------------------------------------
// 1. USERS TABLE
// -------------------------------------------------------------------
async function getUsers() {
  if (usePostgres) {
    try {
      const res = await query(`SELECT id, username, email, full_name, user_role, is_super_admin, permissions, is_active, last_login, created_at, updated_at FROM users ORDER BY id ASC;`);
      return res.rows;
    } catch (err) { console.warn('PG getUsers fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  return (dbJson.users || []).map(u => ({ id: u.id, username: u.username, full_name: u.full_name || u.name, user_role: u.user_role || u.roleTitle || 'admin', is_super_admin: !!u.is_super_admin, permissions: u.permissions || ['all'] }));
}

async function findUserByUsername(username) {
  if (!username) return null;
  if (usePostgres) {
    try {
      const res = await query(`SELECT * FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1;`, [username.trim()]);
      if (res.rows[0]) return res.rows[0];
    } catch (err) { console.warn('PG findUserByUsername fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  const u = (dbJson.users || []).find(x => x.username.toLowerCase() === username.trim().toLowerCase());
  if (!u) return null;
  return { id: u.id, username: u.username, password_hash: u.password_hash || u.password, full_name: u.full_name || u.name, user_role: u.user_role || u.roleTitle || 'admin', is_super_admin: !!u.is_super_admin, permissions: u.permissions || ['all'] };
}

async function findUserById(id) {
  if (!id) return null;
  if (usePostgres) {
    try {
      const res = await query(`SELECT id, username, email, full_name, user_role, is_super_admin, permissions, is_active, last_login, created_at, updated_at FROM users WHERE id = $1 LIMIT 1;`, [id]);
      if (res.rows[0]) return res.rows[0];
    } catch (err) { console.warn('PG findUserById fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  const u = (dbJson.users || []).find(x => String(x.id) === String(id));
  if (!u) return null;
  return { id: u.id, username: u.username, full_name: u.full_name || u.name, user_role: u.user_role || u.roleTitle || 'admin', is_super_admin: !!u.is_super_admin, permissions: u.permissions || ['all'] };
}

async function createUser(user) {
  if (usePostgres) {
    try {
      const res = await query(`
        INSERT INTO users (username, email, password_hash, full_name, user_role, is_super_admin, permissions)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, username, email, full_name, user_role, is_super_admin, permissions, is_active, created_at;
      `, [user.username, user.email || null, user.password_hash, user.full_name || user.name || 'User', user.user_role || 'admin', !!user.is_super_admin, user.permissions || ['overview']]);
      return res.rows[0];
    } catch (err) { console.warn('PG createUser fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  const newId = (dbJson.users || []).length + 1;
  const newUser = { id: newId, username: user.username, password_hash: user.password_hash, full_name: user.full_name || user.name, user_role: user.user_role || 'admin', is_super_admin: !!user.is_super_admin, permissions: user.permissions || ['overview'] };
  dbJson.users.push(newUser);
  writeJsonDb(dbJson);
  return newUser;
}

async function updateUser(id, updates) {
  if (usePostgres) {
    try {
      const fields = [];
      const values = [];
      let idx = 1;
      if (updates.username) { fields.push(`username = $${idx++}`); values.push(updates.username); }
      if (updates.email) { fields.push(`email = $${idx++}`); values.push(updates.email); }
      if (updates.password_hash) { fields.push(`password_hash = $${idx++}`); values.push(updates.password_hash); }
      if (updates.full_name || updates.name) { fields.push(`full_name = $${idx++}`); values.push(updates.full_name || updates.name); }
      if (updates.user_role) { fields.push(`user_role = $${idx++}`); values.push(updates.user_role); }
      if (typeof updates.is_super_admin === 'boolean') { fields.push(`is_super_admin = $${idx++}`); values.push(updates.is_super_admin); }
      if (updates.permissions) { fields.push(`permissions = $${idx++}`); values.push(updates.permissions); }
      if (updates.last_login) { fields.push(`last_login = $${idx++}`); values.push(updates.last_login); }
      fields.push(`updated_at = NOW()`);
      values.push(id);
      const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, username, email, full_name, user_role, is_super_admin, permissions, is_active;`;
      const res = await query(sql, values);
      return res.rows[0];
    } catch (err) { console.warn('PG updateUser fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  const u = (dbJson.users || []).find(x => String(x.id) === String(id));
  if (u) Object.assign(u, updates);
  writeJsonDb(dbJson);
  return u;
}

async function deleteUser(id) {
  if (usePostgres) {
    try {
      await query(`DELETE FROM users WHERE id = $1;`, [id]);
      return;
    } catch (err) { console.warn('PG deleteUser fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  dbJson.users = (dbJson.users || []).filter(u => String(u.id) !== String(id));
  writeJsonDb(dbJson);
}

// -------------------------------------------------------------------
// 2. LEADS & 3. LEAD_NOTES TABLE
// -------------------------------------------------------------------
async function getLeads() {
  if (usePostgres) {
    try {
      const res = await query(`
        SELECT l.*, 
               u.full_name AS assigned_to_name,
               COALESCE(
                 (SELECT json_agg(json_build_object('id', n.id, 'note', n.note, 'created_at', n.created_at, 'user_id', n.user_id)) 
                  FROM lead_notes n WHERE n.lead_id = l.id), '[]'::json
               ) AS notes_history
        FROM leads l
        LEFT JOIN users u ON l.assigned_to = u.id
        ORDER BY l.created_at DESC;
      `);
      return res.rows.map(r => ({
        ...r,
        assignedTo: r.assigned_to_name || 'Unassigned',
        aiScore: r.lead_score,
        timestamp: r.created_at
      }));
    } catch (err) { console.warn('PG getLeads fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  return dbJson.leads || [];
}

async function createLead(lead) {
  if (usePostgres) {
    try {
      const res = await query(`
        INSERT INTO leads (name, email, phone, company, message, budget, source, status, priority, lead_score, ai_summary, assigned_to)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *;
      `, [
        lead.name || lead.fullName || 'Anonymous Lead',
        lead.email || null,
        lead.phone || null,
        lead.company || null,
        lead.message || lead.requirements || '',
        lead.budget || null,
        lead.source || 'Hero Form',
        lead.status || 'new',
        lead.priority || 'normal',
        lead.lead_score || lead.aiScore || 50,
        lead.ai_summary || null,
        lead.assigned_to || null
      ]);
      return res.rows[0];
    } catch (err) { console.warn('PG createLead fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  const newLead = {
    id: Date.now(),
    name: lead.name || lead.fullName || 'Anonymous Lead',
    email: lead.email || '',
    phone: lead.phone || '',
    budget: lead.budget || '',
    message: lead.message || lead.requirements || '',
    source: lead.source || 'Hero Form',
    status: lead.status || 'New',
    aiScore: lead.lead_score || lead.aiScore || 50,
    timestamp: new Date().toISOString()
  };
  dbJson.leads.unshift(newLead);
  writeJsonDb(dbJson);
  return newLead;
}

async function updateLead(id, updates) {
  if (usePostgres) {
    try {
      const fields = [];
      const values = [];
      let idx = 1;
      if (updates.status) { fields.push(`status = $${idx++}`); values.push(updates.status); }
      if (updates.priority) { fields.push(`priority = $${idx++}`); values.push(updates.priority); }
      if (updates.aiScore || updates.lead_score) { fields.push(`lead_score = $${idx++}`); values.push(updates.aiScore || updates.lead_score); }
      if (updates.ai_summary) { fields.push(`ai_summary = $${idx++}`); values.push(updates.ai_summary); }
      if (updates.assigned_to) { fields.push(`assigned_to = $${idx++}`); values.push(updates.assigned_to); }
      fields.push(`updated_at = NOW()`);
      values.push(id);
      const res = await query(`UPDATE leads SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *;`, values);
      return res.rows[0];
    } catch (err) { console.warn('PG updateLead fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  const l = (dbJson.leads || []).find(x => String(x.id) === String(id));
  if (l) Object.assign(l, updates);
  writeJsonDb(dbJson);
  return l;
}

async function deleteLead(id) {
  if (usePostgres) {
    try {
      await query(`DELETE FROM leads WHERE id = $1;`, [id]);
      return;
    } catch (err) { console.warn('PG deleteLead fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  dbJson.leads = (dbJson.leads || []).filter(l => String(l.id) !== String(id));
  writeJsonDb(dbJson);
}

async function addLeadNote(leadId, noteText, userId = null) {
  if (usePostgres) {
    try {
      const res = await query(`
        INSERT INTO lead_notes (lead_id, user_id, note)
        VALUES ($1, $2, $3)
        RETURNING *;
      `, [leadId, userId, noteText]);
      return res.rows[0];
    } catch (err) { console.warn('PG addLeadNote fallback:', err.message); }
  }
  return { id: Date.now(), lead_id: leadId, note: noteText, created_at: new Date() };
}

// -------------------------------------------------------------------
// 4. APPOINTMENTS TABLE
// -------------------------------------------------------------------
async function getAppointments() {
  if (usePostgres) {
    try {
      const res = await query(`
        SELECT a.*, l.name AS lead_name, l.email AS lead_email
        FROM appointments a
        LEFT JOIN leads l ON a.lead_id = l.id
        ORDER BY a.appointment_date DESC;
      `);
      return res.rows.map(r => ({
        id: r.id,
        clientName: r.client_name || r.lead_name || 'Client',
        service: r.service || 'AI Audit',
        meetingType: r.meeting_type,
        date: r.appointment_date ? new Date(r.appointment_date).toISOString().split('T')[0] : '2026-08-10',
        time: r.appointment_date ? new Date(r.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM',
        status: r.status
      }));
    } catch (err) { console.warn('PG getAppointments fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  return dbJson.appointments || [];
}

async function createAppointment(app) {
  if (usePostgres) {
    try {
      const res = await query(`
        INSERT INTO appointments (lead_id, client_name, email, phone, service, meeting_type, appointment_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `, [
        app.lead_id || null,
        app.client_name || app.clientName || 'Client',
        app.email || null,
        app.phone || null,
        app.service || 'AI Audit',
        app.meeting_type || app.meetingType || 'AI Audit Consultation',
        app.appointment_date || new Date(),
        app.status || 'pending'
      ]);
      return res.rows[0];
    } catch (err) { console.warn('PG createAppointment fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  const newApp = { id: Date.now(), clientName: app.clientName || 'Client', service: app.service || 'AI Audit', status: 'Confirmed' };
  dbJson.appointments.push(newApp);
  writeJsonDb(dbJson);
  return newApp;
}

// -------------------------------------------------------------------
// 5. BLOGS, 6. BLOG_CATEGORIES & 7. BLOG_CATEGORY_MAP TABLE
// -------------------------------------------------------------------
async function getBlogs() {
  if (usePostgres) {
    try {
      const res = await query(`
        SELECT b.*, 
               COALESCE(
                 (SELECT json_agg(c.name) 
                  FROM blog_categories c 
                  JOIN blog_category_map m ON c.id = m.category_id 
                  WHERE m.blog_id = b.id), '[]'::json
               ) AS category_list
        FROM blogs b
        ORDER BY b.published_at DESC;
      `);
      return res.rows.map(r => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        category: Array.isArray(r.category_list) && r.category_list.length ? r.category_list[0] : 'AI Automation',
        categories: r.category_list,
        status: r.status || 'Published',
        date: r.published_at ? new Date(r.published_at).toISOString().split('T')[0] : '2026-07-20',
        readTime: r.read_time || '6 mins',
        excerpt: r.excerpt,
        summary: r.excerpt,
        coverImage: r.featured_image,
        image: r.featured_image,
        content: r.content
      }));
    } catch (err) { console.warn('PG getBlogs fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  return dbJson.blogs || [];
}

async function getBlogBySlug(slug) {
  if (usePostgres) {
    try {
      const res = await query(`SELECT * FROM blogs WHERE slug = $1 LIMIT 1;`, [slug]);
      if (res.rows[0]) return res.rows[0];
    } catch (err) { console.warn('PG getBlogBySlug fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  return (dbJson.blogs || []).find(b => b.slug === slug) || null;
}

async function createBlog(b) {
  if (usePostgres) {
    try {
      const res = await query(`
        INSERT INTO blogs (title, slug, excerpt, content, featured_image, meta_title, meta_description, status, read_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
      `, [
        b.title,
        b.slug || b.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        b.excerpt || '',
        b.content || '',
        b.coverImage || b.featured_image || b.image || null,
        b.meta_title || b.title,
        b.meta_description || b.excerpt || b.title,
        b.status || 'published',
        b.readTime || '6 mins'
      ]);
      return res.rows[0];
    } catch (err) { console.warn('PG createBlog fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  const newB = { id: Date.now(), title: b.title, slug: b.slug, excerpt: b.excerpt, status: 'Published' };
  dbJson.blogs.unshift(newB);
  writeJsonDb(dbJson);
  return newB;
}

async function deleteBlog(id) {
  if (usePostgres) {
    try {
      await query(`DELETE FROM blogs WHERE id = $1;`, [id]);
      return;
    } catch (err) { console.warn('PG deleteBlog fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  dbJson.blogs = (dbJson.blogs || []).filter(b => String(b.id) !== String(id));
  writeJsonDb(dbJson);
}

// -------------------------------------------------------------------
// 8. CASE_STUDIES TABLE
// -------------------------------------------------------------------
async function getCaseStudies() {
  if (usePostgres) {
    try {
      const res = await query(`SELECT * FROM case_studies ORDER BY created_at DESC;`);
      return res.rows;
    } catch (err) { console.warn('PG getCaseStudies fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  return dbJson.caseStudies || [];
}

async function getCaseStudyBySlug(slug) {
  if (usePostgres) {
    try {
      const res = await query(`SELECT * FROM case_studies WHERE slug = $1 LIMIT 1;`, [slug]);
      if (res.rows[0]) return res.rows[0];
    } catch (err) { console.warn('PG getCaseStudyBySlug fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  return (dbJson.caseStudies || []).find(cs => cs.slug === slug) || null;
}

async function createCaseStudy(cs) {
  if (usePostgres) {
    try {
      const res = await query(`
        INSERT INTO case_studies (project_title, slug, client_name, problem, solution, results, seo_title, seo_description, featured_image)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
      `, [
        cs.project_title || cs.title,
        cs.slug || (cs.title || cs.project_title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        cs.client_name || cs.client || null,
        cs.problem || '',
        cs.solution || '',
        cs.results || '',
        cs.seo_title || cs.title,
        cs.seo_description || cs.results,
        cs.featured_image || null
      ]);
      return res.rows[0];
    } catch (err) { console.warn('PG createCaseStudy fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  const newCs = { id: Date.now(), title: cs.title || cs.project_title, slug: cs.slug };
  dbJson.caseStudies.unshift(newCs);
  writeJsonDb(dbJson);
  return newCs;
}

async function deleteCaseStudy(id) {
  if (usePostgres) {
    try {
      await query(`DELETE FROM case_studies WHERE id = $1;`, [id]);
      return;
    } catch (err) { console.warn('PG deleteCaseStudy fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  dbJson.caseStudies = (dbJson.caseStudies || []).filter(c => String(c.id) !== String(id));
  writeJsonDb(dbJson);
}

// -------------------------------------------------------------------
// 9. PORTFOLIO TABLE
// -------------------------------------------------------------------
async function getPortfolio() {
  if (usePostgres) {
    try {
      const res = await query(`SELECT * FROM portfolio ORDER BY display_order ASC, created_at DESC;`);
      return res.rows.map(r => ({ id: r.id, title: r.project_name, desc: r.description, category: r.category, image: r.image_url }));
    } catch (err) { console.warn('PG getPortfolio fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  return dbJson.portfolio || [];
}

async function createPortfolio(item) {
  if (usePostgres) {
    try {
      const res = await query(`
        INSERT INTO portfolio (project_name, slug, description, category, image_url, display_order, is_featured)
        VALUES ($1, $2, $3, $4, $5, $6, true)
        RETURNING *;
      `, [
        item.title || item.project_name,
        item.slug || (item.title || item.project_name).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        item.desc || item.description || '',
        item.category || 'AI Automation',
        item.image || item.image_url || null,
        item.display_order || 1
      ]);
      return res.rows[0];
    } catch (err) { console.warn('PG createPortfolio fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  const newP = { id: Date.now(), title: item.title, desc: item.desc, category: item.category };
  dbJson.portfolio.unshift(newP);
  writeJsonDb(dbJson);
  return newP;
}

async function deletePortfolio(id) {
  if (usePostgres) {
    try {
      await query(`DELETE FROM portfolio WHERE id = $1;`, [id]);
      return;
    } catch (err) { console.warn('PG deletePortfolio fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  dbJson.portfolio = (dbJson.portfolio || []).filter(p => String(p.id) !== String(id));
  writeJsonDb(dbJson);
}

// -------------------------------------------------------------------
// 10. PROPOSALS & 11. INVOICES TABLE
// -------------------------------------------------------------------
async function getProposals() {
  if (usePostgres) {
    try {
      const res = await query(`SELECT * FROM proposals ORDER BY created_at DESC;`);
      return res.rows.map(r => ({ id: r.id, client: r.client_name, project: r.title, amount: r.pricing_display || `₹${r.pricing}`, status: r.status }));
    } catch (err) { console.warn('PG getProposals fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  return dbJson.proposals || [];
}

async function getInvoices() {
  if (usePostgres) {
    try {
      const res = await query(`SELECT * FROM invoices ORDER BY created_at DESC;`);
      return res.rows.map(r => ({ id: r.id, invoiceNumber: r.invoice_number, client: r.client_name, amount: r.amount_display || `₹${r.total}`, status: r.status, date: r.due_date ? new Date(r.due_date).toISOString().split('T')[0] : '2026-08-10' }));
    } catch (err) { console.warn('PG getInvoices fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  return dbJson.invoices || [];
}

// -------------------------------------------------------------------
// 12. SERVICES TABLE
// -------------------------------------------------------------------
async function getServices() {
  if (usePostgres) {
    try {
      const res = await query(`SELECT * FROM services WHERE is_active = true ORDER BY display_order ASC;`);
      return res.rows.map(r => ({ id: r.id, name: r.title, desc: r.description, price: r.pricing_info, icon: r.icon, features: r.features || [] }));
    } catch (err) { console.warn('PG getServices fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  return dbJson.services || [];
}

async function createService(s) {
  if (usePostgres) {
    try {
      const res = await query(`
        INSERT INTO services (title, slug, description, pricing_info, icon, features, display_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `, [
        s.name || s.title,
        s.slug || (s.name || s.title).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        s.desc || s.description || '',
        s.price || s.pricing_info || '',
        s.icon || 'settings',
        s.features || [],
        s.display_order || 1
      ]);
      return res.rows[0];
    } catch (err) { console.warn('PG createService fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  const newS = { id: Date.now(), name: s.name, desc: s.desc, price: s.price, icon: s.icon };
  dbJson.services.push(newS);
  writeJsonDb(dbJson);
  return newS;
}

async function deleteService(id) {
  if (usePostgres) {
    try {
      await query(`DELETE FROM services WHERE id = $1;`, [id]);
      return;
    } catch (err) { console.warn('PG deleteService fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  dbJson.services = (dbJson.services || []).filter(s => String(s.id) !== String(id));
  writeJsonDb(dbJson);
}

// -------------------------------------------------------------------
// 13. SITE_SETTINGS TABLE
// -------------------------------------------------------------------
async function getSiteSettings(key = 'global_cms') {
  if (usePostgres) {
    try {
      const res = await query(`SELECT value FROM site_settings WHERE key = $1 LIMIT 1;`, [key]);
      if (res.rows[0]) return res.rows[0].value;
    } catch (err) { console.warn('PG getSiteSettings fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  return key === 'global_cms' ? dbJson.cms : dbJson.settings;
}

async function saveSiteSettings(key, value) {
  if (usePostgres) {
    try {
      const res = await query(`
        INSERT INTO site_settings (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        RETURNING *;
      `, [key, JSON.stringify(value)]);
      return res.rows[0];
    } catch (err) { console.warn('PG saveSiteSettings fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  if (key === 'global_cms') dbJson.cms = value;
  else dbJson.settings = value;
  writeJsonDb(dbJson);
  return { key, value };
}

// -------------------------------------------------------------------
// 14. TEAM_MEMBERS TABLE
// -------------------------------------------------------------------
async function getTeamMembers() {
  if (usePostgres) {
    try {
      const res = await query(`SELECT * FROM team_members WHERE is_active = true ORDER BY display_order ASC;`);
      return res.rows.map(r => ({ id: r.id, name: r.name, role: r.role, bio: r.bio, image: r.profile_image, linkedin: r.linkedin, skills: r.skills || [], revenue: r.revenue || '₹0', leads: r.leads_count || 0, attendance: r.attendance || '100%', kpi: r.kpi || '5.0/5' }));
    } catch (err) { console.warn('PG getTeamMembers fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  return dbJson.team || [];
}

// -------------------------------------------------------------------
// 15. SECURITY_LOGS TABLE
// -------------------------------------------------------------------
async function getSecurityLogs() {
  if (usePostgres) {
    try {
      const res = await query(`SELECT * FROM security_logs ORDER BY created_at DESC LIMIT 100;`);
      return res.rows.map(r => ({ id: r.id, action: r.action, user: r.username || 'System', ip: r.ip_address || '127.0.0.1', status: r.details || 'Success', timestamp: r.created_at }));
    } catch (err) { console.warn('PG getSecurityLogs fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  return dbJson.securityLogs || [];
}

async function addSecurityLog(action, username = null, details = null, ip = null, userAgent = null, userId = null) {
  if (usePostgres) {
    try {
      await query(`
        INSERT INTO security_logs (user_id, username, action, details, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6);
      `, [userId, username, action, details, ip, userAgent]);
      return;
    } catch (err) { console.warn('PG addSecurityLog fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  if (!dbJson.securityLogs) dbJson.securityLogs = [];
  dbJson.securityLogs.unshift({ id: Date.now(), action, user: username || 'System', ip: ip || '127.0.0.1', status: details || 'Success', timestamp: new Date().toISOString() });
  writeJsonDb(dbJson);
}

// -------------------------------------------------------------------
// 16. VISITORS TABLE
// -------------------------------------------------------------------
async function recordVisitor(v) {
  if (usePostgres) {
    try {
      const res = await query(`
        INSERT INTO visitors (session_id, ip_address, email, location, isp, is_bot, bot_name, bot_category, device, device_model, browser, os, entry_page, current_page, exit_page, session_duration, scroll_pct, page_views, user_agent, timestamp, last_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
        ON CONFLICT (session_id) DO UPDATE SET
          current_page = EXCLUDED.current_page,
          exit_page = EXCLUDED.exit_page,
          session_duration = visitors.session_duration + EXCLUDED.session_duration,
          scroll_pct = GREATEST(visitors.scroll_pct, EXCLUDED.scroll_pct),
          page_views = visitors.page_views + 1,
          last_active = NOW()
        RETURNING *;
      `, [
        v.sessionId || `sf-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        v.ip || '127.0.0.1',
        v.email || 'Guest',
        v.location || 'India',
        v.isp || 'Telecom',
        !!v.isBot,
        v.botName || null,
        v.botCategory || null,
        v.device || 'Desktop',
        v.deviceModel || 'PC',
        v.browser || 'Chrome',
        v.os || 'Windows 11',
        v.entryPage || '/',
        v.currentPage || '/',
        v.exitPage || '/',
        v.sessionDuration || 5,
        v.scrollPct || 10,
        v.pageViews || 1,
        v.userAgent || null
      ]);
      return res.rows[0];
    } catch (err) { console.warn('PG recordVisitor fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  if (!dbJson.visitors) dbJson.visitors = [];
  const existingIdx = dbJson.visitors.findIndex(x => x.sessionId === v.sessionId);
  if (existingIdx === -1) {
    dbJson.visitors.unshift({ ...v, timestamp: new Date().toISOString(), lastActive: new Date().toISOString() });
  } else {
    dbJson.visitors[existingIdx].lastActive = new Date().toISOString();
  }
  writeJsonDb(dbJson);
  return v;
}

async function getVisitors() {
  if (usePostgres) {
    try {
      const res = await query(`SELECT * FROM visitors ORDER BY last_active DESC LIMIT 500;`);
      return res.rows.map(r => ({
        sessionId: r.session_id,
        ip: r.ip_address,
        email: r.email,
        location: r.location,
        isp: r.isp,
        isBot: r.is_bot,
        botName: r.bot_name,
        botCategory: r.bot_category,
        device: r.device,
        deviceModel: r.device_model,
        browser: r.browser,
        os: r.os,
        entryPage: r.entry_page,
        currentPage: r.current_page,
        exitPage: r.exit_page,
        sessionDuration: r.session_duration,
        scrollPct: r.scroll_pct,
        pageViews: r.page_views,
        userAgent: r.user_agent,
        timestamp: r.timestamp,
        lastActive: r.last_active
      }));
    } catch (err) { console.warn('PG getVisitors fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  return dbJson.visitors || [];
}

async function clearVisitors() {
  if (usePostgres) {
    try {
      await query(`DELETE FROM visitors;`);
      return;
    } catch (err) { console.warn('PG clearVisitors fallback:', err.message); }
  }
  const dbJson = readJsonDb();
  dbJson.visitors = [];
  writeJsonDb(dbJson);
}

module.exports = {
  pool,
  query,
  getUsers,
  findUserByUsername,
  findUserById,
  createUser,
  updateUser,
  deleteUser,
  getLeads,
  createLead,
  updateLead,
  deleteLead,
  addLeadNote,
  getAppointments,
  createAppointment,
  getBlogs,
  getBlogBySlug,
  createBlog,
  deleteBlog,
  getCaseStudies,
  getCaseStudyBySlug,
  createCaseStudy,
  deleteCaseStudy,
  getPortfolio,
  createPortfolio,
  deletePortfolio,
  getProposals,
  getInvoices,
  getServices,
  createService,
  deleteService,
  getSiteSettings,
  saveSiteSettings,
  getTeamMembers,
  getSecurityLogs,
  addSecurityLog,
  recordVisitor,
  getVisitors,
  clearVisitors
};
