/**
 * Risk Calculator - IMPROVED VERSION v2.0
 * 
 * การปรับปรุงหลัก:
 * ✅ 1. ความแม่นยำสูง (6 ทศนิยม = 0.1 เมตร)
 * ✅ 2. GPS Accuracy Validation - บอกผู้ใช้ถ้า GPS ไม่แม่น
 * ✅ 3. Nearest Border Point - แสดงจุดชายแดนที่ใกล้สุด
 * ✅ 4. Direction/Bearing - ทิศทางไปยังชายแดน
 * ✅ 5. Confidence Level - % ความเชื่อมั่น
 * ✅ 6. Multi-segment Border Line - ชายแดนหลายส่วน
 * ✅ 7. Better Error Handling
 */

const turf = require('@turf/turf');
const fs = require('fs');
const path = require('path');

// ============================================
// CONSTANTS
// ============================================

/**
 * ระยะอันตรายของอาวุธ (กิโลเมตร)
 */
const THRESHOLDS = {
  CRITICAL: 10,       // วิกฤต - ควรอพยพทันที
  HIGH_DANGER: 20,    // อันตรายสูง - เตรียมพร้อมอพยพ
  BM21_MAX: 52,       // BM-21 Grad ระยะสูงสุด
  PHL03_MAX: 130,     // PHL-03 ระยะสูงสุด
  EXTENDED: 160       // ระยะขยาย (บางรุ่น)
};

/**
 * ประเภทโซนความเสี่ยง
 */
const ZONES = {
  CRITICAL: 'critical',
  HIGH_DANGER: 'high_danger',
  BM21_RANGE: 'bm21_range',
  PHL03_RANGE: 'phl03_range',
  EXTENDED_RANGE: 'extended_range',
  SAFE: 'safe',
  OUT_OF_SCOPE: 'out_of_scope',
  INVALID_INPUT: 'invalid_input',
  LOW_GPS_ACCURACY: 'low_gps_accuracy'
};

/**
 * เกณฑ์ความแม่นยำ GPS (เมตร)
 */
const GPS_ACCURACY_LEVELS = {
  EXCELLENT: 5,      // GPS คุณภาพสูง
  GOOD: 15,          // ดี
  ACCEPTABLE: 50,    // ยอมรับได้
  POOR: 100,         // แย่ - ควรเตือน
  UNRELIABLE: 500    // ใช้ไม่ได้ - ต้องให้ลองใหม่
};

/**
 * Thailand Bounding Box (ตรวจสอบว่าอยู่ในประเทศไทย)
 */
const THAILAND_BBOX = {
  minLat: 5.5,
  maxLat: 20.5,
  minLon: 97.0,
  maxLon: 106.0
};

/**
 * ทิศทาง (ภาษาไทย)
 */
const COMPASS_TH = {
  'N': 'เหนือ',
  'NE': 'ตะวันออกเฉียงเหนือ',
  'E': 'ตะวันออก',
  'SE': 'ตะวันออกเฉียงใต้',
  'S': 'ใต้',
  'SW': 'ตะวันตกเฉียงใต้',
  'W': 'ตะวันตก',
  'NW': 'ตะวันตกเฉียงเหนือ'
};

// ============================================
// DATA LOADING
// ============================================

let borderProvinces = null;
let borderLine = null;

/**
 * โหลดข้อมูล GeoJSON
 */
function loadGeoJSONData() {
  try {
    const provincesPath = path.join(__dirname, 'data', 'border_provinces.geojson');
    const borderPath = path.join(__dirname, 'data', 'border_line.geojson');
    
    if (fs.existsSync(provincesPath)) {
      borderProvinces = JSON.parse(fs.readFileSync(provincesPath, 'utf-8'));
      console.log('[RISK] ✅ Loaded border provinces GeoJSON');
    } else {
      console.warn('[RISK] ⚠️ border_provinces.geojson not found, using fallback');
      borderProvinces = createFallbackProvinces();
    }
    
    if (fs.existsSync(borderPath)) {
      borderLine = JSON.parse(fs.readFileSync(borderPath, 'utf-8'));
      console.log('[RISK] ✅ Loaded border line GeoJSON');
    } else {
      console.warn('[RISK] ⚠️ border_line.geojson not found, using fallback');
      borderLine = createFallbackBorderLine();
    }
    
    return true;
  } catch (error) {
    console.error('[RISK] ❌ Error loading GeoJSON:', error.message);
    borderProvinces = createFallbackProvinces();
    borderLine = createFallbackBorderLine();
    return false;
  }
}

/**
 * สร้างข้อมูลจังหวัดชายแดน (Fallback)
 */
function createFallbackProvinces() {
  return {
    type: 'FeatureCollection',
    features: [
      createProvinceFeature('ตราด', 'Trat', '23', [[102.0,11.7],[103.0,11.7],[103.0,12.8],[102.0,12.8],[102.0,11.7]]),
      createProvinceFeature('จันทบุรี', 'Chanthaburi', '22', [[101.7,12.3],[102.8,12.3],[102.8,13.5],[101.7,13.5],[101.7,12.3]]),
      createProvinceFeature('สระแก้ว', 'Sa Kaeo', '27', [[102.0,13.4],[102.8,13.4],[102.8,14.3],[102.0,14.3],[102.0,13.4]]),
      createProvinceFeature('บุรีรัมย์', 'Buriram', '31', [[102.5,14.2],[103.6,14.2],[103.6,15.2],[102.5,15.2],[102.5,14.2]]),
      createProvinceFeature('สุรินทร์', 'Surin', '32', [[103.2,14.0],[104.2,14.0],[104.2,15.3],[103.2,15.3],[103.2,14.0]]),
      createProvinceFeature('ศรีสะเกษ', 'Si Sa Ket', '33', [[104.0,14.2],[105.0,14.2],[105.0,15.5],[104.0,15.5],[104.0,14.2]]),
      createProvinceFeature('อุบลราชธานี', 'Ubon Ratchathani', '34', [[104.5,14.5],[105.6,14.5],[105.6,16.0],[104.5,16.0],[104.5,14.5]])
    ]
  };
}

function createProvinceFeature(nameTh, nameEn, code, coords) {
  return {
    type: 'Feature',
    properties: { name_th: nameTh, name_en: nameEn, province_code: code },
    geometry: { type: 'Polygon', coordinates: [coords] }
  };
}

/**
 * สร้างเส้นชายแดน (Fallback) - Thai-Cambodia Border
 * เส้นละเอียด โดยเฉพาะบริเวณ บ่อไร่/ชำราก
 */
function createFallbackBorderLine() {
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: { name: 'Thai-Cambodia Border' },
      geometry: {
        type: 'MultiLineString',
        coordinates: [
          // ======================================
          // ตราด: หาดเล็ก + คลองใหญ่
          // ======================================
          [
            [102.912, 11.545], [102.910, 11.580], [102.908, 11.620],
            [102.906, 11.660], [102.906, 11.678], [102.905, 11.700],
            [102.898, 11.730], [102.892, 11.760], [102.885, 11.790],
            [102.878, 11.820], [102.872, 11.850], [102.865, 11.880],
            [102.858, 11.910], [102.852, 11.940], [102.845, 11.970]
          ],
          // ======================================
          // ⚠️ บ่อไร่ + ชำราก (ใกล้ฐานกัมพูชา!)
          // ======================================
          [
            [102.840, 12.000], [102.835, 12.020], [102.830, 12.040],
            [102.825, 12.060], [102.820, 12.080], [102.815, 12.100],
            [102.810, 12.115], [102.805, 12.130], [102.800, 12.145],
            [102.795, 12.160], [102.790, 12.175], [102.785, 12.200],
            [102.778, 12.230], [102.770, 12.260], [102.762, 12.290],
            [102.755, 12.320]
          ],
          // ======================================
          // เขาสมิง + ต่อ จ.จันทบุรี
          // ======================================
          [
            [102.748, 12.350], [102.740, 12.380], [102.732, 12.410],
            [102.724, 12.440], [102.716, 12.470], [102.708, 12.500],
            [102.700, 12.530], [102.690, 12.560], [102.680, 12.590],
            [102.670, 12.620], [102.660, 12.650], [102.650, 12.680],
            [102.640, 12.710]
          ],
          // ======================================
          // สระแก้ว
          // ======================================
          [
            [102.630, 12.750], [102.620, 12.800], [102.610, 12.850],
            [102.600, 12.900], [102.580, 13.000], [102.570, 13.100],
            [102.560, 13.200], [102.570, 13.300], [102.590, 13.400]
          ],
          // ======================================
          // บุรีรัมย์ + สุรินทร์
          // ======================================
          [
            [102.650, 13.500], [102.750, 13.600], [102.900, 13.700],
            [103.100, 13.800], [103.400, 13.900], [103.600, 14.000],
            [103.900, 14.100], [104.200, 14.200]
          ],
          // ======================================
          // ศรีสะเกษ + อุบลราชธานี
          // ======================================
          [
            [104.500, 14.300], [104.800, 14.400], [105.000, 14.500],
            [105.200, 14.600]
          ]
        ]
      }
    }]
  };
}

// Initialize data on load
loadGeoJSONData();

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * ตรวจสอบพิกัด (Strict validation)
 */
function validateCoordinates(lat, lon) {
  const errors = [];
  const warnings = [];
  
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    errors.push('พิกัดต้องเป็นตัวเลข');
    return { valid: false, errors, warnings };
  }
  
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    errors.push('พิกัดไม่ถูกต้อง');
    return { valid: false, errors, warnings };
  }
  
  if (lat < -90 || lat > 90) {
    errors.push(`Latitude ${lat} ไม่ถูกต้อง (ต้องอยู่ระหว่าง -90 ถึง 90)`);
  }
  if (lon < -180 || lon > 180) {
    errors.push(`Longitude ${lon} ไม่ถูกต้อง (ต้องอยู่ระหว่าง -180 ถึง 180)`);
  }
  
  if (lat < THAILAND_BBOX.minLat || lat > THAILAND_BBOX.maxLat ||
      lon < THAILAND_BBOX.minLon || lon > THAILAND_BBOX.maxLon) {
    warnings.push('ตำแหน่งอาจอยู่นอกประเทศไทย');
  }
  
  return { valid: errors.length === 0, errors, warnings };
}

/**
 * ประเมินความแม่นยำ GPS
 */
function evaluateGPSAccuracy(accuracy) {
  if (accuracy === undefined || accuracy === null) {
    return {
      level: 'unknown',
      acceptable: true,
      confidence: 70,
      message_th: 'ไม่ทราบความแม่นยำ GPS',
      message_en: 'GPS accuracy unknown',
      color: '#6B7280'
    };
  }
  
  if (typeof accuracy !== 'number' || accuracy < 0 || !Number.isFinite(accuracy)) {
    return {
      level: 'invalid',
      acceptable: false,
      confidence: 0,
      message_th: 'ค่าความแม่นยำไม่ถูกต้อง',
      message_en: 'Invalid accuracy value',
      color: '#DC2626'
    };
  }
  
  if (accuracy <= GPS_ACCURACY_LEVELS.EXCELLENT) {
    return {
      level: 'excellent', acceptable: true, confidence: 98, accuracy_m: accuracy,
      message_th: 'GPS แม่นยำมาก', message_en: 'Excellent GPS accuracy', color: '#16A34A'
    };
  }
  
  if (accuracy <= GPS_ACCURACY_LEVELS.GOOD) {
    return {
      level: 'good', acceptable: true, confidence: 92, accuracy_m: accuracy,
      message_th: 'GPS แม่นยำดี', message_en: 'Good GPS accuracy', color: '#22C55E'
    };
  }
  
  if (accuracy <= GPS_ACCURACY_LEVELS.ACCEPTABLE) {
    return {
      level: 'acceptable', acceptable: true, confidence: 80, accuracy_m: accuracy,
      message_th: 'GPS ยอมรับได้', message_en: 'Acceptable GPS accuracy', color: '#EAB308'
    };
  }
  
  if (accuracy <= GPS_ACCURACY_LEVELS.POOR) {
    return {
      level: 'poor', acceptable: true, confidence: 60, accuracy_m: accuracy,
      message_th: '⚠️ GPS ไม่แม่นยำนัก ระยะทางอาจคลาดเคลื่อน',
      message_en: 'Poor GPS accuracy - distance may be inaccurate', color: '#F97316'
    };
  }
  
  return {
    level: 'unreliable', acceptable: false, confidence: 30, accuracy_m: accuracy,
    message_th: '❌ GPS ไม่แม่นยำ กรุณาเปิด GPS ในที่โล่งแล้วลองใหม่',
    message_en: 'GPS unreliable - please enable GPS in open area', color: '#DC2626'
  };
}

// ============================================
// CORE CALCULATION FUNCTIONS
// ============================================

/**
 * คำนวณระยะทางไปยังชายแดน (High Precision)
 */
function calculateDistanceToBorder(lat, lon) {
  const point = turf.point([lon, lat]);
  
  let minDistance = Infinity;
  let nearestPoint = null;
  let segmentIndex = -1;
  
  const geometry = borderLine.features[0].geometry;
  const lineStrings = geometry.type === 'MultiLineString' 
    ? geometry.coordinates 
    : [geometry.coordinates];
  
  for (let i = 0; i < lineStrings.length; i++) {
    try {
      const line = turf.lineString(lineStrings[i]);
      const snapped = turf.nearestPointOnLine(line, point, { units: 'kilometers' });
      
      if (snapped.properties.dist < minDistance) {
        minDistance = snapped.properties.dist;
        nearestPoint = snapped.geometry.coordinates;
        segmentIndex = i;
      }
    } catch (e) {
      console.warn(`[RISK] Error processing segment ${i}:`, e.message);
    }
  }
  
  let bearing = null;
  let compassDirection = null;
  
  if (nearestPoint) {
    bearing = turf.bearing(point, turf.point(nearestPoint));
    compassDirection = bearingToCompass(bearing);
  }
  
  // High precision (6 decimal places = ~0.1m accuracy)
  const distance_km = Math.round(minDistance * 1000000) / 1000000;
  const distance_m = Math.round(minDistance * 1000);
  
  return {
    distance_km,
    distance_m,
    distance_display: formatDistanceDisplay(distance_km),
    nearest_point: nearestPoint ? {
      lat: Math.round(nearestPoint[1] * 1000000) / 1000000,
      lon: Math.round(nearestPoint[0] * 1000000) / 1000000
    } : null,
    bearing: bearing !== null ? Math.round(bearing * 10) / 10 : null,
    direction: compassDirection,
    direction_th: compassDirection ? COMPASS_TH[compassDirection] : null,
    segment_index: segmentIndex
  };
}

function bearingToCompass(bearing) {
  if (bearing === null) return null;
  const normalized = ((bearing % 360) + 360) % 360;
  
  if (normalized >= 337.5 || normalized < 22.5) return 'N';
  if (normalized >= 22.5 && normalized < 67.5) return 'NE';
  if (normalized >= 67.5 && normalized < 112.5) return 'E';
  if (normalized >= 112.5 && normalized < 157.5) return 'SE';
  if (normalized >= 157.5 && normalized < 202.5) return 'S';
  if (normalized >= 202.5 && normalized < 247.5) return 'SW';
  if (normalized >= 247.5 && normalized < 292.5) return 'W';
  return 'NW';
}

function formatDistanceDisplay(distance_km) {
  if (distance_km < 1) return `${Math.round(distance_km * 1000)} เมตร`;
  if (distance_km < 10) return `${distance_km.toFixed(2)} กม.`;
  if (distance_km < 100) return `${distance_km.toFixed(1)} กม.`;
  return `${Math.round(distance_km)} กม.`;
}

/**
 * ตรวจสอบว่าอยู่ในจังหวัดชายแดนหรือไม่
 */
function checkProvinceContainment(lat, lon) {
  const point = turf.point([lon, lat]);
  
  for (const feature of borderProvinces.features) {
    try {
      const polygon = feature.geometry.type === 'MultiPolygon'
        ? turf.multiPolygon(feature.geometry.coordinates)
        : turf.polygon(feature.geometry.coordinates);
      
      if (turf.booleanPointInPolygon(point, polygon)) {
        return {
          name_th: feature.properties.name_th,
          name_en: feature.properties.name_en,
          province_code: feature.properties.province_code
        };
      }
    } catch (e) {
      console.warn(`[RISK] Province check error:`, e.message);
    }
  }
  
  return null;
}

/**
 * จำแนกโซนความเสี่ยง
 */
function classifyZone(distance_km) {
  if (distance_km < THRESHOLDS.CRITICAL) return ZONES.CRITICAL;
  if (distance_km < THRESHOLDS.HIGH_DANGER) return ZONES.HIGH_DANGER;
  if (distance_km <= THRESHOLDS.BM21_MAX) return ZONES.BM21_RANGE;
  if (distance_km <= THRESHOLDS.PHL03_MAX) return ZONES.PHL03_RANGE;
  if (distance_km <= THRESHOLDS.EXTENDED) return ZONES.EXTENDED_RANGE;
  return ZONES.SAFE;
}

/**
 * ข้อมูลแสดงผลของแต่ละโซน
 */
function getZoneInfo(zone) {
  const info = {
    [ZONES.CRITICAL]: {
      level: 'critical', level_num: 5, color: '#991B1B', bg_color: '#FEE2E2', icon: '🚨',
      message_th: 'วิกฤต! - อพยพทันที!', message_en: 'CRITICAL - Evacuate immediately!',
      action_th: 'ออกจากพื้นที่ทันที ติดต่อหน่วยกู้ภัย 1784',
      action_en: 'Leave the area immediately. Contact emergency 1784', sound_alert: true
    },
    [ZONES.HIGH_DANGER]: {
      level: 'danger', level_num: 4, color: '#DC2626', bg_color: '#FECACA', icon: '⚠️',
      message_th: 'อันตรายสูง! - ใกล้ชายแดนมาก', message_en: 'HIGH DANGER - Very close to border',
      action_th: 'เตรียมพร้อมอพยพ ติดตามข่าวอย่างใกล้ชิด',
      action_en: 'Prepare to evacuate. Monitor news closely', sound_alert: true
    },
    [ZONES.BM21_RANGE]: {
      level: 'high', level_num: 3, color: '#EA580C', bg_color: '#FFEDD5', icon: '🟠',
      message_th: 'อยู่ในระยะ BM-21 (52 กม.)', message_en: 'Within BM-21 range (52km)',
      action_th: 'เฝ้าระวัง เตรียมแผนอพยพ ติดตามประกาศทางการ',
      action_en: 'Stay alert. Have evacuation plan ready', sound_alert: false
    },
    [ZONES.PHL03_RANGE]: {
      level: 'moderate', level_num: 2, color: '#CA8A04', bg_color: '#FEF3C7', icon: '🟡',
      message_th: 'อยู่ในระยะ PHL-03 (130 กม.)', message_en: 'Within PHL-03 range (130km)',
      action_th: 'รับทราบข้อมูล เตรียมอุปกรณ์ฉุกเฉิน',
      action_en: 'Stay informed. Prepare emergency supplies', sound_alert: false
    },
    [ZONES.EXTENDED_RANGE]: {
      level: 'low', level_num: 1, color: '#65A30D', bg_color: '#ECFCCB', icon: '🟢',
      message_th: 'ระยะขยาย - ความเสี่ยงต่ำ', message_en: 'Extended range - Low risk',
      action_th: 'ติดตามข่าวสารตามปกติ', action_en: 'Monitor news as usual', sound_alert: false
    },
    [ZONES.SAFE]: {
      level: 'safe', level_num: 0, color: '#16A34A', bg_color: '#DCFCE7', icon: '✅',
      message_th: 'ปลอดภัย - นอกระยะอาวุธ', message_en: 'SAFE - Outside weapon range',
      action_th: 'ติดตามข่าวสารเพื่ออัพเดท', action_en: 'Continue monitoring news', sound_alert: false
    },
    [ZONES.OUT_OF_SCOPE]: {
      level: 'info', level_num: -1, color: '#6B7280', bg_color: '#F3F4F6', icon: 'ℹ️',
      message_th: 'นอกพื้นที่ติดตาม', message_en: 'Outside monitored area',
      action_th: 'ระบบนี้ออกแบบสำหรับ 7 จังหวัดชายแดนไทย-กัมพูชา',
      action_en: 'This tool is for Thai-Cambodia border provinces', sound_alert: false
    },
    [ZONES.INVALID_INPUT]: {
      level: 'error', level_num: -2, color: '#7C3AED', bg_color: '#EDE9FE', icon: '❓',
      message_th: 'ไม่สามารถระบุตำแหน่งได้', message_en: 'Could not determine location',
      action_th: 'กรุณาเปิด GPS หรือใส่พิกัดด้วยตนเอง',
      action_en: 'Please enable GPS or enter coordinates manually', sound_alert: false
    }
  };
  
  return info[zone] || info[ZONES.INVALID_INPUT];
}

/**
 * คำนวณ confidence level
 */
function calculateConfidence(distance_km, accuracy_m) {
  if (!accuracy_m) {
    return { percent: 75, margin_km: null, message_th: 'ไม่ทราบ accuracy' };
  }
  
  const accuracy_km = accuracy_m / 1000;
  const errorPercent = (accuracy_km / Math.max(distance_km, 0.1)) * 100;
  const confidence = Math.max(0, Math.min(100, 100 - errorPercent));
  
  return {
    percent: Math.round(confidence),
    margin_km: Math.round(accuracy_km * 100) / 100,
    margin_m: Math.round(accuracy_m),
    message_th: confidence >= 90 ? 'เชื่อถือได้สูง' :
                confidence >= 70 ? 'เชื่อถือได้' :
                confidence >= 50 ? 'ความเชื่อมั่นปานกลาง' : 'ความเชื่อมั่นต่ำ'
  };
}

// ============================================
// MAIN API FUNCTION
// ============================================

/**
 * คำนวณความเสี่ยง (Main Function)
 */
function calculateRisk(lat, lon, options = {}) {
  const { accuracy, source = 'unknown' } = options;
  const timestamp = new Date().toISOString();
  
  // 1. Validate coordinates
  const coordCheck = validateCoordinates(lat, lon);
  if (!coordCheck.valid) {
    return {
      success: false, error: true, errors: coordCheck.errors,
      zone: ZONES.INVALID_INPUT, zone_info: getZoneInfo(ZONES.INVALID_INPUT),
      timestamp, source
    };
  }
  
  // 2. Evaluate GPS accuracy
  const gpsEval = evaluateGPSAccuracy(accuracy);
  
  // 3. Check province
  const province = checkProvinceContainment(lat, lon);
  
  // 4. Calculate distance
  const distanceResult = calculateDistanceToBorder(lat, lon);
  
  // 5. Handle out-of-scope
  if (!province) {
    return {
      success: true,
      lat: roundCoord(lat), lon: roundCoord(lon),
      distance_km: distanceResult.distance_km,
      distance_m: distanceResult.distance_m,
      distance_display: distanceResult.distance_display,
      zone: ZONES.OUT_OF_SCOPE,
      zone_info: getZoneInfo(ZONES.OUT_OF_SCOPE),
      province: null,
      border_info: {
        nearest_point: distanceResult.nearest_point,
        bearing: distanceResult.bearing,
        direction: distanceResult.direction,
        direction_th: distanceResult.direction_th
      },
      gps_accuracy: gpsEval,
      warnings: coordCheck.warnings,
      timestamp, source
    };
  }
  
  // 6. Classify zone
  const zone = classifyZone(distanceResult.distance_km);
  const zoneInfo = getZoneInfo(zone);
  
  // 7. Calculate confidence
  const confidence = calculateConfidence(distanceResult.distance_km, accuracy);
  
  // 8. Build complete response
  return {
    success: true,
    lat: roundCoord(lat), lon: roundCoord(lon),
    distance_km: distanceResult.distance_km,
    distance_m: distanceResult.distance_m,
    distance_display: distanceResult.distance_display,
    zone, zone_info: zoneInfo,
    province,
    border_info: {
      nearest_point: distanceResult.nearest_point,
      bearing: distanceResult.bearing,
      direction: distanceResult.direction,
      direction_th: distanceResult.direction_th
    },
    weapon_ranges: {
      bm21: { name: 'BM-21 Grad', range_km: THRESHOLDS.BM21_MAX, in_range: distanceResult.distance_km <= THRESHOLDS.BM21_MAX },
      phl03: { name: 'PHL-03', range_km: THRESHOLDS.PHL03_MAX, in_range: distanceResult.distance_km <= THRESHOLDS.PHL03_MAX }
    },
    gps_accuracy: gpsEval,
    confidence,
    warnings: coordCheck.warnings,
    timestamp, source,
    version: '2.0.0'
  };
}

function roundCoord(val) {
  return Math.round(val * 1000000) / 1000000;
}

// Legacy compatibility
function isValidCoordinate(lat, lon) {
  return validateCoordinates(lat, lon).valid;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  calculateRisk,
  calculateDistanceToBorder,
  checkProvinceContainment,
  classifyZone,
  getZoneInfo,
  validateCoordinates,
  evaluateGPSAccuracy,
  isValidCoordinate,
  THRESHOLDS,
  ZONES,
  GPS_ACCURACY_LEVELS,
  loadGeoJSONData,
  createFallbackProvinces,
  createFallbackBorderLine
};