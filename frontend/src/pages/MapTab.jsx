import { useState, useMemo } from 'react'
import { MapPin, Search, Navigation, AlertTriangle, Shield, Target } from 'lucide-react'
import * as turf from '@turf/turf'

// =============================================
// จุดอ้างอิง: ด่านหาดเล็ก (ด่านถาวรไทย-กัมพูชา)
// =============================================
const HAT_LEK_BORDER = { lat: 11.7010, lng: 102.8890, name: 'ด่านหาดเล็ก' }

// ข้อมูลอำเภอ/ตำบลใน จ.ตราด พร้อมพิกัด
const TRAT_LOCATIONS = [
  // อ.เมืองตราด
  { district: 'เมืองตราด', subdistrict: 'บางพระ', lat: 12.2431, lng: 102.5151 },
  { district: 'เมืองตราด', subdistrict: 'หนองเสม็ด', lat: 12.2300, lng: 102.4900 },
  { district: 'เมืองตราด', subdistrict: 'หนองโสน', lat: 12.2100, lng: 102.5300 },
  { district: 'เมืองตราด', subdistrict: 'หนองคันทรง', lat: 12.1900, lng: 102.4700 },
  { district: 'เมืองตราด', subdistrict: 'ห้วงน้ำขาว', lat: 12.2600, lng: 102.5500 },
  { district: 'เมืองตราด', subdistrict: 'อ่าวใหญ่', lat: 12.1700, lng: 102.5100 },
  { district: 'เมืองตราด', subdistrict: 'วังกระแจะ', lat: 12.2800, lng: 102.5000 },
  { district: 'เมืองตราด', subdistrict: 'ห้วยแร้ง', lat: 12.3000, lng: 102.5200 },
  { district: 'เมืองตราด', subdistrict: 'เนินทราย', lat: 12.2200, lng: 102.5400 },
  { district: 'เมืองตราด', subdistrict: 'ท่าพริก', lat: 12.1500, lng: 102.5300 },
  { district: 'เมืองตราด', subdistrict: 'ท่ากุ่ม', lat: 12.1300, lng: 102.5500 },
  { district: 'เมืองตราด', subdistrict: 'ตะกาง', lat: 12.2000, lng: 102.4500 },
  { district: 'เมืองตราด', subdistrict: 'ชำราก', lat: 12.1600, lng: 102.5800 },
  { district: 'เมืองตราด', subdistrict: 'แหลมกลัด', lat: 12.1200, lng: 102.6000 },
  
  // อ.คลองใหญ่
  { district: 'คลองใหญ่', subdistrict: 'คลองใหญ่', lat: 11.7700, lng: 102.8800 },
  { district: 'คลองใหญ่', subdistrict: 'ไม้รูด', lat: 11.8200, lng: 102.8500 },
  { district: 'คลองใหญ่', subdistrict: 'หาดเล็ก', lat: 11.7010, lng: 102.8890 },
  
  // อ.เขาสมิง
  { district: 'เขาสมิง', subdistrict: 'เขาสมิง', lat: 12.0500, lng: 102.7000 },
  { district: 'เขาสมิง', subdistrict: 'แสนตุ้ง', lat: 12.1000, lng: 102.7200 },
  { district: 'เขาสมิง', subdistrict: 'วังตะเคียน', lat: 12.0800, lng: 102.6800 },
  { district: 'เขาสมิง', subdistrict: 'ท่าโสม', lat: 12.0300, lng: 102.7300 },
  { district: 'เขาสมิง', subdistrict: 'สะตอ', lat: 12.0600, lng: 102.7500 },
  { district: 'เขาสมิง', subdistrict: 'ประณีต', lat: 12.0200, lng: 102.6900 },
  { district: 'เขาสมิง', subdistrict: 'เทพนิมิต', lat: 12.0900, lng: 102.7100 },
  
  // อ.บ่อไร่
  { district: 'บ่อไร่', subdistrict: 'บ่อพลอย', lat: 12.2000, lng: 102.7800 },
  { district: 'บ่อไร่', subdistrict: 'ช้างทูน', lat: 12.2500, lng: 102.8000 },
  { district: 'บ่อไร่', subdistrict: 'ด่านชุมพล', lat: 12.3000, lng: 102.8200 },
  { district: 'บ่อไร่', subdistrict: 'หนองบอน', lat: 12.2200, lng: 102.7600 },
  { district: 'บ่อไร่', subdistrict: 'นนทรีย์', lat: 12.1800, lng: 102.8100 },
  
  // อ.แหลมงอบ
  { district: 'แหลมงอบ', subdistrict: 'แหลมงอบ', lat: 12.1800, lng: 102.4200 },
  { district: 'แหลมงอบ', subdistrict: 'น้ำเชี่ยว', lat: 12.2000, lng: 102.4000 },
  { district: 'แหลมงอบ', subdistrict: 'คลองใหญ่', lat: 12.1500, lng: 102.4500 },
  { district: 'แหลมงอบ', subdistrict: 'บางปิด', lat: 12.1700, lng: 102.3800 },
  
  // อ.เกาะกูด
  { district: 'เกาะกูด', subdistrict: 'เกาะกูด', lat: 11.6600, lng: 102.5700 },
  { district: 'เกาะกูด', subdistrict: 'เกาะหมาก', lat: 11.8200, lng: 102.4800 },
  
  // อ.เกาะช้าง
  { district: 'เกาะช้าง', subdistrict: 'เกาะช้าง', lat: 12.0500, lng: 102.3500 },
  { district: 'เกาะช้าง', subdistrict: 'เกาะช้างใต้', lat: 11.9800, lng: 102.3300 },
]

// ระยะอาวุธ
const WEAPON_RANGES = [
  { name: 'ปืนใหญ่ภาคพื้น', range: 15, icon: '💣' },
  { name: 'BM-21 Grad', range: 40, icon: '🚀' },
  { name: 'Type 90B MLRS', range: 40, icon: '🚀' },
  { name: 'PHL-03', range: 150, icon: '🎯' },
]

// คำนวณระยะห่าง (Haversine)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const from = turf.point([lng1, lat1])
  const to = turf.point([lng2, lat2])
  return turf.distance(from, to, { units: 'kilometers' })
}

// ประเมินความเสี่ยง
function getRiskLevel(distanceKm) {
  if (distanceKm <= 15) return { level: 'วิกฤต', color: '#dc2626', emoji: '🔴', desc: 'อยู่ในระยะปืนใหญ่' }
  if (distanceKm <= 40) return { level: 'อันตรายสูง', color: '#ea580c', emoji: '🟠', desc: 'เสี่ยงจรวด BM-21/Type90B' }
  if (distanceKm <= 70) return { level: 'เฝ้าระวัง', color: '#eab308', emoji: '🟡', desc: 'อาจอยู่ในระยะ MLRS รุ่นใหม่' }
  if (distanceKm <= 150) return { level: 'เสี่ยงต่ำ', color: '#22c55e', emoji: '🟢', desc: 'อยู่ในระยะ PHL-03' }
  return { level: 'ปลอดภัย', color: '#3b82f6', emoji: '✅', desc: 'อยู่นอกระยะอาวุธทุกชนิด' }
}

export default function MapTab() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [distance, setDistance] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // ค้นหาตำบล
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return TRAT_LOCATIONS.filter(loc => 
      loc.subdistrict.toLowerCase().includes(q) || 
      loc.district.toLowerCase().includes(q)
    ).slice(0, 8)
  }, [searchQuery])

  // เลือกตำบลจากรายการ
  const handleSelectLocation = (loc) => {
    setSelectedLocation(loc)
    setSearchQuery(`${loc.subdistrict} อ.${loc.district}`)
    const dist = calculateDistance(loc.lat, loc.lng, HAT_LEK_BORDER.lat, HAT_LEK_BORDER.lng)
    setDistance(dist)
    setError(null)
  }

  // ใช้ GPS
  const handleGetGPS = () => {
    setLoading(true)
    setError(null)
    if (!navigator.geolocation) {
      setError('เบราว์เซอร์ไม่รองรับ GPS')
      setLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const dist = calculateDistance(latitude, longitude, HAT_LEK_BORDER.lat, HAT_LEK_BORDER.lng)
        setSelectedLocation({ subdistrict: 'ตำแหน่งปัจจุบัน', district: 'GPS', lat: latitude, lng: longitude })
        setDistance(dist)
        setSearchQuery('')
        setLoading(false)
      },
      () => {
        setError('ไม่สามารถเข้าถึงตำแหน่งได้')
        setLoading(false)
      }
    )
  }

  const risk = distance !== null ? getRiskLevel(distance) : null

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold text-slate-800">🛡️ เช็คระยะปลอดภัย</h1>
        <p className="text-sm text-slate-500">จากชายแดนไทย-กัมพูชา (ด่านหาดเล็ก)</p>
      </div>

      {/* GPS Button */}
      <button
        onClick={handleGetGPS}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
      >
        <Navigation className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'กำลังค้นหา...' : '📍 เช็คตำแหน่งของฉัน (GPS)'}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-200"></div>
        <span className="text-sm text-slate-400">หรือค้นหาด้วยชื่อ</span>
        <div className="flex-1 h-px bg-slate-200"></div>
      </div>

      {/* Search Box */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="พิมพ์ชื่อตำบล เช่น ชำราก, คลองใหญ่"
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Search Results */}
        {filteredLocations.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
            {filteredLocations.map((loc, i) => (
              <button
                key={i}
                onClick={() => handleSelectLocation(loc)}
                className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0 flex items-center gap-2"
              >
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="font-medium">{loc.subdistrict}</span>
                <span className="text-sm text-slate-400">อ.{loc.district}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
          ❌ {error}
        </div>
      )}

      {/* Result */}
      {distance !== null && risk && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
          {/* Result Header */}
          <div className="p-4 text-center border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-700">ผลการวิเคราะห์</h2>
          </div>

          {/* Location */}
          <div className="p-4 bg-slate-50">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="w-4 h-4" />
              <span><strong>ตำแหน่ง:</strong> {selectedLocation?.subdistrict} {selectedLocation?.district !== 'GPS' ? `อ.${selectedLocation?.district}` : ''}</span>
            </div>
          </div>

          {/* Distance */}
          <div className="p-6 text-center">
            <div className="text-sm text-slate-500 mb-1">📏 ระยะห่างจาก{HAT_LEK_BORDER.name}</div>
            <div className="text-5xl font-bold text-slate-800">{distance.toFixed(2)} <span className="text-2xl">กม.</span></div>
          </div>

          {/* Risk Level */}
          <div 
            className="p-6 text-center text-white"
            style={{ backgroundColor: risk.color }}
          >
            <div className="text-4xl mb-2">{risk.emoji}</div>
            <div className="text-2xl font-bold">{risk.level}</div>
            <div className="text-sm opacity-90 mt-1">{risk.desc}</div>
          </div>

          {/* Weapon Assessment */}
          <div className="p-4">
            <h3 className="font-bold text-sm text-slate-600 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" /> การประเมินจากระยะอาวุธ
            </h3>
            <div className="space-y-2">
              {WEAPON_RANGES.map((weapon, i) => {
                const inRange = distance <= weapon.range
                return (
                  <div key={i} className={`flex items-center justify-between p-2 rounded-lg ${inRange ? 'bg-red-50' : 'bg-green-50'}`}>
                    <div className="flex items-center gap-2">
                      <span>{weapon.icon}</span>
                      <span className="text-sm font-medium">{weapon.name}</span>
                      <span className="text-xs text-slate-400">({weapon.range} กม.)</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${inRange ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {inRange ? '⚠️ อยู่ในระยะ' : '✅ ปลอดภัย'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
        <p className="text-sm text-amber-800">
          ⚠️ <strong>การจำลองเท่านั้น</strong> — ไม่ควรเชื่อถือ 100%
        </p>
        <p className="text-xs text-amber-600 mt-1">
          ติดตามข่าวสารจากหน่วยงานราชการ
        </p>
      </div>
    </div>
  )
}
