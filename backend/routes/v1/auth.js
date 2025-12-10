/**
 * Authentication Routes (Admin Only)
 * 
 * Endpoints:
 * - POST /admin/login - Admin login (username + password)
 * - POST /logout - Revoke tokens
 * - POST /refresh - Refresh access token
 */

const express = require('express');
const router = express.Router();
const {
  generateTokenPair,
  verifyRefreshToken,
  revokeToken,
  verifyPassword,
  requireAuth
} = require('../../middleware/auth');
const logger = require('../../services/logger');
const { loginAttemptsOps, appLogsOps } = require('../../services/database');

// ============================================
// Configuration
// ============================================

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// ============================================
// Account Lockout (Using Database)
// ============================================

function checkAccountLockout(identifier) {
  return loginAttemptsOps.isLocked(identifier);
}

function recordLoginAttempt(identifier, success) {
  if (success) {
    loginAttemptsOps.reset(identifier);
    return { locked: false, attemptsRemaining: MAX_LOGIN_ATTEMPTS };
  }
  
  const result = loginAttemptsOps.recordAttempt(identifier, MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MS);
  
  if (result.locked) {
    console.warn(`[SECURITY] Account locked: ${identifier} after ${MAX_LOGIN_ATTEMPTS} failed attempts`);
  }
  
  return result;
}

// ============================================
// Cookie Configuration
// ============================================

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Lax for dev, strict for prod
  path: '/'  // Changed from /api to / for broader scope
};

if (process.env.COOKIE_DOMAIN) {
  COOKIE_OPTIONS.domain = process.env.COOKIE_DOMAIN;
}

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 60 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTIONS, maxAge: 30 * 24 * 60 * 60 * 1000 });
}

function clearAuthCookies(res) {
  res.clearCookie('accessToken', COOKIE_OPTIONS);
  res.clearCookie('refreshToken', COOKIE_OPTIONS);
}

// ============================================
// Routes
// ============================================

/**
 * POST /api/v1/auth/admin/login
 * Admin login with username and password
 */
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const clientIP = req.clientIp || req.ip;
    const identifier = `admin:${username || 'unknown'}:${clientIP}`;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Bad Request', message: 'กรุณาใส่ชื่อผู้ใช้และรหัสผ่าน' });
    }
    
    // Check lockout
    const lockout = checkAccountLockout(identifier);
    if (lockout.locked) {
      const minutes = Math.ceil(lockout.remainingMs / 60000);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `บัญชีถูกล็อคชั่วคราว กรุณารอ ${minutes} นาที`
      });
    }
    
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    const expectedUsername = 'Superadmin';
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (username !== expectedUsername) {
      recordLoginAttempt(identifier, false);
      return res.status(401).json({ error: 'Unauthorized', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }
    
    // Security Checks - Always require ADMIN_PASSWORD_HASH
    if (!adminPasswordHash) {
      if (isProduction) {
        console.error('[SECURITY] ❌ CRITICAL: ADMIN_PASSWORD_HASH not set in production!');
        return res.status(503).json({ error: 'Service Unavailable', message: 'Admin auth config error' });
      } else {
        // Development: Generate a hash hint
        console.error('[SECURITY] ❌ ADMIN_PASSWORD_HASH not set!');
        console.error('[SECURITY] Generate one with: node -e "require(\'bcryptjs\').hash(\'your-password\', 12).then(console.log)"');
        return res.status(503).json({ 
          error: 'Service Unavailable', 
          message: 'ADMIN_PASSWORD_HASH not configured. Check server logs.' 
        });
      }
    }
    
    // Verify password using bcrypt only - no plaintext fallback
    const isValidPassword = await verifyPassword(password, adminPasswordHash);
    
    if (!isValidPassword) {
      const result = recordLoginAttempt(identifier, false);
      
      // Log failed login attempt
      appLogsOps.add('SECURITY', 'AUTH', `เข้าสู่ระบบล้มเหลว: ${username}`, {
        username,
        attemptsRemaining: result.attemptsRemaining,
        locked: result.locked
      }, clientIP);
      
      if (result.locked) {
        appLogsOps.add('SECURITY', 'AUTH', `บัญชีถูกล็อค: ${username}`, { username }, clientIP);
        return res.status(429).json({ error: 'Too Many Requests', message: 'บัญชีถูกล็อคชั่วคราว' });
      }
      return res.status(401).json({ error: 'Unauthorized', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }
    
    // Success
    const tokens = generateTokenPair('admin', { role: 'admin', username });
    recordLoginAttempt(identifier, true);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    
    // Log successful login
    appLogsOps.add('SECURITY', 'AUTH', `Admin เข้าสู่ระบบสำเร็จ: ${username}`, {
      username,
      role: 'admin'
    }, clientIP);
    
    console.log(`[SECURITY] Admin login success: ${username} from ${clientIP}`);
    
    res.json({
      success: true,
      message: 'เข้าสู่ระบบ Admin สำเร็จ',
      admin: { username, role: 'admin' },
      expiresIn: tokens.expiresIn
    });
    
  } catch (error) {
    console.error('[AUTH] Admin login error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/v1/auth/logout
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const token = req.token;
    const decoded = req.user;
    const expiresAt = new Date(decoded.exp * 1000);
    await revokeToken(token, decoded.userId, expiresAt);
    
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      // Best effort revoke
      try {
          const refreshDecoded = require('../../middleware/auth').verifyRefreshToken(refreshToken);
          if (refreshDecoded) {
             const refreshExpiry = new Date(refreshDecoded.exp * 1000);
             await revokeToken(refreshToken, decoded.userId, refreshExpiry);
          }
      } catch (e) {}
    }
    
    clearAuthCookies(res);
    console.log(`[SECURITY] Logout: ${decoded.userId}`);
    res.json({ success: true, message: 'ออกจากระบบสำเร็จ' });
  } catch (error) {
    console.error('[AUTH] Logout error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/v1/auth/refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) return res.status(401).json({ error: 'Unauthorized' });
    
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { isTokenRevoked } = require('../../middleware/auth');
    if (await isTokenRevoked(refreshToken)) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const tokens = generateTokenPair(decoded.userId, { role: decoded.role });
    const refreshExpiry = new Date(decoded.exp * 1000);
    await revokeToken(refreshToken, decoded.userId, refreshExpiry);
    
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    res.json({ success: true, expiresIn: tokens.expiresIn });
  } catch (error) {
    console.error('[AUTH] Refresh error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
