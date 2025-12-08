import { useState, useCallback } from 'react'
import { MapPin, Navigation, AlertTriangle } from 'lucide-react'
import WeaponRangeCard from '../components/WeaponRangeCard'
import RiskBars from '../components/RiskBars'

// ข้อมูลอำเภอจังหวัดตราด (ข้อมูลจริง)
const TRAT_DISTRICTS = {
  'เมืองตราด': { lat: 12.2428, lng: 102.5177 },
  'คลองใหญ่': { lat: 11.7667, lng: 102.8833 },
  'เขาสมิง': { lat: 12.4000, lng: 102.6500 },
  'บ่อไร่': { lat: 12.3833, lng: 102.8000 },
  'แหลมงอบ': { lat: 12.1833, lng: 102.3833 },
  'เกาะกูด': { lat: 11.6500, lng: 102.5667 },
  'เกาะช้าง': { lat: 12.0500, lng: 102.3500 },
}

// จุดชายแดน (ด่านหาดเล็ก)
const BORDER_POINT = { lat: 11.6833, lng: 102.9167, name: "ด่านหาดเล็ก" }

// คำนวณระยะทาง Haversine
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

const getRiskLevel = (distance) => {
  if (distance <= 20) return { level: 'CRITICAL', color: '#dc2626', text: 'อันตรายสูงสุด' }
  if (distance <= 52) return { level: 'HIGH', color: '#ea580c', text: 'อันตรายสูง' }
  if (distance <= 130) return { level: 'MODERATE', color: '#f59e0b', text: 'เสี่ยงปานกลาง' }
  return { level: 'SAFE', color: '#22c55e', text: 'ปลอดภัย' }
}

export default function CheckTab() {
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [distanceFromBorder, setDistanceFromBorder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [locationSource, setLocationSource] = useState(null) // 'gps' or 'district'

  // Handle district selection
  const handleDistrictChange = (e) => {
    const district = e.target.value
    setSelectedDistrict(district)
    setError(null)
    setLocationSource(null)
    setDistanceFromBorder(null)

    if (district && TRAT_DISTRICTS[district]) {
      const d = TRAT_DISTRICTS[district]
      const distance = calculateDistance(d.lat, d.lng, BORDER_POINT.lat, BORDER_POINT.lng)
      setDistanceFromBorder(Math.round(distance))
      setLocationSource('district')
    }
  }

  // Get GPS location
  const getGPSLocation = useCallback(() => {
    setLoading(true)
    setError(null)
    setSelectedDistrict('')

    if (!navigator.geolocation) {
      setError('เบราว์เซอร์ไม่รองรับ GPS')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const dist = calculateDistance(latitude, longitude, BORDER_POINT.lat, BORDER_POINT.lng)
        setDistanceFromBorder(Math.round(dist))
        setLocationSource('gps')
        setLoading(false)
      },
      (err) => {
        console.error('GPS error:', err)
        setError('ไม่สามารถเข้าถึง GPS ได้ กรุณาเลือกอำเภอ')
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-4 text-white">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          เช็คระยะปลอดภัย - จังหวัดตราด
        </h2>
        <p className="text-sm opacity-80 mt-1">คำนวณระยะจากด่านหาดเล็ก (ชายแดนไทย-กัมพูชา)</p>
      </div>

      {/* Input */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200">
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm text-slate-600 mb-1 block">เลือกอำเภอในจังหวัดตราด</span>
            <select
              value={selectedDistrict}
              onChange={handleDistrictChange}
              className="w-full p-3 border border-slate-300 rounded-xl text-lg bg-white"
            >
              <option value="">-- เลือกอำเภอ --</option>
              {Object.keys(TRAT_DISTRICTS).map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </label>

          <button
            onClick={getGPSLocation}
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white p-3 rounded-xl flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                กำลังค้นหาตำแหน่ง...
              </>
            ) : (
              <>
                <Navigation className="w-5 h-5" />
                ใช้ตำแหน่งปัจจุบัน (GPS)
              </>
            )}
          </button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {distanceFromBorder !== null && (
        <>
          {/* Distance Display */}
          <div
            className="rounded-2xl p-6 text-white text-center"
            style={{ backgroundColor: getRiskLevel(distanceFromBorder).color }}
          >
            <div className="text-sm opacity-80">
              ระยะห่างจาก {BORDER_POINT.name}
              {locationSource === 'gps' && ' (GPS)'}
              {locationSource === 'district' && ` (อ.${selectedDistrict})`}
            </div>
            <div className="text-5xl font-bold my-2">{distanceFromBorder} กม.</div>
            <div className="text-xl font-medium">{getRiskLevel(distanceFromBorder).text}</div>
          </div>

          {/* Weapon Range */}
          <WeaponRangeCard distanceFromBorder={distanceFromBorder} />

          {/* Risk Bars */}
          <RiskBars distanceFromBorder={distanceFromBorder} />

          {/* Info */}
          <div className="bg-slate-100 rounded-xl p-4 text-center">
            <p className="text-sm text-slate-600">
              ⚠️ ข้อมูลเป็นการประมาณการ ควรติดตามข่าวสารจากทางราชการ
            </p>
          </div>
        </>
      )}
    </div>
  )
}
