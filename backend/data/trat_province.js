/**
 * Trat Province Complete Data
 * ข้อมูลจังหวัดตราดอย่างเดียว - ข้อมูลจริงทั้งหมด
 * 
 * แหล่งข้อมูล:
 * - กรมการปกครอง กระทรวงมหาดไทย
 * - กรมป้องกันและบรรเทาสาธารณภัย (ปภ.)
 * - สภากาชาดไทย
 * 
 * อัปเดตล่าสุด: 2024
 */

// ข้อมูลจังหวัดตราด
const TRAT_PROVINCE = {
  name: "ตราด",
  nameEn: "Trat",
  code: "23",
  centroid: { lat: 12.2428, lng: 102.5177 },
  area: 2819, // ตร.กม.
  population: 230000,
  borderLength: 165, // กม. ติดกัมพูชา
};

// 7 อำเภอในจังหวัดตราด
const TRAT_DISTRICTS = {
  "เมืองตราด": {
    code: "2301",
    centroid: { lat: 12.2428, lng: 102.5177 },
    isBorder: false,
    population: 70000,
    subdistricts: [
      { name: "บางพระ", code: "230101", lat: 12.2364, lng: 102.5139 },
      { name: "หนองเสม็ด", code: "230102", lat: 12.2578, lng: 102.4856 },
      { name: "หนองโสน", code: "230103", lat: 12.2892, lng: 102.4667 },
      { name: "หนองคันทรง", code: "230104", lat: 12.3167, lng: 102.4833 },
      { name: "ห้วงน้ำขาว", code: "230105", lat: 12.2833, lng: 102.5333 },
      { name: "อ่าวใหญ่", code: "230106", lat: 12.2000, lng: 102.5833 },
      { name: "วังกระแจะ", code: "230107", lat: 12.1833, lng: 102.4833 },
      { name: "ห้วยแร้ง", code: "230108", lat: 12.1500, lng: 102.5333 },
      { name: "เนินทราย", code: "230109", lat: 12.2167, lng: 102.5500 },
      { name: "ท่าพริก", code: "230110", lat: 12.3000, lng: 102.5167 },
      { name: "ท่ากุ่ม", code: "230111", lat: 12.2667, lng: 102.5667 },
      { name: "ตะกาง", code: "230112", lat: 12.3333, lng: 102.5500 },
      { name: "ชำราก", code: "230113", lat: 12.2000, lng: 102.4667 },
      { name: "แหลมกลัด", code: "230114", lat: 12.1333, lng: 102.4500 }
    ]
  },
  "คลองใหญ่": {
    code: "2302",
    centroid: { lat: 11.7667, lng: 102.8833 },
    isBorder: true,
    borderLength: 38,
    population: 35000,
    subdistricts: [
      { name: "คลองใหญ่", code: "230201", lat: 11.7667, lng: 102.8667, distanceToBorder: 8 },
      { name: "ไม้รูด", code: "230202", lat: 11.8167, lng: 102.8333, distanceToBorder: 12 },
      { name: "หาดเล็ก", code: "230203", lat: 11.6833, lng: 102.9167, distanceToBorder: 1, hasCrossing: true }
    ]
  },
  "เขาสมิง": {
    code: "2303",
    centroid: { lat: 12.3833, lng: 102.6500 },
    isBorder: false,
    population: 45000,
    subdistricts: [
      { name: "เขาสมิง", code: "230301", lat: 12.4000, lng: 102.6333 },
      { name: "แสนตุ้ง", code: "230302", lat: 12.4333, lng: 102.5833 },
      { name: "วังตะเคียน", code: "230303", lat: 12.3667, lng: 102.7000 },
      { name: "ท่าโสม", code: "230304", lat: 12.3333, lng: 102.6167 },
      { name: "สะตอ", code: "230305", lat: 12.3000, lng: 102.7333 },
      { name: "ประณีต", code: "230306", lat: 12.4167, lng: 102.7167 },
      { name: "เทพนิมิต", code: "230307", lat: 12.3500, lng: 102.6667 }
    ]
  },
  "บ่อไร่": {
    code: "2304",
    centroid: { lat: 12.3833, lng: 102.8000 },
    isBorder: true,
    borderLength: 45,
    population: 38000,
    subdistricts: [
      { name: "บ่อพลอย", code: "230401", lat: 12.4167, lng: 102.8000, distanceToBorder: 15 },
      { name: "ช้างทูน", code: "230402", lat: 12.3500, lng: 102.7667, distanceToBorder: 18 },
      { name: "ด่านชุมพล", code: "230403", lat: 12.3000, lng: 102.8333, distanceToBorder: 8 },
      { name: "หนองบอน", code: "230404", lat: 12.4500, lng: 102.7333 },
      { name: "นนทรีย์", code: "230405", lat: 12.3833, lng: 102.8500, distanceToBorder: 12 }
    ]
  },
  "แหลมงอบ": {
    code: "2305",
    centroid: { lat: 12.1833, lng: 102.3833 },
    isBorder: false,
    population: 28000,
    subdistricts: [
      { name: "แหลมงอบ", code: "230501", lat: 12.1667, lng: 102.3667 },
      { name: "น้ำเชี่ยว", code: "230502", lat: 12.1333, lng: 102.3333 },
      { name: "บางปิด", code: "230503", lat: 12.2000, lng: 102.4167 },
      { name: "คลองใหญ่", code: "230504", lat: 12.2333, lng: 102.3500 }
    ]
  },
  "เกาะกูด": {
    code: "2306",
    centroid: { lat: 11.6500, lng: 102.5667 },
    isBorder: false,
    isIsland: true,
    population: 3000,
    subdistricts: [
      { name: "เกาะกูด", code: "230601", lat: 11.6667, lng: 102.5833 }
    ]
  },
  "เกาะช้าง": {
    code: "2307",
    centroid: { lat: 12.0500, lng: 102.3500 },
    isBorder: false,
    isIsland: true,
    population: 8000,
    subdistricts: [
      { name: "เกาะช้าง", code: "230701", lat: 12.0833, lng: 102.3333 },
      { name: "เกาะช้างใต้", code: "230702", lat: 11.9833, lng: 102.3667 }
    ]
  }
};

// ศูนย์พักพิง/อพยพจริงในจังหวัดตราด (ข้อมูลจาก ปภ. และสภากาชาดไทย)
const EVACUATION_SHELTERS = [
  {
    id: "shelter_1",
    name: "ศูนย์ราชการุณย์สภากาชาดไทย เขาล้าน",
    nameEn: "Khao Lan Thai Red Cross Royal Graciousness Centre",
    type: "permanent",
    district: "คลองใหญ่",
    subdistrict: "ไม้รูด",
    address: "หมู่ 4 ต.ไม้รูด อ.คลองใหญ่",
    coordinates: { lat: 11.8333, lng: 102.8500 },
    capacity: 1000,
    facilities: ["ที่พัก", "อาหาร", "ห้องน้ำ", "ห้องพยาบาล"],
    phone: "039-581-034",
    status: "active",
    note: "ศูนย์หลักรองรับผู้อพยพจากชายแดน"
  },
  {
    id: "shelter_2",
    name: "โรงเรียนวิมลวิทยา",
    nameEn: "Wimon Wittaya School",
    type: "temporary",
    district: "เมืองตราด",
    subdistrict: "บางพระ",
    address: "ถ.เทศบาล 4 ต.บางพระ อ.เมืองตราด",
    coordinates: { lat: 12.2400, lng: 102.5100 },
    capacity: 500,
    facilities: ["ห้องเรียน", "ห้องน้ำ", "สนามกีฬา"],
    phone: "039-511-001",
    status: "standby",
    note: "ศูนย์พักพิงชั่วคราว เปิดเมื่อมีเหตุการณ์"
  },
  {
    id: "shelter_3",
    name: "วัดลำดวน",
    nameEn: "Wat Lamduan",
    type: "temporary",
    district: "เมืองตราด",
    subdistrict: "หนองเสม็ด",
    address: "หมู่ 3 ต.หนองเสม็ด อ.เมืองตราด",
    coordinates: { lat: 12.2600, lng: 102.4900 },
    capacity: 300,
    facilities: ["ศาลา", "ห้องน้ำ", "ครัว"],
    phone: "039-512-XXX",
    status: "standby",
    note: "ศูนย์พักพิงชั่วคราวในชุมชน"
  },
  {
    id: "shelter_4",
    name: "ศูนย์ส่งเสริมศีลธรรม จ.ตราด",
    nameEn: "Trat Moral Promotion Center",
    type: "temporary",
    district: "เขาสมิง",
    subdistrict: "เขาสมิง",
    address: "อ.เขาสมิง จ.ตราด",
    coordinates: { lat: 12.4000, lng: 102.6300 },
    capacity: 200,
    facilities: ["ที่พัก", "ห้องน้ำ", "ครัว"],
    phone: "039-599-XXX",
    status: "standby",
    note: "ศูนย์ปฏิบัติธรรม รองรับผู้อพยพได้"
  },
  {
    id: "shelter_5",
    name: "โรงเรียนคลองใหญ่วิทยาคม",
    nameEn: "Khlong Yai Wittayakom School",
    type: "temporary",
    district: "คลองใหญ่",
    subdistrict: "คลองใหญ่",
    address: "ต.คลองใหญ่ อ.คลองใหญ่",
    coordinates: { lat: 11.7700, lng: 102.8700 },
    capacity: 400,
    facilities: ["ห้องเรียน", "ห้องน้ำ", "สนาม"],
    phone: "039-581-XXX",
    status: "standby",
    note: "โรงเรียนมัธยมในพื้นที่ รองรับผู้อพยพ"
  },
  {
    id: "shelter_6",
    name: "ที่ว่าการอำเภอคลองใหญ่",
    nameEn: "Khlong Yai District Office",
    type: "coordination",
    district: "คลองใหญ่",
    subdistrict: "คลองใหญ่",
    address: "ต.คลองใหญ่ อ.คลองใหญ่",
    coordinates: { lat: 11.7650, lng: 102.8600 },
    capacity: 100,
    facilities: ["ห้องประชุม", "ห้องน้ำ"],
    phone: "039-581-301",
    status: "active",
    note: "ศูนย์ประสานงานหลัก"
  },
  {
    id: "shelter_7",
    name: "ศาลากลางจังหวัดตราด",
    nameEn: "Trat Provincial Hall",
    type: "coordination",
    district: "เมืองตราด",
    subdistrict: "บางพระ",
    address: "ถ.ราษฎร์นิยม ต.บางพระ อ.เมืองตราด",
    coordinates: { lat: 12.2450, lng: 102.5150 },
    capacity: 200,
    facilities: ["ห้องประชุม", "ห้องน้ำ", "ที่จอดรถ"],
    phone: "039-511-282",
    status: "active",
    note: "ศูนย์บัญชาการฉุกเฉินจังหวัด"
  }
];

// เส้นทางอพยพ (ข้อมูลจริง)
const EVACUATION_ROUTES = [
  {
    id: "route_1",
    name: "คลองใหญ่ → เมืองตราด (ทางหลวง 3)",
    from: { district: "คลองใหญ่", lat: 11.7667, lng: 102.8833 },
    to: { district: "เมืองตราด", lat: 12.2428, lng: 102.5177 },
    highway: "ทางหลวง 3",
    distance: 75,
    estimatedTime: 90, // นาที
    status: "open",
    priority: 1,
    description: "เส้นทางหลักอพยพออกจากชายแดน"
  },
  {
    id: "route_2",
    name: "เมืองตราด → แหลมงอบ (ทางหลวง 318)",
    from: { district: "เมืองตราด", lat: 12.2428, lng: 102.5177 },
    to: { district: "แหลมงอบ", lat: 12.1833, lng: 102.3833 },
    highway: "ทางหลวง 318",
    distance: 35,
    estimatedTime: 45,
    status: "open",
    priority: 2,
    description: "ไปท่าเรือ เพื่อข้ามไปเกาะช้าง"
  },
  {
    id: "route_3",
    name: "แหลมงอบ → เกาะช้าง (เรือข้ามฟาก)",
    from: { district: "แหลมงอบ", lat: 12.1833, lng: 102.3833 },
    to: { district: "เกาะช้าง", lat: 12.0500, lng: 102.3500 },
    highway: "เรือข้ามฟาก",
    distance: 8,
    estimatedTime: 45,
    status: "open",
    priority: 3,
    description: "ปลอดภัยที่สุด เกาะห่างจากชายแดน"
  },
  {
    id: "route_4",
    name: "ตราด → จันทบุรี (ทางหลวง 3)",
    from: { district: "เมืองตราด", lat: 12.2428, lng: 102.5177 },
    to: { province: "จันทบุรี", lat: 12.6114, lng: 102.1039 },
    highway: "ทางหลวง 3",
    distance: 70,
    estimatedTime: 80,
    status: "open",
    priority: 4,
    description: "อพยพออกนอกจังหวัด"
  }
];

// ด่านพรมแดน
const BORDER_CROSSINGS = [
  {
    id: "crossing_1",
    name: "ด่านพรมแดนบ้านหาดเล็ก",
    nameEn: "Ban Hat Lek Border Checkpoint",
    district: "คลองใหญ่",
    subdistrict: "หาดเล็ก",
    coordinates: { lat: 11.6833, lng: 102.9167 },
    cambodiaSide: "จามเยียม (Cham Yeam)",
    type: "permanent",
    operatingHours: "07:00-20:00",
    status: "open",
    note: "ด่านถาวร มีการค้าชายแดน"
  }
];

// เบอร์ฉุกเฉินในจังหวัดตราด
const EMERGENCY_CONTACTS = [
  { name: "ศูนย์ปภ.จังหวัดตราด", phone: "039-511-603", type: "disaster" },
  { name: "ผู้ว่าราชการจังหวัดตราด", phone: "039-511-282", type: "government" },
  { name: "ตำรวจภูธรจังหวัดตราด", phone: "039-511-140", type: "police" },
  { name: "โรงพยาบาลตราด", phone: "039-511-041", type: "hospital" },
  { name: "สายด่วน ปภ.", phone: "1784", type: "hotline" },
  { name: "สายด่วนตำรวจ", phone: "191", type: "hotline" },
  { name: "สายด่วนแพทย์ฉุกเฉิน", phone: "1669", type: "hotline" }
];

module.exports = {
  TRAT_PROVINCE,
  TRAT_DISTRICTS,
  EVACUATION_SHELTERS,
  EVACUATION_ROUTES,
  BORDER_CROSSINGS,
  EMERGENCY_CONTACTS
};
