const express = require('express');
const router = express.Router();
const { THRESHOLDS, ZONES } = require('../../riskCalculator');

/**
 * GET /api/v1/status
 * System status and configuration info
 */
router.get('/', (req, res) => {
  res.json({
    status: 'operational',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
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

module.exports = router;
