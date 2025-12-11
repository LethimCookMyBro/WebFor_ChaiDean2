const express = require('express');
const router = express.Router();
const { reportsOps, appLogsOps } = require('../../services/database');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

/**
 * GET /api/v1/reports
 * Get all reports
 */
router.get('/', (req, res) => {
  try {
    const { type, verified, limit } = req.query;
    
    let reports = reportsOps.getAll(parseInt(limit, 10) || 100);
    
    // Filter by type if specified
    if (type) {
      reports = reports.filter(r => r.type === type);
    }
    
    // Filter by verified status if specified  
    // SQLite stores verified as INTEGER (0 or 1), not boolean
    if (verified !== undefined) {
      const wantVerified = verified === 'true' || verified === '1';
      reports = reports.filter(r => (r.verified === 1) === wantVerified);
    }
    
    res.json({
      success: true,
      count: reports.length,
      reports
    });
  } catch (error) {
    console.error('[REPORTS] Error getting reports:', error.message);
    res.status(500).json({ error: 'Failed to get reports' });
  }
});

/**
 * POST /api/v1/reports
 * Create a new report
 */
router.post('/', (req, res) => {
  try {
    const { type, description, location, lat, lng, district, subDistrict } = req.body;
    const clientIP = req.clientIp || req.ip;
    
    if (!type) {
      return res.status(400).json({ error: 'Report type is required' });
    }
    
    const report = reportsOps.create({
      type,
      description: description || '',
      location: location || '',
      lat: lat || null,
      lng: lng || null,
      district: district || '',
      subDistrict: subDistrict || '',
      ip: clientIP,
      verified: false
    });
    
    // Log the report
    appLogsOps.add('INFO', 'REPORT', `New report: ${type}`, {
      reportId: report.id,
      location: location || 'Unknown'
    }, clientIP);
    
    res.status(201).json({
      success: true,
      report
    });
  } catch (error) {
    console.error('[REPORTS] Error creating report:', error.message);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

/**
 * PUT /api/v1/reports/:id/verify
 * Verify a report (Admin only)
 */
router.put('/:id/verify', requireAuth, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const clientIP = req.clientIp || req.ip;
    
    const report = reportsOps.verify(id);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    appLogsOps.add('INFO', 'ADMIN', `Report verified: ID ${id}`, {}, clientIP);
    
    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('[REPORTS] Error verifying report:', error.message);
    res.status(500).json({ error: 'Failed to verify report' });
  }
});

/**
 * PUT /api/v1/reports/:id
 * Edit a report (Admin only)
 */
router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const clientIP = req.clientIp || req.ip;
    
    const report = reportsOps.update(id, updates);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    appLogsOps.add('INFO', 'ADMIN', `Report edited: ID ${id}`, { updates }, clientIP);
    
    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('[REPORTS] Error updating report:', error.message);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

/**
 * DELETE /api/v1/reports/:id
 * Delete a report (Admin only)
 */
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const clientIP = req.clientIp || req.ip;
    
    const deleted = reportsOps.delete(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    appLogsOps.add('INFO', 'ADMIN', `Report deleted: ID ${id}`, {}, clientIP);
    
    res.json({
      success: true,
      message: 'Report deleted'
    });
  } catch (error) {
    console.error('[REPORTS] Error deleting report:', error.message);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

/**
 * DELETE /api/v1/reports/bulk
 * Bulk delete reports (Admin only)
 */
router.delete('/bulk', requireAuth, requireAdmin, (req, res) => {
  try {
    const { ids } = req.body;
    const clientIP = req.clientIp || req.ip;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Array of IDs is required' });
    }
    
    let deletedCount = 0;
    for (const id of ids) {
      if (reportsOps.delete(id)) {
        deletedCount++;
      }
    }
    
    appLogsOps.add('INFO', 'ADMIN', `Bulk deleted ${deletedCount} reports`, { ids }, clientIP);
    
    res.json({
      success: true,
      deletedCount
    });
  } catch (error) {
    console.error('[REPORTS] Error bulk deleting reports:', error.message);
    res.status(500).json({ error: 'Failed to delete reports' });
  }
});

module.exports = router;
