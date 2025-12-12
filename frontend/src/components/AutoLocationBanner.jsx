import { useState, useEffect } from 'react'
import { Navigation, AlertTriangle, MapPin, RefreshCw, Shield, X, ChevronDown, ChevronUp } from 'lucide-react'
import { getDistanceToBorder, getDistanceLevel } from '../data/borderLine'

/**
 * AutoLocationBanner Component
 * Automatically checks user's GPS location and shows danger level
 */
export default function AutoLocationBanner() {
  const [status, setStatus] = useState('idle') // idle | loading | success | error | denied
  const [locationResult, setLocationResult] = useState(null)
  const [expanded, setExpanded] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  // Auto-check on mount
  useEffect(() => {
    // Check if already dismissed this session
    const sessionDismissed = sessionStorage.getItem('locationBannerDismissed')
    if (sessionDismissed) {
      setDismissed(true)
      return
    }
    
    // Auto request GPS after 2 seconds
    const timer = setTimeout(() => {
      checkLocation()
    }, 1500)
    
    return () => clearTimeout(timer)
  }, [])

  // Fallback: IP-based geolocation for desktop (with multiple fallback services)
  const checkLocationByIP = async () => {
    // List of free IP geolocation APIs to try
    const ipServices = [
      {
        url: 'https://ip-api.com/json/?fields=lat,lon,city,regionName,status',
        parse: (data) => data.status === 'success' ? { latitude: data.lat, longitude: data.lon, city: data.city, region: data.regionName } : null
      },
      {
        url: 'https://ipwho.is/',
        parse: (data) => data.success !== false ? { latitude: data.latitude, longitude: data.longitude, city: data.city, region: data.region } : null
      },
      {
        url: 'https://ipapi.co/json/',
        parse: (data) => data.latitude ? { latitude: data.latitude, longitude: data.longitude, city: data.city, region: data.region } : null
      }
    ]

    for (const service of ipServices) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000) // 5s timeout
        
        const res = await fetch(service.url, { 
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        })
        clearTimeout(timeout)
        
        if (!res.ok) continue
        
        const data = await res.json()
        const parsed = service.parse(data)
        
        if (parsed?.latitude && parsed?.longitude) {
          const borderResult = getDistanceToBorder(parsed.latitude, parsed.longitude)
          const distance = borderResult.distance || borderResult.distanceRounded || borderResult
          const level = getDistanceLevel(distance)
          
          setLocationResult({
            lat: parsed.latitude,
            lng: parsed.longitude,
            accuracy: 5000, // IP geolocation is ~5km accuracy
            distance,
            level,
            isIPBased: true,
            city: parsed.city,
            region: parsed.region
          })
          setStatus('success')
          console.log('IP geolocation success via:', service.url)
          return true
        }
      } catch (e) {
        console.warn('IP geolocation failed for', service.url, e.message)
        continue // Try next service
      }
    }
    
    console.error('All IP geolocation services failed')
    return false
  }

  const checkLocation = async () => {
    if (!navigator.geolocation) {
      // No GPS support, try IP-based
      setStatus('loading')
      const success = await checkLocationByIP()
      if (!success) setStatus('error')
      return
    }

    setStatus('loading')

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        const borderResult = getDistanceToBorder(latitude, longitude)
        const distance = borderResult.distance || borderResult.distanceRounded || borderResult
        const level = getDistanceLevel(distance)
        
        setLocationResult({
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy),
          distance,
          level,
          isIPBased: false
        })
        setStatus('success')
      },
      async (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied')
        } else {
          // GPS failed (timeout or error), try IP-based fallback
          console.log('GPS failed, trying IP-based location...')
          const success = await checkLocationByIP()
          if (!success) setStatus('error')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('locationBannerDismissed', 'true')
  }

  // Return nothing if dismissed
  if (dismissed) return null

  // Loading state
  if (status === 'loading') {
    return (
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Navigation className="w-5 h-5 text-blue-500 animate-spin" />
          </div>
          <div>
            <div className="font-bold text-blue-800">กำลังค้นหาตำแหน่งของคุณ...</div>
            <div className="text-sm text-blue-600">กรุณาอนุญาตการเข้าถึง GPS</div>
          </div>
        </div>
      </div>
    )
  }

  // Permission denied
  if (status === 'denied') {
    return (
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="font-bold text-amber-800">ไม่สามารถเข้าถึงตำแหน่ง</div>
              <div className="text-sm text-amber-700 mt-1">
                กรุณาอนุญาตการเข้าถึง GPS เพื่อตรวจสอบว่าคุณอยู่ในเขตอันตรายหรือไม่
              </div>
              <button 
                onClick={checkLocation}
                className="mt-2 px-3 py-1 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> ลองใหม่
              </button>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-amber-400 hover:text-amber-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="bg-slate-100 border-2 border-slate-200 rounded-2xl p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <div className="font-bold text-slate-700">ไม่สามารถระบุตำแหน่ง</div>
              <div className="text-sm text-slate-600 mt-1">
                เบราว์เซอร์ไม่รองรับหรือไม่พบ GPS
              </div>
              <button 
                onClick={checkLocation}
                className="mt-2 px-3 py-1 bg-slate-600 text-white rounded-lg text-sm hover:bg-slate-700 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> ลองใหม่
              </button>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  // Success - Show result
  if (status === 'success' && locationResult) {
    const { level, distance } = locationResult
    const isDanger = distance < 52 // Within BM-21 range
    const isCritical = distance < 20 // High danger

    return (
      <div 
        className="rounded-2xl border-2 overflow-hidden transition-all"
        style={{ backgroundColor: level.bgColor || '#f3f4f6', borderColor: level.color }}
      >
        {/* Header - Always visible */}
        <div 
          className="p-4 flex items-start justify-between cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-start gap-3">
            <div 
              className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${isCritical ? 'animate-pulse' : ''}`}
              style={{ backgroundColor: level.color }}
            >
              <span className="text-2xl">{level.emoji}</span>
            </div>
            <div>
              <div className="text-xs opacity-70" style={{ color: level.color }}>
                📍 ตำแหน่งปัจจุบันของคุณ
                {locationResult.isIPBased && <span className="ml-1">(จาก IP)</span>}
              </div>
              <div className="font-bold text-xl" style={{ color: level.color }}>
                {level.text}
              </div>
              <div className="text-sm mt-1" style={{ color: level.color }}>
                ห่างจากชายแดน: <strong>{distance} กม.</strong>
                {locationResult.isIPBased && locationResult.city && (
                  <span className="opacity-70 ml-1"> ({locationResult.city})</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDismiss} className="p-1 hover:bg-black/10 rounded">
              <X className="w-4 h-4" style={{ color: level.color }} />
            </button>
            {expanded ? 
              <ChevronUp className="w-5 h-5" style={{ color: level.color }} /> : 
              <ChevronDown className="w-5 h-5" style={{ color: level.color }} />
            }
          </div>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="px-4 pb-4 space-y-3">
            {/* Warning message for danger zones */}
            {/* Warning message for danger zones */}
            {isCritical && (
              <div className="bg-red-600 text-white p-3 rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">⚠️ คุณอยู่ในเขตอันตราย!</div>
                  <div className="text-sm">แนะนำให้เตรียมพร้อมอพยพหากมีสถานการณ์ ติดตามข่าวสารอย่างใกล้ชิด</div>
                </div>
              </div>
            )}

            {isDanger && !isCritical && (
              <div className="bg-orange-500 text-white p-3 rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">⚠️ คุณอยู่ในระยะอาวุธ BM-21</div>
                  <div className="text-sm">เฝ้าระวังสถานการณ์ เตรียมแผนอพยพไว้</div>
                </div>
              </div>
            )}

            {/* Caution for PHL-03 */}
            {!isDanger && distance <= 130 && (
              <div className="bg-yellow-500 text-white p-3 rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">⚠️ คุณอยู่ในระยะอาวุธไกล (PHL-03)</div>
                  <div className="text-sm">ไม่อยู่ในระยะปืนใหญ่/BM-21 แต่ยังต้องเฝ้าระวัง</div>
                </div>
              </div>
            )}

            {distance > 130 && (
              <div className="bg-green-600 text-white p-3 rounded-xl flex items-start gap-2">
                <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">✅ คุณอยู่ในพื้นที่ปลอดภัย</div>
                  <div className="text-sm">อยู่นอกระยะอาวุธยิงสนับสนุนทุกชนิด</div>
                </div>
              </div>
            )}
9
            {/* Action buttons */}
            <div className="flex gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); checkLocation(); }}
                className="flex-1 py-2 bg-white/50 hover:bg-white/80 rounded-lg text-sm font-medium flex items-center justify-center gap-1"
                style={{ color: level.color }}
              >
                <RefreshCw className="w-4 h-4" /> อัพเดทตำแหน่ง
              </button>
            </div>

            {/* Level description */}
            <div className="text-xs text-center opacity-70" style={{ color: level.color }}>
              {level.description}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Idle - Show prompt to check
  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <div className="font-bold text-blue-800">ตรวจสอบตำแหน่งของคุณ</div>
            <div className="text-sm text-blue-600 mt-1">
              กดปุ่มเพื่อเช็คว่าคุณอยู่ในเขตอันตรายหรือไม่
            </div>
            <button 
              onClick={checkLocation}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
            >
              <Navigation className="w-4 h-4" /> ตรวจสอบตำแหน่ง
            </button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-blue-400 hover:text-blue-600">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
