const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db.json');

// Get default initial seeded database for all 25 modules
function getSeedData() {
  const visitors = [];
  const leads = [];

  const mockCities = ['Mumbai, India', 'Bangalore, India', 'Delhi, India', 'Hyderabad, India', 'Pune, India', 'Chennai, India', 'Kolkata, India'];
  const mockEmails = ['Guest', 'amit.singh@tcs.in', 'priya.sharma@infosys.com', 'rahul@convexsol.co', 'Guest', 'Guest'];
  const mockNames = ['Amit Singh', 'Priya Sharma', 'Rahul Sen', 'Vikramaditya', 'Sanya Gupta'];
  const mockLeadEmails = ['amit.singh@tcs.in', 'priya.sharma@infosys.com', 'rahul@convexsol.co', 'vikram@tutanota.com', 'sanya@designhub.in'];
  const mockBudgets = ['Under ₹25,000', '₹25,000 - ₹50,000', '₹50,000 - ₹1,00,000', '₹1,00,000+'];
  const mockMessages = ['Need ecommerce website revamp', 'Looking for responsive landing page design', 'CRM integration for automated followups', 'Web scraping lead gen bot needed', 'WhatsApp chatbot for retail brand'];

  // Seed Visitors
  for (let i = 0; i < 45; i++) {
    const timestamp = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString();
    const ip = `${103 + Math.floor(Math.random()*100)}.${Math.floor(Math.random()*200)}.${Math.floor(Math.random()*254)}.${Math.floor(Math.random()*254)}`;
    const isBot = Math.random() < 0.12;
    const location = mockCities[Math.floor(Math.random()*mockCities.length)];
    const email = isBot ? 'Guest' : mockEmails[Math.floor(Math.random()*mockEmails.length)];
    
    visitors.push({
      ip,
      email,
      location,
      isBot,
      timestamp,
      lastActive: timestamp,
      userAgent: isBot ? 'Mozilla/5.0 (compatible; Googlebot/2.1)' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0 Safari/537.36',
      device: isBot ? 'Desktop' : (Math.random() < 0.35 ? 'Mobile' : 'Desktop'),
      browser: isBot ? 'Googlebot' : 'Chrome',
      os: isBot ? 'Linux' : 'macOS',
      sessionDuration: isBot ? 1 : Math.floor(Math.random() * 240) + 10,
      scrollPct: isBot ? 5 : Math.floor(Math.random() * 85) + 15,
      pageViews: isBot ? 1 : Math.floor(Math.random() * 4) + 1,
      clickEvents: [],
      userJourney: ['/']
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
    const location = 'Bangalore, India';

    leads.push({
      name,
      email,
      phone: `+91 98765 ${10000 + i*132}`,
      budget,
      message,
      ip,
      location,
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
    { id: 1, title: '93% Lead Response Time Cut', desc: 'Automated WhatsApp AI Agent integrated with Hubspot CRM.', category: 'WhatsApp AI', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmeTgRa_-U6aA6_WtKs62LYrax3kgEdlSWWYya0QlVrtx6Meemrepa58Gg8ylms30H004BXZ7QJ3o31YNe8AMs2Zzzk510e75FdQXBA7nNWS6yFvQsERAHKgmlqqN-nKJvxvulP7JHCSAmS__lJUbEZr2k7HJUWQSWbg4XBbfooZO7wuBB8uKSxgNCrU1wJu2xqknszqE_ZSsBjNJ2s1fKRYWG4A-Uo92DuKgXXCrxfhjbKIZ8G5L5iA' },
    { id: 2, title: '80% Tickets Resolved Instantly', desc: 'Instagram Conversational DM workflow for support ticket automation.', category: 'Social Automation', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlnmZrQBQ6r4bLrUFJZ4yi_bVKqAjkwfpJYlPg3f3CkRj1oQzUTXOuDhO_AXGVc78KX_4kVBWMT7xejWSD2Gg0dF1fZZJktvKbKACTkYXsrgL_3fKMf07bh0-GGQ-8uK41hN88ZwHlbKc0TGIytkqvVyYnmCxvxAshhvH-dN3uZay7jKdjUtficQkSLKXhWiwbhFs-lwxTeUlf0xJidGx89BN3KKP5PgHBFaCzGK4ZfF-M4xc30XY4Pg' },
    { id: 3, title: '140+ Meetings Booked Monthly', desc: 'AI Voice Agent connected to Calendly and automated Gmail followups.', category: 'Voice AI', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNTV6_AVEf00BwdABjxoOW_o5OzSEibEwcFcwmRV-ZUgkf0fIuHWMLkU2BZ_YCOmCE4ufiruoItWPHUhFbfZsAS1yN-sGbLdXSzbmXVyHLa06W9-aqB_leN3gWCOCLbvyzbkeynUOuEN3D-xmdA9C89x_uEdS1DRmrTjU8LhAHl7o-5VB_lkL9cV4gyiw8M-IfO1m5rMjvvZlIzHgMRVHv-6P3YIRbhcKb9858KoGM2TGt1q-jg6h_hQ' }
  ];

  // Seed Blogs
  const blogs = [
    { id: 1, title: 'What is AI Automation and How Can It Grow Your Business?', category: 'AI Automation', status: 'Published', date: '2026-07-10', readTime: '6 mins', summary: 'A beginner-friendly breakdown of what AI automation actually means, the business problems it solves, and how companies typically start.', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmeTgRa_-U6aA6_WtKs62LYrax3kgEdlSWWYya0QlVrtx6Meemrepa58Gg8ylms30H004BXZ7QJ3o31YNe8AMs2Zzzk510e75FdQXBA7nNWS6yFvQsERAHKgmlqqN-nKJvxvulP7JHCSAmS__lJUbEZr2k7HJUWQSWbg4XBbfooZO7wuBB8uKSxgNCrU1wJu2xqknszqE_ZSsBjNJ2s1fKRYWG4A-Uo92DuKgXXCrxfhjbKIZ8G5L5iA' },
    { id: 2, title: 'WhatsApp Automation for Small Businesses', category: 'Messaging Automation', status: 'Published', date: '2026-07-11', readTime: '5 mins', summary: 'How small businesses use WhatsApp bots to handle orders, support, and lead capture without hiring extra staff.', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlnmZrQBQ6r4bLrUFJZ4yi_bVKqAjkwfpJYlPg3f3CkRj1oQzUTXOuDhO_AXGVc78KX_4kVBWMT7xejWSD2Gg0dF1fZZJktvKbKACTkYXsrgL_3fKMf07bh0-GGQ-8uK41hN88ZwHlbKc0TGIytkqvVyYnmCxvxAshhvH-dN3uZay7jKdjUtficQkSLKXhWiwbhFs-lwxTeUlf0xJidGx89BN3KKP5PgHBFaCzGK4ZfF-M4xc30XY4Pg' },
    { id: 3, title: 'AI Chatbots vs Human Support', category: 'Customer Support', status: 'Published', date: '2026-07-12', readTime: '7 mins', summary: 'Where chatbots outperform human agents, where they don\'t, and how to build a hybrid support model that works.', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNTV6_AVEf00BwdABjxoOW_o5OzSEibEwcFcwmRV-ZUgkf0fIuHWMLkU2BZ_YCOmCE4ufiruoItWPHUhFbfZsAS1yN-sGbLdXSzbmXVyHLa06W9-aqB_leN3gWCOCLbvyzbkeynUOuEN3D-xmdA9C89x_uEdS1DRmrTjU8LhAHl7o-5VB_lkL9cV4gyiw8M-IfO1m5rMjvvZlIzHgMRVHv-6P3YIRbhcKb9858KoGM2TGt1q-jg6h_hQ' },
    { id: 4, title: 'How AI Voice Agents Are Changing Customer Service', category: 'Voice AI', status: 'Published', date: '2026-07-13', readTime: '6 mins', summary: 'A look at how AI-driven phone agents are handling calls, bookings, and follow-ups at a fraction of call-center cost.', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCDqQOJR5ptc9fY0HiDc-GcA5CvU0Fa0aUVudTHXu0EEZeI3gl_E95qaX705iwrDCezyBM7wD8fSOf-r33-yFDJ38lNGgJVavU9zfx8CgU0ThJtUUMNDml2UtrfQZobgs9lF59c_AoSddqoyNjpfDBdZ6NwIlyXGZp3ETYOGyBy6RX6VdqZjPXWy8dA_xY5to7MFDUDeCqQCFNHmSKCGVzlg9vgobmutFPBP0R7hFNv0qb1IDPO2qCGqw' },
    { id: 5, title: 'Top Business Processes You Should Automate in 2026', category: 'Business Automation', status: 'Published', date: '2026-07-14', readTime: '8 mins', summary: 'A practical checklist of the highest-ROI processes (lead follow-up, data entry, scheduling, reporting) worth automating first.', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAmBuzV5ivYyRPvXVEWXKXFR7nq7KGxZJyz44yK4BUXsrPowyybwsAHAoTmx1FXEqBxIJfCeXh2jk0M9lar7Qo-5yFgz136ql9g0qyi-Igy-8sMO2sULZC4iwAob2CBs1cUAIszhbqSyfBJe0jWlkuLVDfn95c1EuSAWJlp6o8oqFAro76w4z1tM8DrsgFoCRypbCL806xriU7Sop-7k8ikkzrTRjbzxtQk4lg7MRH9vp8Bvq3aw9U5Ww' }
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
    securityLogs,
    apiKeys,
    settings
  };
}

function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(getSeedData(), null, 2));
  }
}

function readDb() {
  initDb();
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database file:', err);
    return getSeedData();
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('Error writing to database:', err);
    return false;
  }
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
  readDb,
  writeDb,
  updateCMS,
  updateSettings
};
