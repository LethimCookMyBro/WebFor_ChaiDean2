const express = require('express');
const router = express.Router();
const { validateCoordinates } = require('../../middleware/security');

// In-memory store for global SOS alerts (for Admin Dashboard)
// This is separate from family alerts
const globalSosAlerts = [];

/**
 * POST /api/v1/sos
 * Trigger a global SOS alert
 */
router.post('/', (req, res) => {
  try {
    const { 
      userId, userName, phone, district, 
      lat, lng, location,
      message, time 
    } = req.body;
    
    // Create alert object
    const newAlert = {
      id: `sos_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId: userId || 'anonymous',
      userName: userName || 'ผู้ใช้ทั่วไป',
      phone: phone || null,
      district: district || null,
      lat: lat || null,
      lng: lng || null,
      location: location || 'ไม่ทราบตำแหน่ง',
      message: message || 'ต้องการความช่วยเหลือด่วน!',
      time: time || new Date().toISOString(),
      resolved: false,
      createdAt: new Date()
    };
    
    // Add to start of list
    globalSosAlerts.unshift(newAlert);
    
    // Keep list size manageable (e.g., 100 alerts)
    if (globalSosAlerts.length > 100) {
      globalSosAlerts.length = 100;
    }
    
    console.log(`[SOS] New Global Alert: ${newAlert.userName} (${newAlert.phone}) at ${newAlert.location}`);
    
    res.status(201).json({
      success: true,
      message: 'ส่งสัญญาณ SOS แล้ว',
      alert: newAlert
    });
  } catch (error) {
    console.error('[SOS] Error creating alert:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/v1/sos
 * Get all global SOS alerts (for Admin)
 */
router.get('/', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const resolved = req.query.resolved; // 'true', 'false', or undefined
    
    let filtered = globalSosAlerts;
    
    if (resolved !== undefined) {
      const isResolved = resolved === 'true';
      filtered = filtered.filter(a => a.resolved === isResolved);
    }
    
    res.json({
      success: true,
      alerts: filtered.slice(0, limit),
      count: filtered.length
    });
  } catch (error) {
    console.error('[SOS] Error fetching alerts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * PUT /api/v1/sos/:id/resolve
 * Mark alert as resolved
 */
router.put('/:id/resolve', (req, res) => {
  try {
    const { id } = req.params;
    const alert = globalSosAlerts.find(a => a.id === id);
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();
    
    res.json({
      success: true,
      message: 'ปิดการแจ้งเตือนแล้ว',
      alert
    });
  } catch (error) {
    console.error('[SOS] Error resolving alert:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * DELETE /api/v1/sos/:id
 * Delete alert
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const index = globalSosAlerts.findIndex(a => a.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    globalSosAlerts.splice(index, 1);
    
    res.json({
      success: true,
      message: 'ลบการแจ้งเตือนแล้ว'
    });
  } catch (error) {
    console.error('[SOS] Error deleting alert:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
