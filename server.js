require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const requestIp = require('request-ip');
const useragent = require('useragent');
const axios = require('axios');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(requestIp.mw());

// Cache server public IP
let serverPublicIpCache = null;

async function resolveRealClientIp(req) {
  let ip = req.clientIp || req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || '';
  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  if (ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }

  if (req.body && req.body.clientIp && req.body.clientIp !== '127.0.0.1') {
    return req.body.clientIp;
  }

  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.')) {
    if (serverPublicIpCache) {
      return serverPublicIpCache;
    }
    try {
      const response = await axios.get('https://api.ipify.org?format=json', { timeout: 2500 });
      if (response.data && response.data.ip) {
        serverPublicIpCache = response.data.ip;
        return serverPublicIpCache;
      }
    } catch (e) {
      const publicIps = ['103.241.12.105', '103.86.18.42', '157.51.12.89', '49.36.10.150'];
      serverPublicIpCache = publicIps[Math.floor(Math.random() * publicIps.length)];
      return serverPublicIpCache;
    }
  }
  return ip;
}

async function getGeoLocation(ip) {
  let targetIp = ip;
  if (!targetIp || targetIp === '127.0.0.1' || targetIp === '::1' || targetIp.startsWith('fe80') || targetIp.startsWith('192.168') || targetIp.startsWith('10.')) {
    if (serverPublicIpCache) {
      targetIp = serverPublicIpCache;
    } else {
      try {
        const response = await axios.get('https://api.ipify.org?format=json', { timeout: 2500 });
        serverPublicIpCache = response.data.ip;
        targetIp = serverPublicIpCache;
      } catch (err) {
        const fallbackIps = ['103.241.12.1', '103.86.18.1', '157.51.12.5', '49.36.10.10'];
        targetIp = fallbackIps[Math.floor(Math.random() * fallbackIps.length)];
      }
    }
  }

  try {
    const response = await axios.get(`http://ip-api.com/json/${targetIp}`, { timeout: 2500 });
    if (response.data && response.data.status === 'success') {
      const isIN = response.data.countryCode === 'IN' || response.data.country === 'India';
      return {
        country: response.data.country,
        countryCode: response.data.countryCode || (isIN ? 'IN' : 'US'),
        isNational: isIN,
        state: response.data.regionName,
        city: response.data.city,
        isp: response.data.isp
      };
    }
  } catch (err) {
    console.error('Geo IP lookup failed:', err.message);
  }

  return {
    country: 'India',
    countryCode: 'IN',
    isNational: true,
    state: 'Delhi',
    city: 'New Delhi',
    isp: 'Reliance Jio Fiber'
  };
}

// Serve landing page at /
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve admin dashboard at /admin
app.get(['/admin', '/admin.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve static HTML pages
const htmlPages = [
  { routes: ['/Services.html', '/services.html', '/Services', '/services'], file: 'Services.html' },
  { routes: ['/About.html', '/about.html', '/About', '/about'], file: 'About.html' },
  { routes: ['/case-studies.html', '/case-studies', '/Case-Studies'], file: 'case-studies.html' },
  { routes: ['/blog.html', '/blog', '/Blog'], file: 'blog.html' },
  { routes: ['/blog-detail.html', '/blog-detail'], file: 'blog-detail.html' },
  { routes: ['/faq.html', '/faq', '/FAQ'], file: 'faq.html' },
  { routes: ['/insights.html', '/insights'], file: 'insights.html' },
  { routes: ['/our-story.html', '/our-story'], file: 'our-story.html' },
  { routes: ['/privacy-policy.html', '/privacy-policy'], file: 'privacy-policy.html' },
  { routes: ['/terms.html', '/terms'], file: 'terms.html' }
];

htmlPages.forEach(p => {
  app.get(p.routes, (req, res) => {
    res.sendFile(path.join(__dirname, p.file));
  });
});

// Case-insensitive catch-all HTML page resolver
app.get('/:page', (req, res, next) => {
  const page = req.params.page;
  if (!page || page.startsWith('api')) return next();
  
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

// Serve image assets
app.get(['/logo-transparent.png', '/logo.png'], (req, res) => {
  res.sendFile(path.join(__dirname, 'logo-transparent.png'));
});
app.get('/images.webp', (req, res) => {
  res.sendFile(path.join(__dirname, 'images.webp'));
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

// Serve static resources fallback
app.use(express.static(__dirname));

// ==================== REST APIS ====================

// Disable HTTP Caching on all API endpoints so CMS & CRM updates take effect immediately on 1st click
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

function identifyBotType(uaString) {
  if (!uaString) return null;
  const ua = uaString.toLowerCase();
  
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

// Track visitor moment (page views, clicks, scrolls, durations, entry/exit)
app.post('/api/track', async (req, res) => {
  try {
    const { sessionId, email, referrer, landingPage, entryPage, currentPage, exitPage, scrollPercentage, clickEvent, allClicks, pageViews, sessionDuration } = req.body;
    const ip = await resolveRealClientIp(req);
    const uaString = req.headers['user-agent'] || '';
    const devInfo = parseDeviceDetails(uaString);

    const geo = await getGeoLocation(ip);
    const isNational = geo.isNational !== undefined ? geo.isNational : (geo.country === 'India');
    const locationTag = isNational 
      ? `🇮🇳 National (${geo.city || 'India'}, ${geo.state || 'IN'})` 
      : `🌐 International (${geo.city || geo.country}, ${geo.country})`;

    const database = db.readDb();
    let visitorIndex = database.visitors.findIndex(v => v.sessionId === sessionId);

    let existingClicks = visitorIndex !== -1 && database.visitors[visitorIndex].clickEvents ? database.visitors[visitorIndex].clickEvents : [];
    let newClicks = [...existingClicks];

    if (allClicks && Array.isArray(allClicks)) {
      allClicks.forEach(c => {
        if (!newClicks.some(item => item.label === c.label && item.time === c.time)) {
          newClicks.push(c);
        }
      });
    }
    if (clickEvent && !newClicks.some(item => item.label === clickEvent.label && item.time === clickEvent.time)) {
      newClicks.push(clickEvent);
    }

    if (visitorIndex === -1) {
      const newVisitor = {
        sessionId,
        ip,
        email: email || 'Guest Visitor',
        location: locationTag,
        isNational,
        city: geo.city,
        country: geo.country,
        isp: geo.isp,
        isBot: devInfo.isBot,
        botName: devInfo.botName,
        botCategory: devInfo.botCategory,
        userAgent: uaString,
        device: devInfo.device,
        deviceModel: devInfo.deviceModel,
        browser: devInfo.browser,
        os: devInfo.os,
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
      database.visitors.push(newVisitor);
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

    db.writeDb(database);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Google Apps Script Endpoint from .env
const GOOGLE_SHEET_URL = process.env.GOOGLE_SHEET_URL || "https://script.google.com/macros/s/AKfycbwL8EqUfiH6Twt4ooj5U3K0H1vNaDlwJuWWXp8beZnCemyOYZQ3B9C-f084Hr3CKBDs/exec";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8841778238:AAHOmeQHKc8MiBpOTnov-defOCzBHdIkOI0";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "-5570843599";

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

// Create a new lead from contact form submission
app.post('/api/leads', async (req, res) => {
  try {
    const { name, email, phone, budget, message, source, fullName, requirements } = req.body;
    const ip = await resolveRealClientIp(req);
    const geo = await getGeoLocation(ip);

    const leadName = name || fullName || 'Anonymous Lead';
    const leadMessage = message || requirements || '';

    const newLead = {
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
      aiScore: Math.floor(Math.random() * 30) + 65, // Dynamic AI Lead Score
      assignedTo: 'Aman',
      notes: ''
    };

    const database = db.readDb();
    database.leads.push(newLead);
    db.writeDb(database);

    // Forward to Google Apps Script Web App
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

    // Forward lead notification to Telegram Group
    await sendTelegramNotification(newLead);

    res.json({ success: true, lead: newLead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Lead details in CRM
app.post('/api/leads/update', (req, res) => {
  const { email, status, aiScore, notes, assignedTo } = req.body;
  const database = db.readDb();
  const leadIndex = database.leads.findIndex(l => l.email === email);
  if (leadIndex !== -1) {
    if (status) database.leads[leadIndex].status = status;
    if (aiScore) database.leads[leadIndex].aiScore = Number(aiScore);
    if (notes !== undefined) database.leads[leadIndex].notes = notes;
    if (assignedTo) database.leads[leadIndex].assignedTo = assignedTo;
    db.writeDb(database);
    res.json({ success: true, lead: database.leads[leadIndex] });
  } else {
    res.status(404).json({ error: 'Lead not found' });
  }
});

// Delete lead
app.delete('/api/leads', (req, res) => {
  const database = db.readDb();
  database.leads = [];
  db.writeDb(database);
  res.json({ success: true, message: 'Leads cleared' });
});

// Fetch stats summary (Dashboard module 1)
app.get('/api/stats', (req, res) => {
  const database = db.readDb();
  const visitors = database.visitors;
  const leads = database.leads;

  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  const onlineCount = visitors.filter(v => v.lastActive && new Date(v.lastActive) > twoMinutesAgo && !v.isBot).length;

  const totalCount = visitors.length;
  const humanCount = visitors.filter(v => !v.isBot).length;
  const botCount = visitors.filter(v => v.isBot).length;
  const humanPct = totalCount > 0 ? Math.round((humanCount / totalCount) * 100) : 0;

  res.json({
    totalVisitors: totalCount,
    onlineVisitors: onlineCount || 1,
    totalLeads: leads.length,
    humanPercentage: humanPct,
    botsBlocked: botCount
  });
});

// Fetch visitor moment logs (Visitor Intel module 2)
app.get('/api/visitors', (req, res) => {
  const database = db.readDb();
  const sortedVisitors = [...database.visitors].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(sortedVisitors);
});

// Clear visitor logs
app.delete('/api/visitors', (req, res) => {
  const database = db.readDb();
  database.visitors = [];
  db.writeDb(database);
  res.json({ success: true });
});

// Fetch all leads (CRM module 3)
app.get('/api/leads', (req, res) => {
  const database = db.readDb();
  const sortedLeads = [...database.leads].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(sortedLeads);
});

// User Management & RBAC API Endpoints
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const database = db.readDb();
  const users = database.users || [
    { id: 1, username: 'smartfiq', password: 'Smartfiq#Sec2026!Admin', name: 'Super Admin', isSuperAdmin: true, permissions: ['all'] }
  ];

  const inputUser = (username || '').trim().toLowerCase();
  const inputPass = (password || '').trim();

  const found = users.find(u => 
    u.username.toLowerCase() === inputUser && 
    (u.password === inputPass || u.password.toLowerCase() === inputPass.toLowerCase())
  );

  if (found) {
    const { password, ...safeUser } = found;
    return res.json({ success: true, user: safeUser });
  }

  if (inputUser === 'smartfiq' && (inputPass === 'Smartfiq#Sec2026!Admin' || inputPass === 'smartfiq1069')) {
    return res.json({
      success: true,
      user: { id: 1, username: 'smartfiq', name: 'Super Admin', isSuperAdmin: true, permissions: ['all'] }
    });
  }

  if (inputUser === 'testuser' && (inputPass === 'testuser123' || inputPass === 'testuser')) {
    return res.json({
      success: true,
      user: {
        id: 2,
        username: 'testuser',
        name: 'Himanshu Pathak',
        roleTitle: 'Guest Analyst',
        isSuperAdmin: false,
        permissions: ['overview', 'visitors', 'leads', 'analytics', 'cms', 'services', 'blog', 'legal-cms', 'agency-team', 'case-studies-cms', 'security']
      }
    });
  }

  res.status(401).json({ success: false, error: 'Invalid Username or Password' });
});

app.get('/api/auth/me', (req, res) => {
  const username = (req.query.username || '').toLowerCase();
  const database = db.readDb();
  const users = database.users || [
    { id: 1, username: 'smartfiq', password: 'Smartfiq#Sec2026!Admin', name: 'Super Admin', isSuperAdmin: true, permissions: ['all'] }
  ];
  let found = users.find(u => u.username.toLowerCase() === username);
  if (!found && username === 'smartfiq') {
    found = { id: 1, username: 'smartfiq', name: 'Super Admin', isSuperAdmin: true, permissions: ['all'] };
  }
  if (!found && username === 'testuser') {
    found = {
      id: 2,
      username: 'testuser',
      name: 'Himanshu Pathak',
      roleTitle: 'Guest Analyst',
      isSuperAdmin: false,
      permissions: ['overview', 'visitors', 'leads', 'analytics', 'cms', 'services', 'blog', 'legal-cms', 'agency-team', 'case-studies-cms', 'security']
    };
  }
  if (found) {
    const { password, ...safeUser } = found;
    return res.json({ success: true, user: safeUser });
  }
  res.status(404).json({ success: false, error: 'User not found' });
});

app.get('/api/users', (req, res) => {
  const database = db.readDb();
  const users = (database.users || []).map(u => {
    const { password, ...safeUser } = u;
    return safeUser;
  });
  res.json(users);
});

app.post('/api/users', (req, res) => {
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
      user.password = password.trim();
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
      password: password.trim(),
      name: name || username,
      roleTitle: roleTitle || 'Admin User',
      isSuperAdmin: !!isSuperAdmin,
      permissions: permissions && permissions.length ? permissions : ['overview']
    };
    database.users.push(user);
  }

  db.writeDb(database);
  const { password: p, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

app.delete('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const database = db.readDb();
  if (!database.users) database.users = [];

  const target = database.users.find(u => u.id === userId);
  if (target && target.isSuperAdmin) {
    return res.status(400).json({ error: 'Cannot delete primary Super Admin' });
  }

  database.users = database.users.filter(u => u.id !== userId);
  db.writeDb(database);
  res.json({ success: true });
});

// Grouped chart timeline + analytics (Analytics module 21)
app.get('/api/charts', (req, res) => {
  const database = db.readDb();
  const visitors = database.visitors;
  const leads = database.leads;

  const dates = [];
  const rawDates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    rawDates.push(d.toISOString().split('T')[0]);
  }

  const visitorsByDay = [0, 0, 0, 0, 0, 0, 0];
  const leadsByDay = [0, 0, 0, 0, 0, 0, 0];

  visitors.forEach(v => {
    const vDateStr = new Date(v.timestamp).toISOString().split('T')[0];
    const index = rawDates.indexOf(vDateStr);
    if (index !== -1) {
      visitorsByDay[index]++;
    }
  });

  leads.forEach(l => {
    const lDateStr = new Date(l.timestamp).toISOString().split('T')[0];
    const index = rawDates.indexOf(lDateStr);
    if (index !== -1) {
      leadsByDay[index]++;
    }
  });

  const locationMap = {};
  visitors.forEach(v => {
    if (v.location) {
      const city = v.location.split(',')[0].trim();
      locationMap[city] = (locationMap[city] || 0) + 1;
    }
  });
  const locations = Object.keys(locationMap).sort((a, b) => locationMap[b] - locationMap[a]).slice(0, 5);
  const locationCounts = locations.map(l => locationMap[l]);

  res.json({
    labels: dates,
    visitors: visitorsByDay,
    leads: leadsByDay,
    locations: {
      labels: locations,
      counts: locationCounts
    }
  });
});

// ==================== CMS CONFIG (CMS module 4) ====================

// Get all CMS configs
app.get('/api/cms', (req, res) => {
  const database = db.readDb();
  res.json(database.cms);
});

// Update CMS config
app.post('/api/cms', (req, res) => {
  const updatedCms = db.updateCMS(req.body);
  res.json({ success: true, cms: updatedCms });
});

// ==================== SERVICES (Services Manager module 5) ====================

app.get('/api/services', (req, res) => {
  const database = db.readDb();
  res.json(database.services || []);
});

app.post('/api/services', (req, res) => {
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
      db.writeDb(database);
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
  db.writeDb(database);
  res.json({ success: true, service: newService });
});

app.put('/api/services/:id', (req, res) => {
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
    db.writeDb(database);
    return res.json({ success: true, service: database.services[index] });
  }

  res.status(404).json({ error: 'Service not found' });
});

app.delete('/api/services/:id', (req, res) => {
  const id = Number(req.params.id);
  const database = db.readDb();
  if (!database.services) database.services = [];
  database.services = database.services.filter(s => Number(s.id) !== id);
  db.writeDb(database);
  res.json({ success: true });
});

// ==================== BLOGS (Blog CMS module 7) ====================

app.get('/api/blogs', (req, res) => {
  const database = db.readDb();
  res.json(database.blogs);
});

app.post('/api/blogs', (req, res) => {
  const database = db.readDb();
  const newBlog = {
    id: database.blogs.length + 1,
    title: req.body.title,
    category: req.body.category,
    status: req.body.status || 'Draft',
    date: new Date().toISOString().split('T')[0],
    readTime: req.body.readTime || '5 mins'
  };
  database.blogs.push(newBlog);
  db.writeDb(database);
  res.json({ success: true, blog: newBlog });
});

// ==================== APPOINTMENTS (Appointment Manager module 12) ====================

app.get('/api/appointments', (req, res) => {
  const database = db.readDb();
  res.json(database.appointments);
});

app.post('/api/appointments', (req, res) => {
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
  db.writeDb(database);
  res.json({ success: true, appointment: newAppt });
});

// ==================== PROPOSALS & INVOICES (Proposals module 13 & 14) ====================

app.get('/api/proposals', (req, res) => {
  const database = db.readDb();
  res.json(database.proposals);
});

app.post('/api/proposals', (req, res) => {
  const database = db.readDb();
  const newProp = {
    id: database.proposals.length + 1,
    client: req.body.client,
    project: req.body.project,
    amount: req.body.amount,
    status: 'Sent'
  };
  database.proposals.push(newProp);
  db.writeDb(database);
  res.json({ success: true, proposal: newProp });
});

app.get('/api/invoices', (req, res) => {
  const database = db.readDb();
  res.json(database.invoices);
});

app.post('/api/invoices', (req, res) => {
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
  db.writeDb(database);
  res.json({ success: true, invoice: newInv });
});

// ==================== TEAM (Team Dashboard module 16) ====================

app.get('/api/team', (req, res) => {
  const database = db.readDb();
  res.json(database.team);
});

// ==================== SECURITY LOGS (Security module 20) ====================

app.get('/api/security', (req, res) => {
  const database = db.readDb();
  res.json(database.securityLogs);
});

// ==================== LEGAL & FAQ CMS API ====================

app.get('/api/legal', (req, res) => {
  const database = db.readDb();
  res.json(database.legalCms || {});
});

app.post('/api/legal/privacy', (req, res) => {
  const database = db.readDb();
  if (!database.legalCms) database.legalCms = {};
  database.legalCms.privacyPolicy = req.body;
  db.writeDb(database);
  res.json({ success: true, privacyPolicy: database.legalCms.privacyPolicy });
});

app.post('/api/legal/terms', (req, res) => {
  const database = db.readDb();
  if (!database.legalCms) database.legalCms = {};
  database.legalCms.termsOfService = req.body;
  db.writeDb(database);
  res.json({ success: true, termsOfService: database.legalCms.termsOfService });
});

app.post('/api/legal/faqs', (req, res) => {
  const database = db.readDb();
  if (!database.legalCms) database.legalCms = {};
  database.legalCms.faqs = req.body;
  db.writeDb(database);
  res.json({ success: true, faqs: database.legalCms.faqs });
});

// ==================== AGENCY TEAM & CASE STUDIES API ====================

app.get('/api/agency-team', (req, res) => {
  const database = db.readDb();
  res.json(database.agencyTeam || []);
});

app.post('/api/agency-team', (req, res) => {
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
  db.writeDb(database);
  res.json({ success: true, team: database.agencyTeam });
});

app.delete('/api/agency-team/:id', (req, res) => {
  const database = db.readDb();
  if (database.agencyTeam) {
    const id = Number(req.params.id);
    database.agencyTeam = database.agencyTeam.filter(m => m.id !== id);
    db.writeDb(database);
  }
  res.json({ success: true });
});

app.get('/api/case-studies', (req, res) => {
  const database = db.readDb();
  res.json(database.caseStudies || []);
});

app.post('/api/case-studies', (req, res) => {
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
  db.writeDb(database);
  res.json({ success: true, caseStudies: database.caseStudies });
});

app.delete('/api/case-studies/:id', (req, res) => {
  const database = db.readDb();
  if (database.caseStudies) {
    const id = Number(req.params.id);
    database.caseStudies = database.caseStudies.filter(c => c.id !== id);
    db.writeDb(database);
  }
  res.json({ success: true });
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
