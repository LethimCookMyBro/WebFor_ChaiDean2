/**
 * Authentication Middleware
 * 
 * Simple JWT-based authentication for API routes
 * Note: This is a basic implementation. For production, use a proper auth library.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'border-safety-dev-secret-change-in-production';
const TOKEN_EXPIRY = '7d';

/**
 * Generate JWT token
 */
function generateToken(userId, payload = {}) {
  return jwt.sign(
    { userId, ...payload },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Auth middleware - requires valid token
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'กรุณาเข้าสู่ระบบ (No token provided)'
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token ไม่ถูกต้องหรือหมดอายุ'
    });
  }

  // Attach user info to request
  req.user = decoded;
  next();
}

/**
 * Optional auth middleware - attaches user if token present
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
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
      message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)'
    });
  }
  next();
}

/**
 * Hash password (simple bcrypt wrapper)
 */
async function hashPassword(password) {
  // In production, use: const bcrypt = require('bcryptjs');
  // return bcrypt.hash(password, 10);
  
  // Stub for demo
  console.log('[AUTH] Would hash password');
  return `hashed_${password}`;
}

/**
 * Verify password
 */
async function verifyPassword(password, hash) {
  // In production, use: const bcrypt = require('bcryptjs');
  // return bcrypt.compare(password, hash);
  
  // Stub for demo
  return hash === `hashed_${password}`;
}

module.exports = {
  generateToken,
  verifyToken,
  requireAuth,
  optionalAuth,
  requireAdmin,
  hashPassword,
  verifyPassword
};
