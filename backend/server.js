require("dotenv").config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const requestIp = require('request-ip');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

// Routes
const locateRoutes = require('./routes/v1/locate');
const statusRoutes = require('./routes/v1/status');
const geoRoutes = require('./routes/v1/geo');
const reportsRoutes = require('./routes/v1/reports');
const authRoutes = require('./routes/v1/auth');
const adminRoutes = require('./routes/v1/admin');
const healthRoutes = require('./routes/health');

const logger = require('./services/logger');
const { rateLimiter, sanitizeRequest } = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust Proxy
app.set('trust proxy', true);

// Helmet
app.use(helmet({
  contentSecurityPolicy: false, // For easier dev
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

// APIs
app.use('/api/health', healthRoutes);
app.use('/api/v1/auth', rateLimiter, authRoutes); // Admin auth
app.use('/api/v1/locate', rateLimiter, locateRoutes);
app.use('/api/v1/status', rateLimiter, statusRoutes);
app.use('/api/v1/geo', rateLimiter, geoRoutes);
app.use('/api/v1/reports', rateLimiter, reportsRoutes);
app.use('/api/v1/admin', adminRoutes); // Logs etc.

// Root
app.get('/', (req, res) => {
  res.json({
    status: 'operational',
    service: 'Border Safety API',
    version: '2.2-noauth'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  logger.error('SERVER', err.message, { path: req.path });
  res.status(err.status || 500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Trust Proxy: enabled`);
});

module.exports = app;