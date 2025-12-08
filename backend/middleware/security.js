/**
 * Security Middleware
 * 
 * Provides rate limiting, request sanitization, and security utilities
 * with SQL injection detection and enhanced validation
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
  /(--|\#|\/\*|\*\/)/,  // SQL comments
  /(\bEXEC\b|\bEXECUTE\b)/i,
  /(\bDROP\b\s+\bTABLE\b)/i,
  /(0x[0-9a-fA-F]+)/,  // Hex encoded
  /(\bCHAR\s*\(\s*\d+\s*\))/i,  // CHAR() function
  /(\bCONCAT\s*\()/i  // CONCAT function
];

// XSS patterns to detect
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<svg.*?onload/gi
];

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

module.exports = {
  rateLimiter,
  authRateLimiter,
  sanitizeRequest,
  validateCoordinates,
  validateIP,
  detectSQLInjection,
  detectXSS
};
