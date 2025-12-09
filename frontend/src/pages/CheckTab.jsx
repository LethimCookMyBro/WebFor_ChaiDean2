import { useState, useCallback } from 'react'
import { MapPin, Navigation, AlertTriangle, ChevronDown } from 'lucide-react'
import WeaponRangeCard from '../components/WeaponRangeCard'
import RiskBars from '../components/RiskBars'
import { TRAT_TAMBONS, BORDER_POINT, findNearestTambon, getAllTambons } from '../data/tratTambons'

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
  if (distance <= 10) return { level: 'CRITICAL', color: '#dc2626', text: 'อันตรายสูงสุด' }
  if (distance <= 20) return { level: 'HIGH', color: '#ea580c', text: 'อันตรายสูง' }
  if (distance <= 50) return { level: 'MODERATE', color: '#f59e0b', text: 'เสี่ยงปานกลาง' }
  if (distance <= 90) return { level: 'LOW', color: '#84cc16', text: 'เสี่ยงต่ำ' }
  return { level: 'SAFE', color: '#22c55e', text: 'ปลอดภัย' }
}

export default function CheckTab() {
  const [selectedAmphoe, setSelectedAmphoe] = useState('')
  const [selectedTambon, setSelectedTambon] = useState('')
  const [distanceFromBorder, setDistanceFromBorder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [locationSource, setLocationSource] = useState(null) // 'gps' or 'tambon'
  const [locationInfo, setLocationInfo] = useState(null) // { amphoe, tambon }

  // Get tambons for selected amphoe
  const getTambonsForAmphoe = (amphoe) => {
    return amphoe && TRAT_TAMBONS[amphoe] ? Object.keys(TRAT_TAMBONS[amphoe]) : []
  }

  // Handle amphoe selection
  const handleAmphoeChange = (e) => {
    const amphoe = e.target.value
    setSelectedAmphoe(amphoe)
    setSelectedTambon('')
    setError(null)
    setLocationSource(null)
    setDistanceFromBorder(null)
    setLocationInfo(null)
  }

  // Handle tambon selection
  const handleTambonChange = (e) => {
    const tambon = e.target.value
    setSelectedTambon(tambon)
    setError(null)

    if (tambon && selectedAmphoe && TRAT_TAMBONS[selectedAmphoe]?.[tambon]) {
      const coords = TRAT_TAMBONS[selectedAmphoe][tambon]
      const distance = calculateDistance(coords.lat, coords.lng, BORDER_POINT.lat, BORDER_POINT.lng)
      setDistanceFromBorder(Math.round(distance))
      setLocationSource('tambon')
      setLocationInfo({ amphoe: selectedAmphoe, tambon, inTrat: true })
    }
  }

  // Get GPS location and find nearest tambon
  const getGPSLocation = useCallback(() => {
    // Reset all state first
    setLoading(true)
    setError(null)
    setSelectedAmphoe('')
    setSelectedTambon('')
    setDistanceFromBorder(null)
    setLocationInfo(null)
    setLocationSource(null)

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
        
        // Find nearest tambon
        const nearest = findNearestTambon(latitude, longitude)
        
        // Check if user is actually in/near Trat province (within ~100km of any tambon)
        if (nearest && nearest.distance < 50) {
          // User is in Trat province
          setLocationInfo({
            amphoe: nearest.amphoe,
            tambon: nearest.tambon,
            distance: nearest.distance.toFixed(1),
            inTrat: true
          })
        } else {
          // User is outside Trat province
          setLocationInfo({
            amphoe: null,
            tambon: null,
            distance: nearest ? nearest.distance.toFixed(0) : null,
            inTrat: false,
            userLat: latitude.toFixed(4),
            userLng: longitude.toFixed(4)
          })
        }
        
        setLoading(false)
      },
      (err) => {
        console.error('GPS error:', err)
        setError('ไม่สามารถเข้าถึง GPS ได้ กรุณาเลือกอำเภอ/ตำบล')
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  const amphoeList = Object.keys(TRAT_TAMBONS)
  const tambonList = getTambonsForAmphoe(selectedAmphoe)

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

      {/* Input - Amphoe and Tambon Selection */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200">
        <div className="space-y-3">
          {/* Amphoe Selection */}
          <label className="block">
            <span className="text-sm text-slate-600 mb-1 block font-medium">เลือกอำเภอ</span>
            <div className="relative">
              <select
                value={selectedAmphoe}
                onChange={handleAmphoeChange}
                className="w-full p-3 border border-slate-300 rounded-xl text-lg bg-white appearance-none pr-10"
              >
                <option value="">-- เลือกอำเภอ --</option>
                {amphoeList.map((amphoe) => (
                  <option key={amphoe} value={amphoe}>อ.{amphoe}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
          </label>

          {/* Tambon Selection */}
          {selectedAmphoe && (
            <label className="block animate-fadeIn">
              <span className="text-sm text-slate-600 mb-1 block font-medium">เลือกตำบล</span>
              <div className="relative">
                <select
                  value={selectedTambon}
                  onChange={handleTambonChange}
                  className="w-full p-3 border border-slate-300 rounded-xl text-lg bg-white appearance-none pr-10"
                >
                  <option value="">-- เลือกตำบล --</option>
                  {tambonList.map((tambon) => (
                    <option key={tambon} value={tambon}>ต.{tambon}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
            </label>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-sm text-slate-400">หรือ</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          {/* GPS Button */}
          <button
            onClick={getGPSLocation}
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white p-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
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
              {locationSource === 'tambon' && ` (ต.${selectedTambon})`}
            </div>
            <div className="text-5xl font-bold my-2">{distanceFromBorder} กม.</div>
            <div className="text-xl font-medium">{getRiskLevel(distanceFromBorder).text}</div>
          </div>

          {/* Location Info */}
          {locationInfo && (
            <div className={`rounded-xl p-4 border ${locationInfo.inTrat ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className={`flex items-center gap-2 ${locationInfo.inTrat ? 'text-blue-800' : 'text-amber-800'}`}>
                <MapPin className="w-5 h-5 flex-shrink-0" />
                <div>
                  <div className="font-medium">ตำแหน่งของคุณ</div>
                  {locationInfo.inTrat ? (
                    <div className="text-sm">
                      ต.{locationInfo.tambon} อ.{locationInfo.amphoe} จ.ตราด
                      {locationSource === 'gps' && locationInfo.distance && (
                        <span className="text-blue-600"> (ห่างจากจุดศูนย์กลางตำบล ~{locationInfo.distance} กม.)</span>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm">
                      <span className="font-medium">คุณอยู่นอกจังหวัดตราด</span>
                      <br />
                      <span>พิกัด GPS: {locationInfo.userLat}, {locationInfo.userLng}</span>
                      {locationInfo.distance && (
                        <span className="text-amber-600"> (ห่างจากตราดประมาณ {locationInfo.distance} กม.)</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
