const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');

/**
 * GET /api/health
 * Public health check endpoint - minimal information
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/health/detailed
 * Detailed health check - requires admin authentication
 */
router.get('/detailed', requireAuth, requireAdmin, (req, res) => {
  const memUsage = process.memoryUsage();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      external: Math.round(memUsage.external / 1024 / 1024) + 'MB',
      rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB'
    },
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * GET /api/health/ready
 * Readiness probe for container orchestration
 */
router.get('/ready', (req, res) => {
  // Add any dependency checks here (DB, cache, etc.)
  const isReady = true;
  
  if (isReady) {
    res.json({ ready: true });
  } else {
    res.status(503).json({ ready: false, reason: 'Dependencies not ready' });
  }
});

/**
 * GET /api/health/live
 * Liveness probe for container orchestration
 */
router.get('/live', (req, res) => {
  res.json({ alive: true });
});

module.exports = router;
