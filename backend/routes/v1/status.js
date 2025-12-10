const express = require('express');
const router = express.Router();
const { THRESHOLDS, ZONES } = require('../../riskCalculator');
const { settingsOps, broadcastsOps, appLogsOps } = require('../../services/database');
const cache = require('../../services/cache');

// Cache keys
const CACHE_KEYS = {
  THREAT_LEVEL: 'status:threat_level',
  BROADCASTS: 'status:broadcasts'
};

/**
 * GET /api/v1/status
 * System status and configuration info
 */
router.get('/', (req, res) => {
  // Use cached threat level if available
  let threatLevel = cache.get(CACHE_KEYS.THREAT_LEVEL);
  if (!threatLevel) {
    threatLevel = settingsOps.get('threat_level') || 'YELLOW';
    cache.set(CACHE_KEYS.THREAT_LEVEL, threatLevel, 30);
  }
  
  res.json({
    status: 'operational',
    version: '2.5.0',
    timestamp: new Date().toISOString(),
    threatLevel,
    config: {
      thresholds: {
        high_danger_km: THRESHOLDS.HIGH_DANGER,
        bm21_range_km: THRESHOLDS.BM21_MAX,
        phl03_range_km: THRESHOLDS.PHL03_MAX
      },
      monitored_provinces: [
        'Buriram',
        'Surin',
        'Sisaket',
        'Ubon Ratchathani',
        'Sa Kaeo',
        'Chanthaburi',
        'Trat'
      ],
      zones: Object.values(ZONES)
    },
    disclaimer: 'This is an approximate risk model. Always follow official civil defence guidance.'
  });
});

// ============================================
// Threat Level API (persistent + cached)
// ============================================

/**
 * GET /api/v1/status/threat-level
 * Get current threat level (cached for 30s)
 */
router.get('/threat-level', (req, res) => {
  try {
    // Try cache first
    let level = cache.get(CACHE_KEYS.THREAT_LEVEL);
    if (!level) {
      level = settingsOps.get('threat_level') || 'YELLOW';
      cache.set(CACHE_KEYS.THREAT_LEVEL, level, 30); // Cache for 30 seconds
    }
    
    res.json({
      success: true,
      level,
      cached: !!cache.get(CACHE_KEYS.THREAT_LEVEL),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[STATUS] Get threat level error:', error.message);
    res.status(500).json({ error: 'Failed to get threat level' });
  }
});

/**
 * PUT /api/v1/status/threat-level
 * Update threat level (Admin only in production)
 */
router.put('/threat-level', (req, res) => {
  try {
    const { level } = req.body;
    const validLevels = ['GREEN', 'YELLOW', 'ORANGE', 'RED'];
    
    if (!level || !validLevels.includes(level)) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: `Level must be one of: ${validLevels.join(', ')}` 
      });
    }
    
    const oldLevel = settingsOps.get('threat_level') || 'YELLOW';
    settingsOps.set('threat_level', level);
    
    // Invalidate cache on write
    cache.invalidate(CACHE_KEYS.THREAT_LEVEL);
    
    // Log to database
    appLogsOps.add('SECURITY', 'SYSTEM', `ระดับภัยคุกคามเปลี่ยน: ${oldLevel} → ${level}`, {
      oldLevel,
      newLevel: level
    }, req.clientIp || req.ip);
    
    console.log(`[STATUS] Threat level changed to ${level}`);
    
    res.json({
      success: true,
      level,
      message: `Threat level updated to ${level}`
    });
  } catch (error) {
    console.error('[STATUS] Update threat level error:', error.message);
    res.status(500).json({ error: 'Failed to update threat level' });
  }
});

// ============================================
// Broadcasts API (persistent)
// ============================================

/**
 * GET /api/v1/status/broadcasts
 * Get all broadcasts
 */
router.get('/broadcasts', (req, res) => {
  try {
    const broadcasts = broadcastsOps.getAll(100);
    
    // Map to API format
    const formattedBroadcasts = broadcasts.map(b => ({
      id: b.id,
      message: b.message,
      time: b.created_at,
      from: b.from_user
    }));
    
    res.json({
      success: true,
      count: formattedBroadcasts.length,
      broadcasts: formattedBroadcasts
    });
  } catch (error) {
    console.error('[STATUS] Get broadcasts error:', error.message);
    res.status(500).json({ error: 'Failed to get broadcasts' });
  }
});

/**
 * POST /api/v1/status/broadcasts
 * Create a new broadcast
 */
router.post('/broadcasts', (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'Broadcast message is required' 
      });
    }
    
    const broadcast = {
      id: `bc_${Date.now()}`,
      message: message.trim(),
      time: new Date().toISOString(),
      from: 'admin'
    };
    
    broadcastsOps.create(broadcast);
    
    // Log to database
    appLogsOps.add('INFO', 'BROADCAST', `ประกาศใหม่: ${message.trim().substring(0, 50)}...`, {
      broadcastId: broadcast.id,
      messagePreview: message.trim().substring(0, 100)
    }, req.clientIp || req.ip);
    
    console.log(`[BROADCAST] New broadcast: ${message.substring(0, 50)}...`);
    
    res.status(201).json({
      success: true,
      broadcast
    });
  } catch (error) {
    console.error('[STATUS] Create broadcast error:', error.message);
    res.status(500).json({ error: 'Failed to create broadcast' });
  }
});

/**
 * DELETE /api/v1/status/broadcasts/:id
 * Delete a broadcast
 */
router.delete('/broadcasts/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = broadcastsOps.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Not Found' });
    }
    
    // Log to database
    appLogsOps.add('WARN', 'BROADCAST', `ลบประกาศ: ${id}`, {
      broadcastId: id
    }, req.clientIp || req.ip);
    
    res.json({ success: true, message: 'Broadcast deleted' });
  } catch (error) {
    console.error('[STATUS] Delete broadcast error:', error.message);
    res.status(500).json({ error: 'Failed to delete broadcast' });
  }
});

module.exports = router;
