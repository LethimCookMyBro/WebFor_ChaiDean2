/**
 * Auto Blocker Service - Real-time Attack Detection & Auto IP Blocking
 * 
 * Monitors for:
 * - Rate limit violations
 * - Brute force login attempts
 * - SQL Injection attempts
 * - XSS attempts
 * - Suspicious patterns
 * 
 * Auto-blocks IPs exceeding thresholds
 */

const { blockedIPsOps, appLogsOps } = require('./database');

// Configuration
const CONFIG = {
  // Thresholds for auto-blocking
  RATE_LIMIT_VIOLATIONS: 10,    // Block after 10 rate limit hits
  LOGIN_FAILURES: 5,            // Block after 5 failed logins
  SQL_INJECTION_ATTEMPTS: 3,    // Block after 3 SQLi attempts
  XSS_ATTEMPTS: 3,              // Block after 3 XSS attempts
  SUSPICIOUS_REQUESTS: 20,      // Block after 20 suspicious requests
  
  // Time window for counting (milliseconds)
  TIME_WINDOW: 15 * 60 * 1000,  // 15 minutes
  
  // Auto-block duration (milliseconds)
  BLOCK_DURATION: 24 * 60 * 60 * 1000,  // 24 hours
  
  // Whitelist IPs (never block)
  WHITELIST: ['127.0.0.1', '::1', 'localhost']
};

// In-memory tracking (resets on restart, but blocks are persistent in DB)
const ipTracking = new Map();

/**
 * Get or create tracking entry for IP
 */
function getIPTracking(ip) {
  if (!ipTracking.has(ip)) {
    ipTracking.set(ip, {
      rateLimitViolations: 0,
      loginFailures: 0,
      sqlInjectionAttempts: 0,
      xssAttempts: 0,
      suspiciousRequests: 0,
      firstSeen: Date.now(),
      lastActivity: Date.now(),
      events: []
    });
  }
  
  const tracking = ipTracking.get(ip);
  
  // Reset if outside time window
  if (Date.now() - tracking.firstSeen > CONFIG.TIME_WINDOW) {
    tracking.rateLimitViolations = 0;
    tracking.loginFailures = 0;
    tracking.sqlInjectionAttempts = 0;
    tracking.xssAttempts = 0;
    tracking.suspiciousRequests = 0;
    tracking.firstSeen = Date.now();
    tracking.events = [];
  }
  
  tracking.lastActivity = Date.now();
  return tracking;
}

/**
 * Record a security event and check for auto-block
 */
function recordEvent(ip, eventType, details = {}) {
  // Skip whitelisted IPs
  if (CONFIG.WHITELIST.includes(ip)) {
    return { blocked: false, reason: 'whitelisted' };
  }
  
  // Check if already blocked
  if (blockedIPsOps.isBlocked(ip)) {
    return { blocked: true, reason: 'already_blocked' };
  }
  
  const tracking = getIPTracking(ip);
  let shouldBlock = false;
  let blockReason = '';
  
  // Track event
  tracking.events.push({
    type: eventType,
    time: Date.now(),
    details
  });
  
  // Increment counters based on event type
  switch (eventType) {
    case 'RATE_LIMIT':
      tracking.rateLimitViolations++;
      if (tracking.rateLimitViolations >= CONFIG.RATE_LIMIT_VIOLATIONS) {
        shouldBlock = true;
        blockReason = `Rate limit exceeded ${CONFIG.RATE_LIMIT_VIOLATIONS} times in ${CONFIG.TIME_WINDOW / 60000} minutes`;
      }
      break;
      
    case 'LOGIN_FAILURE':
      tracking.loginFailures++;
      if (tracking.loginFailures >= CONFIG.LOGIN_FAILURES) {
        shouldBlock = true;
        blockReason = `Failed login ${CONFIG.LOGIN_FAILURES} times - Brute force suspected`;
      }
      break;
      
    case 'SQL_INJECTION':
      tracking.sqlInjectionAttempts++;
      if (tracking.sqlInjectionAttempts >= CONFIG.SQL_INJECTION_ATTEMPTS) {
        shouldBlock = true;
        blockReason = `SQL Injection attack detected (${tracking.sqlInjectionAttempts} attempts)`;
      }
      break;
      
    case 'XSS':
      tracking.xssAttempts++;
      if (tracking.xssAttempts >= CONFIG.XSS_ATTEMPTS) {
        shouldBlock = true;
        blockReason = `XSS attack detected (${tracking.xssAttempts} attempts)`;
      }
      break;
      
    case 'SUSPICIOUS':
      tracking.suspiciousRequests++;
      if (tracking.suspiciousRequests >= CONFIG.SUSPICIOUS_REQUESTS) {
        shouldBlock = true;
        blockReason = `Suspicious activity threshold exceeded`;
      }
      break;
  }
  
  // Auto-block if threshold exceeded
  if (shouldBlock) {
    const expiresAt = new Date(Date.now() + CONFIG.BLOCK_DURATION);
    
    try {
      blockedIPsOps.add(ip, `[AUTO-BLOCK] ${blockReason}`, 'system:auto-blocker');
      
      // Log the auto-block
      appLogsOps.add('SECURITY', 'AUTO_BLOCK', `🚨 IP อัตโนมัติถูกบล็อก: ${ip}`, {
        ip,
        reason: blockReason,
        eventType,
        tracking: {
          rateLimitViolations: tracking.rateLimitViolations,
          loginFailures: tracking.loginFailures,
          sqlInjectionAttempts: tracking.sqlInjectionAttempts,
          xssAttempts: tracking.xssAttempts
        },
        expiresAt: expiresAt.toISOString()
      }, ip);
      
      console.log(`[SECURITY] 🚨 AUTO-BLOCKED IP: ${ip} - Reason: ${blockReason}`);
      
      // Clear tracking after block
      ipTracking.delete(ip);
      
      return { blocked: true, reason: blockReason, autoBlocked: true };
    } catch (error) {
      console.error('[AUTO-BLOCKER] Failed to block IP:', error.message);
    }
  }
  
  return { 
    blocked: false, 
    tracking: {
      rateLimitViolations: tracking.rateLimitViolations,
      loginFailures: tracking.loginFailures,
      sqlInjectionAttempts: tracking.sqlInjectionAttempts,
      xssAttempts: tracking.xssAttempts
    }
  };
}

/**
 * Log security event (always logs, may auto-block)
 */
function logSecurityEvent(ip, eventType, message, details = {}) {
  // Log to database
  appLogsOps.add('SECURITY', eventType, message, { ...details, ip }, ip);
  
  // Check for auto-block
  const result = recordEvent(ip, eventType, details);
  
  if (result.autoBlocked) {
    console.log(`[SECURITY] ⚡ Real-time auto-block triggered for ${ip}`);
  }
  
  return result;
}

/**
 * Get current threat stats
 */
function getThreatStats() {
  const stats = {
    activeTracking: ipTracking.size,
    topThreats: []
  };
  
  // Get top threats
  const sorted = Array.from(ipTracking.entries())
    .map(([ip, data]) => ({
      ip,
      score: data.rateLimitViolations + 
             (data.loginFailures * 2) + 
             (data.sqlInjectionAttempts * 5) +
             (data.xssAttempts * 5) +
             data.suspiciousRequests,
      data
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  
  stats.topThreats = sorted;
  return stats;
}

/**
 * Cleanup old tracking entries (call periodically)
 */
function cleanup() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [ip, data] of ipTracking.entries()) {
    if (now - data.lastActivity > CONFIG.TIME_WINDOW * 2) {
      ipTracking.delete(ip);
      cleaned++;
    }
  }
  
  return cleaned;
}

// Cleanup every 5 minutes
setInterval(cleanup, 5 * 60 * 1000);

module.exports = {
  recordEvent,
  logSecurityEvent,
  getThreatStats,
  cleanup,
  CONFIG
};
