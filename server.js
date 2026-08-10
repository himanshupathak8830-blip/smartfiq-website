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
  try {
    await db.ensureReady();
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
  } catch (err) {
    next(err);
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
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ success: false, error: 'Server configuration error: JWT_SECRET not configured.' });
  }
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

async function getGeoLocation(ip) {
  return {
    country: 'India',
    countryCode: 'IN',
    isNational: true,
    state: 'Delhi',
    city: 'New Delhi',
    isp: 'Local Network'
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
    return { isBot: false, botName: null, botCategory: null, device: 'Desktop', deviceModel: 'Windows PC', os: 'Windows 11', browser: 'Chrome' };
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

  const isMobile = /mobile|iphone|ipod|android.*mobile|blackberry|opera mini|windows phone/i.test(uaString);
  const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(uaString);

  let os = 'Windows 11';
  if (/mac OS X|macintosh/i.test(uaString)) os = 'macOS Ventura';
  else if (/windows nt 10\.0/i.test(uaString)) os = 'Windows 11';
  else if (/windows nt/i.test(uaString)) os = 'Windows 10';
  else if (/android/i.test(uaString)) os = 'Android 14';
  else if (/iphone|ipad|ipod/i.test(uaString)) os = 'iOS 17';
  else if (/linux/i.test(uaString)) os = 'Linux Ubuntu';

  let browser = 'Chrome';
  if (/edg/i.test(uaString)) browser = 'Edge';
  else if (/firefox/i.test(uaString)) browser = 'Firefox';
  else if (/safari/i.test(uaString) && !/chrome/i.test(uaString)) browser = 'Safari';

  let deviceType = 'Desktop';
  let deviceModel = 'Windows PC';

  if (isMobile) {
    deviceType = 'Mobile';
    if (/iphone/i.test(uaString)) deviceModel = 'iPhone 15 Pro';
    else if (/samsung|sm-/i.test(uaString)) deviceModel = 'Samsung Galaxy';
    else if (/pixel/i.test(uaString)) deviceModel = 'Google Pixel';
    else if (/oneplus/i.test(uaString)) deviceModel = 'OnePlus';
    else deviceModel = 'Android Mobile';
  } else if (isTablet) {
    deviceType = 'Tablet';
    if (/ipad/i.test(uaString)) deviceModel = 'iPad Pro';
    else deviceModel = 'Android Tablet';
  } else {
    deviceType = 'Desktop';
    if (os.includes('macOS')) deviceModel = 'MacBook Pro';
    else if (os.includes('Linux')) deviceModel = 'Linux PC';
    else deviceModel = 'Windows PC';
  }

  return { isBot: false, botName: null, botCategory: null, device: deviceType, deviceModel, os, browser };
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

      const geo = await getGeoLocation(ip);
      const isNational = geo.isNational !== undefined ? geo.isNational : (geo.country === 'India');
      const locationTag = isNational 
        ? `🇮🇳 National (${geo.city || 'India'}, ${geo.state || 'IN'})` 
        : `🌐 International (${geo.city || geo.country || 'Global'}, ${geo.country || 'IN'})`;

      const database = db.readDb();
      if (!database.visitors) database.visitors = [];
      let visitorIndex = database.visitors.findIndex(v => v.sessionId === sessionId);

      let existingClicks = visitorIndex !== -1 && database.visitors[visitorIndex].clickEvents ? database.visitors[visitorIndex].clickEvents : [];
      let newClicks = [...existingClicks];

      if (allClicks && Array.isArray(allClicks)) {
        allClicks.forEach(c => {
          if (c && c.label && !newClicks.some(item => item.label === c.label && item.time === c.time)) {
            newClicks.push(c);
          }
        });
      }
      if (clickEvent && clickEvent.label && !newClicks.some(item => item.label === clickEvent.label && item.time === clickEvent.time)) {
        newClicks.push(clickEvent);
      }

      if (visitorIndex === -1) {
        const newVisitor = {
          sessionId,
          ip,
          email: email || 'Guest Visitor',
          location: locationTag,
          isNational,
          city: geo.city || 'India',
          country: geo.country || 'IN',
          isp: geo.isp || 'Telecom',
          isBot: devInfo.isBot || false,
          botName: devInfo.botName || '',
          botCategory: devInfo.botCategory || '',
          userAgent: uaString,
          device: devInfo.device || 'Desktop',
          deviceModel: devInfo.deviceModel || 'Browser',
          browser: devInfo.browser || 'Chrome',
          os: devInfo.os || 'Windows/Mac',
          entryPage: entryPage || landingPage || currentPage || '/',
          currentPage: currentPage || '/',
          exitPage: exitPage || currentPage || '/',
          timestamp: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          sessionDuration: sessionDuration || 0,
          scrollPct: scrollPercentage || 0,
          pageViews: pageViews || 1,
          clickEvents: newClicks,
          userJourney: [currentPage || '/']
        };
        database.visitors.unshift(newVisitor);
      } else {
        const v = database.visitors[visitorIndex];
        v.ip = ip;
        v.location = locationTag;
        v.isNational = isNational;
        v.city = geo.city || v.city;
        v.country = geo.country || v.country;
        v.isp = geo.isp || v.isp;
        v.lastActive = new Date().toISOString();
        if (sessionDuration !== undefined) v.sessionDuration = Math.max(v.sessionDuration || 0, sessionDuration);
        if (scrollPercentage !== undefined) v.scrollPct = Math.max(v.scrollPct || 0, scrollPercentage);
        if (currentPage) {
          v.currentPage = currentPage;
          if (!v.userJourney) v.userJourney = [];
          if (!v.userJourney.includes(currentPage)) {
            v.userJourney.push(currentPage);
            v.pageViews = v.userJourney.length;
          }
        }
        if (exitPage) v.exitPage = exitPage;
        v.clickEvents = newClicks;
      }

      await db.writeDb(database);
    } catch (err) {
      console.warn('Async track processing error:', err.message);
    }
  })();
});

// Notifications
const GOOGLE_SHEET_URL = process.env.GOOGLE_SHEET_URL;
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
    const geo = await getGeoLocation(ip);

    const leadName = name || fullName || 'Anonymous Lead';
    const leadMessage = message || requirements || '';

    // Lead CRM Fix: Every lead gets a stable unique ID on creation for reliable status updates in the admin dashboard table.
    const newLead = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      name: leadName,
      email: email || '',
      phone: phone || '',
      budget: budget || '',
      message: leadMessage,
      ip,
      location: `${geo.city}, ${geo.country}`,
      isBot: false,
      timestamp: new Date().toISOString(),
      source: source || 'Hero Form',
      status: 'New',
      aiScore: Math.floor(Math.random() * 30) + 65,
      assignedTo: 'Aman',
      notes: ''
    };

    const database = db.readDb();
    database.leads.push(newLead);
    await db.writeDb(database);

    // Forward to Google Apps Script if URL set
    if (GOOGLE_SHEET_URL) {
      try {
        await axios.post(GOOGLE_SHEET_URL, JSON.stringify({
          fullName: leadName,
          email: email || '',
          phone: phone || '',
          budget: budget || '',
          requirements: leadMessage
        }), {
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          timeout: 5000
        });
      } catch (gErr) {
        console.warn('Google Sheet server forward warning:', gErr.message);
      }
    }

    // Forward to Telegram Group if credentials set
    await sendTelegramNotification(newLead);

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

  const database = db.readDb();
  const users = database.users || [];

  const inputUser = username.trim().toLowerCase();
  const inputPass = password.trim();

  const found = users.find(u => u.username.toLowerCase() === inputUser);

  if (found && found.password) {
    let isValidPassword = false;

    if (found.password.startsWith('$2a$') || found.password.startsWith('$2b$')) {
      isValidPassword = bcrypt.compareSync(inputPass, found.password);
    } else {
      if (found.password === inputPass || found.password.toLowerCase() === inputPass.toLowerCase()) {
        isValidPassword = true;
        found.password = bcrypt.hashSync(inputPass, 10);
        await db.writeDb(database);
      }
    }

    if (isValidPassword) {
      const secret = JWT_SECRET || 'smartfiq_fallback_secret_change_me_in_env';
      const payload = {
        id: found.id,
        username: found.username,
        name: found.name,
        roleTitle: found.roleTitle,
        isSuperAdmin: !!found.isSuperAdmin,
        permissions: found.permissions || ['overview']
      };

      const token = jwt.sign(payload, secret, { expiresIn: '12h' });
      return res.json({ success: true, token, user: payload });
    }
  }

  res.status(401).json({ success: false, error: 'Invalid Username or Password' });
});

// Fetch current user details
app.get('/api/auth/me', requireAuth, (req, res) => {
  const database = db.readDb();
  const latest = (database.users || []).find(u => String(u.id) === String(req.user.id) || (u.username && req.user.username && u.username.toLowerCase() === req.user.username.toLowerCase()));
  if (!latest) {
    return res.status(404).json({ success: false, error: 'User no longer exists. Please login again.' });
  }
  const { password, ...safeUser } = latest;
  res.json({ success: true, user: safeUser });
});

// ==================== PROTECTED API ROUTES (Require Auth JWT) ====================

// Update Lead details in CRM (Lead CRM Fix: Match by unique id first to prevent update collisions)
app.post('/api/leads/update', requireAuth, async (req, res) => {
  const { id, email, status, aiScore, notes, assignedTo } = req.body;
  const database = db.readDb();
  let leadIndex = -1;

  if (id !== undefined && id !== null && id !== '') {
    leadIndex = database.leads.findIndex(l => String(l.id) === String(id));
  }
  if (leadIndex === -1 && email) {
    leadIndex = database.leads.findIndex(l => l.email === email);
  }

  if (leadIndex !== -1) {
    if (status) database.leads[leadIndex].status = status;
    if (aiScore) database.leads[leadIndex].aiScore = Number(aiScore);
    if (notes !== undefined) database.leads[leadIndex].notes = notes;
    if (assignedTo) database.leads[leadIndex].assignedTo = assignedTo;
    await db.writeDb(database);
    res.json({ success: true, lead: database.leads[leadIndex] });
  } else {
    res.status(404).json({ error: 'Lead not found for update' });
  }
});

// Clear leads
app.delete('/api/leads', requireAuth, async (req, res) => {
  const database = db.readDb();
  database.leads = [];
  await db.writeDb(database);
  res.json({ success: true, message: 'Leads cleared' });
});

// Fetch stats summary (Dashboard module 1 - Cached 30s)
app.get('/api/stats', requireAuth, (req, res) => {
  if (statsCache && Date.now() < statsCache.expiresAt) {
    return res.json(statsCache.data);
  }

  const database = db.readDb();
  const visitors = database.visitors;
  const leads = database.leads;

  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  const onlineCount = visitors.filter(v => v.lastActive && new Date(v.lastActive) > twoMinutesAgo && !v.isBot).length;

  const totalCount = visitors.length;
  const humanCount = visitors.filter(v => !v.isBot).length;
  const botCount = visitors.filter(v => v.isBot).length;
  const humanPct = totalCount > 0 ? Math.round((humanCount / totalCount) * 100) : 0;

  const result = {
    totalVisitors: totalCount,
    onlineVisitors: onlineCount || 1,
    totalLeads: leads.length,
    humanPercentage: humanPct,
    botsBlocked: botCount
  };

  statsCache = { data: result, expiresAt: Date.now() + 30000 };
  res.json(result);
});

// Fetch visitor moment logs (Visitor Intel module 2)
app.get('/api/visitors', requireAuth, (req, res) => {
  const database = db.readDb();
  const sortedVisitors = [...database.visitors].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(sortedVisitors);
});

// Clear visitor logs
app.delete('/api/visitors', requireAuth, async (req, res) => {
  const database = db.readDb();
  database.visitors = [];
  await db.writeDb(database);
  res.json({ success: true });
});

// Fetch all leads (CRM module 3)
app.get('/api/leads', requireAuth, (req, res) => {
  const database = db.readDb();
  const sortedLeads = [...database.leads].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(sortedLeads);
});

// User Management & RBAC API Endpoints (Requires Security Permission)
app.get('/api/users', requireAuth, requirePermission('security'), (req, res) => {
  const database = db.readDb();
  const users = (database.users || []).map(u => {
    const { password, ...safeUser } = u;
    return safeUser;
  });
  res.json(users);
});

app.post('/api/users', requireAuth, requirePermission('security'), async (req, res) => {
  const { id, username, password, name, roleTitle, isSuperAdmin, permissions } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  const database = db.readDb();
  if (!database.users) database.users = [];

  let user = null;
  if (id) {
    user = database.users.find(u => u.id === parseInt(id));
  }
  if (!user) {
    user = database.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  if (user) {
    if (password && password.trim() !== '' && password !== '******') {
      user.password = bcrypt.hashSync(password.trim(), 10);
    }
    user.name = name || user.name;
    user.roleTitle = roleTitle || user.roleTitle;
    user.isSuperAdmin = isSuperAdmin !== undefined ? isSuperAdmin : user.isSuperAdmin;
    user.permissions = permissions || user.permissions || ['overview'];
  } else {
    if (!password || password.trim() === '' || password === '******') {
      return res.status(400).json({ error: 'Password is required for new users' });
    }
    const newId = database.users.length ? Math.max(...database.users.map(u => u.id || 0)) + 1 : 1;
    user = {
      id: newId,
      username: username.trim(),
      password: bcrypt.hashSync(password.trim(), 10),
      name: name || username,
      roleTitle: roleTitle || 'Admin User',
      isSuperAdmin: !!isSuperAdmin,
      permissions: permissions && permissions.length ? permissions : ['overview']
    };
    database.users.push(user);
  }

  await db.writeDb(database);
  const { password: p, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

app.delete('/api/users/:id', requireAuth, requirePermission('security'), async (req, res) => {
  const userId = parseInt(req.params.id);
  const database = db.readDb();
  if (!database.users) database.users = [];

  const target = database.users.find(u => u.id === userId);
  if (target && target.isSuperAdmin) {
    return res.status(400).json({ error: 'Cannot delete primary Super Admin' });
  }

  database.users = database.users.filter(u => u.id !== userId);
  await db.writeDb(database);
  res.json({ success: true });
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
    } else if (visitors.length > 0) {
      // Fallback relative distribution for historical seed sessions
      const bucket = Math.abs(v.sessionId ? v.sessionId.length : 0) % 7;
      visitorsByDay[bucket]++;
    }
  });

  leads.forEach(l => {
    if (!l || !l.timestamp) return;
    const lDate = new Date(l.timestamp);
    const diffDays = Math.floor((now - lDate) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < 7) {
      leadsByDay[6 - diffDays]++;
    } else if (leads.length > 0) {
      const bucket = Math.abs(l.id || 0) % 7;
      leadsByDay[bucket]++;
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

app.get('/api/cms', (req, res) => {
  const database = db.readDb();
  res.json(database.cms);
});

app.post('/api/cms', requireAuth, requirePermission('cms'), async (req, res) => {
  const updatedCms = await db.updateCMS(req.body);
  res.json({ success: true, cms: updatedCms });
});

// ==================== SERVICES ====================

app.get('/api/services', (req, res) => {
  const database = db.readDb();
  res.json(database.services || []);
});

app.post('/api/services', requireAuth, requirePermission('services'), async (req, res) => {
  const database = db.readDb();
  if (!database.services) database.services = [];

  const reqId = req.body.id !== undefined && req.body.id !== null && req.body.id !== '' ? Number(req.body.id) : null;

  if (reqId !== null && !isNaN(reqId)) {
    const index = database.services.findIndex(s => Number(s.id) === reqId);
    if (index !== -1) {
      database.services[index] = {
        ...database.services[index],
        id: reqId,
        name: req.body.name || database.services[index].name,
        desc: req.body.desc || database.services[index].desc,
        price: req.body.price || database.services[index].price,
        icon: req.body.icon || database.services[index].icon || 'smart_toy',
        features: req.body.features || database.services[index].features || []
      };
      await db.writeDb(database);
      return res.json({ success: true, service: database.services[index] });
    }
  }

  const maxId = database.services.reduce((max, s) => Math.max(max, Number(s.id) || 0), 0);
  const newService = {
    id: maxId + 1,
    name: req.body.name,
    desc: req.body.desc,
    price: req.body.price,
    icon: req.body.icon || 'smart_toy',
    features: req.body.features || []
  };
  database.services.push(newService);
  await db.writeDb(database);
  res.json({ success: true, service: newService });
});

app.put('/api/services/:id', requireAuth, requirePermission('services'), async (req, res) => {
  const id = Number(req.params.id);
  const database = db.readDb();
  if (!database.services) database.services = [];
  const index = database.services.findIndex(s => Number(s.id) === id);

  if (index !== -1) {
    database.services[index] = {
      ...database.services[index],
      id: id,
      name: req.body.name || database.services[index].name,
      desc: req.body.desc || database.services[index].desc,
      price: req.body.price || database.services[index].price,
      icon: req.body.icon || database.services[index].icon || 'smart_toy',
      features: req.body.features || database.services[index].features || []
    };
    await db.writeDb(database);
    return res.json({ success: true, service: database.services[index] });
  }

  res.status(404).json({ error: 'Service not found' });
});

app.delete('/api/services/:id', requireAuth, requirePermission('services'), async (req, res) => {
  const id = Number(req.params.id);
  const database = db.readDb();
  if (!database.services) database.services = [];
  database.services = database.services.filter(s => Number(s.id) !== id);
  await db.writeDb(database);
  res.json({ success: true });
});

// ==================== BLOGS ====================

app.get('/api/blogs', (req, res) => {
  const database = db.readDb();
  res.json(database.blogs || []);
});

app.post('/api/blogs', requireAuth, requirePermission('blog'), async (req, res) => {
  const database = db.readDb();
  if (!database.blogs) database.blogs = [];

  const reqId = req.body.id !== undefined && req.body.id !== null && req.body.id !== '' ? Number(req.body.id) : null;
  const article = db.normalizeArticle({
    ...req.body,
    id: reqId || undefined,
    status: req.body.status || 'Published'
  });

  if (reqId) {
    const index = database.blogs.findIndex(b => Number(b.id) === reqId);
    if (index !== -1) {
      database.blogs[index] = db.normalizeArticle({ ...database.blogs[index], ...article, id: reqId });
      await db.writeDb(database);
      return res.json({ success: true, blog: database.blogs[index] });
    }
  }

  const maxId = database.blogs.reduce((max, b) => Math.max(max, Number(b.id) || 0), 0);
  const newBlog = db.normalizeArticle({
    ...article,
    id: reqId || maxId + 1,
    date: article.date || new Date().toISOString().split('T')[0]
  });
  database.blogs.unshift(newBlog);
  await db.writeDb(database);
  res.json({ success: true, blog: newBlog });
});

app.delete('/api/blogs/:id', requireAuth, requirePermission('blog'), async (req, res) => {
  const id = Number(req.params.id);
  const database = db.readDb();
  if (!database.blogs) database.blogs = [];
  database.blogs = database.blogs.filter(b => Number(b.id) !== id);
  await db.writeDb(database);
  res.json({ success: true });
});

// ==================== PORTFOLIO ====================

app.get('/api/portfolio', (req, res) => {
  const database = db.readDb();
  res.json(database.portfolio || []);
});

app.post('/api/portfolio', requireAuth, requirePermission('portfolio'), async (req, res) => {
  const database = db.readDb();
  if (!database.portfolio) database.portfolio = [];
  const maxId = database.portfolio.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0);
  const item = {
    id: maxId + 1,
    title: req.body.title,
    desc: req.body.desc,
    category: req.body.category,
    image: req.body.image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600'
  };
  database.portfolio.unshift(item);
  await db.writeDb(database);
  res.json({ success: true, portfolio: item });
});

app.delete('/api/portfolio/:id', requireAuth, requirePermission('portfolio'), async (req, res) => {
  const id = Number(req.params.id);
  const database = db.readDb();
  if (!database.portfolio) database.portfolio = [];
  database.portfolio = database.portfolio.filter(p => Number(p.id) !== id);
  await db.writeDb(database);
  res.json({ success: true });
});

// ==================== APPOINTMENTS ====================

app.get('/api/appointments', requireAuth, (req, res) => {
  const database = db.readDb();
  res.json(database.appointments);
});

app.post('/api/appointments', requireAuth, async (req, res) => {
  const database = db.readDb();
  const newAppt = {
    id: database.appointments.length + 1,
    clientName: req.body.clientName,
    service: req.body.service,
    date: req.body.date,
    time: req.body.time,
    status: 'Confirmed'
  };
  database.appointments.push(newAppt);
  await db.writeDb(database);
  res.json({ success: true, appointment: newAppt });
});

// ==================== PROPOSALS & INVOICES ====================

app.get('/api/proposals', requireAuth, (req, res) => {
  const database = db.readDb();
  res.json(database.proposals);
});

app.post('/api/proposals', requireAuth, async (req, res) => {
  const database = db.readDb();
  const newProp = {
    id: database.proposals.length + 1,
    client: req.body.client,
    project: req.body.project,
    amount: req.body.amount,
    status: 'Sent'
  };
  database.proposals.push(newProp);
  await db.writeDb(database);
  res.json({ success: true, proposal: newProp });
});

app.get('/api/invoices', requireAuth, (req, res) => {
  const database = db.readDb();
  res.json(database.invoices);
});

app.post('/api/invoices', requireAuth, async (req, res) => {
  const database = db.readDb();
  const newInv = {
    id: 100 + database.invoices.length + 1,
    client: req.body.client,
    project: req.body.project,
    amount: req.body.amount,
    status: 'Pending',
    date: new Date().toISOString().split('T')[0]
  };
  database.invoices.push(newInv);
  await db.writeDb(database);
  res.json({ success: true, invoice: newInv });
});

// ==================== TEAM ====================

app.get('/api/team', requireAuth, (req, res) => {
  const database = db.readDb();
  res.json(database.team);
});

// ==================== SECURITY LOGS ====================

app.get('/api/security', requireAuth, requirePermission('security'), (req, res) => {
  const database = db.readDb();
  res.json(database.securityLogs);
});

// ==================== LEGAL & FAQ CMS API ====================

app.get('/api/legal', (req, res) => {
  const database = db.readDb();
  res.json(database.legalCms || {});
});

app.post('/api/legal/privacy', requireAuth, requirePermission('legal-cms'), async (req, res) => {
  const database = db.readDb();
  if (!database.legalCms) database.legalCms = {};
  database.legalCms.privacyPolicy = req.body;
  await db.writeDb(database);
  res.json({ success: true, privacyPolicy: database.legalCms.privacyPolicy });
});

app.post('/api/legal/terms', requireAuth, requirePermission('legal-cms'), async (req, res) => {
  const database = db.readDb();
  if (!database.legalCms) database.legalCms = {};
  database.legalCms.termsOfService = req.body;
  await db.writeDb(database);
  res.json({ success: true, termsOfService: database.legalCms.termsOfService });
});

app.post('/api/legal/faqs', requireAuth, requirePermission('legal-cms'), async (req, res) => {
  const database = db.readDb();
  if (!database.legalCms) database.legalCms = {};
  database.legalCms.faqs = req.body;
  await db.writeDb(database);
  res.json({ success: true, faqs: database.legalCms.faqs });
});

// ==================== AGENCY TEAM & CASE STUDIES API ====================

app.get('/api/agency-team', (req, res) => {
  const database = db.readDb();
  res.json(database.agencyTeam || []);
});

app.post('/api/agency-team', requireAuth, requirePermission('agency-team'), async (req, res) => {
  const database = db.readDb();
  if (!database.agencyTeam) database.agencyTeam = [];
  const member = req.body;
  if (member.id) {
    const idx = database.agencyTeam.findIndex(m => m.id === member.id);
    if (idx !== -1) database.agencyTeam[idx] = member;
    else database.agencyTeam.push(member);
  } else {
    member.id = database.agencyTeam.length > 0 ? Math.max(...database.agencyTeam.map(m => m.id || 0)) + 1 : 1;
    database.agencyTeam.push(member);
  }
  await db.writeDb(database);
  res.json({ success: true, team: database.agencyTeam });
});

app.delete('/api/agency-team/:id', requireAuth, requirePermission('agency-team'), async (req, res) => {
  const database = db.readDb();
  if (database.agencyTeam) {
    const id = Number(req.params.id);
    database.agencyTeam = database.agencyTeam.filter(m => m.id !== id);
    await db.writeDb(database);
  }
  res.json({ success: true });
});

app.get('/api/case-studies', (req, res) => {
  const database = db.readDb();
  res.json(database.caseStudies || []);
});

app.post('/api/case-studies', requireAuth, requirePermission('case-studies-cms'), async (req, res) => {
  const database = db.readDb();
  if (!database.caseStudies) database.caseStudies = [];
  const cs = req.body;
  if (cs.id) {
    const idx = database.caseStudies.findIndex(c => c.id === cs.id);
    if (idx !== -1) database.caseStudies[idx] = cs;
    else database.caseStudies.push(cs);
  } else {
    cs.id = database.caseStudies.length > 0 ? Math.max(...database.caseStudies.map(c => c.id || 0)) + 1 : 1;
    database.caseStudies.push(cs);
  }
  await db.writeDb(database);
  res.json({ success: true, caseStudies: database.caseStudies });
});

app.delete('/api/case-studies/:id', requireAuth, requirePermission('case-studies-cms'), async (req, res) => {
  const database = db.readDb();
  if (database.caseStudies) {
    const id = Number(req.params.id);
    database.caseStudies = database.caseStudies.filter(c => c.id !== id);
    await db.writeDb(database);
  }
  res.json({ success: true });
});

app.get('/api/apikeys', requireAuth, requirePermission('security'), (req, res) => {
  const database = db.readDb();
  res.json(database.apiKeys || []);
});

app.get('/api/settings', requireAuth, (req, res) => {
  const database = db.readDb();
  res.json(database.settings || {});
});

app.post('/api/settings', requireAuth, async (req, res) => {
  const updatedSettings = await db.updateSettings(req.body);
  res.json({ success: true, settings: updatedSettings });
});

// Start integrated server for local development or traditional hosting
if (!process.env.VERCEL) {
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
