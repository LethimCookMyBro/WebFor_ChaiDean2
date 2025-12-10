/**
 * Security Middleware
 * 
 * Provides rate limiting, request sanitization, and security utilities
 * with comprehensive attack detection and enhanced validation
 */

// Simple in-memory rate limiter (for production use Redis)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // requests per window

// SQL injection patterns to detect
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b.*\b(FROM|INTO|TABLE|DATABASE)\b)/i,
  /(\bOR\b\s+[\d'"]?\s*=\s*[\d'"]\s*)/i, // OR 1=1, OR '1'='1'
  /(\bAND\b\s+[\d'"]?\s*=\s*[\d'"]\s*)/i,
  /(--|#|\/\*|\*\/)/,  // SQL comments
  /(\bEXEC\b|\bEXECUTE\b)/i,
  /(\bDROP\b\s+\bTABLE\b)/i,
  /(0x[0-9a-fA-F]+)/,  // Hex encoded
  /(\bCHAR\s*\(\s*\d+\s*\))/i,  // CHAR() function
  /(\bCONCAT\s*\()/i,  // CONCAT function
  /(\bWAITFOR\b\s+\bDELAY\b)/i,  // Time-based SQLi
  /(\bBENCHMARK\s*\()/i,  // MySQL benchmark
  /(\bSLEEP\s*\()/i,  // MySQL sleep
  /(\bLOAD_FILE\s*\()/i,  // File read
  /(\bINTO\s+OUTFILE\b)/i,  // File write
];

// XSS patterns to detect
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<svg.*?onload/gi,
  /data:\s*text\/html/gi,  // data: URLs
  /vbscript:/gi,
  /expression\s*\(/gi,  // CSS expressions
  /<img[^>]+onerror/gi,
  /<body[^>]+onload/gi,
];

// NoSQL injection patterns (MongoDB etc)
const NOSQL_INJECTION_PATTERNS = [
  /\$where\s*:/i,
  /\$gt\s*:/i,
  /\$lt\s*:/i,
  /\$ne\s*:/i,
  /\$nin\s*:/i,
  /\$or\s*:\s*\[/i,
  /\$and\s*:\s*\[/i,
  /\$regex\s*:/i,
  /\{\s*"\$[a-z]+"/i,  // Generic $ operator
];

// Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.%2[fF]/g,
  /\.\.%5[cC]/g,  // URL encoded backslash
  /\.\.\\/g,
  /%2e%2e[\\/]/gi,  // Double URL encoded
  /\.\.%c0%af/gi,  // UTF-8 encoded
  /\.\.%c1%9c/gi,
  /\/etc\/passwd/i,
  /\/proc\/self/i,
  /c:\\\\windows/i,
  /boot\.ini/i,
];

// Command injection patterns
const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$]/,  // Shell operators
  /\$\(/,  // Command substitution
  /`.*`/,  // Backtick commands
  /\|\|/,
  /&&/,
  /;\s*\w+/,  // Command chaining
  /\b(cat|ls|dir|rm|del|wget|curl|nc|netcat|bash|sh|cmd|powershell)\b/i,
  />\s*\/?\w+/,  // Output redirection
  /2>&1/,
];

// LDAP injection patterns
const LDAP_INJECTION_PATTERNS = [
  /[()\\*]/,  // LDAP special chars
  /\x00/,  // Null byte
  /\|\(/,  // OR in LDAP
  /&\(/,  // AND in LDAP
];

// Prototype pollution patterns
const PROTOTYPE_POLLUTION_KEYS = ['__proto__', 'constructor', 'prototype'];


/**
 * Rate limiter middleware
 */
function rateLimiter(req, res, next) {
  const ip = req.clientIp || req.ip || 'unknown';
  const now = Date.now();
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, startTime: now });
    return next();
  }
  
  const record = requestCounts.get(ip);
  
  // Reset window if expired
  if (now - record.startTime > RATE_LIMIT_WINDOW) {
    requestCounts.set(ip, { count: 1, startTime: now });
    return next();
  }
  
  // Increment count
  record.count++;
  
  // Check limit
  if (record.count > RATE_LIMIT_MAX) {
    // Log security event
    console.warn(`[SECURITY] Rate limit exceeded: IP=${ip}, count=${record.count}`);
    
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'กรุณารอสักครู่แล้วลองใหม่',
      retryAfter: Math.ceil((record.startTime + RATE_LIMIT_WINDOW - now) / 1000)
    });
  }
  
  // Set rate limit headers
  res.set({
    'X-RateLimit-Limit': RATE_LIMIT_MAX,
    'X-RateLimit-Remaining': RATE_LIMIT_MAX - record.count,
    'X-RateLimit-Reset': new Date(record.startTime + RATE_LIMIT_WINDOW).toISOString()
  });
  
  next();
}

/**
 * Stricter rate limiter for auth endpoints
 */
function authRateLimiter(req, res, next) {
  const ip = req.clientIp || req.ip || 'unknown';
  const key = `auth:${ip}`;
  const now = Date.now();
  const AUTH_LIMIT = 10; // 10 requests per minute for auth
  
  if (!requestCounts.has(key)) {
    requestCounts.set(key, { count: 1, startTime: now });
    return next();
  }
  
  const record = requestCounts.get(key);
  
  if (now - record.startTime > RATE_LIMIT_WINDOW) {
    requestCounts.set(key, { count: 1, startTime: now });
    return next();
  }
  
  record.count++;
  
  if (record.count > AUTH_LIMIT) {
    console.warn(`[SECURITY] Auth rate limit exceeded: IP=${ip}`);
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'มีการเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่'
    });
  }
  
  next();
}

/**
 * Detect SQL injection patterns
 * @param {string} value - Value to check
 * @returns {boolean} True if SQL injection detected
 */
function detectSQLInjection(value) {
  if (typeof value !== 'string') return false;
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Detect XSS patterns
 * @param {string} value - Value to check
 * @returns {boolean} True if XSS detected
 */
function detectXSS(value) {
  if (typeof value !== 'string') return false;
  return XSS_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Detect NoSQL injection patterns (MongoDB, etc)
 * @param {string} value - Value to check
 * @returns {boolean} True if NoSQL injection detected
 */
function detectNoSQLInjection(value) {
  if (typeof value !== 'string') return false;
  return NOSQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Detect path traversal attempts
 * @param {string} value - Value to check
 * @returns {boolean} True if path traversal detected
 */
function detectPathTraversal(value) {
  if (typeof value !== 'string') return false;
  return PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Detect command injection attempts
 * @param {string} value - Value to check
 * @returns {boolean} True if command injection detected
 */
function detectCommandInjection(value) {
  if (typeof value !== 'string') return false;
  // Skip short values that might contain normal punctuation
  if (value.length < 3) return false;
  return COMMAND_INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Detect LDAP injection attempts
 * @param {string} value - Value to check
 * @returns {boolean} True if LDAP injection detected
 */
function detectLDAPInjection(value) {
  if (typeof value !== 'string') return false;
  return LDAP_INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Comprehensive threat detection
 * @param {string} value - Value to check
 * @param {string} location - Where the value was found
 * @returns {string[]} Array of detected threat types
 */
function detectAllThreats(value, location = '') {
  const threats = [];
  
  if (detectSQLInjection(value)) {
    threats.push(`sql_injection:${location}`);
  }
  if (detectXSS(value)) {
    threats.push(`xss_attempt:${location}`);
  }
  if (detectNoSQLInjection(value)) {
    threats.push(`nosql_injection:${location}`);
  }
  if (detectPathTraversal(value)) {
    threats.push(`path_traversal:${location}`);
  }
  if (detectCommandInjection(value)) {
    threats.push(`command_injection:${location}`);
  }
  if (detectLDAPInjection(value)) {
    threats.push(`ldap_injection:${location}`);
  }
  
  return threats;
}

/**
 * Request sanitization middleware
 */
function sanitizeRequest(req, res, next) {
  const threats = [];
  
  // Check and sanitize body
  if (req.body) {
    const result = sanitizeObject(req.body, 'body');
    req.body = result.sanitized;
    threats.push(...result.threats);
  }
  
  // Check and sanitize query params
  if (req.query) {
    const result = sanitizeObject(req.query, 'query');
    req.query = result.sanitized;
    threats.push(...result.threats);
  }
  
  // Log detected threats
  if (threats.length > 0) {
    console.warn(`[SECURITY] Threats detected in request ${req.requestId}:`, threats);
    // Could integrate with audit logging here
  }
  
  next();
}

/**
 * Recursively sanitize object values
 * @returns {object} { sanitized: object, threats: string[] }
 */
function sanitizeObject(obj, location = '') {
  const threats = [];
  
  if (typeof obj !== 'object' || obj === null) {
    const result = sanitizeValue(obj, location);
    return { sanitized: result.value, threats: result.threats };
  }
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Skip prototype pollution attempts
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      threats.push(`prototype_pollution:${location}.${key}`);
      continue;
    }
    
    if (typeof value === 'object' && value !== null) {
      const result = sanitizeObject(value, `${location}.${key}`);
      sanitized[key] = result.sanitized;
      threats.push(...result.threats);
    } else {
      const result = sanitizeValue(value, `${location}.${key}`);
      sanitized[key] = result.value;
      threats.push(...result.threats);
    }
  }
  
  return { sanitized, threats };
}

/**
 * Sanitize individual value with threat detection
 * @returns {object} { value: any, threats: string[] }
 */
function sanitizeValue(value, location = '') {
  const threats = [];
  
  if (typeof value !== 'string') {
    return { value, threats };
  }
  
  // Detect SQL injection
  if (detectSQLInjection(value)) {
    threats.push(`sql_injection:${location}`);
  }
  
  // Detect XSS
  if (detectXSS(value)) {
    threats.push(`xss_attempt:${location}`);
  }
  
  // Sanitize the value
  const sanitized = value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
  
  return { value: sanitized, threats };
}

/**
 * Validate coordinates
 */
function validateCoordinates(lat, lon) {
  const errors = [];
  
  if (lat !== undefined) {
    const latNum = parseFloat(lat);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      errors.push('Invalid latitude (must be between -90 and 90)');
    }
  }
  
  if (lon !== undefined) {
    const lonNum = parseFloat(lon);
    if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      errors.push('Invalid longitude (must be between -180 and 180)');
    }
  }
  
  return errors;
}

/**
 * Validate IP address
 */
function validateIP(ip) {
  if (!ip) return true; // Optional
  
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 simplified pattern
  const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
}

// Clean up old rate limit records periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now - record.startTime > RATE_LIMIT_WINDOW * 2) {
      requestCounts.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW);

// ============================================
// CSRF Protection (Added for security)
// ============================================

const crypto = require('crypto');

// In-memory CSRF token store (use Redis in production)
const csrfTokens = new Map();
const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

/**
 * Generate CSRF token for a session
 * @param {string} sessionId - Session identifier
 * @returns {string} CSRF token
 */
function generateCSRFToken(sessionId) {
  const token = crypto.randomBytes(32).toString('hex');
  csrfTokens.set(token, {
    sessionId,
    createdAt: Date.now()
  });
  return token;
}

/**
 * Validate CSRF token
 * @param {string} token - CSRF token to validate
 * @param {string} sessionId - Expected session ID
 * @returns {boolean} True if valid
 */
function validateCSRFToken(token, sessionId) {
  if (!token || !csrfTokens.has(token)) {
    return false;
  }
  
  const record = csrfTokens.get(token);
  
  // Check expiry
  if (Date.now() - record.createdAt > CSRF_TOKEN_EXPIRY) {
    csrfTokens.delete(token);
    return false;
  }
  
  // Check session match
  if (record.sessionId !== sessionId) {
    return false;
  }
  
  // Token is single-use
  csrfTokens.delete(token);
  return true;
}

/**
 * CSRF protection middleware
 * Use on state-changing endpoints (POST, PUT, DELETE)
 */
function csrfProtection(req, res, next) {
  // Skip for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  const token = req.headers['x-csrf-token'] || req.body?._csrf;
  const sessionId = req.cookies?.accessToken || req.headers.authorization || 'anonymous';
  
  // For now, log CSRF attempts but don't block (gradual rollout)
  if (!token) {
    console.warn(`[SECURITY] Missing CSRF token for ${req.method} ${req.path}`);
    // In strict mode, return 403:
    // return res.status(403).json({ error: 'Forbidden', message: 'CSRF token required' });
  }
  
  next();
}

// Clean up expired CSRF tokens
setInterval(() => {
  const now = Date.now();
  for (const [token, record] of csrfTokens.entries()) {
    if (now - record.createdAt > CSRF_TOKEN_EXPIRY) {
      csrfTokens.delete(token);
    }
  }
}, CSRF_TOKEN_EXPIRY);

// ============================================
// Output Encoding (XSS Prevention)
// ============================================

/**
 * Escape HTML special characters for safe output
 * Use this before rendering untrusted data in HTML context
 * @param {string} str - String to escape
 * @returns {string} HTML-escaped string
 */
function escapeHtml(str) {
  if (typeof str !== 'string') {
    return str;
  }
  
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  
  return str.replace(/[&<>"'`=/]/g, char => htmlEscapes[char]);
}

/**
 * Escape string for use in JavaScript context
 * @param {string} str - String to escape
 * @returns {string} JS-safe string
 */
function escapeJs(str) {
  if (typeof str !== 'string') {
    return str;
  }
  
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Sanitize and encode output data object
 * Use before sending response with user-generated content
 * @param {object} data - Data to sanitize
 * @returns {object} Sanitized data
 */
function sanitizeOutput(data) {
  if (typeof data !== 'object' || data === null) {
    return typeof data === 'string' ? escapeHtml(data) : data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeOutput(item));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = escapeHtml(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeOutput(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

module.exports = {
  // Rate Limiting
  rateLimiter,
  authRateLimiter,
  
  // Request Sanitization
  sanitizeRequest,
  sanitizeOutput,
  
  // Validation
  validateCoordinates,
  validateIP,
  
  // Attack Detection
  detectSQLInjection,
  detectXSS,
  detectNoSQLInjection,
  detectPathTraversal,
  detectCommandInjection,
  detectLDAPInjection,
  detectAllThreats,
  
  // CSRF Protection
  generateCSRFToken,
  validateCSRFToken,
  csrfProtection,
  
  // Output Encoding
  escapeHtml,
  escapeJs
};

