/**
 * Crypto Utilities
 * 
 * Centralized cryptographic functions for security operations
 */

const crypto = require('crypto');

/**
 * Generate a cryptographically secure random token
 * @param {number} length - Length of the token in bytes (output will be hex, so 2x chars)
 * @returns {string} Hex-encoded random token
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a token using SHA256 for storage (e.g., in blacklist)
 * @param {string} token - The token to hash
 * @returns {string} SHA256 hash of the token
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a CSRF token
 * @returns {string} Random CSRF token
 */
function generateCSRFToken() {
  return generateSecureToken(32);
}

/**
 * Generate a secure request ID using crypto
 * @returns {string} UUID v4
 */
function generateRequestId() {
  return crypto.randomUUID();
}

/**
 * Timing-safe string comparison to prevent timing attacks
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} True if strings are equal
 */
function timingSafeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  // Convert to buffers for comparison
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  
  // If lengths differ, still compare to prevent timing leak
  if (bufA.length !== bufB.length) {
    // Compare bufA against itself to maintain constant time
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generate a secure session ID
 * @returns {string} Session ID
 */
function generateSessionId() {
  return `sess_${generateSecureToken(24)}`;
}

/**
 * Derive a key from a secret using PBKDF2
 * @param {string} secret - The secret to derive from
 * @param {string} salt - Salt for derivation
 * @param {number} iterations - Number of iterations
 * @returns {Promise<string>} Derived key as hex
 */
function deriveKey(secret, salt, iterations = 100000) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(secret, salt, iterations, 32, 'sha256', (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString('hex'));
    });
  });
}

module.exports = {
  generateSecureToken,
  hashToken,
  generateCSRFToken,
  generateRequestId,
  timingSafeCompare,
  generateSessionId,
  deriveKey
};
