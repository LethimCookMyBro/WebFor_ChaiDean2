import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Eye, EyeOff, Layers, MapPin } from 'lucide-react'

// Border provinces GeoJSON (inline for frontend)
const borderProvinces = [
  { name: 'Buriram', coords: [[14.2, 102.5], [14.2, 103.5], [14.8, 103.8], [15.2, 103.5], [15.3, 102.8], [14.9, 102.3], [14.2, 102.5]], color: '#3B82F6' },
  { name: 'Surin', coords: [[14.2, 103.5], [14.2, 104.3], [14.8, 104.5], [15.3, 104.2], [15.2, 103.5], [14.2, 103.5]], color: '#8B5CF6' },
  { name: 'Sisaket', coords: [[14.2, 104.3], [14.3, 104.9], [14.8, 105.2], [15.4, 104.9], [15.3, 104.2], [14.2, 104.3]], color: '#EC4899' },
  { name: 'Ubon', coords: [[14.3, 104.9], [14.5, 105.6], [15.2, 105.8], [16.0, 105.5], [15.8, 104.8], [15.4, 104.9], [14.3, 104.9]], color: '#F59E0B' },
  { name: 'Sa Kaeo', coords: [[13.5, 102.0], [13.4, 102.7], [14.1, 102.8], [14.2, 102.5], [14.0, 101.9], [13.5, 102.0]], color: '#10B981' },
  { name: 'Chanthaburi', coords: [[12.4, 101.8], [12.5, 102.5], [13.4, 102.7], [13.5, 102.0], [13.0, 101.5], [12.4, 101.8]], color: '#6366F1' },
  { name: 'Trat', coords: [[11.8, 102.5], [11.9, 102.9], [12.5, 102.9], [12.5, 102.5], [12.2, 102.3], [11.8, 102.5]], color: '#14B8A6' }
]

// Risk thresholds in km
const HIGH_DANGER_RANGE = 20
const BM21_RANGE = 52
const PHL03_RANGE = 130

// Custom marker icon
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// Component to recenter map when user location changes
function RecenterMap({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lon], 10)
    }
  }, [center, map])
  return null
}

export default function RiskMap({ riskData, userLocation }) {
  const [showLegend, setShowLegend] = useState(true)
  const [showControls, setShowControls] = useState(true)
  
  // Toggle states for each layer
  const [layers, setLayers] = useState({
    provinces: true,
    userMarker: true,
    highDanger: true,
    bm21: true,
    phl03: true,
    border: true
  })

  const toggleLayer = (layer) => {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }))
  }

  // Default center on Thailand-Cambodia border region
  const defaultCenter = [14.0, 103.5]
  const center = userLocation ? [userLocation.lat, userLocation.lon] : defaultCenter

  return (
    <div className="h-full relative">
      {/* Layer Toggle Controls */}
      <div className="absolute top-4 right-4 z-[1000]">
        <button
          onClick={() => setShowControls(!showControls)}
          className="bg-slate-900/90 backdrop-blur-sm rounded-lg p-2 mb-2 text-white hover:bg-slate-800"
          title="Toggle Controls"
        >
          <Layers className="w-5 h-5" />
        </button>
        
        {showControls && (
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg p-3 space-y-2 animate-fadeIn">
            <p className="text-xs text-slate-400 font-semibold mb-2 flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Toggle Layers
            </p>
            
            {/* User Marker Toggle */}
            <label className="flex items-center gap-2 text-sm text-white cursor-pointer hover:bg-slate-800/50 p-1 rounded">
              <input
                type="checkbox"
                checked={layers.userMarker}
                onChange={() => toggleLayer('userMarker')}
                className="rounded text-red-500 focus:ring-red-500"
              />
              <MapPin className="w-4 h-4 text-red-500" />
              <span>ตำแหน่งของคุณ</span>
            </label>
            
            {/* High Danger Zone Toggle */}
            <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-800/50 p-1 rounded">
              <input
                type="checkbox"
                checked={layers.highDanger}
                onChange={() => toggleLayer('highDanger')}
                className="rounded text-red-600 focus:ring-red-600"
              />
              <div className="w-4 h-4 rounded-full bg-red-600 border-2 border-red-400"></div>
              <span className="text-red-400">อันตรายสูง (&lt;20km)</span>
            </label>
            
            {/* BM-21 Range Toggle */}
            <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-800/50 p-1 rounded">
              <input
                type="checkbox"
                checked={layers.bm21}
                onChange={() => toggleLayer('bm21')}
                className="rounded text-orange-500 focus:ring-orange-500"
              />
              <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-orange-300"></div>
              <span className="text-orange-400">BM-21 (52km)</span>
            </label>
            
            {/* PHL-03 Range Toggle */}
            <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-800/50 p-1 rounded">
              <input
                type="checkbox"
                checked={layers.phl03}
                onChange={() => toggleLayer('phl03')}
                className="rounded text-yellow-500 focus:ring-yellow-500"
              />
              <div className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-yellow-300"></div>
              <span className="text-yellow-400">PHL-03 (130km)</span>
            </label>

            <hr className="border-slate-700" />

            {/* Provinces Toggle */}
            <label className="flex items-center gap-2 text-sm text-white cursor-pointer hover:bg-slate-800/50 p-1 rounded">
              <input
                type="checkbox"
                checked={layers.provinces}
                onChange={() => toggleLayer('provinces')}
                className="rounded"
              />
              <span>🗺️ จังหวัดชายแดน</span>
            </label>
            
            {/* Border Line Toggle */}
            <label className="flex items-center gap-2 text-sm text-white cursor-pointer hover:bg-slate-800/50 p-1 rounded">
              <input
                type="checkbox"
                checked={layers.border}
                onChange={() => toggleLayer('border')}
                className="rounded"
              />
              <span>🔴 เส้นชายแดน</span>
            </label>
          </div>
        )}
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 z-[1000]">
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="bg-slate-900/90 backdrop-blur-sm rounded-lg p-2 mb-2 text-white hover:bg-slate-800"
          title="Toggle Legend"
        >
          {showLegend ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        
        {showLegend && (
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg p-3 text-xs">
            <p className="text-slate-400 font-semibold mb-2">Risk Zones</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                <span className="text-white">อันตรายสูง (&lt;20km)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-white">BM-21 Range (≤52km)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-white">PHL-03 Range (≤130km)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-white">ปลอดภัย (&gt;130km)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <MapContainer
        center={center}
        zoom={7}
        className="h-full w-full rounded-xl"
        style={{ background: '#0f172a' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterMap center={userLocation} />

        {/* Province Polygons */}
        {layers.provinces && borderProvinces.map((province) => (
          <Polygon
            key={province.name}
            positions={province.coords}
            pathOptions={{
              color: province.color,
              fillColor: province.color,
              fillOpacity: 0.2,
              weight: 2
            }}
          >
            <Popup>{province.name}</Popup>
          </Polygon>
        ))}

        {/* User Location Marker & Range Circles */}
        {userLocation && layers.userMarker && (
          <Marker position={[userLocation.lat, userLocation.lon]} icon={userIcon}>
            <Popup>
              <div className="text-center">
                <strong>ตำแหน่งของคุณ</strong><br />
                {userLocation.lat.toFixed(4)}, {userLocation.lon.toFixed(4)}<br />
                {riskData && (
                  <>
                    <span className="font-semibold">{riskData.distance_km} km</span> จากชายแดน<br />
                    โซน: <span className="font-semibold">{riskData.zone}</span>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* High Danger Zone Circle (20km) */}
        {userLocation && layers.highDanger && (
          <Circle
            center={[userLocation.lat, userLocation.lon]}
            radius={HIGH_DANGER_RANGE * 1000}
            pathOptions={{
              color: '#DC2626',
              fillColor: '#DC2626',
              fillOpacity: 0.15,
              weight: 2
            }}
          />
        )}

        {/* BM-21 Range Circle (52km) */}
        {userLocation && layers.bm21 && (
          <Circle
            center={[userLocation.lat, userLocation.lon]}
            radius={BM21_RANGE * 1000}
            pathOptions={{
              color: '#EA580C',
              fillColor: '#EA580C',
              fillOpacity: 0.1,
              weight: 2,
              dashArray: '5, 5'
            }}
          />
        )}

        {/* PHL-03 Range Circle (130km) */}
        {userLocation && layers.phl03 && (
          <Circle
            center={[userLocation.lat, userLocation.lon]}
            radius={PHL03_RANGE * 1000}
            pathOptions={{
              color: '#CA8A04',
              fillColor: '#CA8A04',
              fillOpacity: 0.05,
              weight: 2,
              dashArray: '10, 10'
            }}
          />
        )}

        {/* Border Line Approximation */}
        {layers.border && (
          <Polygon
            positions={[
              [11.9, 102.9], [12.3, 102.85], [12.8, 102.7], [13.3, 102.6], [13.6, 102.55],
              [13.9, 102.6], [14.15, 102.7], [14.25, 102.9], [14.25, 103.2], [14.18, 103.5],
              [14.15, 103.8], [14.15, 104.1], [14.18, 104.4], [14.25, 104.7], [14.35, 105.0],
              [14.45, 105.3], [14.55, 105.5]
            ]}
            pathOptions={{
              color: '#DC2626',
              weight: 3,
              fillOpacity: 0,
              dashArray: '0'
            }}
          >
            <Popup>เส้นชายแดนไทย-กัมพูชา</Popup>
          </Polygon>
        )}
      </MapContainer>
    </div>
  )
}
