const express = require('express');
const router = express.Router();
const { reportsOps } = require('../../services/database');

/**
 * GET /api/v1/reports
 * Get all reports
 */
router.get('/', (req, res) => {
  try {
    const { type, verified, limit } = req.query;
    
    const options = {};
    if (type) options.type = type;
    if (verified !== undefined) options.verified = verified === 'true';
    if (limit) options.limit = parseInt(limit, 10);
    
    const reports = reportsOps.getAll(options);
    
    // Map database format to API format
    const formattedReports = reports.map(r => ({
      id: r.id,
      type: r.type,
      lat: r.lat,
      lng: r.lng,
      location: r.location,
      description: r.description,
      time: r.created_at,
      verified: !!r.verified,
      severity: 'unknown',
      ip: r.ip_address,
      source: 'public',
      editedAt: r.updated_at
    }));
    
    res.json({
      success: true,
      count: formattedReports.length,
      reports: formattedReports
    });
  } catch (error) {
    console.error('[REPORTS] Get error:', error.message);
    res.status(500).json({ error: 'Failed to get reports' });
  }
});

/**
 * POST /api/v1/reports
 * Create anonymous report with IP capture
 */
router.post('/', (req, res) => {
  try {
    const { type, lat, lng, description, district, subdistrict, location } = req.body;
    
    if (!type) {
      return res.status(400).json({ error: 'Bad Request', message: 'Type required' });
    }

    // Location string construction
    let locationStr = location || '';
    if (!locationStr && lat && lng) {
      locationStr = `GPS: ${lat}, ${lng}`;
    } else if (!locationStr && district) {
      locationStr = `อ.${district} ${subdistrict ? 'ต.'+subdistrict : ''}`;
    }

    // Robust IP Capture
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                     req.socket?.remoteAddress || 
                     req.ip || 
                     req.body.ip || 
                     'unknown';
    
    const newReport = {
      id: `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type,
      lat: lat || null,
      lng: lng || null,
      location: locationStr,
      description: description || '',
      time: new Date().toISOString(),
      verified: false,
      ip: clientIP,
      district: district || null,
      subdistrict: subdistrict || null
    };
    
    reportsOps.create(newReport);
    console.log(`[REPORT] New report from ${clientIP}: ${type}`);
    
    res.status(201).json({
      success: true,
      message: 'Report created',
      report: newReport
    });
  } catch (error) {
    console.error('[REPORTS] Create error:', error.message);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

/**
 * PUT /api/v1/reports/:id/verify
 * Verify report (Admin)
 */
router.put('/:id/verify', (req, res) => {
  try {
    const { id } = req.params;
    const { verified } = req.body;
    
    const report = reportsOps.getById(id);
    if (!report) return res.status(404).json({ error: 'Not found' });
    
    reportsOps.update(id, { verified });
    
    res.json({ 
      success: true, 
      report: { ...report, verified }
    });
  } catch (error) {
    console.error('[REPORTS] Verify error:', error.message);
    res.status(500).json({ error: 'Failed to verify report' });
  }
});

/**
 * PUT /api/v1/reports/:id
 * Edit report (Admin)
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { type, description, location } = req.body;
    
    const report = reportsOps.getById(id);
    if (!report) return res.status(404).json({ error: 'Not found' });
    
    const updates = {};
    if (type) updates.type = type;
    if (description !== undefined) updates.description = description;
    if (location) updates.location = location;
    
    reportsOps.update(id, updates);
    
    console.log(`[REPORT] Edited report ${id}`);
    res.json({ 
      success: true, 
      report: { ...report, ...updates, editedAt: new Date().toISOString() }
    });
  } catch (error) {
    console.error('[REPORTS] Edit error:', error.message);
    res.status(500).json({ error: 'Failed to edit report' });
  }
});

/**
 * DELETE /api/v1/reports/:id
 * Delete report (Admin)
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = reportsOps.delete(id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    
    console.log(`[REPORT] Deleted report ${id}`);
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    console.error('[REPORTS] Delete error:', error.message);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

module.exports = router;
