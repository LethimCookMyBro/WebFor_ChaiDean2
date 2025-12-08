/**
 * Border Safety Risk Checker - API Server
 * 
 * Production-ready Express server with:
 * - Security middleware (rate limiting, input validation)
 * - Structured logging
 * - Error handling
 * - Health checks
 * - Family SOS system
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const requestIp = require('request-ip');

// Import routes
const locateRoutes = require('./routes/v1/locate');
const statusRoutes = require('./routes/v1/status');
const familyRoutes = require('./routes/v1/family');
const geoRoutes = require('./routes/v1/geo');
const reportsRoutes = require('./routes/v1/reports');
const healthRoutes = require('./routes/health');

// Import security middleware
const {
  rateLimiter,
  securityHeaders,
  sanitizeRequest
} = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================
// CORS Configuration
// ============================================
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: function(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    if (NODE_ENV === 'development') {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-User-ID', 'X-Group-ID'],
  maxAge: 86400
};

// ============================================
// Middleware Stack
// ============================================

app.set('trust proxy', 1);
app.use(securityHeaders);
app.use(cors(corsOptions));
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

// Request tracking
app.use((req, res, next) => {
  req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.startTime = Date.now();
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
// API Routes
// ============================================

app.use('/api/health', healthRoutes);
app.use('/api/v1/locate', rateLimiter, locateRoutes);
app.use('/api/v1/status', rateLimiter, statusRoutes);
app.use('/api/v1/family', rateLimiter, familyRoutes);
app.use('/api/v1/geo', rateLimiter, geoRoutes);
app.use('/api/v1/reports', rateLimiter, reportsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Border Safety Risk Checker API',
    version: '2.0.0',
    status: 'operational',
    endpoints: {
      health: 'GET /api/health',
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
    path: req.path
  });
});

app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.requestId || 'unknown'}:`, err.message);
  
  if (NODE_ENV === 'development') {
    console.error(err.stack);
  }
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Forbidden', message: 'Origin not allowed' });
  }
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid JSON' });
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
  console.log('🛡️  Border Safety Risk Checker API v2.0');
  console.log('🛡️  ═══════════════════════════════════════════════');
  console.log(`🛡️  Environment: ${NODE_ENV}`);
  console.log(`🛡️  Port: ${PORT}`);
  console.log(`🛡️  Health: http://localhost:${PORT}/api/health`);
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