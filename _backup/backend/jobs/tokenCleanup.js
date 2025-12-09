/**
 * Token Cleanup Job
 * 
 * Scheduled cleanup tasks for security-related data:
 * - Expired tokens from blacklist
 * - Old audit logs
 * - Old login attempts
 */

// Default retention periods (can be overridden via env)
const TOKEN_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
const AUDIT_LOG_RETENTION_DAYS = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS) || 90;
const LOGIN_ATTEMPTS_RETENTION_DAYS = 7;

let cleanupDB = null;
let cleanupInterval = null;

/**
 * Set database connection for cleanup operations
 */
function setCleanupDB(db) {
  cleanupDB = db;
}

/**
 * Run cleanup tasks
 */
async function runCleanup() {
  if (!cleanupDB) {
    console.log('[CLEANUP] No database configured, skipping');
    return;
  }

  console.log('[CLEANUP] Starting scheduled cleanup...');
  const startTime = Date.now();
  const results = {};

  try {
    // 1. Delete expired tokens from blacklist
    const tokenResult = await cleanupDB.run(
      `DELETE FROM token_blacklist WHERE expires_at < datetime('now')`
    );
    results.expiredTokens = tokenResult?.changes || 0;

    // 2. Delete old audit logs
    const auditResult = await cleanupDB.run(
      `DELETE FROM audit_logs WHERE created_at < datetime('now', '-${AUDIT_LOG_RETENTION_DAYS} days')`
    );
    results.oldAuditLogs = auditResult?.changes || 0;

    // 3. Delete old login attempts
    const loginResult = await cleanupDB.run(
      `DELETE FROM login_attempts WHERE attempted_at < datetime('now', '-${LOGIN_ATTEMPTS_RETENTION_DAYS} days')`
    );
    results.oldLoginAttempts = loginResult?.changes || 0;

    const duration = Date.now() - startTime;
    console.log(`[CLEANUP] Completed in ${duration}ms:`, results);

  } catch (error) {
    console.error('[CLEANUP] Error during cleanup:', error.message);
  }

  return results;
}

/**
 * Start the cleanup scheduler
 */
function startCleanupScheduler() {
  if (cleanupInterval) {
    console.log('[CLEANUP] Scheduler already running');
    return;
  }

  console.log(`[CLEANUP] Starting scheduler (interval: ${TOKEN_CLEANUP_INTERVAL / 1000}s)`);
  
  // Run immediately on start
  runCleanup();

  // Schedule periodic cleanup
  cleanupInterval = setInterval(runCleanup, TOKEN_CLEANUP_INTERVAL);
}

/**
 * Stop the cleanup scheduler
 */
function stopCleanupScheduler() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('[CLEANUP] Scheduler stopped');
  }
}

/**
 * Get cleanup statistics
 */
async function getCleanupStats() {
  if (!cleanupDB) {
    return { error: 'No database configured' };
  }

  try {
    const stats = {};

    // Count tokens in blacklist
    const tokenCount = await cleanupDB.get(
      'SELECT COUNT(*) as count FROM token_blacklist'
    );
    stats.blacklistedTokens = tokenCount?.count || 0;

    // Count expired tokens
    const expiredCount = await cleanupDB.get(
      `SELECT COUNT(*) as count FROM token_blacklist WHERE expires_at < datetime('now')`
    );
    stats.expiredTokens = expiredCount?.count || 0;

    // Count audit logs
    const auditCount = await cleanupDB.get(
      'SELECT COUNT(*) as count FROM audit_logs'
    );
    stats.auditLogs = auditCount?.count || 0;

    // Count login attempts
    const loginCount = await cleanupDB.get(
      'SELECT COUNT(*) as count FROM login_attempts'
    );
    stats.loginAttempts = loginCount?.count || 0;

    return stats;

  } catch (error) {
    return { error: error.message };
  }
}

// Graceful shutdown
process.on('beforeExit', () => {
  stopCleanupScheduler();
});

module.exports = {
  setCleanupDB,
  runCleanup,
  startCleanupScheduler,
  stopCleanupScheduler,
  getCleanupStats,
  TOKEN_CLEANUP_INTERVAL,
  AUDIT_LOG_RETENTION_DAYS,
  LOGIN_ATTEMPTS_RETENTION_DAYS
};
