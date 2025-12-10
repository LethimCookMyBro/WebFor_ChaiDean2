import { useState, useMemo } from 'react'
import { MapPin, Navigation, AlertTriangle, Target, Info } from 'lucide-react'
import { TRAT_TAMBONS, AMPHOE_LIST, getTambonsByAmphoe, getTambonCoords } from '../data/tratTambons'
import { getDistanceToBorder, getDistanceLevel } from '../data/borderLine'

// ระยะอาวุธ (สำหรับอ้างอิง)
const WEAPON_RANGES = [
  { name: 'ปืนใหญ่ภาคพื้น (D-30)', range: 15, icon: '💣' },
  { name: 'BM-21 Grad', range: 40, icon: '🚀' },
  { name: 'Type 90B MLRS', range: 40, icon: '🚀' },
  { name: 'PHL-03', range: 130, icon: '🎯' },
]

export default function CheckTab() {
  const [activeTab, setActiveTab] = useState('gps') // 'gps' | 'select'
  const [selectedAmphoe, setSelectedAmphoe] = useState('')
  const [selectedTambon, setSelectedTambon] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  // รายชื่อตำบลตามอำเภอที่เลือก
  const tambonList = useMemo(() => {
    if (!selectedAmphoe) return []
    return getTambonsByAmphoe(selectedAmphoe)
  }, [selectedAmphoe])

  // ใช้ GPS
  const handleGetGPS = () => {
    setLoading(true)
    setError(null)
    setResult(null)

    if (!navigator.geolocation) {
      setError('เบราว์เซอร์ไม่รองรับ GPS')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const borderResult = getDistanceToBorder(latitude, longitude)
        const distance = borderResult.distance || borderResult.distanceRounded || borderResult
        const level = getDistanceLevel(distance)
        
        setResult({
          location: 'ตำแหน่งปัจจุบัน (GPS)',
          lat: latitude,
          lng: longitude,
          distance,
          level,
          nearestPoint: borderResult.nearestPoint
        })
        setLoading(false)
      },
      (err) => {
        setError('ไม่สามารถเข้าถึงตำแหน่งได้ กรุณาอนุญาตการเข้าถึง GPS')
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  // เลือกตำบลแล้วคำนวณ
  const handleCalculateFromTambon = () => {
    if (!selectedAmphoe || !selectedTambon) {
      setError('กรุณาเลือกอำเภอและตำบล')
      return
    }

    const coords = getTambonCoords(selectedAmphoe, selectedTambon)
    if (!coords) {
      setError('ไม่พบข้อมูลตำบลนี้')
      return
    }

    const borderResult = getDistanceToBorder(coords.lat, coords.lng)
    const distance = borderResult.distance || borderResult.distanceRounded || borderResult
    const level = getDistanceLevel(distance)

    setResult({
      location: `ต.${selectedTambon} อ.${selectedAmphoe}`,
      lat: coords.lat,
      lng: coords.lng,
      distance,
      level,
      nearestPoint: borderResult.nearestPoint
    })
    setError(null)
  }

  // Reset เมื่อเปลี่ยน Tab
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setResult(null)
    setError(null)
    setSelectedAmphoe('')
    setSelectedTambon('')
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold text-slate-800">📍 เช็คระยะจากชายแดน</h1>
        <p className="text-sm text-slate-500">จากแนวชายแดนไทย-กัมพูชา (โดยประมาณ)</p>
      </div>

      {/* Tab Switch */}
      <div className="flex bg-slate-100 rounded-xl p-1">
        <button
          onClick={() => handleTabChange('gps')}
          className={`flex-1 py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'gps' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Navigation className="w-4 h-4" />
          ใช้ GPS
        </button>
        <button
          onClick={() => handleTabChange('select')}
          className={`flex-1 py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'select' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4" />
          เลือกตำบล
        </button>
      </div>

      {/* GPS Tab Content */}
      {activeTab === 'gps' && (
        <div className="space-y-4">
          <button
            onClick={handleGetGPS}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <Navigation className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'กำลังค้นหาตำแหน่ง...' : '📍 เช็คตำแหน่งของฉัน'}
          </button>
          <p className="text-center text-xs text-slate-400">
            กดปุ่มด้านบนเพื่อใช้ GPS ระบุตำแหน่งปัจจุบัน
          </p>
        </div>
      )}

      {/* Select Tab Content */}
      {activeTab === 'select' && (
        <div className="space-y-3">
          {/* Amphoe Dropdown */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">อำเภอ</label>
            <select
              value={selectedAmphoe}
              onChange={(e) => {
                setSelectedAmphoe(e.target.value)
                setSelectedTambon('')
                setResult(null)
              }}
              className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">-- เลือกอำเภอ --</option>
              {AMPHOE_LIST.map(amphoe => (
                <option key={amphoe} value={amphoe}>{amphoe}</option>
              ))}
            </select>
          </div>

          {/* Tambon Dropdown */}
          {selectedAmphoe && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ตำบล</label>
              <select
                value={selectedTambon}
                onChange={(e) => {
                  setSelectedTambon(e.target.value)
                  setResult(null)
                }}
                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">-- เลือกตำบล --</option>
                {tambonList.map(tambon => (
                  <option key={tambon} value={tambon}>{tambon}</option>
                ))}
              </select>
            </div>
          )}

          {/* Calculate Button */}
          {selectedTambon && (
            <button
              onClick={handleCalculateFromTambon}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow transition-all"
            >
              <MapPin className="w-5 h-5" />
              คำนวณระยะห่าง
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
          {/* Location */}
          <div className="p-4 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="w-4 h-4" />
              <span><strong>ตำแหน่ง:</strong> {result.location}</span>
            </div>
          </div>

          {/* Distance */}
          <div className="p-6 text-center">
            <div className="text-sm text-slate-500 mb-1">📏 ระยะห่างจากชายแดน (โดยประมาณ)</div>
            <div className="text-5xl font-bold text-slate-800">
              {result.distance} <span className="text-2xl">กม.</span>
            </div>
          </div>

          {/* Risk Level */}
          <div 
            className="p-6 text-center text-white"
            style={{ backgroundColor: result.level.color }}
          >
            <div className="text-4xl mb-2">{result.level.emoji}</div>
            <div className="text-2xl font-bold">{result.level.text}</div>
            <div className="text-sm opacity-90 mt-1">{result.level.description}</div>
          </div>

          {/* Weapon Assessment */}
          <div className="p-4">
            <h3 className="font-bold text-sm text-slate-600 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" /> ระยะอาวุธ (อ้างอิง)
            </h3>
            <div className="space-y-2">
              {WEAPON_RANGES.map((weapon, i) => {
                const inRange = result.distance <= weapon.range
                return (
                  <div key={i} className={`flex items-center justify-between p-2 rounded-lg ${inRange ? 'bg-red-50' : 'bg-green-50'}`}>
                    <div className="flex items-center gap-2">
                      <span>{weapon.icon}</span>
                      <span className="text-sm font-medium">{weapon.name}</span>
                      <span className="text-xs text-slate-400">({weapon.range} กม.)</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${inRange ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {inRange ? '⚠️ อยู่ในระยะ' : '✓ นอกระยะ'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-800 font-medium">
              ⚠️ ข้อมูลเป็นการประมาณการเท่านั้น
            </p>
            <p className="text-xs text-amber-700 mt-1">
              ระยะที่คำนวณอาจมีความคลาดเคลื่อน เนื่องจากใช้จุดอ้างอิงหลายจุดบนแนวชายแดน 
              ไม่ใช่เส้นชายแดนจริงทั้งหมด กรุณาติดตามข่าวสารจากหน่วยงานราชการเป็นหลัก
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
