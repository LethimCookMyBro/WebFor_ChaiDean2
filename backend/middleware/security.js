/**
 * Security Middleware
 * 
 * Provides rate limiting, security headers, and request sanitization
 */

// Simple in-memory rate limiter (for production use Redis)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // requests per window

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
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'กรุณารอสักครู่แล้วลองใหม่ (Rate limit exceeded)',
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
 * Security headers middleware
 */
function securityHeaders(req, res, next) {
  // Prevent clickjacking
  res.set('X-Frame-Options', 'DENY');
  
  // XSS protection
  res.set('X-XSS-Protection', '1; mode=block');
  
  // Prevent MIME type sniffing
  res.set('X-Content-Type-Options', 'nosniff');
  
  // Referrer policy
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  res.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com;");
  
  // Remove server header
  res.removeHeader('X-Powered-By');
  
  next();
}

/**
 * Request sanitization middleware
 */
function sanitizeRequest(req, res, next) {
  // Sanitize body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query params
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
}

/**
 * Recursively sanitize object values
 */
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeValue(obj);
  }
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Skip prototype pollution attempts
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    
    sanitized[key] = typeof value === 'object' ? sanitizeObject(value) : sanitizeValue(value);
  }
  
  return sanitized;
}

/**
 * Sanitize individual value
 */
function sanitizeValue(value) {
  if (typeof value !== 'string') {
    return value;
  }
  
  // Remove potential script injections
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
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
  for (const [ip, record] of requestCounts.entries()) {
    if (now - record.startTime > RATE_LIMIT_WINDOW * 2) {
      requestCounts.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);

module.exports = {
  rateLimiter,
  securityHeaders,
  sanitizeRequest,
  validateCoordinates,
  validateIP
};
