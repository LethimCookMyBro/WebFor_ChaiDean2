const express = require('express');
const router = express.Router();
const geoEngine = require('../../services/geoEngine');

/**
 * POST /api/v1/geo/reverse
 * Reverse geocode: lat/lng → จังหวัด/อำเภอ/ตำบล
 */
router.post('/reverse', (req, res) => {
  const { lat, lng } = req.body;
  
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'กรุณาระบุ lat และ lng'
    });
  }
  
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  
  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'lat และ lng ต้องเป็นตัวเลข'
    });
  }
  
  const result = geoEngine.reverseGeocode(latitude, longitude);
  
  res.json({
    success: true,
    ...result
  });
});

/**
 * POST /api/v1/geo/assess
 * ประเมินความเสี่ยงจากตำแหน่ง
 */
router.post('/assess', (req, res) => {
  const { lat, lng } = req.body;
  
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'กรุณาระบุ lat และ lng'
    });
  }
  
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  
  const result = geoEngine.getAreaSummary(latitude, longitude);
  
  res.json({
    success: true,
    ...result
  });
});

/**
 * POST /api/v1/geo/distance
 * คำนวณระยะห่างจากชายแดน
 */
router.post('/distance', (req, res) => {
  const { lat, lng } = req.body;
  
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'กรุณาระบุ lat และ lng'
    });
  }
  
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  
  const result = geoEngine.distanceToBorder(latitude, longitude);
  
  res.json({
    success: true,
    ...result
  });
});

/**
 * POST /api/v1/geo/evacuation
 * แนะนำเส้นทางอพยพ
 */
router.post('/evacuation', (req, res) => {
  const { lat, lng } = req.body;
  
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'กรุณาระบุ lat และ lng'
    });
  }
  
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  
  const result = geoEngine.recommendEvacuationRoute(latitude, longitude);
  
  res.json({
    success: true,
    ...result
  });
});

/**
 * GET /api/v1/geo/provinces
 * รายชื่อจังหวัดชายแดน
 */
router.get('/provinces', (req, res) => {
  const provinces = Object.entries(geoEngine.PROVINCES).map(([name, data]) => ({
    name,
    nameEn: data.nameEn,
    code: data.code,
    centroid: data.centroid
  }));
  
  res.json({
    success: true,
    count: provinces.length,
    provinces
  });
});

/**
 * GET /api/v1/geo/districts
 * รายชื่ออำเภอชายแดน
 */
router.get('/districts', (req, res) => {
  const { province } = req.query;
  
  let districts = Object.entries(geoEngine.BORDER_DISTRICTS).map(([name, data]) => ({
    name,
    ...data
  }));
  
  if (province) {
    districts = districts.filter(d => d.province === province);
  }
  
  res.json({
    success: true,
    count: districts.length,
    districts
  });
});

/**
 * GET /api/v1/geo/subdistricts
 * รายชื่อตำบลเสี่ยงสูง
 */
router.get('/subdistricts', (req, res) => {
  const { district, riskLevel } = req.query;
  
  let subdistricts = Object.entries(geoEngine.BORDER_SUBDISTRICTS).map(([name, data]) => ({
    name,
    ...data
  }));
  
  if (district) {
    subdistricts = subdistricts.filter(s => s.district === district);
  }
  
  if (riskLevel) {
    subdistricts = subdistricts.filter(s => s.riskLevel === riskLevel);
  }
  
  res.json({
    success: true,
    count: subdistricts.length,
    subdistricts
  });
});

/**
 * GET /api/v1/geo/crossings
 * จุดผ่านแดน
 */
router.get('/crossings', (req, res) => {
  const crossings = Object.entries(geoEngine.BORDER_CROSSINGS).map(([name, data]) => ({
    name,
    ...data
  }));
  
  res.json({
    success: true,
    count: crossings.length,
    crossings
  });
});

module.exports = router;
