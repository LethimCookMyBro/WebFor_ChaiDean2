/**
 * Security Headers Middleware
 * 
 * Centralized Helmet configuration for consistent security headers
 */

const helmet = require('helmet');

const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Create Helmet middleware with production-ready configuration
 * @param {string[]} allowedOrigins - List of allowed origins for CSP
 * @returns {Function} Helmet middleware
 */
function createSecurityHeaders(allowedOrigins = []) {
  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", ...allowedOrigins],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: NODE_ENV === 'production' ? [] : null
      }
    },
    
    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    
    // Prevent clickjacking
    frameguard: { action: 'deny' },
    
    // Hide X-Powered-By
    hidePoweredBy: true,
    
    // Prevent IE from executing downloads in site's context
    ieNoOpen: true,
    
    // Prevent MIME type sniffing
    noSniff: true,
    
    // XSS filter
    xssFilter: true,
    
    // Referrer policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    
    // Cross-origin policies
    crossOriginEmbedderPolicy: false, // Required for external resources (maps, fonts)
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-site' },
    
    // Don't set Origin-Agent-Cluster
    originAgentCluster: true,
    
    // DNS prefetch control
    dnsPrefetchControl: { allow: false },
    
    // Permitted cross-domain policies
    permittedCrossDomainPolicies: { permittedPolicies: 'none' }
  });
}

/**
 * Additional custom security headers not covered by Helmet
 */
function additionalSecurityHeaders(req, res, next) {
  // Feature Policy / Permissions Policy
  res.setHeader('Permissions-Policy', 
    'accelerometer=(), camera=(), geolocation=(self), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  );
  
  // Cache control for sensitive endpoints
  if (req.path.includes('/auth') || req.path.includes('/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  // Remove server signature
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
}

module.exports = {
  createSecurityHeaders,
  additionalSecurityHeaders
};
