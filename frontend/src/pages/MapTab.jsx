import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Circle, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import { Navigation, Map as MapIcon } from 'lucide-react'
import L from 'leaflet'

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// เส้นชายแดนตราด–กัมพูชา (อ้างอิงแนวเขาพนมดงรัก–คลองใหญ่–ไม้รูด)
const BORDER_LINE = [
  [11.6625, 102.9110], // หาดเล็ก
  [11.7205, 102.8925], // คลองใหญ่ใต้
  [11.8050, 102.8650], // ไม้รูด
  [11.9150, 102.8400], // ชายแดนบ่อไร่
  [12.0600, 102.8250], // เขาสมิงตะวันออก
  [12.1700, 102.8200], // เชื่อมจุดเหนือ
]

// เขตอันตราย - 5 ระดับ (พิกัดและรัศมีปรับตามภูมิประเทศจริง)
const DANGER_ZONES = [
  // 0–5 km จากชายแดน
  { 
    center: [11.6740, 102.9050], 
    radius: 4500, 
    level: "critical", 
    name: "ด่านหาดเล็ก (0–5 กม.)" 
  },
  // 5–10 km
  { 
    center: [11.7205, 102.8925], 
    radius: 9000, 
    level: "critical", 
    name: "คลองใหญ่–ชายแดนใต้ (5–10 กม.)" 
  },
  // 10–20 km
  { 
    center: [11.8200, 102.8550], 
    radius: 18000, 
    level: "high", 
    name: "ไม้รูด (10–20 กม.)" 
  },
  // 15–25 km
  { 
    center: [12.0100, 102.8350], 
    radius: 22000, 
    level: "high", 
    name: "บ่อไร่ (15–25 กม.)" 
  },
  // 25–45 km (พื้นที่ตัดกลางจังหวัด)
  { 
    center: [12.1300, 102.7500], 
    radius: 35000, 
    level: "moderate", 
    name: "เขาสมิง–กลางจังหวัด (25–45 กม.)" 
  },
  // 45–70 km (อ.เมืองตราด)
  { 
    center: [12.2500, 102.5177], 
    radius: 50000, 
    level: "low", 
    name: "เมืองตราด (45–70 กม.)" 
  },
  // ปลอดภัย – เกาะช้าง
  { 
    center: [12.0500, 102.3500], 
    radius: 30000, 
    level: "safe", 
    name: "เกาะช้าง (ปลอดภัย)" 
  },
]

const RISK_COLORS = {
  critical: '#dc2626',
  high: '#ea580c',
  moderate: '#f59e0b',
  low: '#84cc16',
  safe: '#22c55e'
}

const TRAT_CENTER = [12.0500, 102.6000]

// Zone filter levels
const ZONE_LEVELS = [
  { id: 'critical', name: 'อันตรายสูงสุด (0-10 กม.)', color: '#dc2626' },
  { id: 'high', name: 'อันตรายสูง (10-20 กม.)', color: '#ea580c' },
  { id: 'moderate', name: 'เสี่ยงปานกลาง (20-50 กม.)', color: '#f59e0b' },
  { id: 'low', name: 'เสี่ยงต่ำ (50-90 กม.)', color: '#84cc16' },
  { id: 'safe', name: 'ปลอดภัย (90+ กม.)', color: '#22c55e' },
]

// User marker - always blue
function UserMarker({ position }) {
  const color = '#3b82f6' // Fixed blue color
  const map = useMap()
  useEffect(() => {
    if (position) map.flyTo(position, 11, { duration: 1 })
  }, [position, map])
  
  if (!position) return null
  
  return (
    <Marker 
      position={position}
      icon={L.divIcon({
        html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })}
    >
      <Popup><strong>ตำแหน่งของคุณ</strong></Popup>
    </Marker>
  )
}

export default function MapTab() {
  const [userPosition, setUserPosition] = useState(null)
  const [showBorder, setShowBorder] = useState(true)
  const [loading, setLoading] = useState(false)
  // Individual zone visibility controls
  const [visibleZones, setVisibleZones] = useState({
    critical: true,
    high: true,
    moderate: true,
    low: true,
    safe: true
  })

  const toggleZone = (zoneId) => {
    setVisibleZones(prev => ({ ...prev, [zoneId]: !prev[zoneId] }))
  }
  
  const getUserLocation = () => {
    setLoading(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserPosition([pos.coords.latitude, pos.coords.longitude])
          setLoading(false)
        },
        () => {
          setLoading(false)
          alert('ไม่สามารถเข้าถึงตำแหน่งได้')
        },
        { enableHighAccuracy: true }
      )
    }
  }

  return (
    <div className="space-y-4">
      {/* Map */}
      <div className="bg-slate-800 rounded-2xl overflow-hidden relative" style={{ height: '400px' }}>
        <MapContainer center={TRAT_CENTER} zoom={9} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {/* Risk Zones */}
          {DANGER_ZONES.filter(zone => visibleZones[zone.level]).map((zone, i) => (
            <Circle
              key={i}
              center={zone.center}
              radius={zone.radius}
              pathOptions={{
                color: RISK_COLORS[zone.level],
                fillColor: RISK_COLORS[zone.level],
                fillOpacity: 0.25,
                weight: 2
              }}
            >
              <Popup>
                <strong>{zone.name}</strong><br />
                <span style={{ color: RISK_COLORS[zone.level] }}>
                  {zone.level === 'critical' ? 'อันตรายสูงสุด' : 
                   zone.level === 'high' ? 'อันตรายสูง' :
                   zone.level === 'moderate' ? 'เสี่ยงปานกลาง' : 
                   zone.level === 'low' ? 'เสี่ยงต่ำ' : 'ปลอดภัย'}
                </span>
              </Popup>
            </Circle>
          ))}
          
          {/* Border */}
          {showBorder && (
            <Polyline positions={BORDER_LINE} pathOptions={{ color: '#dc2626', weight: 3, dashArray: '10, 5' }} />
          )}
          
          <UserMarker position={userPosition} />
        </MapContainer>
        
        <button
          onClick={getUserLocation}
          disabled={loading}
          className="absolute top-4 left-4 z-[1000] bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 hover:bg-blue-600"
        >
          <Navigation className="w-4 h-4" />
          {loading ? 'กำลังค้นหา...' : 'ตำแหน่งของฉัน'}
        </button>
      </div>

      {/* Controls - Zone Selection */}
      <div className="bg-white rounded-xl p-4 border border-slate-200">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <MapIcon className="w-5 h-5" />
          ควบคุมชั้นข้อมูล
        </h3>
        
        {/* Individual Zone Toggles */}
        <p className="text-sm text-slate-500 mb-2">🔴 เขตอันตราย (เลือกแสดง/ซ่อนแต่ละระดับ)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {ZONE_LEVELS.map((zone) => (
            <label key={zone.id} className="flex items-center gap-2 cursor-pointer text-sm p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <input 
                type="checkbox" 
                checked={visibleZones[zone.id]} 
                onChange={() => toggleZone(zone.id)} 
                className="w-4 h-4 rounded" 
              />
              <div 
                className="w-4 h-4 rounded-full border border-white shadow"
                style={{ backgroundColor: zone.color }}
              />
              <span>{zone.name}</span>
            </label>
          ))}
        </div>
        
        {/* Border Toggle */}
        <div className="border-t pt-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" checked={showBorder} onChange={(e) => setShowBorder(e.target.checked)} className="w-4 h-4 rounded" />
            🚧 เส้นชายแดน
          </label>
        </div>
      </div>
      
      {/* Legend */}
      <div className="bg-white rounded-xl p-4 border border-slate-200">
        <h3 className="font-bold mb-3">คำอธิบายสัญลักษณ์</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {ZONE_LEVELS.map((zone) => (
            <div key={zone.id} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: zone.color }} />
              <span>{zone.name}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 col-span-2 border-t pt-2 mt-1">
            <div className="w-4 h-4 rounded-full bg-blue-500" />
            <span>ตำแหน่งของคุณ</span>
          </div>
        </div>
      </div>
    </div>
  )
}
