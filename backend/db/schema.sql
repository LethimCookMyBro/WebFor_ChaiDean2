-- Border Safety Database Schema
-- Compatible with SQLite

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  password_hash TEXT,
  device_token TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Family groups
CREATE TABLE IF NOT EXISTS family_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_by TEXT NOT NULL,
  invite_code TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Family group members (many-to-many)
CREATE TABLE IF NOT EXISTS family_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK(role IN ('admin', 'member')),
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES family_groups(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(group_id, user_id)
);

-- User status
CREATE TABLE IF NOT EXISTS user_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('safe', 'danger', 'unknown', 'evacuating')),
  latitude REAL,
  longitude REAL,
  accuracy REAL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- SOS Alerts
CREATE TABLE IF NOT EXISTS sos_alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  message TEXT,
  acknowledged_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Crowd reports
CREATE TABLE IF NOT EXISTS crowd_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  report_type TEXT NOT NULL CHECK(report_type IN ('explosion', 'gunfire', 'roadblock', 'evacuation', 'military', 'other')),
  location TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  description TEXT,
  verified INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Notification log
CREATE TABLE IF NOT EXISTS notification_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_id TEXT,
  recipient_id TEXT,
  channel TEXT NOT NULL CHECK(channel IN ('line', 'sms', 'push', 'email')),
  status TEXT NOT NULL,
  response TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (alert_id) REFERENCES sos_alerts(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_status_user ON user_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_status_updated ON user_status(updated_at);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_user ON sos_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_created ON sos_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_crowd_reports_type ON crowd_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_crowd_reports_created ON crowd_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_family_members_group ON family_members(group_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);
