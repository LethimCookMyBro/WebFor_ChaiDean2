/**
 * Geospatial Engine for Trat Province
 * 
 * เน้นเฉพาะจังหวัดตราด
 */

const {
  TRAT_PROVINCE,
  TRAT_DISTRICTS,
  EVACUATION_SHELTERS,
  EVACUATION_ROUTES,
  BORDER_CROSSINGS,
  EMERGENCY_CONTACTS
} = require('../data/trat_province');

// จุดชายแดนหลัก (ด่านหาดเล็ก)
const BORDER_POINT = { lat: 11.6833, lng: 102.9167, name: "ด่านหาดเล็ก" };

/**
 * คำนวณระยะทางด้วยสูตร Haversine
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * 
    Math.cos((lat2 * Math.PI) / 180) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * คำนวณระยะห่างจากชายแดน
 */
function distanceToBorder(lat, lng) {
  const distance = haversineDistance(lat, lng, BORDER_POINT.lat, BORDER_POINT.lng);
  return {
    distance: Math.round(distance * 10) / 10,
    nearestBorderPoint: BORDER_POINT.name,
    coordinates: { lat: BORDER_POINT.lat, lng: BORDER_POINT.lng }
  };
}

/**
 * Reverse Geocode สำหรับตราด
 */
function reverseGeocode(lat, lng) {
  let nearestDistrict = null;
  let minDistance = Infinity;

  for (const [name, data] of Object.entries(TRAT_DISTRICTS)) {
    const dist = haversineDistance(lat, lng, data.centroid.lat, data.centroid.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestDistrict = { name, ...data };
    }
  }

  // หา subdistrict
  let nearestSubdistrict = null;
  if (nearestDistrict && nearestDistrict.subdistricts) {
    let minSubDist = Infinity;
    for (const sub of nearestDistrict.subdistricts) {
      const dist = haversineDistance(lat, lng, sub.lat, sub.lng);
      if (dist < minSubDist) {
        minSubDist = dist;
        nearestSubdistrict = sub;
      }
    }
  }

  return {
    province: { name: "ตราด", nameEn: "Trat", code: "23" },
    district: nearestDistrict ? { name: nearestDistrict.name, code: nearestDistrict.code } : null,
    subdistrict: nearestSubdistrict,
    coordinates: { lat, lng }
  };
}

/**
 * ประเมินความเสี่ยง
 */
function assessRisk(lat, lng) {
  const borderInfo = distanceToBorder(lat, lng);
  const location = reverseGeocode(lat, lng);
  const distance = borderInfo.distance;

  let riskLevel, riskColor, riskText, recommendation;

  if (distance <= 20) {
    riskLevel = 'critical';
    riskColor = '#dc2626';
    riskText = 'อันตรายสูงสุด';
    recommendation = 'แนะนำให้อพยพออกจากพื้นที่ทันที';
  } else if (distance <= 52) {
    riskLevel = 'high';
    riskColor = '#ea580c';
    riskText = 'อันตรายสูง';
    recommendation = 'เตรียมพร้อมอพยพ ติดตามข่าวสารอย่างใกล้ชิด';
  } else if (distance <= 130) {
    riskLevel = 'moderate';
    riskColor = '#f59e0b';
    riskText = 'เสี่ยงปานกลาง';
    recommendation = 'เตรียมอุปกรณ์ฉุกเฉิน ทราบเส้นทางอพยพ';
  } else {
    riskLevel = 'safe';
    riskColor = '#22c55e';
    riskText = 'ปลอดภัย';
    recommendation = 'ไม่มีความเสี่ยงจากสถานการณ์ชายแดน';
  }

  return {
    distance,
    riskLevel,
    riskColor,
    riskText,
    recommendation,
    location,
    weaponRanges: {
      artillery: { range: 15, inRange: distance <= 15 },
      bm21Standard: { range: 20, inRange: distance <= 20 },
      bm21Extended: { range: 52, inRange: distance <= 52 },
      phl03Standard: { range: 130, inRange: distance <= 130 },
      phl03Extended: { range: 160, inRange: distance <= 160 }
    }
  };
}

/**
 * หาศูนย์พักพิงใกล้สุด
 */
function findNearestShelter(lat, lng) {
  let nearest = null;
  let minDistance = Infinity;

  for (const shelter of EVACUATION_SHELTERS) {
    const dist = haversineDistance(lat, lng, shelter.coordinates.lat, shelter.coordinates.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = { ...shelter, distance: Math.round(dist * 10) / 10 };
    }
  }

  return nearest;
}

/**
 * แนะนำเส้นทางอพยพ
 */
function recommendEvacuationRoute(lat, lng) {
  const location = reverseGeocode(lat, lng);
  
  // หาเส้นทางที่เหมาะสมตามอำเภอ
  let recommendedRoutes = [];
  
  if (location.district) {
    const district = location.district.name;
    
    if (district === 'คลองใหญ่' || district === 'บ่อไร่') {
      // ใกล้ชายแดน - ให้อพยพไปตัวเมือง
      recommendedRoutes = EVACUATION_ROUTES.filter(r => 
        r.from.district === district || r.from.district === 'คลองใหญ่'
      );
    } else {
      // ไกลชายแดน - สามารถไปเกาะช้างได้
      recommendedRoutes = EVACUATION_ROUTES.filter(r => 
        r.name.includes('เกาะช้าง') || r.name.includes('จันทบุรี')
      );
    }
  }

  return {
    currentLocation: location,
    currentDistanceToBorder: distanceToBorder(lat, lng).distance,
    recommendedRoutes: recommendedRoutes.length > 0 ? recommendedRoutes : EVACUATION_ROUTES,
    nearestShelter: findNearestShelter(lat, lng)
  };
}

/**
 * ตรวจสอบว่าอยู่ในจังหวัดตราดหรือไม่
 */
function isInTratProvince(lat, lng) {
  // ขอบเขตจังหวัดตราดโดยประมาณ
  return lat >= 11.5 && lat <= 12.6 && lng >= 102.2 && lng <= 103.0;
}

/**
 * สรุปสถานะพื้นที่
 */
function getAreaSummary(lat, lng) {
  if (!isInTratProvince(lat, lng)) {
    return {
      inTratProvince: false,
      message: 'ตำแหน่งนี้อยู่นอกจังหวัดตราด'
    };
  }

  return {
    inTratProvince: true,
    ...assessRisk(lat, lng),
    evacuationAdvice: recommendEvacuationRoute(lat, lng),
    emergencyContacts: EMERGENCY_CONTACTS
  };
}

module.exports = {
  haversineDistance,
  distanceToBorder,
  reverseGeocode,
  assessRisk,
  findNearestShelter,
  recommendEvacuationRoute,
  isInTratProvince,
  getAreaSummary,
  // Export data
  TRAT_PROVINCE,
  TRAT_DISTRICTS,
  EVACUATION_SHELTERS,
  EVACUATION_ROUTES,
  BORDER_CROSSINGS,
  EMERGENCY_CONTACTS
};
