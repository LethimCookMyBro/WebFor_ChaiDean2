/**
 * Border Safety Risk Checker - API Server
 * 
 * Production-ready Express server with:
 * - Security middleware (Helmet, rate limiting, input validation)
 * - Secure cookie handling
 * - Structured logging
 * - Error handling
 * - Health checks
 * - Family SOS system
 * - Authentication system
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const requestIp = require('request-ip');
const crypto = require('crypto');

// Cookie parser for auth cookies
let cookieParser;
try {
  cookieParser = require('cookie-parser');
} catch (e) {
  console.warn('[SERVER] cookie-parser not installed, cookies will not be parsed');
  cookieParser = (req, res, next) => next();
}

// Import routes
const locateRoutes = require('./routes/v1/locate');
const statusRoutes = require('./routes/v1/status');
const familyRoutes = require('./routes/v1/family');
const geoRoutes = require('./routes/v1/geo');
const reportsRoutes = require('./routes/v1/reports');
const authRoutes = require('./routes/v1/auth');
const healthRoutes = require('./routes/health');

// Import security middleware
const {
  rateLimiter,
  sanitizeRequest
} = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================
// CORS Configuration - Explicit whitelist
// ============================================

// Parse allowed origins from environment or use defaults
const parseOrigins = () => {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',').map(o => o.trim()).filter(Boolean);
  }
  // Default allowed origins
  return [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
  ];
};

const allowedOrigins = [
  ...parseOrigins(),
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check against whitelist
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log blocked origins
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-User-ID', 'X-Group-ID', 'X-CSRF-Token'],
  maxAge: 86400
};

// ============================================
// Trust Proxy Configuration
// ============================================

// Parse trusted proxies from environment
const trustedProxies = process.env.TRUSTED_PROXIES || 'loopback';
app.set('trust proxy', trustedProxies);

// ============================================
// Helmet Security Headers
// ============================================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", ...allowedOrigins],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false, // Required for some map tiles
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// ============================================
// Middleware Stack
// ============================================

app.use(cors(corsOptions));

// Cookie parser
if (typeof cookieParser === 'function') {
  app.use(cookieParser());
}

// Route-specific body size limits
const createBodyParser = (limit) => express.json({ limit });

// Default body parser (will be overridden per-route)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use(requestIp.mw());
app.use(sanitizeRequest);

// Logging
if (NODE_ENV === 'production') {
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400
  }));
} else {
  app.use(morgan('dev'));
}

// Secure request ID tracking using crypto
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  req.startTime = Date.now();
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.requestId);
  
  console.log(`[${req.requestId}] ${req.method} ${req.path} - IP: ${req.clientIp}`);
  
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    if (duration > 1000) {
      console.warn(`[${req.requestId}] Slow request: ${duration}ms`);
    }
  });
  
  next();
});

// ============================================
// Route-specific body limits middleware
// ============================================

const authBodyLimit = express.json({ limit: '1kb' });
const reportsBodyLimit = express.json({ limit: '50kb' });
const sosBodyLimit = express.json({ limit: '5kb' });

// ============================================
// API Routes
// ============================================

// Health check (no rate limit for monitoring)
app.use('/api/health', healthRoutes);

// Auth routes with strict body limit
app.use('/api/v1/auth', authBodyLimit, rateLimiter, authRoutes);

// Main API routes
app.use('/api/v1/locate', rateLimiter, locateRoutes);
app.use('/api/v1/status', rateLimiter, statusRoutes);
app.use('/api/v1/family', sosBodyLimit, rateLimiter, familyRoutes);
app.use('/api/v1/geo', rateLimiter, geoRoutes);
app.use('/api/v1/reports', reportsBodyLimit, rateLimiter, reportsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Border Safety Risk Checker API',
    version: '2.1.0',
    status: 'operational',
    endpoints: {
      health: 'GET /api/health',
      auth: {
        login: 'POST /api/v1/auth/login',
        adminLogin: 'POST /api/v1/auth/admin/login',
        logout: 'POST /api/v1/auth/logout',
        refresh: 'POST /api/v1/auth/refresh'
      },
      locate: 'POST /api/v1/locate',
      status: 'GET /api/v1/status',
      family: {
        register: 'POST /api/v1/family/register',
        members: 'GET /api/v1/family/members',
        status: 'GET /api/v1/family/status',
        sos: 'POST /api/v1/family/sos',
        updateStatus: 'POST /api/v1/family/update-status',
        alerts: 'GET /api/v1/family/alerts'
      }
    },
    disclaimer: 'This is an approximate risk model. Always follow official civil defence guidance.'
  });
});

// ============================================
// Error Handling
// ============================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'ไม่พบ endpoint ที่ร้องขอ',
    requestId: req.requestId
  });
});

app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.requestId || 'unknown'}:`, err.message);
  
  if (NODE_ENV === 'development') {
    console.error(err.stack);
  }
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Origin not allowed',
      requestId: req.requestId
    });
  }
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ 
      error: 'Bad Request', 
      message: 'Invalid JSON',
      requestId: req.requestId
    });
  }
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ 
      error: 'Payload Too Large', 
      message: 'Request body too large',
      requestId: req.requestId
    });
  }
  
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: NODE_ENV === 'development' ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่',
    requestId: req.requestId
  });
});

// ============================================
// Server Startup
// ============================================

const server = app.listen(PORT, () => {
  console.log('');
  console.log('🛡️  ═══════════════════════════════════════════════');
  console.log('🛡️  Border Safety Risk Checker API v2.1');
  console.log('🛡️  ═══════════════════════════════════════════════');
  console.log(`🛡️  Environment: ${NODE_ENV}`);
  console.log(`🛡️  Port: ${PORT}`);
  console.log(`🛡️  Trust Proxy: ${trustedProxies}`);
  console.log(`🛡️  Allowed Origins: ${allowedOrigins.join(', ')}`);
  console.log('🛡️  ───────────────────────────────────────────────');
  console.log(`🛡️  Health: http://localhost:${PORT}/api/health`);
  console.log(`🛡️  Auth: http://localhost:${PORT}/api/v1/auth/*`);
  console.log(`🛡️  Locate: POST http://localhost:${PORT}/api/v1/locate`);
  console.log(`🛡️  Family: http://localhost:${PORT}/api/v1/family/*`);
  console.log('🛡️  ═══════════════════════════════════════════════');
  console.log('');
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;