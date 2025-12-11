/**
 * Audit Logging Middleware
 * 
 * Provides structured audit logging for security events including:
 * - Authentication success/failure
 * - Authorization failures
 * - Admin actions
 * - Security threats (SQL injection, XSS, etc.)
 */

// Event types
const EVENT_TYPES = {
  AUTH_SUCCESS: 'auth_success',
  AUTH_FAILURE: 'auth_failure',
  AUTHZ_FAILURE: 'authz_failure',
  ADMIN_ACTION: 'admin_action',
  PASSWORD_CHANGE: 'password_change',
  ACCOUNT_LOCKOUT: 'account_lockout',
  TOKEN_REVOKED: 'token_revoked',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  CSRF_VIOLATION: 'csrf_violation',
  SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
  XSS_ATTEMPT: 'xss_attempt',
  SESSION_HIJACK_ATTEMPT: 'session_hijack_attempt',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity'
};

// Get auditOps lazily to avoid circular dependency
let _auditOps = null;
function getAuditOps() {
  if (!_auditOps) {
    try {
      const { auditOps } = require('../services/database');
      _auditOps = auditOps;
    } catch (e) {
      console.error('[AUDIT] Failed to load auditOps:', e.message);
    }
  }
  return _auditOps;
}

/**
 * Check if event type is a security threat
 */
function isSecurityThreat(eventType) {
  return [
    EVENT_TYPES.SQL_INJECTION_ATTEMPT,
    EVENT_TYPES.XSS_ATTEMPT,
    EVENT_TYPES.SESSION_HIJACK_ATTEMPT,
    EVENT_TYPES.CSRF_VIOLATION,
    EVENT_TYPES.ACCOUNT_LOCKOUT,
    EVENT_TYPES.AUTH_FAILURE,
    EVENT_TYPES.AUTHZ_FAILURE
  ].includes(eventType);
}

/**
 * Log an audit event
 * @param {object} event - Audit event details
 */
function logAuditEvent({
  eventType,
  userId = null,
  action,
  resource = null,
  ip = null,
  userAgent = null,
  requestId = null,
  metadata = null
}) {
  const logEntry = {
    event_type: eventType,
    user_id: userId,
    action,
    resource,
    ip,
    user_agent: userAgent,
    request_id: requestId,
    metadata: metadata ? JSON.stringify(metadata) : null
  };

  // Console log for immediate visibility
  const logLevel = isSecurityThreat(eventType) ? 'warn' : 'info';
  console[logLevel](`[AUDIT] ${eventType}: ${action}`, { userId, ip });

  // Write to database using auditOps
  const auditOps = getAuditOps();
  if (auditOps) {
    try {
      auditOps.log(logEntry);
    } catch (error) {
      console.error('[AUDIT] Failed to write to DB:', error.message);
    }
  }
}

/**
 * Audit middleware - automatically logs requests to sensitive endpoints
 * ONLY logs actual actions (POST/PUT/DELETE), not reads (GET)
 */
function auditMiddleware(req, res, next) {
  // Store original end function
  const originalEnd = res.end;

  // Override end to capture response
  res.end = function(chunk, encoding) {
    res.end = originalEnd;
    res.end(chunk, encoding);

    // Skip GET requests - they're just reads, not actions
    // This prevents logs from filling up during auto-refresh
    if (req.method === 'GET') {
      return;
    }

    // Log based on route and status
    const shouldAudit = 
      req.path.includes('/auth') ||
      req.path.includes('/admin') ||
      req.path.includes('/sos') ||
      res.statusCode >= 400;

    if (shouldAudit) {
      const eventType = res.statusCode >= 400 
        ? (res.statusCode === 401 ? EVENT_TYPES.AUTH_FAILURE : 
           res.statusCode === 403 ? EVENT_TYPES.AUTHZ_FAILURE : 
           'request_error')
        : (req.path.includes('/admin') ? EVENT_TYPES.ADMIN_ACTION : EVENT_TYPES.AUTH_SUCCESS);

      logAuditEvent({
        eventType,
        userId: req.user?.userId,
        action: `${req.method} ${req.path}`,
        resource: req.path,
        ip: req.clientIp || req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
        metadata: {
          statusCode: res.statusCode,
          method: req.method
        }
      });
    }
  };

  next();
}

/**
 * Create audit logger with request context
 */
function createAuditLogger(req) {
  return {
    log: (eventType, action, metadata = {}) => {
      logAuditEvent({
        eventType,
        userId: req.user?.userId,
        action,
        resource: req.path,
        ip: req.clientIp || req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
        metadata
      });
    },
    authSuccess: (userId) => {
      logAuditEvent({
        eventType: EVENT_TYPES.AUTH_SUCCESS,
        userId,
        action: 'User authenticated',
        ip: req.clientIp || req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId
      });
    },
    authFailure: (reason) => {
      logAuditEvent({
        eventType: EVENT_TYPES.AUTH_FAILURE,
        action: 'Authentication failed',
        ip: req.clientIp || req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
        metadata: { reason }
      });
    },
    securityThreat: (threatType, details) => {
      logAuditEvent({
        eventType: threatType,
        action: `Security threat detected: ${threatType}`,
        ip: req.clientIp || req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
        metadata: details
      });
    }
  };
}

module.exports = {
  EVENT_TYPES,
  logAuditEvent,
  auditMiddleware,
  createAuditLogger
};

