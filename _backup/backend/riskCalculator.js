const turf = require('@turf/turf');
const fs = require('fs');
const path = require('path');

// Load GeoJSON data
const borderProvinces = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'border_provinces.geojson'), 'utf-8')
);
const borderLine = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'border_line.geojson'), 'utf-8')
);

// Risk thresholds in kilometers
const THRESHOLDS = {
  HIGH_DANGER: 20,    // Very close to border
  BM21_MAX: 52,       // BM-21 Grad maximum range
  PHL03_MAX: 130      // PHL-03 maximum range
};

// Risk zone classifications
const ZONES = {
  HIGH_DANGER: 'high_danger',
  BM21_RANGE: 'bm21_range',
  PHL03_RANGE: 'phl03_range',
  SAFE: 'safe',
  OUT_OF_SCOPE: 'out_of_scope',
  INVALID_INPUT: 'invalid_input'
};

/**
 * Check if a point is within any of the 7 border provinces
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {object|null} - Province info if inside, null otherwise
 */
function checkProvinceContainment(lat, lon) {
  const point = turf.point([lon, lat]);
  
  for (const feature of borderProvinces.features) {
    const polygon = turf.polygon(feature.geometry.coordinates);
    if (turf.booleanPointInPolygon(point, polygon)) {
      return {
        name_th: feature.properties.name_th,
        name_en: feature.properties.name_en,
        province_code: feature.properties.province_code
      };
    }
  }
  return null;
}

/**
 * Calculate distance from a point to the Thai-Cambodia border
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {number} - Distance in kilometers
 */
function calculateDistanceToBorder(lat, lon) {
  const point = turf.point([lon, lat]);
  const line = turf.lineString(borderLine.features[0].geometry.coordinates);
  
  // Calculate distance in kilometers
  const distance = turf.pointToLineDistance(point, line, { units: 'kilometers' });
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Classify risk zone based on distance
 * @param {number} distance - Distance to border in km
 * @returns {string} - Zone classification
 */
function classifyZone(distance) {
  if (distance < THRESHOLDS.HIGH_DANGER) {
    return ZONES.HIGH_DANGER;
  } else if (distance <= THRESHOLDS.BM21_MAX) {
    return ZONES.BM21_RANGE;
  } else if (distance <= THRESHOLDS.PHL03_MAX) {
    return ZONES.PHL03_RANGE;
  } else {
    return ZONES.SAFE;
  }
}

/**
 * Get zone display info
 * @param {string} zone - Zone classification
 * @returns {object} - Display information
 */
function getZoneInfo(zone) {
  const zoneInfo = {
    [ZONES.HIGH_DANGER]: {
      level: 'critical',
      color: '#DC2626',
      message_en: 'HIGH DANGER ZONE - You are very close to the border!',
      message_th: 'พื้นที่อันตรายสูง - คุณอยู่ใกล้ชายแดนมาก!',
      action: 'Seek shelter immediately and follow civil defense instructions.'
    },
    [ZONES.BM21_RANGE]: {
      level: 'high',
      color: '#EA580C',
      message_en: 'Within BM-21 Artillery Range (52km)',
      message_th: 'อยู่ในระยะปืนใหญ่ BM-21 (52 กม.)',
      action: 'Stay alert and monitor official announcements.'
    },
    [ZONES.PHL03_RANGE]: {
      level: 'moderate',
      color: '#CA8A04',
      message_en: 'Within PHL-03 Artillery Range (130km)',
      message_th: 'อยู่ในระยะปืนใหญ่ PHL-03 (130 กม.)',
      action: 'Stay informed and have an evacuation plan ready.'
    },
    [ZONES.SAFE]: {
      level: 'safe',
      color: '#16A34A',
      message_en: 'Outside known artillery range',
      message_th: 'อยู่นอกระยะปืนใหญ่ที่ทราบ',
      action: 'Continue to monitor news for updates.'
    },
    [ZONES.OUT_OF_SCOPE]: {
      level: 'info',
      color: '#6B7280',
      message_en: 'Location is outside the 7 monitored border provinces',
      message_th: 'ตำแหน่งอยู่นอก 7 จังหวัดชายแดนที่ติดตาม',
      action: 'This tool is designed for Thai-Cambodia border provinces only.'
    },
    [ZONES.INVALID_INPUT]: {
      level: 'error',
      color: '#991B1B',
      message_en: 'Could not determine location',
      message_th: 'ไม่สามารถระบุตำแหน่งได้',
      action: 'Please try again with GPS or enter coordinates manually.'
    }
  };
  
  return zoneInfo[zone] || zoneInfo[ZONES.INVALID_INPUT];
}

/**
 * Main risk calculation function
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {object} - Complete risk assessment
 */
function calculateRisk(lat, lon) {
  // Validate input
  if (!isValidCoordinate(lat, lon)) {
    return {
      lat: null,
      lon: null,
      distance_km: null,
      zone: ZONES.INVALID_INPUT,
      zone_info: getZoneInfo(ZONES.INVALID_INPUT),
      province: null,
      timestamp: new Date().toISOString()
    };
  }
  
  // Check if within border provinces
  const province = checkProvinceContainment(lat, lon);
  
  if (!province) {
    // Calculate distance anyway for informational purposes
    const distance = calculateDistanceToBorder(lat, lon);
    return {
      lat,
      lon,
      distance_km: distance,
      zone: ZONES.OUT_OF_SCOPE,
      zone_info: getZoneInfo(ZONES.OUT_OF_SCOPE),
      province: null,
      timestamp: new Date().toISOString()
    };
  }
  
  // Calculate distance to border
  const distance = calculateDistanceToBorder(lat, lon);
  
  // Classify zone
  const zone = classifyZone(distance);
  
  return {
    lat,
    lon,
    distance_km: distance,
    zone,
    zone_info: getZoneInfo(zone),
    province,
    timestamp: new Date().toISOString()
  };
}

/**
 * Validate coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {boolean} - True if valid
 */
function isValidCoordinate(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number') return false;
  if (isNaN(lat) || isNaN(lon)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lon < -180 || lon > 180) return false;
  return true;
}

module.exports = {
  calculateRisk,
  calculateDistanceToBorder,
  checkProvinceContainment,
  classifyZone,
  getZoneInfo,
  isValidCoordinate,
  THRESHOLDS,
  ZONES
};
