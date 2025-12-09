const express = require('express');
const router = express.Router();
const geoEngine = require('../../services/geoEngine');

// In-memory reports (DB in production)
const reports = [];

// Init some data (optional)
const initReports = () => {
  if (reports.length === 0) {
     // Keeping existing mock data or clearing is fine. Let's keep a few for admin to see.
     reports.push({
        id: 'rpt_001',
        type: 'explosion',
        location: 'ต.ภูผาหมอก อ.กันทรลักษ์',
        lat: 14.3833,
        lng: 104.8000,
        time: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        verified: true,
        ip: '192.168.1.1'
     });
  }
};
initReports();

/**
 * GET /api/v1/reports
 * Get all reports
 */
router.get('/', (req, res) => {
  const { province, type, verified, hours } = req.query;
  
  let filtered = [...reports];
  
  if (type) filtered = filtered.filter(r => r.type === type);
  if (verified !== undefined) filtered = filtered.filter(r => r.verified === (verified === 'true'));
  // if (province) ... 

  filtered.sort((a, b) => new Date(b.time) - new Date(a.time));
  
  res.json({
    success: true,
    count: filtered.length,
    reports: filtered
  });
});

/**
 * POST /api/v1/reports
 * Create anonymous report with IP capture
 */
router.post('/', (req, res) => {
  const { type, lat, lng, description, district, subdistrict, location } = req.body;
  
  if (!type) {
    return res.status(400).json({ error: 'Bad Request', message: 'Type required' });
  }

  // Capture IP
  const clientIP = req.clientIp || req.ip || 'unknown';
  
  // Location string construction
  let locationStr = location || '';
  if (!locationStr && lat && lng) {
      locationStr = `GPS: ${lat}, ${lng}`;
      // In real app, reverse geocode here
  } else if (!locationStr && district) {
      locationStr = `อ.${district} ${subdistrict ? 'ต.'+subdistrict : ''}`;
  }

  const newReport = {
    id: `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    type,
    lat: lat || null,
    lng: lng || null,
    location: locationStr,
    description: description || '',
    time: new Date().toISOString(),
    verified: false,
    severity: 'unknown',
    ip: clientIP, // Stored for admin
    source: 'public'
  };
  
  reports.unshift(newReport);
  console.log(`[REPORT] New report from ${clientIP}: ${type}`);
  
  res.status(201).json({
    success: true,
    message: 'Report created',
    report: newReport
  });
});

/**
 * PUT /api/v1/reports/:id/verify
 * Verify report (Admin)
 */
router.put('/:id/verify', (req, res) => {
   const { id } = req.params;
   const { verified } = req.body;
   
   const report = reports.find(r => r.id === id);
   if (!report) return res.status(404).json({ error: 'Not found' });
   
   report.verified = verified;
   res.json({ success: true, report });
});

/**
 * DELETE /api/v1/reports/:id
 * Delete report (Admin)
 */
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const idx = reports.findIndex(r => r.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    
    reports.splice(idx, 1);
    res.json({ success: true, message: 'Deleted' });
});

module.exports = router;
