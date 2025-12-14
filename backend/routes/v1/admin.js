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
const { appLogsOps, auditOps, visitorsOps } = require('../../services/database');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

// Apply auth middleware to all admin routes
router.use(requireAuth);
router.use(requireAdmin);

// ============================================
// Blocked IPs Store (Database-backed)
// Changed from in-memory Map to database for persistence
// ============================================

const { blockedIPsOps } = require('../../services/database');

/**
 * Check if an IP is blocked (exported for use in server.js middleware)
 * @param {string} ip 
 * @returns {boolean}
 */
function isIPBlocked(ip) {
  try {
    return blockedIPsOps.isBlocked(ip);
  } catch (error) {
    console.error('[ADMIN] isIPBlocked error:', error.message);
    return false;
  }
}

/**
 * Get blocked IP info (exported for use in server.js middleware)
 * @param {string} ip 
 * @returns {object|null}
 */
function getBlockedIPInfo(ip) {
  try {
    return blockedIPsOps.getInfo(ip);
  } catch (error) {
    console.error('[ADMIN] getBlockedIPInfo error:', error.message);
    return null;
  }
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
    
    // Use database logs
    const appLogs = appLogsOps.getAll(options.limit || 100);
    
    // Fetch Audit Logs (Security Events)
    const auditLogs = auditOps.getRecent(options.limit || 100);
    
    // Format Audit Logs to match App Logs structure
    const formattedAuditLogs = auditLogs.map(log => ({
      id: log.id || `audit-${log.created_at}-${Math.random()}`,
      timestamp: log.created_at,
      level: 'SECURITY', // Force level for security tab
      category: 'SECURITY', // Force category for security tab
      message: `${log.event_type}: ${log.action}`,
      ip: log.ip,
      details: {
        ...JSON.parse(log.metadata || '{}'),
        resource: log.resource,
        user_agent: log.user_agent,
        user_id: log.user_id,
        request_id: log.request_id
      }
    }));
    
    // Merge logs
    let allLogs = [...appLogs, ...formattedAuditLogs];
    
    // Filter by level/category if specified
    if (options.level) {
      allLogs = allLogs.filter(log => log.level === options.level);
    }
    if (options.category) {
      allLogs = allLogs.filter(log => log.category === options.category);
    }
    
    // Sort by timestamp desc
    allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Apply limit after merge
    if (options.limit) {
      allLogs = allLogs.slice(0, options.limit);
    }
    
    // Format logs for frontend (final pass)
    const formattedLogs = allLogs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      level: log.level,
      category: log.category,
      message: log.message,
      ip: log.ip,
      details: log.details || (log.metadata ? JSON.parse(log.metadata) : null)
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
 * GET /api/v1/admin/stats/users
 * Get realtime user stats
 */
router.get('/stats/users', (req, res) => {
  try {
    const stats = visitorsOps.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    // Log to console only to avoid spamming system logs
    console.error('[ADMIN] Failed to get user stats:', error.message);
    res.status(500).json({ error: 'Failed to get user stats' });
  }
});

/**
 * DELETE /api/v1/admin/stats/users
 * Reset all visitor stats (Admin action)
 */
router.delete('/stats/users', (req, res) => {
  try {
    const deleted = visitorsOps.resetStats();
    console.log(`[ADMIN] Visitor stats reset by admin: ${deleted} records deleted`);
    res.json({
      success: true,
      message: 'Visitor stats reset',
      deleted
    });
  } catch (error) {
    console.error('[ADMIN] Failed to reset user stats:', error.message);
    res.status(500).json({ error: 'Failed to reset user stats' });
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
    // Clear both app logs and audit logs from database
    const appCleared = appLogsOps.clear();
    const auditCleared = auditOps.clear();
    console.log(`[ADMIN] Cleared logs: app=${appCleared}, audit=${auditCleared}`);
    res.json({ success: true, message: 'Logs cleared', cleared: { app: appCleared, audit: auditCleared } });
  } catch (error) {
    console.error('[ADMIN] Failed to clear logs:', error.message);
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

/**
 * DELETE /api/v1/admin/logs/security
 * Clear all security/audit logs (admin action)
 * NOTE: This must come BEFORE /logs/:id to avoid matching 'security' as :id
 */
router.delete('/logs/security', (req, res) => {
  try {
    const cleared = auditOps.clear();
    console.log(`[ADMIN] Security logs cleared: ${cleared} records deleted`);
    res.json({ 
      success: true, 
      message: 'Security logs cleared', 
      cleared 
    });
  } catch (error) {
    console.error('[ADMIN] Failed to clear security logs:', error.message);
    res.status(500).json({ error: 'Failed to clear security logs' });
  }
});

/**
 * DELETE /api/v1/admin/logs/:id
 * Delete a specific log by ID (admin action)
 */
router.delete('/logs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = appLogsOps.deleteById(id) || auditOps.deleteById(id);
    if (deleted) {
      res.json({ success: true, message: 'Log deleted' });
    } else {
      res.status(404).json({ error: 'Log not found' });
    }
  } catch (error) {
    console.error('[ADMIN] Failed to delete log:', error.message);
    res.status(500).json({ error: 'Failed to delete log' });
  }
});

// ============================================
// IP Blocking Routes
// ============================================

/**
 * GET /api/v1/admin/blocked-ips
 * Get all blocked IPs (Database-backed)
 */
router.get('/blocked-ips', (req, res) => {
  try {
    const blockedList = blockedIPsOps.getAll();
    
    // Format response
    const ips = blockedList.map(record => ({
      ip: record.ip,
      reason: record.reason,
      blockedAt: record.created_at,
      blockedBy: record.blocked_by,
      expiresAt: record.expires_at || null,
      permanent: !record.expires_at
    }));
    
    res.json({
      success: true,
      count: ips.length,
      blockedIPs: ips
    });
  } catch (error) {
    console.error('[ADMIN] Failed to get blocked IPs:', error.message);
    res.status(500).json({ error: 'Failed to get blocked IPs' });
  }
});

/**
 * POST /api/v1/admin/blocked-ips
 * Block an IP address (Database-backed)
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
    
    // Calculate expiry if duration provided (in hours)
    let expiresAt = null;
    if (duration && typeof duration === 'number' && duration > 0) {
      expiresAt = new Date(Date.now() + (duration * 60 * 60 * 1000)).toISOString();
    }
    
    const blockedBy = req.user?.username || 'admin';
    const reasonText = reason || 'Manual block by admin';
    
    // Save to database
    blockedIPsOps.block(cleanIP, reasonText, blockedBy, expiresAt);
    
    logger.security('ADMIN', `IP blocked: ${cleanIP}`, { 
      ip: cleanIP, 
      reason: reasonText,
      blockedBy: blockedBy 
    });
    
    console.log(`[SECURITY] ❌ IP blocked: ${cleanIP} by ${blockedBy}`);
    
    res.json({
      success: true,
      message: `IP ${cleanIP} blocked successfully`,
      record: { 
        ip: cleanIP, 
        reason: reasonText, 
        blockedBy,
        expiresAt 
      }
    });
  } catch (error) {
    console.error('[ADMIN] Failed to block IP:', error.message);
    res.status(500).json({ error: 'Failed to block IP' });
  }
});

/**
 * DELETE /api/v1/admin/blocked-ips/:ip
 * Unblock an IP address (Database-backed)
 */
router.delete('/blocked-ips/:ip', (req, res) => {
  try {
    const ip = req.params.ip;
    
    // Try to unblock from database
    const success = blockedIPsOps.unblock(ip);
    
    if (!success) {
      return res.status(404).json({ error: 'IP not found in blocked list' });
    }
    
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
    console.error('[ADMIN] Failed to unblock IP:', error.message);
    res.status(500).json({ error: 'Failed to unblock IP' });
  }
});

// Export router and helper functions
module.exports = router;
module.exports.isIPBlocked = isIPBlocked;
module.exports.getBlockedIPInfo = getBlockedIPInfo;
