const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ FATAL ERROR: DATABASE_URL environment variable is missing.');
  process.exit(1);
}

const pool = new Pool({ connectionString });

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL Pool Error:', err.message);
});

async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    console.error('SQL Execution Error:', err.message, '| Query:', text);
    throw err;
  }
}

// -------------------------------------------------------------------
// 1. USERS TABLE
// -------------------------------------------------------------------
async function getUsers() {
  const res = await query(`
    SELECT id, username, email, full_name, user_role, is_super_admin, permissions, is_active, last_login, created_at, updated_at 
    FROM users 
    ORDER BY id ASC;
  `);
  return res.rows;
}

async function findUserByUsername(username) {
  if (!username) return null;
  const res = await query(`SELECT * FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1;`, [username.trim()]);
  return res.rows[0] || null;
}

async function findUserById(id) {
  if (!id) return null;
  const res = await query(`SELECT id, username, email, full_name, user_role, is_super_admin, permissions, is_active, last_login, created_at, updated_at FROM users WHERE id = $1 LIMIT 1;`, [id]);
  return res.rows[0] || null;
}

async function createUser(user) {
  const res = await query(`
    INSERT INTO users (username, email, password_hash, full_name, user_role, is_super_admin, permissions)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, username, email, full_name, user_role, is_super_admin, permissions, is_active, created_at;
  `, [
    user.username,
    user.email || null,
    user.password_hash,
    user.full_name || user.name || 'User',
    user.user_role || 'admin',
    !!user.is_super_admin,
    user.permissions || ['overview']
  ]);
  return res.rows[0];
}

async function updateUser(id, updates) {
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
  if (typeof updates.is_active === 'boolean') { fields.push(`is_active = $${idx++}`); values.push(updates.is_active); }
  if (updates.last_login) { fields.push(`last_login = $${idx++}`); values.push(updates.last_login); }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, username, email, full_name, user_role, is_super_admin, permissions, is_active;`;
  const res = await query(sql, values);
  return res.rows[0];
}

async function deleteUser(id) {
  await query(`DELETE FROM users WHERE id = $1;`, [id]);
}

// -------------------------------------------------------------------
// 2. LEADS & 3. LEAD_NOTES TABLE
// -------------------------------------------------------------------
async function getLeads() {
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
}

async function createLead(lead) {
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
}

async function updateLead(id, updates) {
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
}

async function deleteLead(id) {
  await query(`DELETE FROM leads WHERE id = $1;`, [id]);
}

async function addLeadNote(leadId, noteText, userId = null) {
  const res = await query(`
    INSERT INTO lead_notes (lead_id, user_id, note)
    VALUES ($1, $2, $3)
    RETURNING *;
  `, [leadId, userId, noteText]);
  return res.rows[0];
}

// -------------------------------------------------------------------
// 4. APPOINTMENTS TABLE
// -------------------------------------------------------------------
async function getAppointments() {
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
}

async function createAppointment(app) {
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
}

// -------------------------------------------------------------------
// 5. BLOGS, 6. BLOG_CATEGORIES & 7. BLOG_CATEGORY_MAP TABLE
// -------------------------------------------------------------------
async function getBlogs() {
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
}

async function getBlogBySlug(slug) {
  const res = await query(`SELECT * FROM blogs WHERE slug = $1 LIMIT 1;`, [slug]);
  return res.rows[0] || null;
}

async function createBlog(b) {
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
}

async function deleteBlog(id) {
  await query(`DELETE FROM blogs WHERE id = $1;`, [id]);
}

// -------------------------------------------------------------------
// 8. CASE_STUDIES TABLE
// -------------------------------------------------------------------
async function getCaseStudies() {
  const res = await query(`SELECT * FROM case_studies ORDER BY created_at DESC;`);
  return res.rows;
}

async function getCaseStudyBySlug(slug) {
  const res = await query(`SELECT * FROM case_studies WHERE slug = $1 LIMIT 1;`, [slug]);
  return res.rows[0] || null;
}

async function createCaseStudy(cs) {
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
}

async function deleteCaseStudy(id) {
  await query(`DELETE FROM case_studies WHERE id = $1;`, [id]);
}

// -------------------------------------------------------------------
// 9. PORTFOLIO TABLE
// -------------------------------------------------------------------
async function getPortfolio() {
  const res = await query(`SELECT * FROM portfolio ORDER BY display_order ASC, created_at DESC;`);
  return res.rows.map(r => ({
    id: r.id,
    title: r.project_name,
    desc: r.description,
    category: r.category,
    image: r.image_url
  }));
}

async function createPortfolio(item) {
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
}

async function deletePortfolio(id) {
  await query(`DELETE FROM portfolio WHERE id = $1;`, [id]);
}

// -------------------------------------------------------------------
// 10. PROPOSALS & 11. INVOICES TABLE
// -------------------------------------------------------------------
async function getProposals() {
  const res = await query(`SELECT * FROM proposals ORDER BY created_at DESC;`);
  return res.rows.map(r => ({
    id: r.id,
    client: r.client_name,
    project: r.title,
    amount: r.pricing_display || (r.pricing ? `₹${r.pricing}` : '₹50,000'),
    status: r.status
  }));
}

async function getInvoices() {
  const res = await query(`SELECT * FROM invoices ORDER BY created_at DESC;`);
  return res.rows.map(r => ({
    id: r.id,
    invoiceNumber: r.invoice_number,
    client: r.client_name,
    amount: r.amount_display || (r.total ? `₹${r.total}` : '₹50,000'),
    status: r.status,
    date: r.due_date ? new Date(r.due_date).toISOString().split('T')[0] : '2026-08-10'
  }));
}

// -------------------------------------------------------------------
// 12. SERVICES TABLE
// -------------------------------------------------------------------
async function getServices() {
  const res = await query(`SELECT * FROM services WHERE is_active = true ORDER BY display_order ASC;`);
  return res.rows.map(r => ({
    id: r.id,
    name: r.title,
    desc: r.description,
    price: r.pricing_info,
    icon: r.icon,
    features: r.features || []
  }));
}

async function createService(s) {
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
}

async function deleteService(id) {
  await query(`DELETE FROM services WHERE id = $1;`, [id]);
}

// -------------------------------------------------------------------
// 13. SITE_SETTINGS TABLE
// -------------------------------------------------------------------
async function getSiteSettings(key = 'global_cms') {
  const res = await query(`SELECT value FROM site_settings WHERE key = $1 LIMIT 1;`, [key]);
  return res.rows[0] ? res.rows[0].value : null;
}

async function saveSiteSettings(key, value) {
  const res = await query(`
    INSERT INTO site_settings (key, value)
    VALUES ($1, $2)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    RETURNING *;
  `, [key, JSON.stringify(value)]);
  return res.rows[0];
}

// -------------------------------------------------------------------
// 14. TEAM_MEMBERS TABLE
// -------------------------------------------------------------------
async function getTeamMembers() {
  const res = await query(`SELECT * FROM team_members WHERE is_active = true ORDER BY display_order ASC;`);
  return res.rows.map(r => ({
    id: r.id,
    name: r.name,
    role: r.role,
    bio: r.bio,
    image: r.profile_image,
    linkedin: r.linkedin,
    skills: r.skills || [],
    revenue: r.revenue || '₹0',
    leads: r.leads_count || 0,
    attendance: r.attendance || '100%',
    kpi: r.kpi || '5.0/5'
  }));
}

// -------------------------------------------------------------------
// 15. SECURITY_LOGS TABLE
// -------------------------------------------------------------------
async function getSecurityLogs() {
  const res = await query(`SELECT * FROM security_logs ORDER BY created_at DESC LIMIT 100;`);
  return res.rows.map(r => ({
    id: r.id,
    action: r.action,
    user: r.username || 'System',
    ip: r.ip_address || '127.0.0.1',
    status: r.details || 'Success',
    timestamp: r.created_at
  }));
}

async function addSecurityLog(action, username = null, details = null, ip = null, userAgent = null, userId = null) {
  await query(`
    INSERT INTO security_logs (user_id, username, action, details, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5, $6);
  `, [userId, username, action, details, ip, userAgent]);
}

// -------------------------------------------------------------------
// 16. VISITORS TABLE
// -------------------------------------------------------------------
async function recordVisitor(v) {
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
    v.isp || 'Network',
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
}

async function getVisitors() {
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
}

async function clearVisitors() {
  await query(`DELETE FROM visitors;`);
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
