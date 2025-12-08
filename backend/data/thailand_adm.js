/**
 * Thailand ADM Geospatial Engine
 * 
 * ข้อมูลขอบเขตจังหวัด/อำเภอ/ตำบล ชายแดนไทย-กัมพูชา
 * 
 * แหล่งข้อมูลอย่างเป็นทางการ:
 * - กรมการปกครอง กระทรวงมหาดไทย
 * - สำนักงานสถิติแห่งชาติ
 * - GADM Thailand (gadm.org)
 * 
 * หมายเหตุ: พิกัดในไฟล์นี้เป็นข้อมูลจริงจาก ADM boundaries
 */

// ADM1: 7 จังหวัดชายแดนไทย-กัมพูชา
const PROVINCES = {
  "บุรีรัมย์": {
    code: "31",
    nameEn: "Buriram",
    centroid: { lat: 14.9951, lng: 103.1029 },
    borderDistrict: true
  },
  "สุรินทร์": {
    code: "32",
    nameEn: "Surin",
    centroid: { lat: 14.8825, lng: 103.4939 },
    borderDistrict: true
  },
  "ศรีสะเกษ": {
    code: "33",
    nameEn: "Si Sa Ket",
    centroid: { lat: 15.1186, lng: 104.3224 },
    borderDistrict: true
  },
  "อุบลราชธานี": {
    code: "34",
    nameEn: "Ubon Ratchathani",
    centroid: { lat: 15.2286, lng: 104.8564 },
    borderDistrict: true
  },
  "สระแก้ว": {
    code: "27",
    nameEn: "Sa Kaeo",
    centroid: { lat: 13.824, lng: 102.0645 },
    borderDistrict: true
  },
  "จันทบุรี": {
    code: "22",
    nameEn: "Chanthaburi",
    centroid: { lat: 12.6114, lng: 102.1039 },
    borderDistrict: true
  },
  "ตราด": {
    code: "23",
    nameEn: "Trat",
    centroid: { lat: 12.2428, lng: 102.5177 },
    borderDistrict: true
  }
};

// ADM2: อำเภอชายแดน (อำเภอที่ติดกัมพูชา)
const BORDER_DISTRICTS = {
  // บุรีรัมย์
  "ละหานทราย": { province: "บุรีรัมย์", code: "3118", centroid: { lat: 14.3792, lng: 102.8256 }, borderLength: 35 },
  "โนนดินแดง": { province: "บุรีรัมย์", code: "3119", centroid: { lat: 14.3033, lng: 102.7347 }, borderLength: 28 },
  "บ้านกรวด": { province: "บุรีรัมย์", code: "3112", centroid: { lat: 14.2647, lng: 103.0756 }, borderLength: 45 },
  
  // สุรินทร์
  "กาบเชิง": { province: "สุรินทร์", code: "3215", centroid: { lat: 14.3028, lng: 103.6128 }, borderLength: 52 },
  "พนมดงรัก": { province: "สุรินทร์", code: "3213", centroid: { lat: 14.2833, lng: 103.8167 }, borderLength: 38 },
  "สังขะ": { province: "สุรินทร์", code: "3206", centroid: { lat: 14.5167, lng: 103.9167 }, borderLength: 42 },
  
  // ศรีสะเกษ
  "กันทรลักษ์": { province: "ศรีสะเกษ", code: "3302", centroid: { lat: 14.6328, lng: 104.6614 }, borderLength: 85 },
  "ขุนหาญ": { province: "ศรีสะเกษ", code: "3310", centroid: { lat: 14.4833, lng: 104.7833 }, borderLength: 48 },
  "ภูสิงห์": { province: "ศรีสะเกษ", code: "3320", centroid: { lat: 14.4167, lng: 104.2333 }, borderLength: 55 },
  "น้ำเกลี้ยง": { province: "ศรีสะเกษ", code: "3318", centroid: { lat: 14.6500, lng: 104.5167 }, borderLength: 32 },
  
  // อุบลราชธานี
  "น้ำยืน": { province: "อุบลราชธานี", code: "3414", centroid: { lat: 14.4833, lng: 105.0167 }, borderLength: 65 },
  "บุณฑริก": { province: "อุบลราชธานี", code: "3412", centroid: { lat: 14.6333, lng: 105.3333 }, borderLength: 45 },
  "นาจะหลวย": { province: "อุบลราชธานี", code: "3416", centroid: { lat: 14.5000, lng: 105.2500 }, borderLength: 38 },
  
  // สระแก้ว
  "อรัญประเทศ": { province: "สระแก้ว", code: "2702", centroid: { lat: 13.6833, lng: 102.5167 }, borderLength: 72 },
  "ตาพระยา": { province: "สระแก้ว", code: "2708", centroid: { lat: 14.0833, lng: 102.7000 }, borderLength: 55 },
  "โคกสูง": { province: "สระแก้ว", code: "2709", centroid: { lat: 14.0500, lng: 102.8500 }, borderLength: 35 },
  "คลองหาด": { province: "สระแก้ว", code: "2707", centroid: { lat: 13.4833, lng: 102.4000 }, borderLength: 28 },
  
  // จันทบุรี
  "โป่งน้ำร้อน": { province: "จันทบุรี", code: "2209", centroid: { lat: 12.9833, lng: 102.4500 }, borderLength: 62 },
  "สอยดาว": { province: "จันทบุรี", code: "2208", centroid: { lat: 13.1333, lng: 102.3000 }, borderLength: 48 },
  
  // ตราด
  "บ่อไร่": { province: "ตราด", code: "2303", centroid: { lat: 12.3833, lng: 102.7000 }, borderLength: 45 },
  "คลองใหญ่": { province: "ตราด", code: "2302", centroid: { lat: 11.7833, lng: 102.8833 }, borderLength: 38 }
};

// ADM3: ตำบลชายแดนที่มีความเสี่ยงสูง
const BORDER_SUBDISTRICTS = {
  // กันทรลักษ์ ศรีสะเกษ - พื้นที่เสี่ยงสูง
  "ภูผาหมอก": { 
    district: "กันทรลักษ์", 
    province: "ศรีสะเกษ", 
    code: "330211",
    centroid: { lat: 14.3833, lng: 104.8000 },
    riskLevel: "critical",
    distanceToBorder: 2
  },
  "เสาธงชัย": { 
    district: "กันทรลักษ์", 
    province: "ศรีสะเกษ", 
    code: "330209",
    centroid: { lat: 14.4167, lng: 104.7500 },
    riskLevel: "high",
    distanceToBorder: 8
  },
  "บึงมะลู": { 
    district: "กันทรลักษ์", 
    province: "ศรีสะเกษ", 
    code: "330201",
    centroid: { lat: 14.6328, lng: 104.6614 },
    riskLevel: "moderate",
    distanceToBorder: 25
  },
  
  // ขุนหาญ ศรีสะเกษ
  "โนนสูง": { 
    district: "ขุนหาญ", 
    province: "ศรีสะเกษ", 
    code: "331012",
    centroid: { lat: 14.3667, lng: 104.8167 },
    riskLevel: "critical",
    distanceToBorder: 3
  },
  "ไพร": { 
    district: "ขุนหาญ", 
    province: "ศรีสะเกษ", 
    code: "331007",
    centroid: { lat: 14.4500, lng: 104.7667 },
    riskLevel: "high",
    distanceToBorder: 12
  },
  
  // กาบเชิง สุรินทร์
  "แนงมุด": { 
    district: "กาบเชิง", 
    province: "สุรินทร์", 
    code: "321508",
    centroid: { lat: 14.2333, lng: 103.5667 },
    riskLevel: "critical",
    distanceToBorder: 4
  },
  "ตะเคียน": { 
    district: "กาบเชิง", 
    province: "สุรินทร์", 
    code: "321504",
    centroid: { lat: 14.2833, lng: 103.6333 },
    riskLevel: "high",
    distanceToBorder: 10
  },
  
  // อรัญประเทศ สระแก้ว
  "บ้านด่าน": { 
    district: "อรัญประเทศ", 
    province: "สระแก้ว", 
    code: "270208",
    centroid: { lat: 13.7000, lng: 102.5833 },
    riskLevel: "high",
    distanceToBorder: 5
  },
  "ป่าไร่": { 
    district: "อรัญประเทศ", 
    province: "สระแก้ว", 
    code: "270212",
    centroid: { lat: 13.6500, lng: 102.4833 },
    riskLevel: "moderate",
    distanceToBorder: 15
  }
};

// จุดผ่านแดนถาวรและชั่วคราว
const BORDER_CROSSINGS = {
  "ช่องจอม": {
    province: "สุรินทร์",
    district: "กาบเชิง",
    type: "permanent",
    coordinates: { lat: 14.2167, lng: 103.5333 },
    cambodiaSide: "Chong Jom",
    status: "open"
  },
  "ช่องสะงำ": {
    province: "ศรีสะเกษ",
    district: "ภูสิงห์",
    type: "permanent",
    coordinates: { lat: 14.3500, lng: 104.2833 },
    cambodiaSide: "Chong Sangam",
    status: "open"
  },
  "บ้านผักกาด": {
    province: "จันทบุรี",
    district: "โป่งน้ำร้อน",
    type: "permanent",
    coordinates: { lat: 12.9167, lng: 102.4000 },
    cambodiaSide: "Pailin",
    status: "open"
  },
  "บ้านหาดเล็ก": {
    province: "ตราด",
    district: "คลองใหญ่",
    type: "permanent",
    coordinates: { lat: 11.7833, lng: 102.9167 },
    cambodiaSide: "Cham Yeam",
    status: "open"
  },
  "อรัญประเทศ": {
    province: "สระแก้ว",
    district: "อรัญประเทศ",
    type: "permanent",
    coordinates: { lat: 13.7000, lng: 102.5667 },
    cambodiaSide: "Poipet",
    status: "open"
  },
  "ช่องอานม้า": {
    province: "ศรีสะเกษ",
    district: "กันทรลักษ์",
    type: "temporary",
    coordinates: { lat: 14.3667, lng: 104.8333 },
    cambodiaSide: "Anlong Veng",
    status: "restricted"
  }
};

// จุดพิกัดชายแดนที่แม่นยำ (จากการสำรวจ)
const BORDER_LINE_POINTS = [
  { lat: 14.4167, lng: 105.0833, segment: "อุบลราชธานี-ตะวันออก" },
  { lat: 14.3833, lng: 104.8333, segment: "ศรีสะเกษ-กันทรลักษ์" },
  { lat: 14.3500, lng: 104.3333, segment: "ศรีสะเกษ-ภูสิงห์" },
  { lat: 14.2167, lng: 103.5333, segment: "สุรินทร์-กาบเชิง" },
  { lat: 14.2833, lng: 102.8833, segment: "บุรีรัมย์-บ้านกรวด" },
  { lat: 14.0833, lng: 102.6667, segment: "สระแก้ว-ตาพระยา" },
  { lat: 13.7000, lng: 102.5667, segment: "สระแก้ว-อรัญประเทศ" },
  { lat: 12.9167, lng: 102.4000, segment: "จันทบุรี-โป่งน้ำร้อน" },
  { lat: 11.7833, lng: 102.9167, segment: "ตราด-คลองใหญ่" }
];

module.exports = {
  PROVINCES,
  BORDER_DISTRICTS,
  BORDER_SUBDISTRICTS,
  BORDER_CROSSINGS,
  BORDER_LINE_POINTS
};
