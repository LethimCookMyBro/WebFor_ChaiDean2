const { visitorsOps } = require('../services/database');

/**
 * Middleware to track visitors
 * Records IP and User Agent to 'visitors' table
 * 
 * ONLY tracks actual page views, NOT API calls
 * This prevents inflated visit counts from multiple API calls per page load
 */
const visitorTracker = (req, res, next) => {
  try {
    // Skip API calls - we only want to count actual page visits
    // API calls happen multiple times per page load
    if (req.path.startsWith('/api')) {
      return next();
    }
    
    // Skip static assets (js, css, images, etc.)
    const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.map'];
    if (staticExtensions.some(ext => req.path.endsWith(ext))) {
      return next();
    }
    
    // Skip health checks
    if (req.path === '/health') {
      return next();
    }
    
    // Only track HTML page requests (SPA entry point)
    // This typically means requests without file extension or requesting /index.html
    const isPageRequest = req.path === '/' || 
                          req.path === '/index.html' ||
                          !req.path.includes('.'); // SPA routes like /admin, /check, etc.
    
    if (!isPageRequest) {
      return next();
    }
    
    // Get IP
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const cleanIP = ip.replace('::ffff:', '').split(',')[0].trim(); // Get first IP if multiple
    
    // Get User Agent
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Record visit (synchronous with better-sqlite3)
    visitorsOps.recordVisit(cleanIP, userAgent);

  } catch (error) {
    // Silent fail - tracking shouldn't break app
    console.error('[VISITOR TRACKER] Error:', error.message);
  }
  
  next();
};

module.exports = visitorTracker;

