/**
 * ข้อมูลตำบลจังหวัดตราด (Trat Province Sub-districts)
 * 
 * รวมทั้งหมด 37 ตำบล จาก 7 อำเภอ
 * พิกัดใช้จุดกลางตำบล - ระยะที่คำนวณจะใช้ borderLine.js หาระยะไปชายแดนจริง
 */

export const TRAT_TAMBONS = {
  // ============================================
  // อำเภอเมืองตราด (Mueang Trat) - 13 ตำบล
  // ============================================
  'เมืองตราด': {
    'บางพระ': { lat: 12.2350, lng: 102.5150, isCenter: true },
    'ชำราก': { lat: 12.1940, lng: 102.6770 }, // ✅ อยู่ อ.เมืองตราด ถูกแล้ว
    'ตะกาง': { lat: 12.2500, lng: 102.6590 },
    'ท่ากุ่ม': { lat: 12.3450, lng: 102.6750 },
    'ท่าพริก': { lat: 12.2430, lng: 102.5890 },
    'วังกระแจะ': { lat: 12.2720, lng: 102.4790 },
    'หนองคันทรง': { lat: 12.1940, lng: 102.5420 },
    'หนองเสม็ด': { lat: 12.2160, lng: 102.5040 },
    'หนองโสน': { lat: 12.1840, lng: 102.4880 },
    'ห้วงน้ำขาว': { lat: 12.1430, lng: 102.5180 },
    'ห้วยแร้ง': { lat: 12.3870, lng: 102.5600 },
    'อ่าวใหญ่': { lat: 12.0780, lng: 102.5620 },
    'เนินทราย': { lat: 12.2830, lng: 102.5470 },
    'แหลมกลัด': { lat: 12.1170, lng: 102.7040 },
  },

  // ============================================
  // อำเภอคลองใหญ่ (Khlong Yai) - 3 ตำบล
  // ⚠️ ชายแดนไทย-กัมพูชา - ใกล้มาก!
  // ============================================
  'คลองใหญ่': {
    'คลองใหญ่': { lat: 11.7740, lng: 102.8890, isCenter: true },
    'หาดเล็ก': { lat: 11.6780, lng: 102.9060 }, // ด่านชายแดน!
    'ไม้รูด': { lat: 11.9100, lng: 102.8050 },
  },

  // ============================================
  // อำเภอบ่อไร่ (Bo Rai) - 5 ตำบล
  // ติดชายแดน
  // ============================================
  'บ่อไร่': {
    'บ่อพลอย': { lat: 12.6040, lng: 102.5590, isCenter: true },
    'ช้างทูน': { lat: 12.5850, lng: 102.4690 },
    'ด่านชุมพล': { lat: 12.4610, lng: 102.6640 }, // ด่านชายแดน!
    'นนทรีย์': { lat: 12.5440, lng: 102.6000 },
    'หนองบอน': { lat: 12.6830, lng: 102.4470 },
  },

  // ============================================
  // อำเภอเกาะกูด (Ko Kut) - 2 ตำบล (เกาะ)
  // ============================================
  'เกาะกูด': {
    'เกาะกูด': { lat: 11.6880, lng: 102.5430, isCenter: true },
    'เกาะหมาก': { lat: 11.8183, lng: 102.4318 },
  },

  // ============================================
  // อำเภอเกาะช้าง (Ko Chang) - 2 ตำบล (เกาะ)
  // ============================================
  'เกาะช้าง': {
    'เกาะช้าง': { lat: 12.1155, lng: 102.2840, isCenter: true },
    'เกาะช้างใต้': { lat: 11.9960, lng: 102.3310 },
  },

  // ============================================
  // อำเภอเขาสมิง (Khao Saming) - 8 ตำบล
  // ============================================
  'เขาสมิง': {
    'เขาสมิง': { lat: 12.3400, lng: 102.4370, isCenter: true },
    'ทุ่งนนทรี': { lat: 12.4050, lng: 102.5010 },
    'ท่าโสม': { lat: 12.2960, lng: 102.3460 },
    'ประณีต': { lat: 12.5250, lng: 102.3590 },
    'วังตะเคียน': { lat: 12.4780, lng: 102.5310 },
    'สะตอ': { lat: 12.5530, lng: 102.4340 },
    'เทพนิมิต': { lat: 12.4690, lng: 102.4350 },
    'แสนตุ้ง': { lat: 12.3980, lng: 102.3820 },
  },

  // ============================================
  // อำเภอแหลมงอบ (Laem Ngop) - 4 ตำบล
  // ============================================
  'แหลมงอบ': {
    'แหลมงอบ': { lat: 12.1860, lng: 102.4190, isCenter: true },
    'คลองใหญ่': { lat: 12.2260, lng: 102.3620 },
    'น้ำเชี่ยว': { lat: 12.2090, lng: 102.4360 },
    'บางปิด': { lat: 12.2410, lng: 102.3010 },
  },
}

// ============================================
// Helper Functions
// ============================================

export const getAllTambons = () => {
  const result = []
  Object.entries(TRAT_TAMBONS).forEach(([amphoe, tambons]) => {
    Object.entries(tambons).forEach(([tambon, data]) => {
      result.push({
        amphoe,
        tambon,
        fullName: `ต.${tambon} อ.${amphoe}`,
        ...data
      })
    })
  })
  return result
}

export const findNearestTambon = (lat, lng) => {
  const tambons = getAllTambons()
  let nearest = null
  let minDistance = Infinity

  tambons.forEach(tambon => {
    const distance = calculateDistance(lat, lng, tambon.lat, tambon.lng)
    if (distance < minDistance) {
      minDistance = distance
      nearest = { ...tambon, distance }
    }
  })

  return nearest
}

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export const AMPHOE_LIST = Object.keys(TRAT_TAMBONS)

export const getTambonsByAmphoe = (amphoe) => {
  if (!TRAT_TAMBONS[amphoe]) return []
  return Object.keys(TRAT_TAMBONS[amphoe])
}

export const getTambonCoords = (amphoe, tambon) => {
  if (!TRAT_TAMBONS[amphoe] || !TRAT_TAMBONS[amphoe][tambon]) return null
  return TRAT_TAMBONS[amphoe][tambon]
}

export default TRAT_TAMBONS
