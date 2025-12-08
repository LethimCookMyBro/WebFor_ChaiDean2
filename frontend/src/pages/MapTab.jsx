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

// เส้นชายแดน
const BORDER_LINE = [
  [11.6833, 102.9167],
  [11.7500, 102.9000],
  [11.8500, 102.8800],
  [11.9500, 102.8600],
  [12.1000, 102.8400],
  [12.2500, 102.8600],
  [12.3500, 102.8800],
]

// เขตอันตราย - 5 ระดับ
const DANGER_ZONES = [
  { center: [11.6900, 102.9100], radius: 5000, level: "critical", name: "ด่านหาดเล็ก (0-5 กม.)" },
  { center: [11.7200, 102.8900], radius: 10000, level: "critical", name: "ชายแดนใต้ (5-10 กม.)" },
  { center: [11.8333, 102.8500], radius: 20000, level: "high", name: "ไม้รูด (10-20 กม.)" },
  { center: [12.3000, 102.8333], radius: 15000, level: "high", name: "บ่อไร่ (15-20 กม.)" },
  { center: [12.0000, 102.7000], radius: 30000, level: "moderate", name: "พื้นที่กลาง (20-50 กม.)" },
  { center: [12.2428, 102.5177], radius: 40000, level: "low", name: "เมืองตราด (50-90 กม.)" },
  { center: [12.0500, 102.3500], radius: 30000, level: "safe", name: "เกาะช้าง (ปลอดภัย)" },
]

const RISK_COLORS = {
  critical: '#dc2626',
  high: '#ea580c',
  moderate: '#f59e0b',
  low: '#84cc16',
  safe: '#22c55e'
}

const TRAT_CENTER = [12.0500, 102.6000]

// Available marker colors
const MARKER_COLORS = [
  { id: 'purple', name: 'ม่วง', color: '#8b5cf6' },
  { id: 'blue', name: 'ฟ้า', color: '#3b82f6' },
  { id: 'green', name: 'เขียว', color: '#22c55e' },
  { id: 'red', name: 'แดง', color: '#ef4444' },
  { id: 'orange', name: 'ส้ม', color: '#f97316' },
  { id: 'yellow', name: 'เหลือง', color: '#eab308' },
]

// User marker
function UserMarker({ position, color = '#8b5cf6' }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.flyTo(position, 11, { duration: 1 })
  }, [position, map])
  
  if (!position) return null
  
  return (
    <Marker 
      position={position}
      icon={L.divIcon({
        html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 3px ${color}40;"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      })}
    >
      <Popup><strong>ตำแหน่งของคุณ</strong></Popup>
    </Marker>
  )
}

export default function MapTab() {
  const [userPosition, setUserPosition] = useState(null)
  const [showZones, setShowZones] = useState(true)
  const [showBorder, setShowBorder] = useState(true)
  const [loading, setLoading] = useState(false)
  const [markerColor, setMarkerColor] = useState('#8b5cf6')
  
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
          {showZones && DANGER_ZONES.map((zone, i) => (
            <Circle
              key={i}
              center={zone.center}
              radius={zone.radius}
              pathOptions={{
                color: RISK_COLORS[zone.level],
                fillColor: RISK_COLORS[zone.level],
                fillOpacity: 0.2,
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
          
          <UserMarker position={userPosition} color={markerColor} />
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

      {/* Marker Color Selector */}
      <div className="bg-white rounded-xl p-4 border border-slate-200">
        <h3 className="font-bold mb-3">🎨 เลือกสี Marker ตำแหน่ง</h3>
        <div className="flex flex-wrap gap-2">
          {MARKER_COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => setMarkerColor(c.color)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                markerColor === c.color 
                  ? 'border-slate-800 bg-slate-100' 
                  : 'border-transparent hover:bg-slate-50'
              }`}
            >
              <div 
                className="w-5 h-5 rounded-full border-2 border-white shadow"
                style={{ backgroundColor: c.color }}
              />
              <span className="text-sm">{c.name}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Controls */}
      <div className="bg-white rounded-xl p-4 border border-slate-200">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <MapIcon className="w-5 h-5" />
          ควบคุมชั้นข้อมูล
        </h3>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" checked={showZones} onChange={(e) => setShowZones(e.target.checked)} className="w-4 h-4 rounded" />
            🔴 เขตอันตราย (5 ระดับ)
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" checked={showBorder} onChange={(e) => setShowBorder(e.target.checked)} className="w-4 h-4 rounded" />
            🚧 เส้นชายแดน
          </label>
        </div>
      </div>
      
      {/* Legend */}
      <div className="bg-white rounded-xl p-4 border border-slate-200">
        <h3 className="font-bold mb-3">คำอธิบายสัญลักษณ์ (5 ระดับ)</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-600" />
            <span>อันตรายสูงสุด (0-10 กม.)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-500" />
            <span>อันตรายสูง (10-20 กม.)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-amber-500" />
            <span>เสี่ยงปานกลาง (20-50 กม.)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-lime-500" />
            <span>เสี่ยงต่ำ (50-90 กม.)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500" />
            <span>ปลอดภัย (90+ กม.)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-purple-500" />
            <span>ตำแหน่งของคุณ</span>
          </div>
        </div>
      </div>
    </div>
  )
}
