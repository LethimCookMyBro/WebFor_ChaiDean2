const { visitorsOps } = require('../services/database');

/**
 * Middleware to track visitors
 * Records IP and User Agent to 'visitors' table
 */
const visitorTracker = (req, res, next) => {
  try {
    // Skip static files and health checks to reduce noise/load?
    // Actually, we want to track page loads. API calls are good proxies for "Online".
    // Let's track everything under /api and root.
    
    // Get IP
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const cleanIP = ip.replace('::ffff:', ''); // Normalize IPv4
    
    // Get User Agent
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Record async (don't await to avoid blocking response)
    visitorsOps.recordVisit(cleanIP, userAgent);

  } catch (error) {
    // Silent fail - tracking shouldn't break app
    console.error('[VISITOR TRACKER] Error:', error.message);
  }
  
  next();
};

module.exports = visitorTracker;
