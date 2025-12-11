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

    CREATE TABLE IF NOT EXISTS visitors (
      ip TEXT PRIMARY KEY,
      user_agent TEXT,
      visits INTEGER DEFAULT 1,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
  },

  /**
   * Clear all audit logs
   */
  clear() {
    try {
      const stmt = db.prepare('DELETE FROM audit_logs');
      const result = stmt.run();
      console.log(`[DATABASE] Cleared ${result.changes} audit logs`);
      return result.changes;
    } catch (e) {
      console.error('[DATABASE] auditOps.clear error:', e.message);
      return 0;
    }
  }
};

// ============================================
// Visitor Tracking Operations
// ============================================

const visitorsOps = {
  /**
   * Record visit (insert or update last_seen)
   */
  recordVisit(ip, userAgent) {
    // Ensure column exists (migration-like check for SQLite/Turso)
    try {
        db.prepare("ALTER TABLE visitors ADD COLUMN visits INTEGER DEFAULT 1").run();
    } catch (e) { /* Column likely exists */ }

    const stmt = db.prepare(`
      INSERT INTO visitors (ip, user_agent, visits, last_seen)
      VALUES (?, ?, 1, datetime('now'))
      ON CONFLICT(ip) DO UPDATE SET
        last_seen = datetime('now'),
        visits = visits + 1,
        user_agent = excluded.user_agent
    `);
    const result = stmt.run(ip, userAgent);
    return result.changes > 0;
  },

  /**
   * Get visitor stats
   * - online: active in last 5 minutes
   * - total: total unique IPs tracked
   * - pageViews: total visits count
   */
  getStats() {
    try {
        // Count active in last 5 minutes
        const onlineStmt = db.prepare(`
        SELECT COUNT(*) as count FROM visitors 
        WHERE last_seen > datetime('now', '-5 minutes')
        `);
        const online = onlineStmt.get().count;

        // Count total unique visitors
        const totalStmt = db.prepare('SELECT COUNT(*) as count FROM visitors');
        const total = totalStmt.get().count;

        // Count total page views
        let pageViews = 0;
        try {
            const viewsStmt = db.prepare('SELECT SUM(visits) as count FROM visitors');
            const res = viewsStmt.get();
            pageViews = res ? res.count : 0;
        } catch(e) {
            // Fallback if visits column issue
            pageViews = total; 
        }

        return { online, total, pageViews: pageViews || total };
    } catch (e) {
        console.error('[DATABASE] getStats error:', e.message);
        return { online: 0, total: 0, pageViews: 0 };
    }
  },

  /**
   * Cleanup old visitors (keep last 24 hours only to save space, or keeps history?)
   * Let's keep history for "Total Users" count, but maybe clean very old data if needed.
   * For now, just keeping all to satisfy "Total Users" requirement.
   */
  cleanup(daysToKeep = 30) {
    // Optional: Only keep active tracking for recently active, but we want TOTAL unique users forever?
    // User asked for "Total Users", so we shouldn't delete unless space is issue.
    // We'll leave cleanup manual or for later.
    return 0;
  }
};

// ============================================
// Settings Operations
// ============================================

const settingsOps = {
  get(key) {
    try {
      const stmt = db.prepare('SELECT value FROM system_settings WHERE key = ?');
      const row = stmt.get(key);
      return row ? row.value : null;
    } catch (e) {
      console.error('[DATABASE] settingsOps.get error:', e.message);
      return null;
    }
  },
  
  set(key, value) {
    try {
      const stmt = db.prepare(`
        INSERT INTO system_settings (key, value, updated_at) 
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
      `);
      stmt.run(key, value, value);
      return true;
    } catch (e) {
      console.error('[DATABASE] settingsOps.set error:', e.message);
      return false;
    }
  }
};

// ============================================
// Broadcasts Operations
// ============================================

const broadcastsOps = {
  getAll() {
    try {
      const stmt = db.prepare('SELECT * FROM broadcasts ORDER BY created_at DESC');
      return stmt.all();
    } catch (e) {
      console.error('[DATABASE] broadcastsOps.getAll error:', e.message);
      return [];
    }
  },
  
  create(message, priority = 'normal') {
    try {
      const id = 'bcast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const stmt = db.prepare(`
        INSERT INTO broadcasts (id, message, from_user, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `);
      stmt.run(id, message, 'admin');
      return { id, message, from_user: 'admin', created_at: new Date().toISOString() };
    } catch (e) {
      console.error('[DATABASE] broadcastsOps.create error:', e.message);
      return null;
    }
  },
  
  delete(id) {
    try {
      const stmt = db.prepare('DELETE FROM broadcasts WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (e) {
      console.error('[DATABASE] broadcastsOps.delete error:', e.message);
      return false;
    }
  }
};

// ============================================
// Reports Operations
// ============================================

const reportsOps = {
  getAll(limit = 100) {
    try {
      const stmt = db.prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT ?');
      return stmt.all(limit);
    } catch (e) {
      console.error('[DATABASE] reportsOps.getAll error:', e.message);
      return [];
    }
  },
  
  create(data) {
    try {
      const id = 'rpt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const stmt = db.prepare(`
        INSERT INTO reports (id, type, description, location, lat, lng, district, subdistrict, ip_address, verified, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      stmt.run(
        id,
        data.type,
        data.description || '',
        data.location || '',
        data.lat || null,
        data.lng || null,
        data.district || '',
        data.subDistrict || '',
        data.ip || '',
        data.verified ? 1 : 0
      );
      return { 
        id, 
        ...data, 
        created_at: new Date().toISOString() 
      };
    } catch (e) {
      console.error('[DATABASE] reportsOps.create error:', e.message);
      return null;
    }
  },
  
  verify(id) {
    try {
      const stmt = db.prepare('UPDATE reports SET verified = 1 WHERE id = ?');
      const result = stmt.run(id);
      if (result.changes > 0) {
        const getStmt = db.prepare('SELECT * FROM reports WHERE id = ?');
        return getStmt.get(id);
      }
      return null;
    } catch (e) {
      console.error('[DATABASE] reportsOps.verify error:', e.message);
      return null;
    }
  },
  
  update(id, updates) {
    try {
      const fields = [];
      const values = [];
      
      if (updates.type !== undefined) { fields.push('type = ?'); values.push(updates.type); }
      if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
      if (updates.location !== undefined) { fields.push('location = ?'); values.push(updates.location); }
      if (updates.verified !== undefined) { fields.push('verified = ?'); values.push(updates.verified ? 1 : 0); }
      
      if (fields.length === 0) return null;
      
      values.push(id);
      const stmt = db.prepare(`UPDATE reports SET ${fields.join(', ')} WHERE id = ?`);
      const result = stmt.run(...values);
      
      if (result.changes > 0) {
        const getStmt = db.prepare('SELECT * FROM reports WHERE id = ?');
        return getStmt.get(id);
      }
      return null;
    } catch (e) {
      console.error('[DATABASE] reportsOps.update error:', e.message);
      return null;
    }
  },
  
  delete(id) {
    try {
      const stmt = db.prepare('DELETE FROM reports WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (e) {
      console.error('[DATABASE] reportsOps.delete error:', e.message);
      return false;
    }
  }
};

// ============================================
// App Logs Operations
// ============================================

const appLogsOps = {
  add(level, category, message, details = null, ip = null) {
    try {
      const stmt = db.prepare(`
        INSERT INTO app_logs (level, category, message, metadata, ip, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `);
      stmt.run(level, category, message, details ? JSON.stringify(details) : null, ip);
      return true;
    } catch (e) {
      console.error('[DATABASE] appLogsOps.add error:', e.message);
      return false;
    }
  },
  
  getAll(limit = 100) {
    try {
      const stmt = db.prepare('SELECT * FROM app_logs ORDER BY created_at DESC LIMIT ?');
      return stmt.all(limit);
    } catch (e) {
      console.error('[DATABASE] appLogsOps.getAll error:', e.message);
      return [];
    }
  },
  
  /**
   * Get logs with filtering options
   * @param {object} options - { level, category, limit }
   */
  getLogs(options = {}) {
    try {
      let query = 'SELECT * FROM app_logs WHERE 1=1';
      const params = [];
      
      if (options.level) {
        query += ' AND level = ?';
        params.push(options.level);
      }
      if (options.category) {
        query += ' AND category = ?';
        params.push(options.category);
      }
      
      query += ' ORDER BY created_at DESC';
      
      if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
      } else {
        query += ' LIMIT 100';
      }
      
      const stmt = db.prepare(query);
      return stmt.all(...params);
    } catch (e) {
      console.error('[DATABASE] appLogsOps.getLogs error:', e.message);
      return [];
    }
  },
  
  /**
   * Get log statistics
   */
  getStats() {
    try {
      const totalStmt = db.prepare('SELECT COUNT(*) as count FROM app_logs');
      const total = totalStmt.get().count;
      
      // Last hour stats
      const lastHourStmt = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN level = 'ERROR' THEN 1 ELSE 0 END) as errors,
          SUM(CASE WHEN level = 'SECURITY' THEN 1 ELSE 0 END) as security
        FROM app_logs 
        WHERE created_at > datetime('now', '-1 hour')
      `);
      const lastHour = lastHourStmt.get();
      
      // Last 24 hours stats
      const last24Stmt = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN level = 'ERROR' THEN 1 ELSE 0 END) as errors,
          SUM(CASE WHEN level = 'SECURITY' THEN 1 ELSE 0 END) as security
        FROM app_logs 
        WHERE created_at > datetime('now', '-24 hours')
      `);
      const last24Hours = last24Stmt.get();
      
      return {
        total,
        lastHour: {
          total: lastHour.total || 0,
          errors: lastHour.errors || 0,
          security: lastHour.security || 0
        },
        last24Hours: {
          total: last24Hours.total || 0,
          errors: last24Hours.errors || 0,
          security: last24Hours.security || 0
        }
      };
    } catch (e) {
      console.error('[DATABASE] appLogsOps.getStats error:', e.message);
      return {
        total: 0,
        lastHour: { total: 0, errors: 0, security: 0 },
        last24Hours: { total: 0, errors: 0, security: 0 }
      };
    }
  },
  
  /**
   * Clear all logs
   */
  clear() {
    try {
      const stmt = db.prepare('DELETE FROM app_logs');
      const result = stmt.run();
      console.log(`[DATABASE] Cleared ${result.changes} app logs`);
      return result.changes;
    } catch (e) {
      console.error('[DATABASE] appLogsOps.clear error:', e.message);
      return 0;
    }
  },
  
  deleteOlderThan(days) {
    try {
      const stmt = db.prepare(`DELETE FROM app_logs WHERE created_at < datetime('now', '-' || ? || ' days')`);
      return stmt.run(days).changes;
    } catch (e) {
      console.error('[DATABASE] appLogsOps.deleteOlderThan error:', e.message);
      return 0;
    }
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
  visitorsOps,
  auditOps,
  settingsOps,
  broadcastsOps,
  reportsOps,
  appLogsOps,
  startCleanupJob,
  stopCleanupJob
};
