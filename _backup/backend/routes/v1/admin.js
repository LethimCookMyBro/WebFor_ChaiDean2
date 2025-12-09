/**
 * Admin Logs API Routes
 * 
 * Endpoints for viewing system logs (admin only)
 */

const express = require('express');
const router = express.Router();
const logger = require('../../services/logger');

/**
 * GET /api/v1/admin/logs
 * Get logs with optional filtering
 */
router.get('/logs', (req, res) => {
  try {
    const { level, category, since, search, limit } = req.query;
    
    const options = {};
    if (level) options.level = level.toUpperCase();
    if (category) options.category = category.toUpperCase();
    if (since) options.since = since;
    if (search) options.search = search;
    if (limit) options.limit = parseInt(limit, 10);
    
    const logs = logger.getLogs(options);
    
    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    logger.error('ADMIN', 'Failed to get logs', { error: error.message });
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

/**
 * GET /api/v1/admin/logs/stats
 * Get log statistics
 */
router.get('/logs/stats', (req, res) => {
  try {
    const stats = logger.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('ADMIN', 'Failed to get log stats', { error: error.message });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * DELETE /api/v1/admin/logs
 * Clear all logs (admin action)
 */
router.delete('/logs', (req, res) => {
  try {
    logger.clearLogs();
    logger.security('ADMIN', 'Logs cleared', { ip: req.clientIp || req.ip });
    res.json({ success: true, message: 'Logs cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

module.exports = router;
