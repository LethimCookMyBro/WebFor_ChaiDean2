-- Border Safety Database Schema v2.0
-- SQLite Database for persistent storage

-- ============================================
-- Reports (Anonymous + IP)
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  location TEXT,
  lat REAL,
  lng REAL,
  province TEXT,
  district TEXT,
  subdistrict TEXT,
  description TEXT,
  ip_address TEXT,
  verified INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_reports_ip ON reports(ip_address);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);

-- ============================================
-- Audit Logs (Security & Admin Actions)
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_ip ON audit_logs(ip);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ============================================
-- Token Blacklist (Revoked JWTs)
-- ============================================
CREATE TABLE IF NOT EXISTS token_blacklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT UNIQUE NOT NULL,
  user_id TEXT,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_token_hash ON token_blacklist(token_hash);
CREATE INDEX IF NOT EXISTS idx_token_expires ON token_blacklist(expires_at);

-- ============================================
-- Blocked IPs (Persistent IP Blocking)
-- ============================================
CREATE TABLE IF NOT EXISTS blocked_ips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT UNIQUE NOT NULL,
  reason TEXT,
  blocked_by TEXT,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blocked_ip ON blocked_ips(ip);

-- ============================================
-- Login Attempts (Rate Limiting & Lockout)
-- ============================================
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL,
  attempts INTEGER DEFAULT 1,
  locked_until DATETIME,
  last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(identifier)
);

CREATE INDEX IF NOT EXISTS idx_login_identifier ON login_attempts(identifier);

-- ============================================
-- Broadcasts (Admin Messages)
-- ============================================
CREATE TABLE IF NOT EXISTS broadcasts (
  id TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  from_user TEXT DEFAULT 'admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Cleanup: Remove expired entries periodically
-- ============================================
-- Run this periodically:
-- DELETE FROM token_blacklist WHERE expires_at < datetime('now');
-- DELETE FROM blocked_ips WHERE expires_at IS NOT NULL AND expires_at < datetime('now');
-- DELETE FROM login_attempts WHERE locked_until IS NOT NULL AND locked_until < datetime('now');
