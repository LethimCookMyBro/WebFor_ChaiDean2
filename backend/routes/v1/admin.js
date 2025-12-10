/**
 * Admin API Routes
 * 
 * Endpoints for admin functions:
 * - Logs management (persistent)
 * - IP blocking (persistent via database)
 * 
 * Protected by requireAuth + requireAdmin middleware
 */

const express = require('express');
const router = express.Router();
const { blockedIPsOps, appLogsOps } = require('../../services/database');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

// Apply auth middleware to all admin routes
router.use(requireAuth);
router.use(requireAdmin);

// ============================================
// Blocked IPs Functions (Using Database)
// ============================================

/**
 * Check if an IP is blocked
 * @param {string} ip 
 * @returns {boolean}
 */
function isIPBlocked(ip) {
  return blockedIPsOps.isBlocked(ip);
}

/**
 * Get blocked IP info
 * @param {string} ip 
 * @returns {object|null}
 */
function getBlockedIPInfo(ip) {
  return blockedIPsOps.getInfo(ip);
}

// ============================================
// Logs Routes (Using Database)
// ============================================

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
    
    const logs = appLogsOps.getLogs(options);
    
    // Format for frontend compatibility
    const formattedLogs = logs.map(log => ({
      id: `log_${log.id}`,
      timestamp: log.created_at,
      level: log.level,
      category: log.category,
      message: log.message,
      metadata: log.metadata,
      ip: log.ip
    }));
    
    res.json({
      success: true,
      count: formattedLogs.length,
      logs: formattedLogs
    });
  } catch (error) {
    console.error('[ADMIN] Failed to get logs:', error.message);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

/**
 * GET /api/v1/admin/logs/stats
 * Get log statistics
 */
router.get('/logs/stats', (req, res) => {
  try {
    const stats = appLogsOps.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[ADMIN] Failed to get log stats:', error.message);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * DELETE /api/v1/admin/logs
 * Clear all logs (admin action)
 */
router.delete('/logs', (req, res) => {
  try {
    appLogsOps.clear();
    
    // Log this action
    appLogsOps.add('SECURITY', 'ADMIN', 'Logs cleared by admin', { ip: req.clientIp || req.ip });
    
    res.json({ success: true, message: 'Logs cleared' });
  } catch (error) {
    console.error('[ADMIN] Failed to clear logs:', error.message);
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

// ============================================
// IP Blocking Routes (Using Database)
// ============================================

/**
 * GET /api/v1/admin/blocked-ips
 * Get all blocked IPs
 */
router.get('/blocked-ips', (req, res) => {
  try {
    const ips = blockedIPsOps.getAll();
    
    const formattedIPs = ips.map(record => ({
      ip: record.ip,
      reason: record.reason,
      blockedAt: record.created_at,
      blockedBy: record.blocked_by,
      expiresAt: record.expires_at || null,
      permanent: !record.expires_at
    }));
    
    res.json({
      success: true,
      count: formattedIPs.length,
      blockedIPs: formattedIPs
    });
  } catch (error) {
    console.error('[ADMIN] Failed to get blocked IPs:', error.message);
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
    if (blockedIPsOps.isBlocked(cleanIP)) {
      return res.status(409).json({ error: 'IP already blocked' });
    }
    
    // Calculate expiry
    let expiresAt = null;
    if (duration && typeof duration === 'number' && duration > 0) {
      expiresAt = new Date(Date.now() + (duration * 60 * 60 * 1000)).toISOString();
    }
    
    const blockedBy = req.user?.username || 'admin';
    const blockReason = reason || 'Manual block by admin';
    
    blockedIPsOps.block(cleanIP, blockReason, blockedBy, expiresAt);
    
    // Log this action
    appLogsOps.add('SECURITY', 'ADMIN', `IP blocked: ${cleanIP}`, { 
      ip: cleanIP, 
      reason: blockReason,
      blockedBy 
    });
    
    console.log(`[SECURITY] ❌ IP blocked: ${cleanIP} by ${blockedBy}`);
    
    res.json({
      success: true,
      message: `IP ${cleanIP} blocked successfully`,
      record: { 
        ip: cleanIP, 
        reason: blockReason,
        blockedBy,
        blockedAt: new Date().toISOString(),
        expiresAt,
        permanent: !expiresAt
      }
    });
  } catch (error) {
    console.error('[ADMIN] Failed to block IP:', error.message);
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
    
    const unblocked = blockedIPsOps.unblock(ip);
    if (!unblocked) {
      return res.status(404).json({ error: 'IP not found in blocked list' });
    }
    
    // Log this action
    appLogsOps.add('SECURITY', 'ADMIN', `IP unblocked: ${ip}`, { 
      ip, 
      unblockedBy: req.user?.username || 'admin' 
    });
    
    console.log(`[SECURITY] ✅ IP unblocked: ${ip}`);
    
    res.json({
      success: true,
      message: `IP ${ip} unblocked successfully`
    });
  } catch (error) {
    console.error('[ADMIN] Failed to unblock IP:', error.message);
    res.status(500).json({ error: 'Failed to unblock IP' });
  }
});

// Export router and helper functions
module.exports = router;
module.exports.isIPBlocked = isIPBlocked;
module.exports.getBlockedIPInfo = getBlockedIPInfo;
