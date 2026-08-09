const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = process.env.VERCEL ? path.join('/tmp', 'db.json') : path.join(__dirname, 'db.json');

// In-memory debounced disk write timer
let writeTimeout = null;

// Get default initial seeded database for all modules
function getSeedData() {
  const visitors = [];
  const leads = [];

  const mockCities = ['Mumbai, India', 'Bangalore, India', 'Delhi, India', 'Hyderabad, India', 'Pune, India', 'Chennai, India', 'Kolkata, India'];
  const mockEmails = ['Guest', 'amit.singh@tcs.in', 'priya.sharma@infosys.com', 'rahul@convexsol.co', 'Guest', 'Guest'];
  const mockNames = ['Amit Singh', 'Priya Sharma', 'Rahul Sen', 'Vikramaditya', 'Sanya Gupta'];
  const mockLeadEmails = ['amit.singh@tcs.in', 'priya.sharma@infosys.com', 'rahul@convexsol.co', 'vikram@tutanota.com', 'sanya@designhub.in'];
  const mockBudgets = ['Under ₹25,000', '₹25,000 - ₹50,000', '₹50,000 - ₹1,00,000', '₹1,00,000+'];
  const mockMessages = ['Need ecommerce website revamp', 'Looking for responsive landing page design', 'CRM integration for automated followups', 'Web scraping lead gen bot needed', 'WhatsApp chatbot for retail brand'];

  const mockISPs = ['Jio 5G', 'Airtel 5G', 'Vi Network', 'BSNL Broadband', 'ACT Fibernet', 'Tata Play Fiber'];

  const mockDevices = [
    { device: 'Mobile', deviceModel: 'iPhone 15 Pro', os: 'iOS 17', browser: 'Mobile Safari', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' },
    { device: 'Mobile', deviceModel: 'Samsung Galaxy S24', os: 'Android 14', browser: 'Chrome Mobile', ua: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 Chrome/122.0.0.0 Mobile Safari/537.36' },
    { device: 'Mobile', deviceModel: 'OnePlus 12', os: 'Android 14', browser: 'Chrome Mobile', ua: 'Mozilla/5.0 (Linux; Android 14; CPH2581) AppleWebKit/537.36 Chrome/121.0.0.0 Mobile Safari/537.36' },
    { device: 'Desktop', deviceModel: 'Windows PC', os: 'Windows 11', browser: 'Chrome', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36' },
    { device: 'Desktop', deviceModel: 'Windows PC', os: 'Windows 10', browser: 'Edge', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0' },
    { device: 'Desktop', deviceModel: 'MacBook Pro', os: 'macOS Ventura', browser: 'Safari', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 Safari/605.1.15' },
    { device: 'Tablet', deviceModel: 'iPad Pro', os: 'iOS 17', browser: 'Mobile Safari', ua: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' }
  ];

  const mockBots = [
    { name: 'Googlebot Indexer', category: 'Search Engine Crawler', ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
    { name: 'Google Lighthouse Audit', category: 'Performance Audit Bot', ua: 'Mozilla/5.0 (Linux; Android 11; Chrome-Lighthouse) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36' },
    { name: 'Bingbot Search Crawler', category: 'Search Engine Crawler', ua: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)' },
    { name: 'WhatsApp Link Previewer', category: 'Messaging Previewer', ua: 'WhatsApp/2.23.20.76 A' },
    { name: 'Ahrefs SEO Crawler', category: 'SEO Analytics Bot', ua: 'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)' }
  ];

  // Seed Visitors
  for (let i = 0; i < 45; i++) {
    const timestamp = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString();
    const ip = `${103 + Math.floor(Math.random()*100)}.${Math.floor(Math.random()*200)}.${Math.floor(Math.random()*254)}.${Math.floor(Math.random()*254)}`;
    const isBot = (i % 9 === 0);
    const bObj = isBot ? mockBots[i % mockBots.length] : null;
    const location = mockCities[Math.floor(Math.random()*mockCities.length)];
    const isp = mockISPs[Math.floor(Math.random()*mockISPs.length)];
    const email = isBot ? 'Guest' : mockEmails[Math.floor(Math.random()*mockEmails.length)];
    const dObj = mockDevices[i % mockDevices.length];
    
    visitors.push({
      sessionId: `sf-sess-${100000 + i}`,
      ip,
      email,
      location,
      isp,
      isBot,
      botName: isBot ? bObj.name : null,
      botCategory: isBot ? bObj.category : null,
      timestamp,
      lastActive: timestamp,
      userAgent: isBot ? bObj.ua : dObj.ua,
      device: isBot ? 'Desktop' : dObj.device,
      deviceModel: isBot ? bObj.name : dObj.deviceModel,
      browser: isBot ? bObj.name : dObj.browser,
      os: isBot ? 'Cloud Server' : dObj.os,
      entryPage: i % 3 === 0 ? '/services' : (i % 2 === 0 ? '/about' : '/'),
      currentPage: i % 4 === 0 ? '/contact' : '/services',
      exitPage: i % 3 === 0 ? '/contact' : (i % 2 === 0 ? '/services' : '/'),
      sessionDuration: isBot ? 1 : Math.floor(Math.random() * 240) + 10,
      scrollPct: isBot ? 5 : Math.floor(Math.random() * 85) + 15,
      pageViews: isBot ? 1 : Math.floor(Math.random() * 4) + 1,
      clickEvents: [],
      userJourney: ['/', '/services']
    });
  }

  // Seed Leads
  for (let i = 0; i < 8; i++) {
    const timestamp = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString();
    const name = mockNames[i % mockNames.length];
    const email = mockLeadEmails[i % mockLeadEmails.length];
    const budget = mockBudgets[i % mockBudgets.length];
    const message = mockMessages[i % mockMessages.length];
    const ip = `${112 + i * 11}.${50 + i * 15}.48.92`;

    leads.push({
      id: i + 1,
      name,
      email,
      phone: `+91 98765 ${10000 + i*132}`,
      budget,
      message,
      ip,
      location: 'Bangalore, India',
      isBot: false,
      timestamp,
      source: i % 2 === 0 ? 'Hero Form' : 'Popup Modal',
      status: i === 0 ? 'Contacted' : i === 1 ? 'Converted' : 'New',
      aiScore: 70 + (i * 4) % 30,
      assignedTo: i % 2 === 0 ? 'Aman' : 'Priya',
      notes: 'Wants integration within 2 weeks'
    });
  }

  // Seed CMS Configuration
  const cms = {
    brandName: 'Smartfiq',
    heroTitle: 'Automate Your <span class="lava-gradient-text">Operations</span> &amp; Cut Manual Workload by 80%',
    heroSubtitle: 'We build intelligent AI voice agents, WhatsApp automations, and custom CRM systems that work 24/7 to nurture leads, answer support, and scale revenue.',
    heroCtaText: 'Book Free AI Consultation',
    heroCtaLink: '#contactModal',
    aboutTitle: 'Empowering Teams to Focus on Growth, Not Busywork',
    aboutContent: 'We specialize in visual interfaces, backend automation pipelines, and custom AI agents designed to unlock exponential growth.',
    footerText: '© 2026 Smartfiq. All Rights Reserved. Smart Intelligence. Faster Growth.',
    contactEmail: 'consult@smartfiq.com',
    contactPhone: '+91 7678188047',
    contactAddress: 'New Delhi, India',
    whatsappNumber: '917678188047'
  };

  // Seed Services
  const services = [
    { id: 1, name: 'Website Development', desc: 'Modern, responsive, high-converting websites tailored for your brand.', price: 'Starting at ₹14,999 / $199', icon: 'language', features: ['Responsive Design', 'SEO Optimized', 'High Conversion UI'] },
    { id: 2, name: 'WhatsApp Chatbot Setup', desc: 'Automated 24/7 AI-driven customer support & lead capture on WhatsApp.', price: 'Starting at ₹9,999 / $129', icon: 'chat', features: ['24/7 AI Support', 'Instant Lead Capture', 'Custom Conversation Flows'] },
    { id: 3, name: 'Bulk WhatsApp Marketing Solutions', desc: 'Reach 1000+ potential clients simultaneously with targeted campaigns.', price: 'Starting at ₹4,999 / $69', icon: 'campaign', features: ['Targeted Broadcasts', 'High Open Rates', 'Analytics & Tracking'] },
    { id: 4, name: 'Logo & Brand Identity Design', desc: 'High-impact logo design & visual identity to stand out from competitors.', price: 'Starting at ₹3,499 / $49', icon: 'palette', features: ['Custom Logo Design', 'Brand Guidelines', 'Social Media Assets'] },
    { id: 5, name: 'Digital Marketing & SEO', desc: 'Rank higher on Google, boost traffic, and scale your online visibility.', price: 'Starting at ₹11,999/mo / $150/mo', icon: 'trending_up', features: ['Google Search Ranking', 'Content Strategy', 'Traffic Growth'] },
    { id: 6, name: 'AI Voice & Call Agents for Business', desc: 'Smart automated AI voice callers for inbound customer queries and outbound lead calls.', price: 'Starting at ₹19,999 / $249', icon: 'record_voice_over', features: ['Inbound & Outbound Calls', 'Humanlike Tone', 'CRM Sync & Reminders'] },
    { id: 7, name: 'Custom CRM Systems', desc: 'Streamline your lead management, client tracking, and sales pipelines.', price: 'Starting at ₹24,999 / $299', icon: 'grid_view', features: ['Lead Pipeline Management', 'Client Tracking', 'Automated Follow-ups'] },
    { id: 8, name: 'Gym Management System', desc: 'Complete software for member attendance, subscriptions, and automated reminders.', price: 'Starting at ₹14,999 / $199', icon: 'fitness_center', features: ['Member Attendance', 'Subscription Tracking', 'Automated Reminders'] }
  ];

  // Seed Portfolio
  const portfolio = [
    { id: 1, title: '93% Lead Response Time Cut', desc: 'Automated WhatsApp AI Agent integrated with Hubspot CRM.', category: 'WhatsApp AI', image: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?q=80&w=600' },
    { id: 2, title: '80% Tickets Resolved Instantly', desc: 'Instagram Conversational DM workflow for support ticket automation.', category: 'Social Automation', image: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=600' },
    { id: 3, title: '140+ Meetings Booked Monthly', desc: 'AI Voice Agent connected to Calendly and automated Gmail followups.', category: 'Voice AI', image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=600' }
  ];

  // Seed Blogs
  const blogs = [
    { id: 1, title: 'What is AI Automation? A Complete Guide for Businesses (2026)', category: 'AI Automation', status: 'Published', date: '2026-07-10', readTime: '6 mins', summary: 'A beginner-friendly breakdown of what AI automation actually means, the business problems it solves, and how companies typically start.', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600' },
    { id: 2, title: 'How WhatsApp Automation Works: Complete Guide for Businesses', category: 'Messaging Automation', status: 'Published', date: '2026-07-11', readTime: '5 mins', summary: 'How small businesses use WhatsApp bots to handle orders, support, and lead capture without hiring extra staff.', image: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?q=80&w=600' },
    { id: 3, title: 'AI Chatbots vs Human Support: Which Is Right for Your Business?', category: 'Customer Support', status: 'Published', date: '2026-07-12', readTime: '7 mins', summary: 'Where chatbots outperform human agents, where they don\'t, and how to build a hybrid support model that works.', image: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=600' },
    { id: 4, title: 'AI Voice Agents Explained: Automating Sales & Support Calls', category: 'Voice AI', status: 'Published', date: '2026-07-13', readTime: '6 mins', summary: 'A look at how AI-driven phone agents are handling calls, bookings, and follow-ups at a fraction of call-center cost.', image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=600' },
    { id: 5, title: 'Top 10 Business Processes You Should Automate with AI in 2026', category: 'Business Automation', status: 'Published', date: '2026-07-14', readTime: '8 mins', summary: 'A practical checklist of the highest-ROI processes (lead follow-up, data entry, scheduling, reporting) worth automating first.', image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=600' }
  ];

  // Seed Appointments
  const appointments = [
    { id: 1, clientName: 'Amit Singh', service: 'CRM Integration', date: '2026-07-16', time: '11:00 AM', status: 'Confirmed' },
    { id: 2, clientName: 'Priya Sharma', service: 'AI Agent Consultation', date: '2026-07-17', time: '03:30 PM', status: 'Pending' }
  ];

  // Seed Proposals
  const proposals = [
    { id: 1, client: 'TechCo India', project: 'AI Automation Core Framework', amount: '₹1,50,000', status: 'Accepted' },
    { id: 2, client: 'BrandsIn Retail', project: 'WhatsApp Broadcast Setup', amount: '₹40,000', status: 'Sent' }
  ];

  // Seed Invoices
  const invoices = [
    { id: 101, client: 'TechCo India', project: 'AI Automation Core Framework', amount: '₹1,50,000', status: 'Paid', date: '2026-07-12' },
    { id: 102, client: 'BrandsIn Retail', project: 'WhatsApp Broadcast Setup', amount: '₹40,000', status: 'Pending', date: '2026-07-14' }
  ];

  // Seed Team Members
  const team = [
    { id: 1, name: 'Aman Verma', role: 'Sales Lead', revenue: '₹3,40,000', leads: 24, attendance: '98%', kpi: '4.8/5' },
    { id: 2, name: 'Priya Iyer', role: 'Solutions Architect', revenue: '₹4,50,000', leads: 18, attendance: '95%', kpi: '4.9/5' }
  ];

  // Seed Security logs
  const securityLogs = [
    { id: 1, event: 'Successful Login', user: 'smartfiq', ip: '127.0.0.1', time: new Date().toISOString() },
    { id: 2, event: 'Dashboard Initialized', user: 'smartfiq', ip: '127.0.0.1', time: new Date().toISOString() }
  ];

  // Seed API integrations
  const apiKeys = [
    { id: 1, name: 'OpenAI API Key', key: 'sk-proj-...8aFd', status: 'Connected' },
    { id: 2, name: 'Meta WhatsApp Token', key: 'EAAGb...99ZA', status: 'Connected' },
    { id: 3, name: 'Resend API Key', key: 're_12...xyZ4', status: 'Connected' }
  ];

  // Seed Settings
  const settings = {
    brandName: 'SmartFiQ',
    supportEmail: 'consult@smartfiq.com',
    supportPhone: '+91 7678188047',
    theme: 'Azure Bright',
    maintenanceMode: false
  };

  // Seed Users with Bcrypt Hashed Passwords
  const users = [
    {
      id: 1,
      username: 'smartfiq',
      password: bcrypt.hashSync('Smartfiq#Sec2026!Admin', 10),
      name: 'Super Admin',
      roleTitle: 'Lead Architect & Owner',
      isSuperAdmin: true,
      permissions: ['all']
    },
    {
      id: 2,
      username: 'testuser',
      password: bcrypt.hashSync('testuser123', 10),
      name: 'Himanshu Pathak',
      roleTitle: 'Guest Analyst',
      isSuperAdmin: false,
      permissions: ['overview', 'visitors', 'leads', 'analytics', 'cms', 'services', 'blog', 'legal-cms', 'agency-team', 'case-studies-cms', 'security']
    }
  ];

  return {
    visitors,
    leads,
    cms,
    services,
    portfolio,
    blogs,
    appointments,
    proposals,
    invoices,
    team,
    users,
    securityLogs,
    apiKeys,
    settings
  };
}

function initDb() {
  const seedPath = path.join(__dirname, 'db.json');
  if (!fs.existsSync(DB_FILE)) {
    let content = null;
    if (fs.existsSync(seedPath)) {
      try { content = fs.readFileSync(seedPath, 'utf8'); } catch (e) {}
    }
    if (!content) {
      content = JSON.stringify(getSeedData(), null, 2);
    }
    try {
      fs.writeFileSync(DB_FILE, content);
    } catch (e) {
      console.warn('DB File write warning:', e.message);
    }
  }
}

function readDb() {
  if (!global.smartfiq_in_memory_db) {
    initDb();
    const seedPath = path.join(__dirname, 'db.json');
    try {
      if (fs.existsSync(DB_FILE)) {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        global.smartfiq_in_memory_db = JSON.parse(data);
      } else if (fs.existsSync(seedPath)) {
        const data = fs.readFileSync(seedPath, 'utf8');
        global.smartfiq_in_memory_db = JSON.parse(data);
      } else {
        global.smartfiq_in_memory_db = getSeedData();
      }
    } catch (err) {
      console.error('Error reading database file:', err);
      global.smartfiq_in_memory_db = getSeedData();
    }
  }

  const db = global.smartfiq_in_memory_db;
  
  // Seed data fallbacks if database or individual keys are empty/uninitialized
  const seeds = getSeedData();
  if (!db.visitors || db.visitors.length === 0) db.visitors = seeds.visitors;
  if (!db.leads || db.leads.length === 0) db.leads = seeds.leads;
  if (!db.services || db.services.length === 0) db.services = seeds.services;
  if (!db.users || db.users.length === 0) db.users = seeds.users;
  if (!db.cms || Object.keys(db.cms).length === 0) db.cms = seeds.cms;
  if (!db.blogs || db.blogs.length === 0) db.blogs = seeds.blogs;
  if (!db.appointments) db.appointments = seeds.appointments || [];
  if (!db.proposals) db.proposals = seeds.proposals || [];
  if (!db.invoices) db.invoices = seeds.invoices || [];
  if (!db.team) db.team = seeds.team || [];
  if (!db.securityLogs) db.securityLogs = seeds.securityLogs || [];
  if (!db.apiKeys) db.apiKeys = seeds.apiKeys || [];
  if (!db.settings) db.settings = seeds.settings || {};

  return db;
}

// Write to disk with debouncing and visitor pruning (max 2000 sessions)
function flushDbToDisk(data) {
  try {
    const jsonStr = JSON.stringify(data, null, 2);
    fs.writeFileSync(DB_FILE, jsonStr);
    const repoDbPath = path.join(__dirname, 'db.json');
    if (DB_FILE !== repoDbPath) {
      try { fs.writeFileSync(repoDbPath, jsonStr); } catch (e) {}
    }
  } catch (err) {
    console.warn('DB File write warning (memory persisted):', err.message);
  }
}

function writeDb(data) {
  // Prune visitors array at 2000 max size
  if (data.visitors && data.visitors.length > 2000) {
    data.visitors = data.visitors.slice(-2000);
  }

  global.smartfiq_in_memory_db = data;

  // Invalidate stats & charts cache on write
  if (global.smartfiq_invalidate_cache) {
    global.smartfiq_invalidate_cache();
  }

  // Debounced disk write (500ms)
  if (writeTimeout) clearTimeout(writeTimeout);
  writeTimeout = setTimeout(() => {
    flushDbToDisk(data);
    writeTimeout = null;
  }, 500);

  return true;
}

// Custom DB actions
function updateCMS(cmsData) {
  const db = readDb();
  db.cms = { ...db.cms, ...cmsData };
  writeDb(db);
  return db.cms;
}

function updateSettings(settingsData) {
  const db = readDb();
  db.settings = { ...db.settings, ...settingsData };
  writeDb(db);
  return db.settings;
}

module.exports = {
  getSeedData,
  readDb,
  writeDb,
  updateCMS,
  updateSettings
};
