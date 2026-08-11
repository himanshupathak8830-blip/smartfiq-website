const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');

const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const userRoutes = require('./routes/users');
const visitorRoutes = require('./routes/visitors');
const securityRoutes = require('./routes/security');
const portfolioRoutes = require('./routes/portfolio');
const appointmentRoutes = require('./routes/appointments');
const cmsRoutes = require('./routes/cms');

const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Allow external fonts, images, and inline styles for rich UI
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Simple Cookie Parser Middleware
app.use((req, res, next) => {
  req.cookies = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      if (parts.length === 2) {
        req.cookies[parts[0].trim()] = decodeURIComponent(parts[1].trim());
      }
    });
  }
  next();
});

// Serve Static Assets & Root Assets
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'templates')));
app.use(express.static(__dirname));

// General API Rate Limiting
app.use('/api', apiLimiter);

// API Routes Mount
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/security-logs', securityRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api', visitorRoutes); // For /api/track & /api/analytics
app.use('/api', cmsRoutes);     // For /api/services, /api/settings, /api/stats, /api/charts

// HTML Page Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates/index.html'));
});

app.get('/services', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates/services.html'));
});

app.get('/portfolio', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates/case-studies.html'));
});

app.get('/case-studies', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates/case-studies.html'));
});

app.get('/blog', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates/blog.html'));
});

app.get('/blog/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates/blog-detail.html'));
});

app.get('/about-smartfiq', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates/about-smartfiq.html'));
});

app.get('/our-story', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates/our-story.html'));
});

app.get('/faq', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates/faq.html'));
});

app.get('/privacy-policy', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates/privacy-policy.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates/terms.html'));
});

// Admin Dashboard Routes
app.get(['/personal-admin*', '/admin*'], (req, res) => {
  const adminIndex = path.join(__dirname, 'templates/admin/index.html');
  res.sendFile(adminIndex);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    backend: 'Node.js Express',
    storage: 'Google Sheets Data Engine',
    timestamp: new Date().toISOString()
  });
});

// Catch-all 404 Handler for HTML pages
app.use((req, res, next) => {
  if (req.accepts('html')) {
    return res.status(404).sendFile(path.join(__dirname, 'templates/404.html'));
  }
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Global Error Handler
app.use(errorHandler);

// Start Server
if (require.main === module) {
  app.listen(env.PORT, () => {
    console.log(`⚡ [SmartFiQ Server] Running on http://localhost:${env.PORT}`);
    console.log(`📊 [Storage Engine] Primary Storage: Google Sheets + Google Apps Script`);
  });
}

module.exports = app;
