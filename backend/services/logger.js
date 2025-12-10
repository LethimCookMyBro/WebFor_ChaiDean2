/**
 * Admin Logger Service
 * 
 * Stores logs in SQLite database for persistence
 * Falls back to console if database not available
 */

let appLogsOps = null;

// Try to load database - may not be available during initialization
function getAppLogsOps() {
  if (!appLogsOps) {
    try {
      const db = require('./database');
      appLogsOps = db.appLogsOps;
    } catch (e) {
      // Database not yet initialized, will use console only
    }
  }
  return appLogsOps;
}

// Log levels
const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  SECURITY: 'SECURITY'
};

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
  
  // Try to store in database
  const ops = getAppLogsOps();
  if (ops) {
    try {
      ops.add(level, category, message, metadata, metadata.ip || null);
    } catch (e) {
      // Database write failed, continue to console
    }
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
  const ops = getAppLogsOps();
  if (ops) {
    try {
      const logs = ops.getLogs(options);
      return logs.map(log => ({
        id: `log_${log.id}`,
        timestamp: log.created_at,
        level: log.level,
        category: log.category,
        message: log.message,
        metadata: log.metadata,
        ip: log.ip
      }));
    } catch (e) {
      console.error('[LOGGER] Failed to get logs from DB:', e.message);
    }
  }
  return [];
}

/**
 * Get log statistics
 */
function getStats() {
  const ops = getAppLogsOps();
  if (ops) {
    try {
      return ops.getStats();
    } catch (e) {
      console.error('[LOGGER] Failed to get stats from DB:', e.message);
    }
  }
  return {
    total: 0,
    lastHour: { total: 0, errors: 0, security: 0 },
    last24Hours: { total: 0, errors: 0, security: 0 }
  };
}

/**
 * Clear all logs (admin action)
 */
function clearLogs() {
  const ops = getAppLogsOps();
  if (ops) {
    try {
      ops.clear();
      info('SYSTEM', 'Logs cleared by admin');
    } catch (e) {
      console.error('[LOGGER] Failed to clear logs:', e.message);
    }
  }
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
