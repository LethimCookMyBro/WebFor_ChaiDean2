-- Border Safety Database Schema
-- Refactored: No Auth, No SOS, IP-based Reporting

-- Reports table (Anonymous + IP)
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admin Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  admin_username TEXT,
  ip TEXT,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
