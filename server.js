const express = require('express');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use('/static', express.static(path.join(__dirname, 'static')));
app.use(express.static(path.join(__dirname, 'static', 'images')));
app.use(express.static(path.join(__dirname, 'templates')));
app.use(express.static(__dirname, {
  index: false,
  dotfiles: 'ignore'
}));

const pages = {
  '/': 'index.html',
  '/services': 'services.html',
  '/case-studies': 'case-studies.html',
  '/blog': 'blog.html',
  '/about-smartfiq': 'about-smartfiq.html',
  '/our-story': 'our-story.html',
  '/faq': 'smartfiq-faq.html',
  '/smartfiq-faq': 'smartfiq-faq.html',
  '/privacy-policy': 'privacy-policy.html',
  '/terms': 'terms.html'
};

Object.entries(pages).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', file));
  });
});

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

app.get('/case-studies/:slug', (req, res, next) => {
  const slug = req.params.slug.replace(/\.html$/, '');
  const htmlFile = path.join(__dirname, 'case-studies', `${slug}.html`);
  if (fs.existsSync(htmlFile)) {
    return res.sendFile(htmlFile);
  }
  return res.sendFile(path.join(__dirname, 'templates', 'case-studies.html'));
});

app.get('/blog/:slug', (req, res, next) => {
  const slug = req.params.slug.replace(/\.html$/, '');
  const htmlFile = path.join(__dirname, 'blog', `${slug}.html`);
  if (fs.existsSync(htmlFile)) {
    return res.sendFile(htmlFile);
  }
  return res.sendFile(path.join(__dirname, 'templates', 'blog-detail.html'));
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    backend: 'Static Node fallback',
    admin: 'Django Admin at /admin/',
    api: 'Django'
  });
});

app.use((req, res) => {
  if (req.accepts('html')) {
    return res.status(404).sendFile(path.join(__dirname, 'templates', '404.html'));
  }
  return res.status(404).json({ success: false, error: 'Endpoint not found. Use Django for API routes.' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`SmartFiQ static fallback running on http://localhost:${PORT}`);
    console.log('Django is authoritative for /admin/ and /api/.');
  });
}

module.exports = app;
