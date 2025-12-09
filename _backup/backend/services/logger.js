/**
 * Admin Logger Service
 * 
 * Stores logs in memory for admin viewing
 * In production, would use a database or file storage
 */

const MAX_LOGS = 500; // Maximum logs to keep in memory

// Log levels
const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  SECURITY: 'SECURITY'
};

// In-memory log storage
const logs = [];

/**
 * Add a log entry
 * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR, SECURITY)
 * @param {string} category - Category (AUTH, SOS, REPORT, SYSTEM, etc.)
 * @param {string} message - Log message
 * @param {object} metadata - Additional data
 */
function addLog(level, category, message, metadata = {}) {
  const logEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    metadata,
    ip: metadata.ip || null
  };
  
  // Add to beginning of array
  logs.unshift(logEntry);
  
  // Trim if exceeds max
  if (logs.length > MAX_LOGS) {
    logs.pop();
  }
  
  // Also log to console with color
  const colors = {
    DEBUG: '\x1b[90m',   // Gray
    INFO: '\x1b[36m',    // Cyan
    WARN: '\x1b[33m',    // Yellow
    ERROR: '\x1b[31m',   // Red
    SECURITY: '\x1b[35m' // Magenta
  };
  const reset = '\x1b[0m';
  const color = colors[level] || reset;
  
  console.log(`${color}[${level}][${category}]${reset} ${message}`);
  if (Object.keys(metadata).length > 0 && level !== 'DEBUG') {
    console.log(`  └─ ${JSON.stringify(metadata)}`);
  }
  
  return logEntry;
}

/**
 * Helper functions for different log levels
 */
function debug(category, message, metadata = {}) {
  return addLog(LOG_LEVELS.DEBUG, category, message, metadata);
}

function info(category, message, metadata = {}) {
  return addLog(LOG_LEVELS.INFO, category, message, metadata);
}

function warn(category, message, metadata = {}) {
  return addLog(LOG_LEVELS.WARN, category, message, metadata);
}

function error(category, message, metadata = {}) {
  return addLog(LOG_LEVELS.ERROR, category, message, metadata);
}

function security(category, message, metadata = {}) {
  return addLog(LOG_LEVELS.SECURITY, category, message, metadata);
}

/**
 * Get logs with optional filtering
 * @param {object} options - Filter options
 * @returns {array} Filtered logs
 */
function getLogs(options = {}) {
  let result = [...logs];
  
  // Filter by level
  if (options.level) {
    result = result.filter(log => log.level === options.level);
  }
  
  // Filter by category
  if (options.category) {
    result = result.filter(log => log.category === options.category);
  }
  
  // Filter by time range
  if (options.since) {
    const sinceDate = new Date(options.since);
    result = result.filter(log => new Date(log.timestamp) >= sinceDate);
  }
  
  // Search in message
  if (options.search) {
    const searchLower = options.search.toLowerCase();
    result = result.filter(log => 
      log.message.toLowerCase().includes(searchLower) ||
      JSON.stringify(log.metadata).toLowerCase().includes(searchLower)
    );
  }
  
  // Limit results
  if (options.limit) {
    result = result.slice(0, options.limit);
  }
  
  return result;
}

/**
 * Get log statistics
 */
function getStats() {
  const now = new Date();
  const oneHourAgo = new Date(now - 60 * 60 * 1000);
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  
  const recentLogs = logs.filter(log => new Date(log.timestamp) >= oneHourAgo);
  const dailyLogs = logs.filter(log => new Date(log.timestamp) >= oneDayAgo);
  
  return {
    total: logs.length,
    lastHour: {
      total: recentLogs.length,
      errors: recentLogs.filter(l => l.level === 'ERROR').length,
      security: recentLogs.filter(l => l.level === 'SECURITY').length
    },
    last24Hours: {
      total: dailyLogs.length,
      errors: dailyLogs.filter(l => l.level === 'ERROR').length,
      security: dailyLogs.filter(l => l.level === 'SECURITY').length,
      byCategory: dailyLogs.reduce((acc, log) => {
        acc[log.category] = (acc[log.category] || 0) + 1;
        return acc;
      }, {})
    }
  };
}

/**
 * Clear all logs (admin action)
 */
function clearLogs() {
  logs.length = 0;
  info('SYSTEM', 'Logs cleared by admin');
}

module.exports = {
  LOG_LEVELS,
  addLog,
  debug,
  info,
  warn,
  error,
  security,
  getLogs,
  getStats,
  clearLogs
};
