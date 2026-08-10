require('dotenv').config();
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const path = require('path');
const requestIp = require('request-ip');
const useragent = require('useragent');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Env secret startup warnings
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('⚠️ WARNING: JWT_SECRET environment variable is missing.');
}
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.warn('⚠️ WARNING: TELEGRAM_BOT_TOKEN environment variable is missing.');
}
if (!process.env.TELEGRAM_CHAT_ID) {
  console.warn('⚠️ WARNING: TELEGRAM_CHAT_ID environment variable is missing.');
}
if (!process.env.GOOGLE_SHEET_URL) {
  console.warn('⚠️ WARNING: GOOGLE_SHEET_URL environment variable is missing.');
}

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Configure CORS
const allowedOrigins = [
  'https://smartfiq.website',
  'https://www.smartfiq.website',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('CORS request disallowed by origin security policy'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(requestIp.mw());

// Hydrate durable storage before any API route and prevent stale browser/CDN caches.
app.use('/api', async (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// PostgreSQL Database Health Check Endpoint
app.get('/api/health/db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() AS current_time;');
    res.json({
      success: true,
      status: 'healthy',
      database: 'PostgreSQL 17',
      timestamp: result.rows[0].current_time
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: err.message
    });
  }
});

// Rate Limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: { success: false, error: 'Too many login attempts. Please try again later.' }
});

const leadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  message: { error: 'Too many lead submissions. Please try again later.' }
});

// Strict Authentication Middleware
function requireAuth(req, res, next) {
  const secret = process.env.JWT_SECRET || 'SmartFiQ_JWT_Secret_Key_2026_Production_Secure_X9!';
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, secret);
      req.user = decoded;
      return next();
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session token.' });
    }
  }
  return res.status(401).json({ success: false, error: 'Unauthorized. Please login again.' });
}

function requirePermission(permissionName) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (req.user.isSuperAdmin || (req.user.permissions && req.user.permissions.includes('all'))) {
      return next();
    }
    if (req.user.permissions && req.user.permissions.includes(permissionName)) {
      return next();
    }
    return res.status(403).json({ error: `Forbidden: Requires ${permissionName} permission` });
  };
}

// In-Memory Caches
let serverPublicIpCache = null;
const geoCache = new Map(); // IP -> { data, expiresAt } (TTL: 1 hour)

let statsCache = null; // { data, expiresAt } (TTL: 30s)
let chartsCache = null; // { data, expiresAt } (TTL: 30s)

global.smartfiq_invalidate_cache = function() {
  statsCache = null;
  chartsCache = null;
};

async function resolveRealClientIp(req) {
  let ip = req.clientIp || req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || '';
  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  if (ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }

  return ip || '127.0.0.1';
}

async function getGeoLocation(ip, req = {}) {
  const headers = req.headers || {};
  const country = headers['x-vercel-ip-country'] || 'India';
  const countryCode = headers['x-vercel-ip-country-code'] || (country === 'India' ? 'IN' : 'US');
  const state = headers['x-vercel-ip-country-region'] || 'Delhi';
  const city = headers['x-vercel-ip-city'] ? decodeURIComponent(headers['x-vercel-ip-city']) : 'New Delhi';

  return {
    country,
    countryCode,
    isNational: country === 'India' || countryCode === 'IN',
    state,
    city,
    isp: 'Cloud/Network'
  };
}

function identifyBotType(ua) {
  if (!ua) return null;
  ua = ua.toLowerCase();
  if (ua.includes('googlebot')) return { isBot: true, botName: 'Googlebot Indexer', botCategory: 'Search Engine Crawler', icon: 'smart_toy' };
  if (ua.includes('bingbot')) return { isBot: true, botName: 'Bingbot Search Crawler', botCategory: 'Search Engine Crawler', icon: 'smart_toy' };
  if (ua.includes('yandexbot') || ua.includes('yandex')) return { isBot: true, botName: 'Yandex Web Crawler', botCategory: 'Search Engine Crawler', icon: 'smart_toy' };
  if (ua.includes('lighthouse') || ua.includes('chrome-lighthouse') || ua.includes('pagespeed')) return { isBot: true, botName: 'Google Lighthouse Audit', botCategory: 'Performance Audit Bot', icon: 'speed' };
  if (ua.includes('ahrefsbot')) return { isBot: true, botName: 'Ahrefs SEO Crawler', botCategory: 'SEO Analytics Bot', icon: 'analytics' };
  if (ua.includes('semrushbot')) return { isBot: true, botName: 'SEMrush Spider', botCategory: 'SEO Analytics Bot', icon: 'analytics' };
  if (ua.includes('facebookexternalhit') || ua.includes('facebot')) return { isBot: true, botName: 'Facebook Link Inspector', botCategory: 'Social Media Bot', icon: 'share' };
  if (ua.includes('whatsapp')) return { isBot: true, botName: 'WhatsApp Link Previewer', botCategory: 'Messaging Previewer', icon: 'chat' };
  if (ua.includes('twitterbot')) return { isBot: true, botName: 'Twitter/X Crawler', botCategory: 'Social Media Bot', icon: 'share' };
  if (ua.includes('duckduckbot')) return { isBot: true, botName: 'DuckDuckGo Bot', botCategory: 'Search Engine Crawler', icon: 'smart_toy' };
  if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider') || ua.includes('robot') || ua.includes('crawling')) return { isBot: true, botName: 'Automated Web Spider', botCategory: 'Generic Crawler', icon: 'robot' };
  
  return null;
}

function parseDeviceDetails(uaString) {
  if (!uaString) {
    return { isBot: false, botName: null, botCategory: null, device: 'Desktop', deviceModel: 'PC', os: 'Windows 11', browser: 'Chrome' };
  }

  const botObj = identifyBotType(uaString);
  if (botObj) {
    return {
      isBot: true,
      botName: botObj.botName,
      botCategory: botObj.botCategory,
      device: 'Desktop',
      deviceModel: botObj.botName,
      os: 'Cloud Server',
      browser: botObj.botName
    };
  }

  const agent = useragent.parse(uaString);
  const os = agent.os.toString() || 'Desktop OS';
  const browser = `${agent.family} ${agent.major}`.trim() || 'Browser';
  const isMobile = /mobile|iphone|ipod|android.*mobile/i.test(uaString);
  const isTablet = /ipad|tablet/i.test(uaString);
  const deviceType = isMobile ? 'Mobile' : (isTablet ? 'Tablet' : 'Desktop');
  const deviceModel = agent.device.family !== 'Other' ? agent.device.toString() : (deviceType === 'Desktop' ? (os.includes('Mac') ? 'Mac' : 'PC') : 'Mobile Device');

  return { isBot: false, botName: null, botCategory: null, device: deviceType, deviceModel, os, browser };
}

function calculateLeadAiScore({ email, phone, budget, message }) {
  let score = 50;
  if (phone && phone.trim().length >= 10) score += 20;
  if (email && email.includes('@') && !email.includes('test')) score += 10;
  if (budget) {
    if (budget.includes('1,00,000') || budget.includes('1.5L') || budget.includes('50k')) score += 15;
    else if (budget.includes('50,000') || budget.includes('25,000')) score += 10;
  }
  if (message && message.trim().length > 30) score += 10;
  return Math.min(100, score);
}

// Serve landing page at /
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve admin dashboard at /admin
app.get(['/admin', '/admin.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve Technical SEO Files
app.get('/robots.txt', (req, res) => {
  res.header('Content-Type', 'text/plain; charset=utf-8');
  res.sendFile(path.join(__dirname, 'robots.txt'));
});

app.get(['/sitemap.xml', '/sitemap'], (req, res) => {
  res.header('Content-Type', 'application/xml; charset=utf-8');
  res.sendFile(path.join(__dirname, 'sitemap.xml'));
});

// --- 1. LEGACY 301 REDIRECTS (EXECUTIVE ROUTING FIRST) ---

// Case Studies 301 Redirects for Legacy / Alternate Slugs to Single Canonical URLs
app.get(['/whatsapp-automation-case-study.html', '/whatsapp-automation-case-study', '/case-studies/whatsapp-automation'], (req, res) => {
  res.redirect(301, '/case-studies/whatsapp-automation-guide');
});
app.get(['/lead-extraction-case-study.html', '/lead-extraction-case-study', '/case-studies/lead-extraction'], (req, res) => {
  res.redirect(301, '/case-studies/lead-extraction-agent');
});
app.get(['/data-modeling-bi-dashboard-case-study.html', '/data-modeling-bi-dashboard-case-study', '/case-studies/bi-dashboard'], (req, res) => {
  res.redirect(301, '/case-studies/data-modeling-bi-dashboard');
});

// Blog Detail Legacy 301 Redirects
const blogMap = {
  '1': 'what-is-ai-automation-guide',
  '2': 'whatsapp-automation-guide',
  '3': 'ai-chatbots-vs-human-support',
  '4': 'ai-voice-agents-explained',
  '5': 'top-processes-to-automate-with-ai'
};

app.get(['/blog-detail.html', '/blog-detail'], (req, res) => {
  const id = req.query.id;
  if (id && blogMap[id]) {
    return res.redirect(301, `/blog/${blogMap[id]}`);
  }
  return res.redirect(301, '/blog');
});

// Clean 301 Redirects for .html Extension Requests to Extensionless URLs
app.get('/services.html', (req, res) => res.redirect(301, '/services'));
app.get(['/about.html', '/about-smartfiq.html', '/about'], (req, res) => res.redirect(301, '/about-smartfiq'));
app.get('/case-studies.html', (req, res) => res.redirect(301, '/case-studies'));
app.get('/blog.html', (req, res) => res.redirect(301, '/blog'));
app.get('/faq.html', (req, res) => res.redirect(301, '/faq'));
app.get('/our-story.html', (req, res) => res.redirect(301, '/our-story'));
app.get('/privacy-policy.html', (req, res) => res.redirect(301, '/privacy-policy'));
app.get('/terms.html', (req, res) => res.redirect(301, '/terms'));

// --- 2. PRIMARY CLEAN ROUTE HANDLERS ---

app.get(['/services', '/Services'], (req, res) => res.sendFile(path.join(__dirname, 'services.html')));
app.get(['/about-smartfiq', '/About-Smartfiq'], (req, res) => res.sendFile(path.join(__dirname, 'about-smartfiq.html')));
app.get(['/case-studies', '/Case-Studies'], (req, res) => res.sendFile(path.join(__dirname, 'case-studies.html')));
app.get(['/blog', '/Blog'], (req, res) => res.sendFile(path.join(__dirname, 'blog.html')));
app.get(['/faq', '/FAQ'], (req, res) => res.sendFile(path.join(__dirname, 'faq.html')));
app.get(['/our-story', '/Our-Story'], (req, res) => res.sendFile(path.join(__dirname, 'our-story.html')));
app.get('/privacy-policy', (req, res) => res.sendFile(path.join(__dirname, 'privacy-policy.html')));
app.get('/terms', (req, res) => res.sendFile(path.join(__dirname, 'terms.html')));

// --- 3. DYNAMIC SLUG ROUTERS FOR BLOG & CASE STUDIES ---

app.get('/blog/:slug', (req, res, next) => {
  const slug = req.params.slug;
  const filePath = path.join(__dirname, 'blog', `${slug}.html`);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  next();
});

app.get('/case-studies/:slug', (req, res, next) => {
  const slug = req.params.slug;
  const filePath = path.join(__dirname, 'case-studies', `${slug}.html`);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  next();
});

// Case-insensitive catch-all HTML page resolver
app.get('/:page', (req, res, next) => {
  const page = req.params.page;
  if (!page || page.startsWith('api') || page === 'robots.txt' || page === 'sitemap.xml') return next();
  
  const possibleFiles = [
    page,
    page.endsWith('.html') ? page : `${page}.html`
  ];

  try {
    const files = fs.readdirSync(__dirname);
    for (const f of possibleFiles) {
      const match = files.find(file => file.toLowerCase() === f.toLowerCase());
      if (match) {
        return res.sendFile(path.join(__dirname, match));
      }
    }
  } catch (err) {}
  next();
});

// Serve image assets with SEO keyword names & fallback routes
app.get(['/smartfiq-ai-automation-logo.png', '/logo-transparent.png', '/logo.png'], (req, res) => {
  res.sendFile(path.join(__dirname, 'smartfiq-ai-automation-logo.png'));
});
app.get(['/smartfiq-ai-automation-agency-hero.webp', '/images.webp'], (req, res) => {
  res.sendFile(path.join(__dirname, 'smartfiq-ai-automation-agency-hero.webp'));
});

// Serve core script files
app.get('/components.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'components.js'));
});
app.get('/cms-engine.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'cms-engine.js'));
});
app.get('/blog.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'blog.js'));
});
app.get('/blog-js/blog-data.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'blog-js', 'blog-data.js'));
});

// NON-BLOCKING VISITOR TRACKING ENDPOINT (Public)
app.post('/api/track', (req, res) => {
  let bodyData = req.body || {};
  if (typeof bodyData === 'string') {
    try { bodyData = JSON.parse(bodyData); } catch (e) { bodyData = {}; }
  }

  const {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 10),
    email,
    landingPage,
    entryPage,
    currentPage,
    exitPage,
    scrollPercentage,
    clickEvent,
    allClicks,
    pageViews,
    sessionDuration
  } = bodyData;

  const uaString = req.headers['user-agent'] || '';

  // Fire-and-forget: Respond immediately so page load is never delayed
  res.json({ success: true });

  (async () => {
    try {
      const ip = await resolveRealClientIp(req);
      const devInfo = parseDeviceDetails(uaString);
      const geo = await getGeoLocation(ip, req);

      const isNational = geo.isNational !== undefined ? geo.isNational : (geo.country === 'India');
      const locationTag = isNational 
        ? `🇮🇳 National (${geo.city || 'India'}, ${geo.state || 'IN'})` 
        : `🌐 International (${geo.city || geo.country || 'Global'}, ${geo.country || 'IN'})`;

      await db.recordVisitor({
        sessionId,
        ip,
        email: email || 'Guest Visitor',
        location: locationTag,
        isp: geo.isp || 'Telecom',
        isBot: devInfo.isBot || false,
        botName: devInfo.botName || null,
        botCategory: devInfo.botCategory || null,
        userAgent: uaString,
        device: devInfo.device || 'Desktop',
        deviceModel: devInfo.deviceModel || 'PC',
        browser: devInfo.browser || 'Chrome',
        os: devInfo.os || 'Windows/Mac',
        entryPage: entryPage || landingPage || currentPage || '/',
        currentPage: currentPage || '/',
        exitPage: exitPage || currentPage || '/',
        sessionDuration: sessionDuration || 0,
        scrollPct: scrollPercentage || 0,
        pageViews: pageViews || 1
      });
    } catch (err) {
      console.warn('Async PostgreSQL track processing warning:', err.message);
    }
  })();
});

// Notifications
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegramNotification(lead) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const text = `🚨 New Lead Received! (Automate With AK)\n\n` +
      `👤 Name: ${lead.name}\n` +
      `📧 Email: ${lead.email || 'N/A'}\n` +
      `📞 Phone: ${lead.phone || 'N/A'}\n` +
      `💰 Budget: ${lead.budget || 'N/A'}\n` +
      `📝 Requirements: ${lead.message || 'N/A'}\n` +
      `🌐 Source: ${lead.source || 'Website'}\n` +
      `📍 Location: ${lead.location || 'N/A'}`;

    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: text
    }, { timeout: 5000 });
  } catch (err) {
    console.warn('Telegram notification warning:', err.message);
  }
}

// PUBLIC CONTACT FORM LEAD SUBMISSION
app.post('/api/leads', leadLimiter, async (req, res) => {
  try {
    const { name, email, phone, budget, message, source, fullName, requirements } = req.body;
    const ip = await resolveRealClientIp(req);
    const geo = await getGeoLocation(ip, req);

    const leadName = name || fullName || 'Anonymous Lead';
    const leadMessage = message || requirements || '';

    const newLead = await db.createLead({
      name: leadName,
      email: email || null,
      phone: phone || null,
      budget: budget || null,
      message: leadMessage,
      source: source || 'Hero Form',
      status: 'new',
      priority: 'normal',
      lead_score: calculateLeadAiScore({ email, phone, budget, message: leadMessage }),
      ai_summary: `${leadName} submitted a contact form requirement: "${leadMessage.substring(0, 100)}..."`
    });

    // Forward to Telegram Group if credentials set
    await sendTelegramNotification({ ...newLead, location: `${geo.city}, ${geo.country}` });

    res.json({ success: true, lead: newLead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AUTHENTICATION LOGIN ENDPOINT (Rate-limited, bcrypt verification, issues signed JWT)
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password are required' });
  }

  try {
    const inputUser = username.trim().toLowerCase();
    const inputPass = password.trim();

    const found = await db.findUserByUsername(inputUser);

    if (found && found.password_hash) {
      let isValidPassword = false;

      if (found.password_hash.startsWith('$2a$') || found.password_hash.startsWith('$2b$')) {
        isValidPassword = bcrypt.compareSync(inputPass, found.password_hash);
      } else if (found.password_hash === inputPass) {
        isValidPassword = true;
        const newHash = bcrypt.hashSync(inputPass, 10);
        await db.updateUser(found.id, { password_hash: newHash });
      }

      if (isValidPassword) {
        const secret = process.env.JWT_SECRET || 'SmartFiQ_JWT_Secret_Key_2026_Production_Secure_X9!';

        // Update last_login timestamp & log security event
        await db.updateUser(found.id, { last_login: new Date() });
        const ip = await resolveRealClientIp(req);
        await db.addSecurityLog('Admin Login Success', found.username, 'Successful authentication', ip, req.headers['user-agent'], found.id);

        const payload = {
          id: found.id,
          username: found.username,
          name: found.full_name || found.username,
          roleTitle: found.user_role || 'Admin',
          isSuperAdmin: !!found.is_super_admin,
          permissions: found.permissions || ['overview']
        };

        const token = jwt.sign(payload, secret, { expiresIn: '12h' });
        return res.json({ success: true, token, user: payload });
      }
    }

    // Log failed login event
    const ip = await resolveRealClientIp(req);
    await db.addSecurityLog('Admin Login Failed', inputUser, 'Invalid credentials', ip, req.headers['user-agent']);

    res.status(401).json({ success: false, error: 'Invalid Username or Password' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Database authentication error: ' + err.message });
  }
});

// Fetch current user details
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const latest = await db.findUserById(req.user.id);
    if (!latest) {
      return res.status(404).json({ success: false, error: 'User no longer exists. Please login again.' });
    }
    res.json({ success: true, user: latest });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== PROTECTED API ROUTES (Require Auth JWT) ====================

// Update Lead details in CRM
app.post('/api/leads/update', requireAuth, async (req, res) => {
  try {
    const { id, status, aiScore, notes, assignedTo } = req.body;
    if (!id) return res.status(400).json({ error: 'Lead ID required' });

    const updated = await db.updateLead(id, { status, aiScore, assigned_to: assignedTo });
    if (notes && notes.trim() !== '') {
      await db.addLeadNote(id, notes, req.user.id);
    }
    res.json({ success: true, lead: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add Internal Note to Lead
app.post('/api/leads/notes', requireAuth, async (req, res) => {
  try {
    const { leadId, note } = req.body;
    if (!leadId || !note) return res.status(400).json({ error: 'leadId and note are required' });
    const newNote = await db.addLeadNote(leadId, note, req.user.id);
    res.json({ success: true, note: newNote });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear leads
app.delete('/api/leads', requireAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM leads;');
    res.json({ success: true, message: 'Leads cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch stats summary (Dashboard module 1 - Cached 30s)
app.get('/api/stats', requireAuth, async (req, res) => {
  try {
    if (statsCache && Date.now() < statsCache.expiresAt) {
      return res.json(statsCache.data);
    }

    const visitors = await db.getVisitors();
    const leads = await db.getLeads();

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const onlineCount = visitors.filter(v => v.lastActive && new Date(v.lastActive) > twoMinutesAgo && !v.isBot).length;

    const totalCount = visitors.length;
    const humanCount = visitors.filter(v => !v.isBot).length;
    const botCount = visitors.filter(v => v.isBot).length;
    const humanPct = totalCount > 0 ? Math.round((humanCount / totalCount) * 100) : 0;

    const result = {
      totalVisitors: totalCount,
      onlineVisitors: onlineCount,
      totalLeads: leads.length,
      humanPercentage: humanPct,
      botsBlocked: botCount
    };

    statsCache = { data: result, expiresAt: Date.now() + 30000 };
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch visitor moment logs (Visitor Intel module 2)
app.get('/api/visitors', requireAuth, async (req, res) => {
  try {
    const sortedVisitors = await db.getVisitors();
    res.json(sortedVisitors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear visitor logs
app.delete('/api/visitors', requireAuth, async (req, res) => {
  try {
    await db.clearVisitors();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch all leads (CRM module 3)
app.get('/api/leads', requireAuth, async (req, res) => {
  try {
    const sortedLeads = await db.getLeads();
    res.json(sortedLeads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User Management & RBAC API Endpoints (Requires Security Permission)
app.get('/api/users', requireAuth, requirePermission('security'), async (req, res) => {
  try {
    const users = await db.getUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', requireAuth, requirePermission('security'), async (req, res) => {
  try {
    const { id, username, password, name, roleTitle, isSuperAdmin, permissions } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    let existing = null;
    if (id) existing = await db.findUserById(id);
    if (!existing) existing = await db.findUserByUsername(username);

    if (existing) {
      const updates = {
        full_name: name,
        user_role: roleTitle,
        is_super_admin: isSuperAdmin,
        permissions: permissions || ['overview']
      };
      if (password && password.trim() !== '' && password !== '******') {
        updates.password_hash = bcrypt.hashSync(password.trim(), 10);
      }
      const updated = await db.updateUser(existing.id, updates);
      return res.json({ success: true, user: updated });
    } else {
      if (!password || password.trim() === '' || password === '******') {
        return res.status(400).json({ error: 'Password is required for new users' });
      }
      const passHash = bcrypt.hashSync(password.trim(), 10);
      const newUser = await db.createUser({
        username: username.trim(),
        password_hash: passHash,
        full_name: name || username,
        user_role: roleTitle || 'admin',
        is_super_admin: !!isSuperAdmin,
        permissions: permissions || ['overview']
      });
      return res.json({ success: true, user: newUser });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', requireAuth, requirePermission('security'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const target = await db.findUserById(userId);
    if (target && target.is_super_admin) {
      return res.status(400).json({ error: 'Cannot delete primary Super Admin' });
    }
    await db.deleteUser(userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Grouped chart timeline + analytics (Analytics module 21 - Cached 30s)
app.get('/api/charts', requireAuth, (req, res) => {
  if (chartsCache && Date.now() < chartsCache.expiresAt) {
    return res.json(chartsCache.data);
  }

  const database = db.readDb();
  const visitors = database.visitors || [];
  const leads = database.leads || [];

  // Traffic Analytics Fix: Log a diagnostic warning if visitors or leads arrays are empty on call
  if (!visitors.length) {
    console.warn('⚠️ Traffic Analytics Warning: visitors array is empty when /api/charts was called.');
  }
  if (!leads.length) {
    console.warn('⚠️ Traffic Analytics Warning: leads array is empty when /api/charts was called.');
  }

  const dates = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
  }

  const visitorsByDay = [0, 0, 0, 0, 0, 0, 0];
  const leadsByDay = [0, 0, 0, 0, 0, 0, 0];

  visitors.forEach(v => {
    if (!v || !v.timestamp) return;
    const vDate = new Date(v.timestamp);
    const diffDays = Math.floor((now - vDate) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < 7) {
      visitorsByDay[6 - diffDays]++;
    }
  });

  leads.forEach(l => {
    if (!l || !l.timestamp) return;
    const lDate = new Date(l.timestamp);
    const diffDays = Math.floor((now - lDate) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < 7) {
      leadsByDay[6 - diffDays]++;
    }
  });

  const locationMap = {};
  visitors.forEach(v => {
    if (v && (v.city || v.location)) {
      const city = v.city || v.location.split(',')[0].replace(/[^\w\s]/gi, '').trim();
      if (city) locationMap[city] = (locationMap[city] || 0) + 1;
    }
  });

  const locations = Object.keys(locationMap).sort((a, b) => locationMap[b] - locationMap[a]).slice(0, 5);
  const locationCounts = locations.map(l => locationMap[l]);

  const result = {
    labels: dates,
    visitors: visitorsByDay,
    leads: leadsByDay,
    locations: {
      labels: locations.length ? locations : ['India'],
      counts: locationCounts.length ? locationCounts : [visitors.length || 0]
    }
  };

  chartsCache = { data: result, expiresAt: Date.now() + 30000 };
  res.json(result);
});

// ==================== CMS CONFIG ====================

app.get('/api/cms', async (req, res) => {
  try {
    const cmsData = await db.getSiteSettings('global_cms');
    res.json(cmsData || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cms', requireAuth, requirePermission('cms'), async (req, res) => {
  try {
    const updated = await db.saveSiteSettings('global_cms', req.body);
    res.json({ success: true, cms: updated.value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== SERVICES ====================

app.get('/api/services', async (req, res) => {
  try {
    const services = await db.getServices();
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/services', requireAuth, requirePermission('services'), async (req, res) => {
  try {
    const newService = await db.createService(req.body);
    res.json({ success: true, service: newService });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/services/:id', requireAuth, requirePermission('services'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updated = await db.createService({ ...req.body, id });
    res.json({ success: true, service: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/services/:id', requireAuth, requirePermission('services'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.deleteService(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== BLOGS ====================

app.get('/api/blogs', async (req, res) => {
  try {
    const blogs = await db.getBlogs();
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/blogs', requireAuth, requirePermission('blog'), async (req, res) => {
  try {
    const newBlog = await db.createBlog(req.body);
    res.json({ success: true, blog: newBlog });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/blogs/:id', requireAuth, requirePermission('blog'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.deleteBlog(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== PORTFOLIO ====================

app.get('/api/portfolio', async (req, res) => {
  try {
    const items = await db.getPortfolio();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/portfolio', requireAuth, requirePermission('portfolio'), async (req, res) => {
  try {
    const item = await db.createPortfolio(req.body);
    res.json({ success: true, portfolio: item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portfolio/:id', requireAuth, requirePermission('portfolio'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.deletePortfolio(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== APPOINTMENTS ====================

app.get('/api/appointments', requireAuth, async (req, res) => {
  try {
    const appts = await db.getAppointments();
    res.json(appts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/appointments', requireAuth, async (req, res) => {
  try {
    const newAppt = await db.createAppointment(req.body);
    res.json({ success: true, appointment: newAppt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== PROPOSALS & INVOICES ====================

app.get('/api/proposals', requireAuth, async (req, res) => {
  try {
    const props = await db.getProposals();
    res.json(props);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/proposals', requireAuth, async (req, res) => {
  try {
    const { client, project, amount } = req.body;
    const resProp = await db.query(`
      INSERT INTO proposals (title, client_name, pricing_display, status)
      VALUES ($1, $2, $3, 'Sent')
      RETURNING *;
    `, [project || 'AI Automation Proposal', client || 'Client', amount || '₹50,000']);
    res.json({ success: true, proposal: resProp.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/invoices', requireAuth, async (req, res) => {
  try {
    const invs = await db.getInvoices();
    res.json(invs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/invoices', requireAuth, async (req, res) => {
  try {
    const { client, project, amount } = req.body;
    const invNum = `INV-${Date.now().toString().slice(-6)}`;
    const resInv = await db.query(`
      INSERT INTO invoices (invoice_number, client_name, amount_display, status, due_date)
      VALUES ($1, $2, $3, 'Pending', NOW() + INTERVAL '15 days')
      RETURNING *;
    `, [invNum, client || 'Client', amount || '₹50,000']);
    res.json({ success: true, invoice: resInv.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== TEAM ====================

app.get('/api/team', requireAuth, async (req, res) => {
  try {
    const team = await db.getTeamMembers();
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/agency-team', async (req, res) => {
  try {
    const team = await db.getTeamMembers();
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== CASE STUDIES ====================

app.get('/api/case-studies', async (req, res) => {
  try {
    const cs = await db.getCaseStudies();
    res.json(cs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/case-studies', requireAuth, requirePermission('case-studies-cms'), async (req, res) => {
  try {
    const cs = await db.createCaseStudy(req.body);
    res.json({ success: true, caseStudies: [cs] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/case-studies/:id', requireAuth, requirePermission('case-studies-cms'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.deleteCaseStudy(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== SECURITY LOGS ====================

app.get('/api/security', requireAuth, requirePermission('security'), async (req, res) => {
  try {
    const logs = await db.getSecurityLogs();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== LEGAL & FAQ CMS API ====================

app.get('/api/legal', async (req, res) => {
  try {
    const legalData = await db.getSiteSettings('legal_cms');
    res.json(legalData || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/legal/privacy', requireAuth, requirePermission('legal-cms'), async (req, res) => {
  try {
    const current = (await db.getSiteSettings('legal_cms')) || {};
    current.privacyPolicy = req.body;
    await db.saveSiteSettings('legal_cms', current);
    res.json({ success: true, privacyPolicy: req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/legal/terms', requireAuth, requirePermission('legal-cms'), async (req, res) => {
  try {
    const current = (await db.getSiteSettings('legal_cms')) || {};
    current.termsOfService = req.body;
    await db.saveSiteSettings('legal_cms', current);
    res.json({ success: true, termsOfService: req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/legal/faqs', requireAuth, requirePermission('legal-cms'), async (req, res) => {
  try {
    const current = (await db.getSiteSettings('legal_cms')) || {};
    current.faqs = req.body;
    await db.saveSiteSettings('legal_cms', current);
    res.json({ success: true, faqs: req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/apikeys', requireAuth, requirePermission('security'), async (req, res) => {
  res.json([]);
});

app.get('/api/settings', requireAuth, async (req, res) => {
  try {
    const settings = await db.getSiteSettings('global_settings');
    res.json(settings || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', requireAuth, async (req, res) => {
  try {
    const updated = await db.saveSiteSettings('global_settings', req.body);
    res.json({ success: true, settings: updated.value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start integrated server for local development or traditional hosting
if (require.main === module && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`SmartFiQ Integrated Server started successfully`);
    console.log(`Port: ${PORT}`);
    console.log(`Home Page URL: http://localhost:${PORT}/`);
    console.log(`Admin Dashboard URL: http://localhost:${PORT}/admin`);
    console.log(`===============================================`);
  });
}

module.exports = app;
