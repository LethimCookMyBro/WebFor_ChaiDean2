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
    // Debug logging
    console.log('[DATABASE] DB_PATH:', DB_PATH);
    
    // Ensure db directory exists
    const dbDir = path.dirname(DB_PATH);
    console.log('[DATABASE] DB_DIR:', dbDir);
    console.log('[DATABASE] DB_DIR exists:', fs.existsSync(dbDir));
    
    if (!fs.existsSync(dbDir)) {
      console.log('[DATABASE] Creating directory:', dbDir);
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // Check if we can write to the directory
    try {
      const testFile = path.join(dbDir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log('[DATABASE] ✅ Directory is writable');
    } catch (writeError) {
      console.error('[DATABASE] ❌ Directory NOT writable:', writeError.message);
    }

    // Create database connection
    db = new Database(DB_PATH, { 
      verbose: process.env.NODE_ENV === 'development' ? console.log : null 
    });

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

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
      
      if (tokensCleaned + ipsCleaned + attemptsCleaned + logsCleaned > 0) {
        console.log(`[DATABASE] 🧹 Cleanup: tokens=${tokensCleaned}, ips=${ipsCleaned}, attempts=${attemptsCleaned}, logs=${logsCleaned}`);
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
  startCleanupJob,
  stopCleanupJob
};
