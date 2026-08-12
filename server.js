const express = require('express');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API Fallback Route Handlers (Prevents 404s in local dev) ---
app.post(['/api/track', '/api/track/'], (req, res) => {
  res.json({ success: true, tracked: true });
});

app.get(['/api/cms', '/api/cms/'], (req, res) => {
  res.json({
    success: true,
    contactEmail: "smartfiqagency@gmail.com",
    contactPhone: "+91 7678188047",
    whatsappNumber: "7678188047"
  });
});

app.all(['/api/public/leads', '/api/public/leads/', '/api/leads', '/api/leads/'], (req, res) => {
  res.json({ success: true, message: "Lead recorded successfully" });
});

app.all(['/api/public/subscribers', '/api/public/subscribers/'], (req, res) => {
  res.json({ success: true, message: "Subscribed successfully" });
});

app.get(['/api/agency-team', '/api/agency-team/', '/api/team', '/api/team/'], (req, res) => {
  res.json({ success: true, team: [] });
});

app.get(['/api/services', '/api/services/'], (req, res) => {
  res.json({ success: true, services: [] });
});

app.get(['/api/case-studies', '/api/case-studies/'], (req, res) => {
  res.json({ success: true, caseStudies: [] });
});

app.get(['/api/blogs', '/api/blogs/'], (req, res) => {
  res.json({ success: true, blogs: [] });
});

app.all('/api/*', (req, res) => {
  res.json({ success: true, status: "OK" });
});

const pages = {
  '/': 'index.html',
  '/services': 'services.html',
  '/case-studies': 'case-studies.html',
  '/blog': 'blog.html',
  '/about-smartfiq': 'about-smartfiq.html',
  '/our-story': 'our-story.html',
  '/faq': 'smartfiq-faq.html',
  '/smartfiq-faq': 'smartfiq-faq.html',
  '/industries': 'industries.html',
  '/industries.html': 'industries.html',
  '/privacy-policy': 'privacy-policy.html',
  '/terms': 'terms.html',
  '/admin': 'admin.html'
};

Object.entries(pages).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', file));
  });
});

const staticOptions = {
  setHeaders: (res, filePath) => {
    const lower = filePath.toLowerCase();
    if (lower.match(/\.(webp|jpg|jpeg|png|gif|ico|svg|woff2?|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (lower.match(/\.(js|css)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
    }
  }
};

app.use('/static', express.static(path.join(__dirname, 'static'), staticOptions));
app.use(express.static(path.join(__dirname, 'static', 'images'), staticOptions));
app.use(express.static(path.join(__dirname, 'templates'), staticOptions));
app.use(express.static(__dirname, {
  ...staticOptions,
  index: false,
  dotfiles: 'ignore'
}));

const fs = require('fs');

app.get('/services/:slug', (req, res) => {
  let rawSlug = req.params.slug.replace(/\.html$/, '').trim().toLowerCase();
  
  // 1. Direct file check
  let htmlFile = path.join(__dirname, 'services', `${rawSlug}.html`);
  if (fs.existsSync(htmlFile)) {
    return res.sendFile(htmlFile);
  }
  
  // 2. Fuzzy match in services directory
  const servicesDir = path.join(__dirname, 'services');
  if (fs.existsSync(servicesDir)) {
    const files = fs.readdirSync(servicesDir).filter(f => f.endsWith('.html'));
    
    let matchedFile = files.find(f => {
      const name = f.replace(/\.html$/, '').toLowerCase();
      return name === rawSlug || rawSlug.startsWith(name) || name.startsWith(rawSlug);
    });
    
    if (matchedFile) {
      return res.sendFile(path.join(servicesDir, matchedFile));
    }
  }
  
  // 3. Keyword fallback mapping
  if (rawSlug.includes('voice') || rawSlug.includes('call')) {
    return res.sendFile(path.join(__dirname, 'services', 'ai-voice-call-agents.html'));
  }
  if (rawSlug.includes('whatsapp') && (rawSlug.includes('market') || rawSlug.includes('bulk'))) {
    return res.sendFile(path.join(__dirname, 'services', 'bulk-whatsapp-marketing.html'));
  }
  if (rawSlug.includes('whatsapp') || rawSlug.includes('bot')) {
    return res.sendFile(path.join(__dirname, 'services', 'whatsapp-chatbot-setup.html'));
  }
  if (rawSlug.includes('website')) {
    return res.sendFile(path.join(__dirname, 'services', 'website-development.html'));
  }
  if (rawSlug.includes('viral') || rawSlug.includes('reel') || rawSlug.includes('pilot')) {
    return res.sendFile(path.join(__dirname, 'services', 'viralpilot-ai-social-reel-automation.html'));
  }
  if (rawSlug.includes('logo') || rawSlug.includes('brand')) {
    return res.sendFile(path.join(__dirname, 'services', 'logo-brand-identity-design.html'));
  }
  if (rawSlug.includes('crm')) {
    return res.sendFile(path.join(__dirname, 'services', 'custom-crm-systems.html'));
  }
  if (rawSlug.includes('gym')) {
    return res.sendFile(path.join(__dirname, 'services', 'gym-management-system.html'));
  }
  if (rawSlug.includes('marketing') || rawSlug.includes('seo')) {
    return res.sendFile(path.join(__dirname, 'services', 'digital-marketing-seo.html'));
  }
  
  return res.redirect('/services');
});

app.use((req, res, next) => {
  if (req.path.length > 1 && req.path.endsWith('/')) {
    const query = req.url.slice(req.path.length);
    const safePath = req.path.slice(0, -1);
    return res.redirect(301, safePath + query);
  }
  next();
});

app.get(['/case-studies', '/case-studies/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'case-studies.html'));
});

app.get('/case-studies/:slug', (req, res) => {
  const slug = (req.params.slug || '').replace(/\.html$/, '').trim().toLowerCase();
  if (!slug) {
    return res.sendFile(path.join(__dirname, 'templates', 'case-studies.html'));
  }
  const htmlFile = path.join(__dirname, 'case-studies', `${slug}.html`);
  if (fs.existsSync(htmlFile)) {
    return res.sendFile(htmlFile);
  }
  return res.sendFile(path.join(__dirname, 'templates', 'case-studies.html'));
});

app.get(['/blog', '/blog/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'blog.html'));
});

app.get('/blog/:slug', (req, res) => {
  const slug = (req.params.slug || '').replace(/\.html$/, '').trim().toLowerCase();
  if (!slug) {
    return res.sendFile(path.join(__dirname, 'templates', 'blog.html'));
  }
  const htmlFile = path.join(__dirname, 'blog', `${slug}.html`);
  if (fs.existsSync(htmlFile)) {
    return res.sendFile(htmlFile);
  }
  return res.sendFile(path.join(__dirname, 'templates', 'blog.html'));
});

app.get('/industries/:slug', (req, res) => {
  const slug = (req.params.slug || '').replace(/\.html$/, '').trim().toLowerCase();
  let htmlFile = path.join(__dirname, 'templates', 'industries', `${slug}.html`);
  if (!fs.existsSync(htmlFile)) {
    htmlFile = path.join(__dirname, 'industries', `${slug}.html`);
  }
  if (fs.existsSync(htmlFile)) {
    return res.sendFile(htmlFile);
  }
  return res.redirect('/');
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    backend: 'Node.js Express',
    api: 'Node.js Express'
  });
});

app.use((req, res) => {
  if (req.accepts('html')) {
    return res.status(404).sendFile(path.join(__dirname, 'templates', '404.html'));
  }
  return res.status(404).json({ success: false, error: 'Endpoint not found.' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`SmartFiQ Node.js server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
