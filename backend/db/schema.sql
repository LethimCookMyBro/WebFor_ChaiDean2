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
-- System Settings (Threat Level, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Initialize default threat level
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('threat_level', 'YELLOW');

-- ============================================
-- Application Logs (For Admin Dashboard)
-- ============================================
CREATE TABLE IF NOT EXISTS app_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT,
  ip TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_app_logs_level ON app_logs(level);
CREATE INDEX IF NOT EXISTS idx_app_logs_category ON app_logs(category);
CREATE INDEX IF NOT EXISTS idx_app_logs_created ON app_logs(created_at DESC);

-- ============================================
-- Cleanup: Remove expired entries periodically
-- ============================================
-- Run this periodically:
-- DELETE FROM token_blacklist WHERE expires_at < datetime('now');
-- DELETE FROM blocked_ips WHERE expires_at IS NOT NULL AND expires_at < datetime('now');
-- DELETE FROM login_attempts WHERE locked_until IS NOT NULL AND locked_until < datetime('now');
-- DELETE FROM app_logs WHERE created_at < datetime('now', '-30 days');

-- ============================================
-- Visitors (Online Users Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS visitors (
  ip TEXT PRIMARY KEY,
  user_agent TEXT,
  visits INTEGER DEFAULT 1,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON visitors(last_seen DESC);
