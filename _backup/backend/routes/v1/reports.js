const express = require('express');
const router = express.Router();
const geoEngine = require('../../services/geoEngine');

// In-memory storage for reports (use database in production)
const reports = [];

// Initial demo reports with real locations
const initReports = () => {
  if (reports.length === 0) {
    reports.push(
      {
        id: 'rpt_001',
        type: 'explosion',
        location: 'ต.ภูผาหมอก อ.กันทรลักษ์',
        lat: 14.3833,
        lng: 104.8000,
        province: 'ศรีสะเกษ',
        time: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 min ago
        verified: true,
        severity: 'high',
        description: 'เสียงระเบิดดังหลายครั้ง',
        source: 'อสม.ภาคประชาชน'
      },
      {
        id: 'rpt_002',
        type: 'roadblock',
        location: 'ทางหลวง 2248 กม.12',
        lat: 14.4167,
        lng: 104.7500,
        province: 'ศรีสะเกษ',
        time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        verified: true,
        severity: 'medium',
        description: 'ถนนปิดโดยเจ้าหน้าที่',
        source: 'กรมทางหลวง'
      },
      {
        id: 'rpt_003',
        type: 'evacuation',
        location: 'วัดป่าศรีมงคล อ.ขุนหาญ',
        lat: 14.4500,
        lng: 104.7667,
        province: 'ศรีสะเกษ',
        time: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
        verified: true,
        severity: 'info',
        description: 'จุดอพยพเปิดรับประชาชน',
        source: 'ปภ.'
      },
      {
        id: 'rpt_004',
        type: 'gunfire',
        location: 'บ.แนงมุด ต.แนงมุด',
        lat: 14.2333,
        lng: 103.5667,
        province: 'สุรินทร์',
        time: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20 min ago
        verified: false,
        severity: 'high',
        description: 'รายงานเสียงปืน รอการยืนยัน',
        source: 'ประชาชน'
      }
    );
  }
};

initReports();

/**
 * GET /api/v1/reports
 * ดึงรายงานทั้งหมด พร้อม filter
 * Now supports userId filter for data separation
 */
router.get('/', (req, res) => {
  const { province, type, verified, hours, userId } = req.query;
  
  let filteredReports = [...reports];
  
  // Filter by userId (for data separation - show only user's own reports)
  if (userId) {
    filteredReports = filteredReports.filter(r => r.userId === userId);
  }
  
  // Filter by province
  if (province) {
    filteredReports = filteredReports.filter(r => r.province === province);
  }
  
  // Filter by type
  if (type) {
    filteredReports = filteredReports.filter(r => r.type === type);
  }
  
  // Filter by verified status
  if (verified !== undefined) {
    const isVerified = verified === 'true';
    filteredReports = filteredReports.filter(r => r.verified === isVerified);
  }
  
  // Filter by time (last N hours)
  if (hours) {
    const hoursAgo = parseInt(hours);
    const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    filteredReports = filteredReports.filter(r => new Date(r.time) >= cutoff);
  }
  
  // Sort by time (newest first)
  filteredReports.sort((a, b) => new Date(b.time) - new Date(a.time));
  
  // Format time for display
  const formattedReports = filteredReports.map(r => ({
    ...r,
    timeFormatted: new Date(r.time).toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    timeAgo: getTimeAgo(r.time)
  }));
  
  res.json({
    success: true,
    count: formattedReports.length,
    reports: formattedReports
  });
});

/**
 * GET /api/v1/reports/nearby
 * ดึงรายงานใกล้ตำแหน่งที่กำหนด
 */
router.get('/nearby', (req, res) => {
  const { lat, lng, radius = 50 } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'กรุณาระบุ lat และ lng'
    });
  }
  
  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const radiusKm = parseFloat(radius);
  
  const nearbyReports = reports.filter(r => {
    if (!r.lat || !r.lng) return false;
    const distance = geoEngine.haversineDistance(userLat, userLng, r.lat, r.lng);
    return distance <= radiusKm;
  }).map(r => ({
    ...r,
    distance: Math.round(geoEngine.haversineDistance(userLat, userLng, r.lat, r.lng) * 10) / 10,
    timeFormatted: new Date(r.time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    timeAgo: getTimeAgo(r.time)
  })).sort((a, b) => a.distance - b.distance);
  
  res.json({
    success: true,
    count: nearbyReports.length,
    radius: radiusKm,
    reports: nearbyReports
  });
});

/**
 * POST /api/v1/reports
 * สร้างรายงานใหม่ (จากประชาชน)
 * Now includes userId for data separation
 */
router.post('/', (req, res) => {
  const { type, lat, lng, description, source, userId, userName, userPhone, userDistrict } = req.body;
  
  if (!type || !lat || !lng) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'กรุณาระบุ type, lat, lng'
    });
  }
  
  // Reverse geocode to get location name
  const locationInfo = geoEngine.reverseGeocode(parseFloat(lat), parseFloat(lng));
  
  const locationStr = locationInfo.subdistrict 
    ? `ต.${locationInfo.subdistrict.name} อ.${locationInfo.district?.name || ''}`
    : locationInfo.district 
      ? `อ.${locationInfo.district.name}`
      : locationInfo.province?.name || 'ไม่ทราบ';
  
  const newReport = {
    id: `rpt_${Date.now()}`,
    type,
    location: locationStr,
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    province: locationInfo.province?.name || null,
    district: locationInfo.district?.name || null,
    subdistrict: locationInfo.subdistrict?.name || null,
    time: new Date().toISOString(),
    verified: false, // ต้องรอการยืนยัน
    severity: 'unknown',
    description: description || null,
    source: source || 'ประชาชน',
    // User data for separation - ผูกข้อมูลกับผู้ใช้
    userId: userId || null,
    userName: userName || null,
    userPhone: userPhone || null,
    userDistrict: userDistrict || null
  };
  
  reports.unshift(newReport); // เพิ่มที่หัว array
  
  res.status(201).json({
    success: true,
    message: 'รายงานถูกสร้างแล้ว รอการตรวจสอบ',
    report: {
      ...newReport,
      timeFormatted: new Date(newReport.time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    }
  });
});

/**
 * GET /api/v1/reports/stats
 * สถิติรายงาน
 */
router.get('/stats', (req, res) => {
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const reportsLast24h = reports.filter(r => new Date(r.time) >= last24h);
  
  const stats = {
    total: reports.length,
    last24h: reportsLast24h.length,
    verified: reports.filter(r => r.verified).length,
    unverified: reports.filter(r => !r.verified).length,
    byType: {},
    byProvince: {}
  };
  
  reports.forEach(r => {
    stats.byType[r.type] = (stats.byType[r.type] || 0) + 1;
    if (r.province) {
      stats.byProvince[r.province] = (stats.byProvince[r.province] || 0) + 1;
    }
  });
  
  res.json({
    success: true,
    stats
  });
});

function getTimeAgo(time) {
  const now = new Date();
  const then = new Date(time);
  const diff = Math.floor((now - then) / 1000);
  
  if (diff < 60) return 'เมื่อสักครู่';
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีก่อน`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงก่อน`;
  return `${Math.floor(diff / 86400)} วันก่อน`;
}

module.exports = router;
