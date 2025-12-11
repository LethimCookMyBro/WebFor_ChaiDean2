require("dotenv").config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const requestIp = require('request-ip');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const path = require('path');

// Routes
const locateRoutes = require('./routes/v1/locate');
const statusRoutes = require('./routes/v1/status');
const geoRoutes = require('./routes/v1/geo');
const reportsRoutes = require('./routes/v1/reports');
const authRoutes = require('./routes/v1/auth');
const adminRoutes = require('./routes/v1/admin');
const healthRoutes = require('./routes/health');

// Services
const logger = require('./services/logger');
const { initDatabase } = require('./services/database');
const { rateLimiter, sanitizeRequest, authRateLimiter } = require('./middleware/security');
const { csrfTokenMiddleware, csrfValidationMiddleware } = require('./middleware/csrf');
const { auditMiddleware } = require('./middleware/audit');

// Initialize Database
try {
  initDatabase();
  console.log('📦 Database initialized successfully');
} catch (error) {
  console.error('❌ Database initialization failed:', error.message);
  process.exit(1);
}

const app = express();

// Trust proxy for IP capture
app.set('trust proxy', true);
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================
// Security Middleware
// ============================================

// Helmet
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS
const allowedOrigins = [
  'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175',
  'http://127.0.0.1:5173', 'http://127.0.0.1:5174',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true
}));

app.use(cookieParser());
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestIp.mw());
app.use(sanitizeRequest);

if (NODE_ENV !== 'production') app.use(morgan('dev'));

// Request ID
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// IP Blocking Middleware (In-memory)
app.use((req, res, next) => {
  const clientIP = req.clientIp || req.ip;
  
  try {
    const { isIPBlocked, getBlockedIPInfo } = require('./routes/v1/admin');
    if (isIPBlocked && isIPBlocked(clientIP)) {
      const info = getBlockedIPInfo(clientIP);
      console.warn(`[SECURITY] ❌ Blocked request from banned IP: ${clientIP}`);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Your IP has been blocked',
        reason: info?.reason || 'Access denied'
      });
    }
  } catch (e) {
    // Continue if module not loaded yet
  }
  
  next();
});

// Audit Middleware
app.use(auditMiddleware);

// CSRF Protection
app.use('/api', csrfTokenMiddleware);
app.use('/api/v1', csrfValidationMiddleware);

// ============================================
// Static Files & Health Check
// ============================================

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: NODE_ENV === 'production' ? '1d' : 0,
  etag: true
}));

// Health check at /health (Railway uses this path)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

// ============================================
// API Routes
// ============================================
app.use('/api/health', healthRoutes);
app.use('/api/v1/auth', authRateLimiter, authRoutes);
app.use('/api/v1/locate', rateLimiter, locateRoutes);
app.use('/api/v1/status', rateLimiter, statusRoutes);
app.use('/api/v1/geo', rateLimiter, geoRoutes);
app.use('/api/v1/reports', rateLimiter, reportsRoutes);
app.use('/api/v1/admin', rateLimiter, adminRoutes);

// Root
app.get('/', (req, res) => {
  res.json({
    status: 'operational',
    service: 'Border Safety API',
    version: '2.3',
    storage: 'in-memory'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  logger.error('SERVER', err.message, { path: req.path });
  res.status(err.status || 500).json({ error: 'Internal Server Error' });
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📊 Storage: SQLite at ${process.env.DATABASE_PATH || 'default'}`);
  console.log(`🔒 Security: CSRF, Rate Limiting, IP Blocking enabled`);
  console.log(`📝 Audit Logging: Database\n`);
});

module.exports = app;
