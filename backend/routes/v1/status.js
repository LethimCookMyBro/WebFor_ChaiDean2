const express = require('express');
const router = express.Router();
const { THRESHOLDS, ZONES } = require('../../riskCalculator');
const { settingsOps, broadcastsOps, appLogsOps } = require('../../services/database');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

/**
 * GET /api/v1/status
 * System status and configuration info
 */
router.get('/', (req, res) => {
  const threatLevel = settingsOps.get('threat_level') || 'YELLOW';
  const threatMessage = settingsOps.get('threat_message') || '';
  const threatUpdatedAt = settingsOps.get('threat_updated_at') || null;
  
  res.json({
    status: 'operational',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    threatLevel,
    threatMessage,
    threatUpdatedAt,
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
// Threat Level Endpoints
// ============================================

/**
 * GET /api/v1/status/threat-level
 * Get current threat level
 */
router.get('/threat-level', (req, res) => {
  try {
    const level = settingsOps.get('threat_level') || 'YELLOW';
    const message = settingsOps.get('threat_message') || '';
    const updatedAt = settingsOps.get('threat_updated_at') || null;
    
    res.json({
      success: true,
      level,
      message,
      updatedAt
    });
  } catch (error) {
    console.error('[STATUS] Error getting threat level:', error.message);
    res.status(500).json({ error: 'Failed to get threat level' });
  }
});

/**
 * PUT /api/v1/status/threat-level
 * Update threat level (Admin only)
 */
router.put('/threat-level', requireAuth, requireAdmin, (req, res) => {
  try {
    const { level, message } = req.body;
    const clientIP = req.clientIp || req.ip;
    
    const validLevels = ['GREEN', 'YELLOW', 'ORANGE', 'RED'];
    if (!level || !validLevels.includes(level.toUpperCase())) {
      return res.status(400).json({ 
        error: 'Invalid threat level',
        validLevels 
      });
    }
    
    const upperLevel = level.toUpperCase();
    const updatedAt = new Date().toISOString();
    
    settingsOps.set('threat_level', upperLevel);
    settingsOps.set('threat_updated_at', updatedAt);
    
    if (message !== undefined) {
      settingsOps.set('threat_message', message || '');
    }
    
    // Log the change
    appLogsOps.add('INFO', 'ADMIN', `Threat level changed to ${upperLevel}`, {
      previousLevel: settingsOps.get('threat_level'),
      newLevel: upperLevel,
      message: message || null
    }, clientIP);
    
    res.json({
      success: true,
      level: upperLevel,
      message: settingsOps.get('threat_message') || '',
      updatedAt
    });
  } catch (error) {
    console.error('[STATUS] Error updating threat level:', error.message);
    res.status(500).json({ error: 'Failed to update threat level' });
  }
});

// ============================================
// Broadcasts Endpoints
// ============================================

/**
 * GET /api/v1/status/broadcasts
 * Get all broadcasts
 */
router.get('/broadcasts', (req, res) => {
  try {
    const broadcasts = broadcastsOps.getAll();
    res.json({
      success: true,
      count: broadcasts.length,
      broadcasts
    });
  } catch (error) {
    console.error('[STATUS] Error getting broadcasts:', error.message);
    res.status(500).json({ error: 'Failed to get broadcasts' });
  }
});

/**
 * POST /api/v1/status/broadcasts
 * Create a new broadcast (Admin only)
 */
router.post('/broadcasts', requireAuth, requireAdmin, (req, res) => {
  try {
    const { message, priority } = req.body;
    const clientIP = req.clientIp || req.ip;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const broadcast = broadcastsOps.create(message.trim(), priority || 'normal');
    
    // Log the action
    appLogsOps.add('INFO', 'ADMIN', `Broadcast created: ${message.substring(0, 50)}...`, {
      broadcastId: broadcast.id
    }, clientIP);
    
    res.status(201).json({
      success: true,
      broadcast
    });
  } catch (error) {
    console.error('[STATUS] Error creating broadcast:', error.message);
    res.status(500).json({ error: 'Failed to create broadcast' });
  }
});

/**
 * DELETE /api/v1/status/broadcasts/:id
 * Delete a broadcast (Admin only)
 */
router.delete('/broadcasts/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const clientIP = req.clientIp || req.ip;
    
    const deleted = broadcastsOps.delete(parseInt(id, 10));
    
    if (!deleted) {
      return res.status(404).json({ error: 'Broadcast not found' });
    }
    
    // Log the action
    appLogsOps.add('INFO', 'ADMIN', `Broadcast deleted: ID ${id}`, {}, clientIP);
    
    res.json({
      success: true,
      message: 'Broadcast deleted'
    });
  } catch (error) {
    console.error('[STATUS] Error deleting broadcast:', error.message);
    res.status(500).json({ error: 'Failed to delete broadcast' });
  }
});

module.exports = router;
