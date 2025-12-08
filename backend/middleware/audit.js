/**
 * Audit Logging Middleware
 * 
 * Provides structured audit logging for security events including:
 * - Authentication success/failure
 * - Authorization failures
 * - Admin actions
 * - Security threats (SQL injection, XSS, etc.)
 */

const fs = require('fs');
const path = require('path');

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

// In-memory log buffer (for batch writing)
const logBuffer = [];
const BUFFER_FLUSH_INTERVAL = 5000; // 5 seconds
const MAX_BUFFER_SIZE = 100;

// Database connection (set via dependency injection)
let auditDB = null;

/**
 * Set database connection for audit logging
 */
function setAuditDB(db) {
  auditDB = db;
}

/**
 * Log an audit event
 * @param {object} event - Audit event details
 */
async function logAuditEvent({
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
    timestamp: new Date().toISOString(),
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
  console[logLevel](`[AUDIT] ${eventType}: ${action}`, {
    userId,
    ip,
    requestId
  });

  // Add to buffer for batch DB writing
  logBuffer.push(logEntry);

  // Flush if buffer is full
  if (logBuffer.length >= MAX_BUFFER_SIZE) {
    await flushLogBuffer();
  }

  // Try to write to DB immediately for critical events
  if (isSecurityThreat(eventType) && auditDB) {
    try {
      await writeToDatabase(logEntry);
    } catch (error) {
      console.error('[AUDIT] Failed to write critical event to DB:', error.message);
    }
  }
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
    EVENT_TYPES.ACCOUNT_LOCKOUT
  ].includes(eventType);
}

/**
 * Write single log entry to database
 */
async function writeToDatabase(entry) {
  if (!auditDB) return;

  await auditDB.run(
    `INSERT INTO audit_logs (event_type, user_id, action, resource, ip, user_agent, request_id, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.event_type,
      entry.user_id,
      entry.action,
      entry.resource,
      entry.ip,
      entry.user_agent,
      entry.request_id,
      entry.metadata
    ]
  );
}

/**
 * Flush log buffer to database
 */
async function flushLogBuffer() {
  if (logBuffer.length === 0 || !auditDB) return;

  const entries = logBuffer.splice(0, logBuffer.length);

  try {
    for (const entry of entries) {
      await writeToDatabase(entry);
    }
  } catch (error) {
    console.error('[AUDIT] Failed to flush log buffer:', error.message);
    // Re-add entries to buffer on failure
    logBuffer.unshift(...entries);
  }
}

/**
 * Audit middleware - automatically logs requests to sensitive endpoints
 */
function auditMiddleware(req, res, next) {
  // Store original end function
  const originalEnd = res.end;

  // Override end to capture response
  res.end = function(chunk, encoding) {
    res.end = originalEnd;
    res.end(chunk, encoding);

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

// Periodic buffer flush
setInterval(flushLogBuffer, BUFFER_FLUSH_INTERVAL);

// Flush on process exit
process.on('beforeExit', async () => {
  await flushLogBuffer();
});

module.exports = {
  EVENT_TYPES,
  logAuditEvent,
  auditMiddleware,
  createAuditLogger,
  setAuditDB,
  flushLogBuffer
};
