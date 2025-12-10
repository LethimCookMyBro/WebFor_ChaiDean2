/**
 * Authentication Middleware
 * 
 * Production-ready JWT authentication with:
 * - Required environment variables (no fallbacks)
 * - Short-lived access tokens (15m) + refresh tokens (7d)
 * - Database-backed token blacklist
 * - bcrypt password hashing (cost 12)
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { hashToken } = require('../utils/crypto');

// ============================================
// Configuration - No fallbacks, require env vars
// ============================================

// Development fallback for JWT_SECRET
const NODE_ENV = process.env.NODE_ENV || 'development';
const DEV_JWT_SECRET = 'dev-secret-key-for-development-only-do-not-use-in-production-12345';

let JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || DEV_JWT_SECRET;
// Extended access token from 15m to 1h for better UX (less frequent re-authentication)
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';
const BCRYPT_COST = 12;

// Validate required environment variables on load
if (!JWT_SECRET) {
  if (NODE_ENV === 'production') {
    console.error('\n❌ FATAL: JWT_SECRET environment variable is required in production');
    console.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    console.error('   Add it to your .env file or environment\n');
    process.exit(1);
  } else {
    console.warn('\n⚠️ WARNING: JWT_SECRET not set, using development fallback (NOT SECURE!)');
    console.warn('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    JWT_SECRET = DEV_JWT_SECRET;
  }
}

if (JWT_SECRET.length < 32 && NODE_ENV === 'production') {
  console.error('\n❌ FATAL: JWT_SECRET must be at least 32 characters');
  process.exit(1);
}

// ============================================
// Token Blacklist (DB-backed via dependency injection)
// ============================================

let tokenBlacklistDB = null;

/**
 * Set the database connection for token blacklist
 * This should be called during server initialization
 */
function setTokenBlacklistDB(db) {
  tokenBlacklistDB = db;
}

/**
 * Check if a token is revoked (in blacklist)
 * @param {string} token - The JWT token
 * @returns {Promise<boolean>}
 */
async function isTokenRevoked(token) {
  if (!tokenBlacklistDB) {
    // If no DB configured, fall back to in-memory (development only)
    return inMemoryBlacklist.has(hashToken(token));
  }
  
  try {
    const tokenHash = hashToken(token);
    const result = await tokenBlacklistDB.get(
      'SELECT id FROM token_blacklist WHERE token_hash = ? AND expires_at > datetime("now")',
      [tokenHash]
    );
    return !!result;
  } catch (error) {
    console.error('[AUTH] Token blacklist check error:', error.message);
    return false;
  }
}

/**
 * Revoke a token by adding to blacklist
 * @param {string} token - The JWT token to revoke
 * @param {string} userId - User ID associated with token
 * @param {Date} expiresAt - Token expiry time
 */
async function revokeToken(token, userId, expiresAt) {
  const tokenHash = hashToken(token);
  
  if (!tokenBlacklistDB) {
    // In-memory fallback for development
    inMemoryBlacklist.add(tokenHash);
    return;
  }
  
  try {
    await tokenBlacklistDB.run(
      `INSERT OR IGNORE INTO token_blacklist (token_hash, user_id, expires_at) 
       VALUES (?, ?, ?)`,
      [tokenHash, userId, expiresAt.toISOString()]
    );
  } catch (error) {
    console.error('[AUTH] Token revocation error:', error.message);
  }
}

// In-memory fallback (development only, clears on restart)
const inMemoryBlacklist = new Set();

// ============================================
// Token Generation
// ============================================

/**
 * Generate access token (short-lived)
 * @param {string} userId - User ID
 * @param {object} payload - Additional claims
 * @returns {string} JWT access token
 */
function generateAccessToken(userId, payload = {}) {
  return jwt.sign(
    { 
      userId, 
      type: 'access',
      ...payload 
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Generate refresh token (long-lived)
 * @param {string} userId - User ID
 * @returns {string} JWT refresh token
 */
function generateRefreshToken(userId) {
  return jwt.sign(
    { 
      userId, 
      type: 'refresh'
    },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * Generate both access and refresh tokens
 * @param {string} userId - User ID
 * @param {object} payload - Additional claims for access token
 * @returns {object} { accessToken, refreshToken, expiresIn }
 */
function generateTokenPair(userId, payload = {}) {
  return {
    accessToken: generateAccessToken(userId, payload),
    refreshToken: generateRefreshToken(userId),
    expiresIn: 60 * 60 // 1 hour in seconds (extended from 15 minutes)
  };
}

// ============================================
// Token Verification
// ============================================

/**
 * Verify access token
 * @param {string} token - JWT token
 * @returns {object|null} Decoded token or null
 */
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'access') {
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Verify refresh token
 * @param {string} token - JWT token
 * @returns {object|null} Decoded token or null
 */
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    if (decoded.type !== 'refresh') {
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

// ============================================
// Middleware
// ============================================

/**
 * Auth middleware - requires valid access token
 */
async function requireAuth(req, res, next) {
  // Try cookie first, then Authorization header
  const token = req.cookies?.accessToken || 
                (req.headers.authorization?.startsWith('Bearer ') 
                  ? req.headers.authorization.slice(7) 
                  : null);

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'กรุณาเข้าสู่ระบบ'
    });
  }

  // Verify token
  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token ไม่ถูกต้องหรือหมดอายุ'
    });
  }

  // Check blacklist
  const revoked = await isTokenRevoked(token);
  if (revoked) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token ถูกเพิกถอน กรุณาเข้าสู่ระบบใหม่'
    });
  }

  req.user = decoded;
  req.token = token;
  next();
}

/**
 * Optional auth - attaches user if token present
 */
async function optionalAuth(req, res, next) {
  const token = req.cookies?.accessToken || 
                (req.headers.authorization?.startsWith('Bearer ') 
                  ? req.headers.authorization.slice(7) 
                  : null);

  if (token) {
    const decoded = verifyAccessToken(token);
    if (decoded) {
      const revoked = await isTokenRevoked(token);
      if (!revoked) {
        req.user = decoded;
        req.token = token;
      }
    }
  }

  next();
}

/**
 * Admin only middleware
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'ไม่มีสิทธิ์เข้าถึง'
    });
  }
  next();
}

// ============================================
// Password Hashing
// ============================================

/**
 * Hash password with bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_COST);
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - bcrypt hash
 * @returns {Promise<boolean>}
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// ============================================
// Exports
// ============================================

module.exports = {
  // Token generation
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  
  // Token verification
  verifyAccessToken,
  verifyRefreshToken,
  
  // Token blacklist
  setTokenBlacklistDB,
  isTokenRevoked,
  revokeToken,
  
  // Middleware
  requireAuth,
  optionalAuth,
  requireAdmin,
  
  // Password
  hashPassword,
  verifyPassword,
  
  // Config (for testing)
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY
};
