const express = require('express');
const router = express.Router();
const { THRESHOLDS, ZONES } = require('../../riskCalculator');
const { settingsOps, broadcastsOps } = require('../../services/database');

/**
 * GET /api/v1/status
 * System status and configuration info
 */
router.get('/', (req, res) => {
  const threatLevel = settingsOps.get('threat_level') || 'YELLOW';
  
  res.json({
    status: 'operational',
    version: '1.0.0',
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
// Threat Level API (persistent)
// ============================================

/**
 * GET /api/v1/status/threat-level
 * Get current threat level
 */
router.get('/threat-level', (req, res) => {
  try {
    const level = settingsOps.get('threat_level') || 'YELLOW';
    res.json({
      success: true,
      level,
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
    
    settingsOps.set('threat_level', level);
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
    
    res.json({ success: true, message: 'Broadcast deleted' });
  } catch (error) {
    console.error('[STATUS] Delete broadcast error:', error.message);
    res.status(500).json({ error: 'Failed to delete broadcast' });
  }
});

module.exports = router;
