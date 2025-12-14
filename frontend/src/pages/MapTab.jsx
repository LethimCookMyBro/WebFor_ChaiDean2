import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Circle, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet'
import { Navigation, Target, MousePointer2 } from 'lucide-react'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// เส้นชายแดน - ฝั่งกัมพูชา
const BORDER_LINE = [
  [12.18, 102.92], [12.14, 102.94], [12.10, 102.95],
  [12.05, 102.96], [12.00, 102.95], [11.95, 102.97],
  [11.90, 102.96], [11.85, 102.97], [11.80, 102.96],
  [11.75, 102.97], [11.70, 102.95], [11.65, 102.94],
  [11.60, 102.93], [11.55, 102.92], [11.50, 102.92],
]

// โซนความปลอดภัย - ทั้งหมด
const ALL_ZONES = [
  { range: 10, label: '🚨 วิกฤต', desc: '0-10 กม.', color: '#991b1b', fillOpacity: 0.35 },
  { range: 52, label: '🟠 ระยะ BM-21', desc: '10-52 กม.', color: '#ea580c', fillOpacity: 0.20 },
  { range: 90, label: '🔴 ระยะกลาง PHL-03', desc: '52-90 กม.', color: '#dc2626', fillOpacity: 0.22 },
  { range: 130, label: '🟡 ระยะไกล PHL-03', desc: '90-130 กม.', color: '#eab308', fillOpacity: 0.12 },
]

// อาวุธ - ระยะยิงจริง + โซนที่แสดงบนแผนที่
// NOTE: displayScale ใช้ลดขนาดวงกลมในแผนที่ให้ดูสมจริง (ค่าจริง x displayScale)
const WEAPONS = {
  mlrs: { 
    name: 'BM-21 Grad / Type90B', 
    icon: '🚀', 
    maxRange: 52,  // ระยะยิงสูงสุดจริง 52 กม.
    displayScale: 0.6,  // วาดที่ 60% ของขนาดจริง
    zones: [
      { range: 10, color: '#991b1b', fillOpacity: 0.35, label: '0-10 กม.' },
      { range: 25, color: '#dc2626', fillOpacity: 0.25, label: '10-25 กม.' },
      { range: 52, color: '#ea580c', fillOpacity: 0.15, label: '25-52 กม.' },
    ]
  },
  phl03: { 
    name: 'PHL-03', 
    icon: '🎯', 
    maxRange: 130,  // ระยะยิงสูงสุดจริง 130 กม.
    displayScale: 0.4,  // วาดที่ 40% ของขนาดจริง (เล็กลงเยอะ)
    zones: [
      { range: 40, color: '#dc2626', fillOpacity: 0.35, label: '0-40 กม.' },
      { range: 80, color: '#ea580c', fillOpacity: 0.22, label: '40-80 กม.' },
      { range: 130, color: '#eab308', fillOpacity: 0.12, label: '80-130 กม.' },
    ]
  },
}

const TRAT_CENTER = [11.80, 102.80]

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click(e) { onMapClick(e.latlng) } })
  return null
}

function UserMarker({ position }) {
  const map = useMap()
  useEffect(() => { if (position) map.flyTo(position, 10, { duration: 1 }) }, [position, map])
  if (!position) return null
  return (
    <Marker position={position}
      icon={L.divIcon({
        html: `<div style="background:#3b82f6;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(59,130,246,0.5);"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7]
      })}>
      <Popup><strong>📍 ตำแหน่งของคุณ</strong></Popup>
    </Marker>
  )
}

export default function MapTab() {
  const [userPosition, setUserPosition] = useState(null)
  const [loading, setLoading] = useState(false)
  const [simPoint, setSimPoint] = useState(null)
  const [weaponType, setWeaponType] = useState('mlrs')
  
  const currentWeapon = WEAPONS[weaponType]
  
  const getUserLocation = () => {
    setLoading(true)
    navigator.geolocation?.getCurrentPosition(
      (pos) => { setUserPosition([pos.coords.latitude, pos.coords.longitude]); setLoading(false) },
      () => { setLoading(false); alert('ไม่สามารถเข้าถึงตำแหน่งได้') },
      { enableHighAccuracy: true }
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-blue-800 text-sm flex items-center gap-2">
        <MousePointer2 className="w-4 h-4 flex-shrink-0" />
        <span><strong>แตะแผนที่</strong> เพื่อจำลองจุดยิง</span>
      </div>

      {/* Weapon Selector */}
      <div className="flex gap-2">
        {Object.entries(WEAPONS).map(([key, w]) => (
          <button key={key} onClick={() => setWeaponType(key)}
            className={`flex-1 p-2 rounded-lg border-2 text-center transition-all ${
              weaponType === key ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
            }`}>
            <div className="text-lg">{w.icon}</div>
            <div className="text-xs font-medium">{w.name}</div>
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="bg-slate-800 rounded-2xl overflow-hidden relative shadow-lg" style={{ height: '380px' }}>
        <MapContainer center={TRAT_CENTER} zoom={9} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClickHandler onMapClick={(latlng) => setSimPoint([latlng.lat, latlng.lng])} />
          
          {/* Border */}
          <Polyline positions={BORDER_LINE} pathOptions={{ color: '#dc2626', weight: 3, dashArray: '8, 6', opacity: 0.9 }} />
          
          {/* Weapon-specific Zones - ใช้ displayScale ลดขนาด */}
          {simPoint && [...currentWeapon.zones].reverse().map((zone, i) => (
            <Circle key={`zone-${i}`} center={simPoint} 
              radius={zone.range * 1000 * (currentWeapon.displayScale || 1)}
              pathOptions={{ 
                color: zone.color, 
                fillColor: zone.color, 
                fillOpacity: zone.fillOpacity, 
                weight: 1.5,
                opacity: 0.6
              }} />
          ))}
          
          {/* Max Range Circle - เส้นประ (ใช้ displayScale) */}
          {simPoint && (
            <Circle center={simPoint} 
              radius={currentWeapon.maxRange * 1000 * (currentWeapon.displayScale || 1)}
              pathOptions={{ 
                color: currentWeapon.zones[currentWeapon.zones.length - 1].color, 
                fillOpacity: 0, 
                weight: 3, 
                dashArray: '10, 6',
                opacity: 1
              }} />
          )}
          
          {simPoint && (
            <Marker position={simPoint} 
              icon={L.divIcon({ html: '<div style="font-size:16px;">💥</div>', className: '', iconAnchor: [8, 8] })} />
          )}
          
          <UserMarker position={userPosition} />
        </MapContainer>
        
        {/* GPS Button */}
        <button onClick={getUserLocation} disabled={loading}
          className="absolute top-3 right-3 z-[1000] bg-white text-slate-700 p-2.5 rounded-full shadow-lg hover:bg-slate-50">
          <Navigation className={`w-5 h-5 ${loading ? 'animate-spin text-blue-500' : ''}`} />
        </button>
        

        {/* Sim Info */}
        {simPoint && (
          <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur rounded-lg p-2 text-[10px] shadow-lg">
            <div className="font-bold mb-1">💥 {currentWeapon.icon} {currentWeapon.name}</div>
            <div className="text-slate-500">ระยะสูงสุด: {currentWeapon.maxRange} กม.</div>
            <button onClick={() => setSimPoint(null)} className="text-red-500 hover:text-red-700 font-medium mt-1">✕ ล้าง</button>
          </div>
        )}
      </div>

      {/* Legend - ตามอาวุธที่เลือก */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Target className="w-4 h-4" /> {currentWeapon.icon} {currentWeapon.name} (ระยะ {currentWeapon.maxRange} กม.)
        </h3>
        <div className={`grid gap-2 ${currentWeapon.zones.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
          {currentWeapon.zones.map((z, i) => {
            const prevRange = i === 0 ? 0 : currentWeapon.zones[i - 1].range
            return (
              <div key={i} className="text-center p-2 rounded-lg" style={{ backgroundColor: `${z.color}20` }}>
                <div className="w-6 h-6 mx-auto rounded-full mb-1" style={{ backgroundColor: z.color }}></div>
                <div className="text-[10px] text-slate-600">{prevRange}-{z.range} กม.</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <p className="text-xs text-amber-800 text-center">
          ⚠️ <strong>นี่เป็นการจำลองเท่านั้น</strong> — อย่าเชื่อถือข้อมูลนี้ 100% กรุณาติดตามข่าวจากหน่วยงานราชการ
        </p>
      </div>
    </div>
  )
}
