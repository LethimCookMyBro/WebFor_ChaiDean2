/**
 * CSRF Protection Middleware
 * 
 * Implements double-submit cookie pattern for CSRF protection
 */

const crypto = require('crypto');

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const CSRF_TOKEN_LENGTH = 32;

// Methods that require CSRF validation
const PROTECTED_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

// Paths exempt from CSRF (webhooks, public APIs)
const EXEMPT_PATHS = [
  '/api/health',
  '/api/v1/auth/login',
  '/api/v1/auth/admin/login'
];

/**
 * Generate CSRF token
 * @returns {string} Cryptographically secure token
 */
function generateCSRFToken() {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * CSRF token middleware - sets token cookie on responses
 */
function csrfTokenMiddleware(req, res, next) {
  // Check if token exists in cookies
  let token = req.cookies?.[CSRF_COOKIE_NAME];
  
  if (!token) {
    // Generate new token
    token = generateCSRFToken();
    
    // Set cookie
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Must be readable by JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/'
    });
  }
  
  // Attach token to request for use in templates/responses
  req.csrfToken = token;
  
  // Add token to response locals for server-side rendering
  res.locals.csrfToken = token;
  
  next();
}

/**
 * CSRF validation middleware - validates token on protected requests
 */
function csrfValidationMiddleware(req, res, next) {
  // Skip non-protected methods
  if (!PROTECTED_METHODS.includes(req.method)) {
    return next();
  }
  
  // Skip exempt paths
  if (EXEMPT_PATHS.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  // Get token from cookie
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  
  // Get token from header or body
  const headerToken = req.headers[CSRF_HEADER_NAME.toLowerCase()] || 
                      req.headers['x-xsrf-token'] ||
                      req.body?._csrf;
  
  // Validate tokens exist
  if (!cookieToken || !headerToken) {
    console.warn(`[CSRF] Missing token - cookie: ${!!cookieToken}, header: ${!!headerToken}, path: ${req.path}`);
    return res.status(403).json({
      error: 'Forbidden',
      message: 'CSRF token missing'
    });
  }
  
  // Validate tokens match (timing-safe comparison)
  if (!timingSafeCompare(cookieToken, headerToken)) {
    console.warn(`[CSRF] Token mismatch - path: ${req.path}, ip: ${req.clientIp}`);
    
    // Log security event
    const { logAuditEvent, EVENT_TYPES } = require('./audit');
    logAuditEvent({
      eventType: EVENT_TYPES.CSRF_VIOLATION,
      action: 'CSRF token validation failed',
      resource: req.path,
      ip: req.clientIp || req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.requestId
    });
    
    return res.status(403).json({
      error: 'Forbidden',
      message: 'CSRF token invalid'
    });
  }
  
  next();
}

/**
 * Timing-safe string comparison
 */
function timingSafeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Combined CSRF middleware (token + validation)
 */
function csrfProtection(req, res, next) {
  csrfTokenMiddleware(req, res, () => {
    csrfValidationMiddleware(req, res, next);
  });
}

/**
 * Add path to exempt list
 */
function exemptPath(path) {
  if (!EXEMPT_PATHS.includes(path)) {
    EXEMPT_PATHS.push(path);
  }
}

module.exports = {
  generateCSRFToken,
  csrfTokenMiddleware,
  csrfValidationMiddleware,
  csrfProtection,
  exemptPath,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME
};
