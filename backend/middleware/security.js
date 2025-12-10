/**
 * Security Middleware v2.0
 * 
 * Production-ready security with:
 * - Rate limiting with memory cleanup
 * - Comprehensive attack detection (ReDoS-safe patterns)
 * - Request sanitization with size/depth limits
 * - Output encoding for XSS prevention
 * 
 * CSRF protection is handled by csrf.js (double-submit cookie pattern)
 */

// ============================================
// Configuration
// ============================================

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 500; // requests per window (increased for multi-device)
const AUTH_RATE_LIMIT_MAX = 10; // auth requests per window
const MAX_REQUEST_SIZE = 50 * 1024; // 50KB (also enforced by express.json)
const MAX_OBJECT_DEPTH = 10;
const MAX_ARRAY_LENGTH = 1000;
const MAX_STRING_LENGTH = 10000;

// ============================================
// Rate Limiting (In-Memory with cleanup)
// ============================================

// Map with automatic cleanup to prevent memory leaks
const requestCounts = new Map();

/**
 * Rate limiter middleware
 * Note: For production with multiple servers, use Redis
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
    console.warn(`[SECURITY] Rate limit exceeded: IP=${ip}`);
    
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'กรุณารอสักครู่แล้วลองใหม่',
      retryAfter: Math.ceil((record.startTime + RATE_LIMIT_WINDOW - now) / 1000)
    });
  }
  
  // Don't expose rate limit details - security through obscurity
  // Removed: X-RateLimit-Remaining header
  
  next();
}

/**
 * Stricter rate limiter for auth endpoints
 */
function authRateLimiter(req, res, next) {
  const ip = req.clientIp || req.ip || 'unknown';
  const key = `auth:${ip}`;
  const now = Date.now();
  
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
  
  if (record.count > AUTH_RATE_LIMIT_MAX) {
    console.warn(`[SECURITY] Auth rate limit exceeded: IP=${ip}`);
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'มีการเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่'
    });
  }
  
  next();
}

// Cleanup expired rate limit records every minute
setInterval(() => {
  const now = Date.now();
  const expiredThreshold = RATE_LIMIT_WINDOW * 2;
  
  for (const [key, record] of requestCounts.entries()) {
    if (now - record.startTime > expiredThreshold) {
      requestCounts.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW);

// ============================================
// Attack Detection Patterns (ReDoS-safe)
// ============================================

// SQL injection patterns - simplified to avoid ReDoS
const SQL_INJECTION_PATTERNS = [
  /\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b/i,
  /\bOR\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i,
  /\bAND\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i,
  /--\s*$/,
  /#\s*$/,
  /\/\*[\s\S]*?\*\//,
  /\bEXEC(UTE)?\b/i,
  /\bWAITFOR\s+DELAY\b/i,
  /\bSLEEP\s*\(/i,
  /\bBENCHMARK\s*\(/i,
];

// XSS patterns - ReDoS-safe versions
const XSS_PATTERNS = [
  /<script\b/i,
  /<\/script>/i,
  /javascript\s*:/i,
  /\bon\w+\s*=/i,  // onclick=, onerror=, etc.
  /<iframe\b/i,
  /<object\b/i,
  /<embed\b/i,
  /<svg\b[^>]*\bon/i,
  /<img\b[^>]*\bon/i,
  /<body\b[^>]*\bon/i,
  /data\s*:\s*text\/html/i,
  /vbscript\s*:/i,
  /expression\s*\(/i,
];

// NoSQL injection patterns
const NOSQL_INJECTION_PATTERNS = [
  /\$where\s*:/i,
  /\$gt\s*:/i,
  /\$lt\s*:/i,
  /\$ne\s*:/i,
  /\$or\s*:\s*\[/i,
  /\$and\s*:\s*\[/i,
  /\$regex\s*:/i,
];

// Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//,
  /\.\.%2[fF]/,
  /\.\.%5[cC]/,
  /\.\.\\/,
  /%2e%2e[\/\\]/i,
  /\/etc\/passwd/i,
  /\/proc\/self/i,
];

// Command injection patterns
const COMMAND_INJECTION_PATTERNS = [
  /[;&|`]/,
  /\$\(/,
  /\|\|/,
  /&&/,
];

// Prototype pollution keys
const PROTOTYPE_POLLUTION_KEYS = ['__proto__', 'constructor', 'prototype'];

// ============================================
// Detection Functions
// ============================================

function detectSQLInjection(value) {
  if (typeof value !== 'string' || value.length > MAX_STRING_LENGTH) return false;
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

function detectXSS(value) {
  if (typeof value !== 'string' || value.length > MAX_STRING_LENGTH) return false;
  return XSS_PATTERNS.some(pattern => pattern.test(value));
}

function detectNoSQLInjection(value) {
  if (typeof value !== 'string' || value.length > MAX_STRING_LENGTH) return false;
  return NOSQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

function detectPathTraversal(value) {
  if (typeof value !== 'string' || value.length > MAX_STRING_LENGTH) return false;
  return PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(value));
}

function detectCommandInjection(value) {
  if (typeof value !== 'string' || value.length < 3 || value.length > MAX_STRING_LENGTH) return false;
  return COMMAND_INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

function detectAllThreats(value, location = '') {
  const threats = [];
  
  if (detectSQLInjection(value)) threats.push(`sql_injection:${location}`);
  if (detectXSS(value)) threats.push(`xss_attempt:${location}`);
  if (detectNoSQLInjection(value)) threats.push(`nosql_injection:${location}`);
  if (detectPathTraversal(value)) threats.push(`path_traversal:${location}`);
  if (detectCommandInjection(value)) threats.push(`command_injection:${location}`);
  
  return threats;
}

// ============================================
// Request Validation
// ============================================

/**
 * Validate object depth to prevent deeply nested attacks
 */
function validateObjectDepth(obj, maxDepth = MAX_OBJECT_DEPTH, currentDepth = 0) {
  if (currentDepth > maxDepth) {
    return false;
  }
  
  if (typeof obj !== 'object' || obj === null) {
    return true;
  }
  
  for (const value of Object.values(obj)) {
    if (!validateObjectDepth(value, maxDepth, currentDepth + 1)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Validate array lengths
 */
function validateArrayLengths(obj, maxLength = MAX_ARRAY_LENGTH) {
  if (Array.isArray(obj)) {
    if (obj.length > maxLength) return false;
    return obj.every(item => validateArrayLengths(item, maxLength));
  }
  
  if (typeof obj === 'object' && obj !== null) {
    return Object.values(obj).every(value => validateArrayLengths(value, maxLength));
  }
  
  return true;
}

// ============================================
// Request Sanitization Middleware
// ============================================

/**
 * Main request sanitization middleware
 */
function sanitizeRequest(req, res, next) {
  const threats = [];
  
  // Validate request body depth
  if (req.body && !validateObjectDepth(req.body)) {
    console.warn(`[SECURITY] Request body too deeply nested: ${req.requestId}`);
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Request body structure too complex'
    });
  }
  
  // Validate array lengths
  if (req.body && !validateArrayLengths(req.body)) {
    console.warn(`[SECURITY] Array too long in request: ${req.requestId}`);
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Array in request is too large'
    });
  }
  
  // Sanitize body
  if (req.body) {
    const result = sanitizeObject(req.body, 'body');
    req.body = result.sanitized;
    threats.push(...result.threats);
  }
  
  // Sanitize query params
  if (req.query) {
    const result = sanitizeObject(req.query, 'query');
    req.query = result.sanitized;
    threats.push(...result.threats);
  }
  
  // Log detected threats
  if (threats.length > 0) {
    console.warn(`[SECURITY] Threats detected in request ${req.requestId}:`, threats);
    
    // For critical threats, block the request
    const criticalThreats = threats.filter(t => 
      t.includes('sql_injection') || 
      t.includes('command_injection') ||
      t.includes('prototype_pollution')
    );
    
    if (criticalThreats.length > 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid input detected'
      });
    }
  }
  
  next();
}

/**
 * Recursively sanitize object values
 */
function sanitizeObject(obj, location = '', depth = 0) {
  const threats = [];
  
  // Prevent infinite recursion
  if (depth > MAX_OBJECT_DEPTH) {
    return { sanitized: null, threats: ['max_depth_exceeded'] };
  }
  
  if (typeof obj !== 'object' || obj === null) {
    const result = sanitizeValue(obj, location);
    return { sanitized: result.value, threats: result.threats };
  }
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Block prototype pollution
    if (PROTOTYPE_POLLUTION_KEYS.includes(key)) {
      threats.push(`prototype_pollution:${location}.${key}`);
      continue;
    }
    
    if (typeof value === 'object' && value !== null) {
      const result = sanitizeObject(value, `${location}.${key}`, depth + 1);
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
 * Sanitize individual value with comprehensive XSS prevention
 */
function sanitizeValue(value, location = '') {
  const threats = [];
  
  if (typeof value !== 'string') {
    return { value, threats };
  }
  
  // Check string length
  if (value.length > MAX_STRING_LENGTH) {
    return { value: value.substring(0, MAX_STRING_LENGTH), threats: ['string_truncated'] };
  }
  
  // Detect threats
  threats.push(...detectAllThreats(value, location));
  
  // Comprehensive sanitization
  let sanitized = value
    // Remove script tags
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    // Remove javascript: URLs
    .replace(/javascript\s*:/gi, '')
    // Remove event handlers (onclick, onerror, etc.)
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s*on\w+\s*=\s*[^\s>]+/gi, '')
    // Remove dangerous tags
    .replace(/<(iframe|object|embed|svg|math)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(iframe|object|embed|svg|math)\b[^>]*\/?>/gi, '')
    // Remove data: URLs in attributes
    .replace(/\s+(href|src|action)\s*=\s*["']?\s*data:/gi, ' $1="')
    // Trim whitespace
    .trim();
  
  return { value: sanitized, threats };
}

// ============================================
// Validation Utilities
// ============================================

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
  if (!ip) return true;
  
  // IPv4
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 simplified
  const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  // IPv6 shorthand with ::
  const ipv6ShortPattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  
  if (ipv4Pattern.test(ip)) {
    // Validate each octet
    const octets = ip.split('.').map(Number);
    return octets.every(o => o >= 0 && o <= 255);
  }
  
  return ipv6Pattern.test(ip) || ipv6ShortPattern.test(ip);
}

// ============================================
// Output Encoding (XSS Prevention)
// ============================================

/**
 * Escape HTML special characters
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  
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
 * Escape for JavaScript context
 */
function escapeJs(str) {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Sanitize output data for safe rendering
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

// ============================================
// Exports
// ============================================

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
  validateObjectDepth,
  validateArrayLengths,
  
  // Attack Detection
  detectSQLInjection,
  detectXSS,
  detectNoSQLInjection,
  detectPathTraversal,
  detectCommandInjection,
  detectAllThreats,
  
  // Output Encoding
  escapeHtml,
  escapeJs,
  
  // Configuration (for testing)
  MAX_OBJECT_DEPTH,
  MAX_ARRAY_LENGTH,
  MAX_STRING_LENGTH
};
