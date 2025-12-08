/**
 * Authentication Routes
 * 
 * Endpoints:
 * - POST /login - User login (phone-based)
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
  hashPassword,
  verifyPassword,
  requireAuth
} = require('../../middleware/auth');
const { timingSafeCompare, generateSecureToken } = require('../../utils/crypto');

// ============================================
// Configuration
// ============================================

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_HISTORY_COUNT = 5;

// In-memory login attempts tracking (use DB in production for persistence)
const loginAttempts = new Map();

// Common passwords list (subset - in production, use larger list or API)
const COMMON_PASSWORDS = new Set([
  'password1234', 'qwerty123456', 'admin1234567',
  '123456789012', 'password12345', 'letmein12345'
]);

// ============================================
// Password Policy Validation
// ============================================

/**
 * Validate password against security policy
 * @param {string} password - Password to validate
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validatePasswordPolicy(password) {
  const errors = [];
  
  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['รหัสผ่านไม่ถูกต้อง'] };
  }
  
  // Minimum length
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`รหัสผ่านต้องมีอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร`);
  }
  
  // Uppercase
  if (!/[A-Z]/.test(password)) {
    errors.push('ต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว');
  }
  
  // Lowercase
  if (!/[a-z]/.test(password)) {
    errors.push('ต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว');
  }
  
  // Number
  if (!/[0-9]/.test(password)) {
    errors.push('ต้องมีตัวเลขอย่างน้อย 1 ตัว');
  }
  
  // Special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('ต้องมีอักขระพิเศษอย่างน้อย 1 ตัว (!@#$%^&*...)');
  }
  
  // Common password check
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('รหัสผ่านนี้เป็นรหัสที่ใช้บ่อยเกินไป กรุณาเลือกรหัสอื่น');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================
// Account Lockout
// ============================================

/**
 * Check if account is locked
 * @param {string} identifier - Username, phone, or IP
 * @returns {object} { locked: boolean, remainingMs: number }
 */
function checkAccountLockout(identifier) {
  const record = loginAttempts.get(identifier);
  
  if (!record) {
    return { locked: false, remainingMs: 0 };
  }
  
  const now = Date.now();
  
  // Check if lockout period has passed
  if (record.lockedUntil && now < record.lockedUntil) {
    return {
      locked: true,
      remainingMs: record.lockedUntil - now
    };
  }
  
  // Reset if lockout expired
  if (record.lockedUntil && now >= record.lockedUntil) {
    loginAttempts.delete(identifier);
    return { locked: false, remainingMs: 0 };
  }
  
  return { locked: false, remainingMs: 0 };
}

/**
 * Record login attempt
 * @param {string} identifier - Username, phone, or IP
 * @param {boolean} success - Whether login was successful
 * @returns {object} { locked: boolean, attemptsRemaining: number }
 */
function recordLoginAttempt(identifier, success) {
  if (success) {
    loginAttempts.delete(identifier);
    return { locked: false, attemptsRemaining: MAX_LOGIN_ATTEMPTS };
  }
  
  const record = loginAttempts.get(identifier) || { attempts: 0 };
  record.attempts += 1;
  record.lastAttempt = Date.now();
  
  if (record.attempts >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    loginAttempts.set(identifier, record);
    
    // Log security event
    console.warn(`[SECURITY] Account locked: ${identifier} after ${MAX_LOGIN_ATTEMPTS} failed attempts`);
    
    return {
      locked: true,
      attemptsRemaining: 0
    };
  }
  
  loginAttempts.set(identifier, record);
  
  return {
    locked: false,
    attemptsRemaining: MAX_LOGIN_ATTEMPTS - record.attempts
  };
}

// ============================================
// Cookie Configuration
// ============================================

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api'
};

if (process.env.COOKIE_DOMAIN) {
  COOKIE_OPTIONS.domain = process.env.COOKIE_DOMAIN;
}

/**
 * Set auth cookies on response
 */
function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie('accessToken', accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000 // 15 minutes
  });
  
  res.cookie('refreshToken', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

/**
 * Clear auth cookies
 */
function clearAuthCookies(res) {
  res.clearCookie('accessToken', COOKIE_OPTIONS);
  res.clearCookie('refreshToken', COOKIE_OPTIONS);
}

// ============================================
// Routes
// ============================================

/**
 * POST /api/v1/auth/login
 * User login with phone number
 */
router.post('/login', async (req, res) => {
  try {
    const { phone } = req.body;
    const clientIP = req.clientIp || req.ip;
    
    // Input validation
    if (!phone || typeof phone !== 'string' || phone.length !== 10) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'กรุณาใส่เบอร์โทร 10 หลัก'
      });
    }
    
    // Check lockout
    const lockout = checkAccountLockout(phone);
    if (lockout.locked) {
      const minutes = Math.ceil(lockout.remainingMs / 60000);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `บัญชีถูกล็อคชั่วคราว กรุณารอ ${minutes} นาที`
      });
    }
    
    // TODO: In production, verify phone against database
    // For now, simulate phone-based login
    // This should check allUsers in actual implementation
    
    const mockUserId = `user_${phone}`;
    
    // Generate tokens
    const tokens = generateTokenPair(mockUserId, { phone });
    
    // Record successful login
    recordLoginAttempt(phone, true);
    
    // Set cookies
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    
    res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      user: {
        id: mockUserId,
        phone
      },
      expiresIn: tokens.expiresIn
    });
    
  } catch (error) {
    console.error('[AUTH] Login error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'เกิดข้อผิดพลาด กรุณาลองใหม่'
    });
  }
});

/**
 * POST /api/v1/auth/admin/login
 * Admin login with username and password
 */
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const clientIP = req.clientIp || req.ip;
    const identifier = `admin:${username || 'unknown'}:${clientIP}`;
    
    // Input validation
    if (!username || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'กรุณาใส่ชื่อผู้ใช้และรหัสผ่าน'
      });
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
    
    // Validate against environment variable (hashed password)
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    const expectedUsername = 'Superadmin'; // Could also be from env
    
    // Check username
    if (username !== expectedUsername) {
      recordLoginAttempt(identifier, false);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
      });
    }
    
    // Check password
    let isValidPassword = false;
    if (adminPasswordHash) {
      isValidPassword = await verifyPassword(password, adminPasswordHash);
    } else {
      // Development fallback - REMOVE IN PRODUCTION
      console.warn('[AUTH] WARNING: ADMIN_PASSWORD_HASH not set, using development fallback');
      isValidPassword = password === 'DevAdmin2024!@#';
    }
    
    if (!isValidPassword) {
      const result = recordLoginAttempt(identifier, false);
      
      if (result.locked) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'บัญชีถูกล็อคชั่วคราว กรุณารอ 15 นาที'
        });
      }
      
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
      });
    }
    
    // Success - generate tokens
    const tokens = generateTokenPair('admin', { role: 'admin', username });
    
    // Record successful login
    recordLoginAttempt(identifier, true);
    
    // Set cookies
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    
    // Log security event
    console.log(`[SECURITY] Admin login success: ${username} from ${clientIP}`);
    
    res.json({
      success: true,
      message: 'เข้าสู่ระบบ Admin สำเร็จ',
      admin: {
        username,
        role: 'admin'
      },
      expiresIn: tokens.expiresIn
    });
    
  } catch (error) {
    console.error('[AUTH] Admin login error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'เกิดข้อผิดพลาด กรุณาลองใหม่'
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * Revoke tokens and clear cookies
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const token = req.token;
    const decoded = req.user;
    
    // Calculate token expiry
    const expiresAt = new Date(decoded.exp * 1000);
    
    // Revoke token (add to blacklist)
    await revokeToken(token, decoded.userId, expiresAt);
    
    // Also revoke refresh token if present
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      const refreshDecoded = require('../../middleware/auth').verifyRefreshToken(refreshToken);
      if (refreshDecoded) {
        const refreshExpiry = new Date(refreshDecoded.exp * 1000);
        await revokeToken(refreshToken, decoded.userId, refreshExpiry);
      }
    }
    
    // Clear cookies
    clearAuthCookies(res);
    
    // Log security event
    console.log(`[SECURITY] User logout: ${decoded.userId}`);
    
    res.json({
      success: true,
      message: 'ออกจากระบบสำเร็จ'
    });
    
  } catch (error) {
    console.error('[AUTH] Logout error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'เกิดข้อผิดพลาด กรุณาลองใหม่'
    });
  }
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Refresh token ไม่พบ'
      });
    }
    
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      clearAuthCookies(res);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Refresh token ไม่ถูกต้องหรือหมดอายุ'
      });
    }
    
    // Check if refresh token is revoked
    const { isTokenRevoked } = require('../../middleware/auth');
    const revoked = await isTokenRevoked(refreshToken);
    if (revoked) {
      clearAuthCookies(res);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token ถูกเพิกถอน กรุณาเข้าสู่ระบบใหม่'
      });
    }
    
    // Generate new token pair
    const tokens = generateTokenPair(decoded.userId, { role: decoded.role });
    
    // Revoke old refresh token
    const refreshExpiry = new Date(decoded.exp * 1000);
    await revokeToken(refreshToken, decoded.userId, refreshExpiry);
    
    // Set new cookies
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    
    res.json({
      success: true,
      message: 'Token รีเฟรชสำเร็จ',
      expiresIn: tokens.expiresIn
    });
    
  } catch (error) {
    console.error('[AUTH] Refresh error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'เกิดข้อผิดพลาด กรุณาลองใหม่'
    });
  }
});

/**
 * POST /api/v1/auth/validate-password
 * Validate password against policy (utility endpoint)
 */
router.post('/validate-password', (req, res) => {
  const { password } = req.body;
  const result = validatePasswordPolicy(password);
  
  res.json({
    valid: result.valid,
    errors: result.errors
  });
});

module.exports = router;
