/**
 * Database Service - SQLite with better-sqlite3
 * 
 * Provides:
 * - Database connection initialization
 * - Schema migration
 * - Helper methods for common operations
 * - Auto-cleanup of expired entries
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Database file path
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'db', 'database.sqlite');
const SCHEMA_PATH = path.join(__dirname, '..', 'db', 'schema.sql');

// Database instance
let db = null;

/**
 * Initialize database connection and run migrations
 */
function initDatabase() {
  try {
    // Ensure db directory exists
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Create database connection with timeout
    db = new Database(DB_PATH, { 
      verbose: process.env.NODE_ENV === 'development' ? console.log : null,
      timeout: 10000  // 10 second timeout for busy database
    });

    // ============================================
    // SQLite PRAGMA Optimizations for Railway
    // ============================================
    
    // WAL mode for better concurrency (reads don't block writes)
    db.pragma('journal_mode = WAL');
    
    // Foreign key constraints
    db.pragma('foreign_keys = ON');
    
    // Busy timeout: wait 5 seconds if database is locked
    db.pragma('busy_timeout = 5000');
    
    // NORMAL sync is faster but still safe with WAL
    db.pragma('synchronous = NORMAL');
    
    // 64MB cache for read-heavy operations
    db.pragma('cache_size = -64000');
    
    // Store temp tables in memory for speed
    db.pragma('temp_store = MEMORY');
    
    // Optimize memory-mapped I/O (256MB)
    db.pragma('mmap_size = 268435456');
    
    // Checkpoint WAL every 1000 pages
    db.pragma('wal_autocheckpoint = 1000');

    // Run schema migration
    if (fs.existsSync(SCHEMA_PATH)) {
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      db.exec(schema);
      console.log('[DATABASE] ✅ Schema initialized');
    } else {
      console.warn('[DATABASE] ⚠️ Schema file not found, creating basic tables');
      createBasicTables();
    }

    // Start cleanup job
    startCleanupJob();

    console.log('[DATABASE] ✅ Database connected:', DB_PATH);
    return db;
  } catch (error) {
    console.error('[DATABASE] ❌ Failed to initialize:', error.message);
    throw error;
  }
}

/**
 * Create basic tables if schema file not found
 */
function createBasicTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      user_id TEXT,
      action TEXT NOT NULL,
      resource TEXT,
      ip TEXT,
      user_agent TEXT,
      request_id TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS token_blacklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT UNIQUE NOT NULL,
      user_id TEXT,
      expires_at DATETIME NOT NULL,
      revoked_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS blocked_ips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT UNIQUE NOT NULL,
      reason TEXT,
      blocked_by TEXT,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier TEXT UNIQUE NOT NULL,
      attempts INTEGER DEFAULT 1,
      locked_until DATETIME,
      last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * Get database instance
 */
function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// ============================================
// Token Blacklist Operations
// ============================================

const tokenBlacklistOps = {
  /**
   * Check if token is revoked
   */
  isRevoked(tokenHash) {
    const stmt = db.prepare(`
      SELECT id FROM token_blacklist 
      WHERE token_hash = ? AND expires_at > datetime('now')
    `);
    return !!stmt.get(tokenHash);
  },

  /**
   * Revoke a token
   */
  revoke(tokenHash, userId, expiresAt) {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO token_blacklist (token_hash, user_id, expires_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(tokenHash, userId, expiresAt);
  },

  /**
   * Cleanup expired tokens
   */
  cleanup() {
    const stmt = db.prepare(`DELETE FROM token_blacklist WHERE expires_at < datetime('now')`);
    const result = stmt.run();
    return result.changes;
  }
};

// ============================================
// Blocked IPs Operations
// ============================================

const blockedIPsOps = {
  /**
   * Check if IP is blocked
   */
  isBlocked(ip) {
    const stmt = db.prepare(`
      SELECT id FROM blocked_ips 
      WHERE ip = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
    `);
    return !!stmt.get(ip);
  },

  /**
   * Get blocked IP info
   */
  getInfo(ip) {
    const stmt = db.prepare(`
      SELECT * FROM blocked_ips 
      WHERE ip = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
    `);
    return stmt.get(ip);
  },

  /**
   * Get all blocked IPs
   */
  getAll() {
    const stmt = db.prepare(`
      SELECT * FROM blocked_ips 
      WHERE expires_at IS NULL OR expires_at > datetime('now')
      ORDER BY created_at DESC
    `);
    return stmt.all();
  },

  /**
   * Block an IP
   */
  block(ip, reason, blockedBy, expiresAt = null) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO blocked_ips (ip, reason, blocked_by, expires_at, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(ip, reason, blockedBy, expiresAt);
  },

  /**
   * Unblock an IP
   */
  unblock(ip) {
    const stmt = db.prepare(`DELETE FROM blocked_ips WHERE ip = ?`);
    return stmt.run(ip).changes > 0;
  },

  /**
   * Cleanup expired blocks
   */
  cleanup() {
    const stmt = db.prepare(`DELETE FROM blocked_ips WHERE expires_at IS NOT NULL AND expires_at < datetime('now')`);
    return stmt.run().changes;
  }
};

// ============================================
// Login Attempts Operations
// ============================================

const loginAttemptsOps = {
  /**
   * Get attempt record
   */
  get(identifier) {
    const stmt = db.prepare(`SELECT * FROM login_attempts WHERE identifier = ?`);
    return stmt.get(identifier);
  },

  /**
   * Check if account is locked
   */
  isLocked(identifier) {
    const record = this.get(identifier);
    if (!record || !record.locked_until) return { locked: false, remainingMs: 0 };
    
    const lockedUntil = new Date(record.locked_until).getTime();
    const now = Date.now();
    
    if (now >= lockedUntil) {
      this.reset(identifier);
      return { locked: false, remainingMs: 0 };
    }
    
    return { locked: true, remainingMs: lockedUntil - now };
  },

  /**
   * Record a login attempt
   */
  recordAttempt(identifier, maxAttempts = 5, lockoutDurationMs = 15 * 60 * 1000) {
    const record = this.get(identifier);
    
    if (!record) {
      const stmt = db.prepare(`
        INSERT INTO login_attempts (identifier, attempts, last_attempt)
        VALUES (?, 1, datetime('now'))
      `);
      stmt.run(identifier);
      return { locked: false, attemptsRemaining: maxAttempts - 1 };
    }
    
    const newAttempts = record.attempts + 1;
    
    if (newAttempts >= maxAttempts) {
      const lockUntil = new Date(Date.now() + lockoutDurationMs).toISOString();
      const stmt = db.prepare(`
        UPDATE login_attempts 
        SET attempts = ?, locked_until = ?, last_attempt = datetime('now')
        WHERE identifier = ?
      `);
      stmt.run(newAttempts, lockUntil, identifier);
      return { locked: true, attemptsRemaining: 0 };
    }
    
    const stmt = db.prepare(`
      UPDATE login_attempts 
      SET attempts = ?, last_attempt = datetime('now')
      WHERE identifier = ?
    `);
    stmt.run(newAttempts, identifier);
    return { locked: false, attemptsRemaining: maxAttempts - newAttempts };
  },

  /**
   * Reset attempts on successful login
   */
  reset(identifier) {
    const stmt = db.prepare(`DELETE FROM login_attempts WHERE identifier = ?`);
    stmt.run(identifier);
  },

  /**
   * Cleanup expired lockouts
   */
  cleanup() {
    const stmt = db.prepare(`DELETE FROM login_attempts WHERE locked_until IS NOT NULL AND locked_until < datetime('now')`);
    return stmt.run().changes;
  }
};

// ============================================
// Audit Log Operations
// ============================================

const auditOps = {
  /**
   * Insert audit log entry
   */
  log(entry) {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (event_type, user_id, action, resource, ip, user_agent, request_id, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      entry.event_type,
      entry.user_id,
      entry.action,
      entry.resource,
      entry.ip,
      entry.user_agent,
      entry.request_id,
      entry.metadata
    );
  },

  /**
   * Get recent logs
   */
  getRecent(limit = 100, eventType = null) {
    if (eventType) {
      const stmt = db.prepare(`
        SELECT * FROM audit_logs WHERE event_type = ? ORDER BY created_at DESC LIMIT ?
      `);
      return stmt.all(eventType, limit);
    }
    const stmt = db.prepare(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?`);
    return stmt.all(limit);
  },

  /**
   * Get logs by IP
   */
  getByIP(ip, limit = 50) {
    const stmt = db.prepare(`SELECT * FROM audit_logs WHERE ip = ? ORDER BY created_at DESC LIMIT ?`);
    return stmt.all(ip, limit);
  },

  /**
   * Cleanup old logs (keep last 30 days)
   */
  cleanup(daysToKeep = 30) {
    const stmt = db.prepare(`DELETE FROM audit_logs WHERE created_at < datetime('now', '-' || ? || ' days')`);
    return stmt.run(daysToKeep).changes;
  }
};

// ============================================
// Reports Operations
// ============================================

const reportsOps = {
  /**
   * Get all reports with optional filters
   */
  getAll(options = {}) {
    let query = 'SELECT * FROM reports';
    const params = [];
    const conditions = [];
    
    if (options.type) {
      conditions.push('type = ?');
      params.push(options.type);
    }
    if (options.verified !== undefined) {
      conditions.push('verified = ?');
      params.push(options.verified ? 1 : 0);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';
    
    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  },

  /**
   * Get report by ID
   */
  getById(id) {
    const stmt = db.prepare('SELECT * FROM reports WHERE id = ?');
    return stmt.get(id);
  },

  /**
   * Create a new report
   */
  create(report) {
    const stmt = db.prepare(`
      INSERT INTO reports (id, type, location, lat, lng, province, district, subdistrict, description, ip_address, verified, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      report.id,
      report.type,
      report.location,
      report.lat,
      report.lng,
      report.province,
      report.district,
      report.subdistrict,
      report.description,
      report.ip,
      report.verified ? 1 : 0,
      report.time || new Date().toISOString()
    );
    return report;
  },

  /**
   * Update report
   */
  update(id, updates) {
    const fields = [];
    const params = [];
    
    if (updates.type !== undefined) { fields.push('type = ?'); params.push(updates.type); }
    if (updates.location !== undefined) { fields.push('location = ?'); params.push(updates.location); }
    if (updates.description !== undefined) { fields.push('description = ?'); params.push(updates.description); }
    if (updates.verified !== undefined) { fields.push('verified = ?'); params.push(updates.verified ? 1 : 0); }
    
    fields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    
    const stmt = db.prepare(`UPDATE reports SET ${fields.join(', ')} WHERE id = ?`);
    return stmt.run(...params).changes > 0;
  },

  /**
   * Delete report
   */
  delete(id) {
    const stmt = db.prepare('DELETE FROM reports WHERE id = ?');
    return stmt.run(id).changes > 0;
  },

  /**
   * Get count
   */
  count() {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM reports');
    return stmt.get().count;
  }
};

// ============================================
// Broadcasts Operations
// ============================================

const broadcastsOps = {
  /**
   * Get all broadcasts
   */
  getAll(limit = 100) {
    const stmt = db.prepare('SELECT * FROM broadcasts ORDER BY created_at DESC LIMIT ?');
    return stmt.all(limit);
  },

  /**
   * Create broadcast
   */
  create(broadcast) {
    const stmt = db.prepare(`
      INSERT INTO broadcasts (id, message, from_user, created_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(
      broadcast.id,
      broadcast.message,
      broadcast.from || 'admin',
      broadcast.time || new Date().toISOString()
    );
    return broadcast;
  },

  /**
   * Delete broadcast
   */
  delete(id) {
    const stmt = db.prepare('DELETE FROM broadcasts WHERE id = ?');
    return stmt.run(id).changes > 0;
  }
};

// ============================================
// System Settings Operations
// ============================================

const settingsOps = {
  /**
   * Get setting value
   */
  get(key) {
    const stmt = db.prepare('SELECT value FROM system_settings WHERE key = ?');
    const result = stmt.get(key);
    return result ? result.value : null;
  },

  /**
   * Set setting value
   */
  set(key, value) {
    const stmt = db.prepare(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
    `);
    stmt.run(key, value, value);
  }
};

// ============================================
// App Logs Operations (For Admin Dashboard)
// ============================================

const appLogsOps = {
  /**
   * Add log entry
   */
  add(level, category, message, metadata = {}, ip = null) {
    const stmt = db.prepare(`
      INSERT INTO app_logs (level, category, message, metadata, ip)
      VALUES (?, ?, ?, ?, ?)
    `);
    const metadataStr = typeof metadata === 'object' ? JSON.stringify(metadata) : metadata;
    stmt.run(level, category, message, metadataStr, ip);
  },

  /**
   * Get logs with filtering
   */
  getLogs(options = {}) {
    let query = 'SELECT * FROM app_logs';
    const params = [];
    const conditions = [];
    
    if (options.level) {
      conditions.push('level = ?');
      params.push(options.level);
    }
    if (options.category) {
      conditions.push('category = ?');
      params.push(options.category);
    }
    if (options.since) {
      conditions.push('created_at >= ?');
      params.push(options.since);
    }
    if (options.search) {
      conditions.push('(message LIKE ? OR metadata LIKE ?)');
      params.push(`%${options.search}%`, `%${options.search}%`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';
    query += ` LIMIT ${options.limit || 200}`;
    
    const stmt = db.prepare(query);
    return stmt.all(...params).map(log => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : {}
    }));
  },

  /**
   * Get stats
   */
  getStats() {
    const total = db.prepare('SELECT COUNT(*) as count FROM app_logs').get().count;
    const lastHour = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN level = 'ERROR' THEN 1 ELSE 0 END) as errors,
        SUM(CASE WHEN level = 'SECURITY' THEN 1 ELSE 0 END) as security
      FROM app_logs 
      WHERE created_at >= datetime('now', '-1 hour')
    `).get();
    
    const last24Hours = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN level = 'ERROR' THEN 1 ELSE 0 END) as errors,
        SUM(CASE WHEN level = 'SECURITY' THEN 1 ELSE 0 END) as security
      FROM app_logs 
      WHERE created_at >= datetime('now', '-1 day')
    `).get();
    
    return {
      total,
      lastHour: { total: lastHour.total, errors: lastHour.errors || 0, security: lastHour.security || 0 },
      last24Hours: { total: last24Hours.total, errors: last24Hours.errors || 0, security: last24Hours.security || 0 }
    };
  },

  /**
   * Clear all logs
   */
  clear() {
    const stmt = db.prepare('DELETE FROM app_logs');
    stmt.run();
  },

  /**
   * Delete specific log
   */
  delete(id) {
    // Handle "log_123" format or just "123"
    const dbId = id.toString().replace('log_', '');
    const stmt = db.prepare('DELETE FROM app_logs WHERE id = ?');
    stmt.run(dbId);
  },

  /**
   * Cleanup old logs
   */
  cleanup(daysToKeep = 30) {
    const stmt = db.prepare(`DELETE FROM app_logs WHERE created_at < datetime('now', '-' || ? || ' days')`);
    return stmt.run(daysToKeep).changes;
  }
};

// ============================================
// Cleanup Job
// ============================================

let cleanupInterval = null;

function startCleanupJob() {
  // Run cleanup every hour
  cleanupInterval = setInterval(() => {
    try {
      const tokensCleaned = tokenBlacklistOps.cleanup();
      const ipsCleaned = blockedIPsOps.cleanup();
      const attemptsCleaned = loginAttemptsOps.cleanup();
      const logsCleaned = auditOps.cleanup();
      const appLogsCleaned = appLogsOps.cleanup();
      
      if (tokensCleaned + ipsCleaned + attemptsCleaned + logsCleaned + appLogsCleaned > 0) {
        console.log(`[DATABASE] 🧹 Cleanup: tokens=${tokensCleaned}, ips=${ipsCleaned}, attempts=${attemptsCleaned}, logs=${logsCleaned}, appLogs=${appLogsCleaned}`);
      }
    } catch (error) {
      console.error('[DATABASE] Cleanup error:', error.message);
    }
  }, 60 * 60 * 1000); // 1 hour
}

function stopCleanupJob() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

// ============================================
// Graceful Shutdown
// ============================================

process.on('SIGINT', () => {
  if (db) {
    db.close();
    console.log('[DATABASE] Connection closed');
  }
  process.exit(0);
});

// ============================================
// Exports
// ============================================

module.exports = {
  initDatabase,
  getDatabase,
  tokenBlacklistOps,
  blockedIPsOps,
  loginAttemptsOps,
  auditOps,
  reportsOps,
  broadcastsOps,
  settingsOps,
  appLogsOps,
  startCleanupJob,
  stopCleanupJob
};
