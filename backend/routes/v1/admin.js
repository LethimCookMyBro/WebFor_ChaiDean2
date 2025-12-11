/**
 * Admin API Routes
 * 
 * Endpoints for admin functions:
 * - Logs management
 * - IP blocking (server-side)
 * 
 * Protected by requireAuth + requireAdmin middleware
 */

const express = require('express');
const router = express.Router();
const logger = require('../../services/logger');
const { appLogsOps } = require('../../services/database');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

// Apply auth middleware to all admin routes
router.use(requireAuth);
router.use(requireAdmin);

// ============================================
// Blocked IPs Store (In-Memory)
// In production, use Redis or Database
// ============================================

const blockedIPs = new Map(); // Map<ip, { reason, blockedAt, blockedBy, expiresAt? }>

/**
 * Check if an IP is blocked
 * @param {string} ip 
 * @returns {boolean}
 */
function isIPBlocked(ip) {
  const record = blockedIPs.get(ip);
  if (!record) return false;
  
  // Check expiry
  if (record.expiresAt && Date.now() > record.expiresAt) {
    blockedIPs.delete(ip);
    return false;
  }
  
  return true;
}

/**
 * Get blocked IP info
 * @param {string} ip 
 * @returns {object|null}
 */
function getBlockedIPInfo(ip) {
  const record = blockedIPs.get(ip);
  if (!record) return null;
  
  if (record.expiresAt && Date.now() > record.expiresAt) {
    blockedIPs.delete(ip);
    return null;
  }
  
  return { ip, ...record };
}

// ============================================
// Logs Routes
// ============================================

/**
 * GET /api/v1/admin/logs
 * Get logs with optional filtering
 */
router.get('/logs', (req, res) => {
  try {
    const { level, category, limit } = req.query;
    
    const options = {};
    if (level) options.level = level.toUpperCase();
    if (category) options.category = category.toUpperCase();
    if (limit) options.limit = parseInt(limit, 10);
    
    // Use database logs instead of console logger
    const logs = appLogsOps.getAll(options.limit || 100);
    
    // Filter by level/category if specified
    let filteredLogs = logs;
    if (options.level) {
      filteredLogs = filteredLogs.filter(log => log.level === options.level);
    }
    if (options.category) {
      filteredLogs = filteredLogs.filter(log => log.category === options.category);
    }
    
    // Format logs for frontend
    const formattedLogs = filteredLogs.map(log => ({
      id: log.id,
      timestamp: log.created_at,
      level: log.level,
      category: log.category,
      message: log.message,
      ip: log.ip,
      details: log.metadata ? JSON.parse(log.metadata) : null
    }));
    
    res.json({
      success: true,
      count: formattedLogs.length,
      logs: formattedLogs
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

// ============================================
// IP Blocking Routes
// ============================================

/**
 * GET /api/v1/admin/blocked-ips
 * Get all blocked IPs
 */
router.get('/blocked-ips', (req, res) => {
  try {
    const ips = [];
    const now = Date.now();
    
    for (const [ip, record] of blockedIPs.entries()) {
      // Skip expired
      if (record.expiresAt && now > record.expiresAt) {
        blockedIPs.delete(ip);
        continue;
      }
      
      ips.push({
        ip,
        reason: record.reason,
        blockedAt: record.blockedAt,
        blockedBy: record.blockedBy,
        expiresAt: record.expiresAt || null,
        permanent: !record.expiresAt
      });
    }
    
    res.json({
      success: true,
      count: ips.length,
      blockedIPs: ips
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get blocked IPs' });
  }
});

/**
 * POST /api/v1/admin/blocked-ips
 * Block an IP address
 */
router.post('/blocked-ips', (req, res) => {
  try {
    const { ip, reason, duration } = req.body;
    
    // Validate IP format (basic check)
    if (!ip || typeof ip !== 'string') {
      return res.status(400).json({ error: 'IP address is required' });
    }
    
    // Basic IP validation
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(ip.trim())) {
      return res.status(400).json({ error: 'Invalid IP address format' });
    }
    
    const cleanIP = ip.trim();
    
    // Don't allow blocking localhost
    if (cleanIP === '127.0.0.1' || cleanIP === '::1') {
      return res.status(400).json({ error: 'Cannot block localhost' });
    }
    
    // Check if already blocked
    if (blockedIPs.has(cleanIP)) {
      return res.status(409).json({ error: 'IP already blocked' });
    }
    
    // Create block record
    const record = {
      reason: reason || 'Manual block by admin',
      blockedAt: new Date().toISOString(),
      blockedBy: req.user?.username || 'admin'
    };
    
    // Set expiry if duration provided (in hours)
    if (duration && typeof duration === 'number' && duration > 0) {
      record.expiresAt = Date.now() + (duration * 60 * 60 * 1000);
    }
    
    blockedIPs.set(cleanIP, record);
    
    logger.security('ADMIN', `IP blocked: ${cleanIP}`, { 
      ip: cleanIP, 
      reason: record.reason,
      blockedBy: record.blockedBy 
    });
    
    console.log(`[SECURITY] ❌ IP blocked: ${cleanIP} by ${record.blockedBy}`);
    
    res.json({
      success: true,
      message: `IP ${cleanIP} blocked successfully`,
      record: { ip: cleanIP, ...record }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to block IP' });
  }
});

/**
 * DELETE /api/v1/admin/blocked-ips/:ip
 * Unblock an IP address
 */
router.delete('/blocked-ips/:ip', (req, res) => {
  try {
    const ip = req.params.ip;
    
    if (!blockedIPs.has(ip)) {
      return res.status(404).json({ error: 'IP not found in blocked list' });
    }
    
    blockedIPs.delete(ip);
    
    logger.security('ADMIN', `IP unblocked: ${ip}`, { 
      ip, 
      unblockedBy: req.user?.username || 'admin' 
    });
    
    console.log(`[SECURITY] ✅ IP unblocked: ${ip}`);
    
    res.json({
      success: true,
      message: `IP ${ip} unblocked successfully`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unblock IP' });
  }
});

// Export router and helper functions
module.exports = router;
module.exports.isIPBlocked = isIPBlocked;
module.exports.getBlockedIPInfo = getBlockedIPInfo;
module.exports.blockedIPs = blockedIPs;

