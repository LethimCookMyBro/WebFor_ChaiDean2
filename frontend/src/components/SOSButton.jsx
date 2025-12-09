import { useState, useRef, useCallback, useEffect } from 'react'
import { Siren, Phone, MapPin, CheckCircle, Navigation } from 'lucide-react'

/**
 * SOSButton Component
 * กดค้าง 3 วินาที → บันทึกลง localStorage → แสดงใน Admin
 * ใช้ GPS ตำแหน่งของผู้ใช้เอง (ไม่ใช่ครอบครัว)
 */
export default function SOSButton({ userId, userName, userPhone, userDistrict, onSOSTriggered }) {
  const [isHolding, setIsHolding] = useState(false)
  const [progress, setProgress] = useState(0)
  const [sent, setSent] = useState(false)
  const [location, setLocation] = useState(null)
  const [gpsStatus, setGpsStatus] = useState('idle') // idle, getting, success, error
  const holdTimer = useRef(null)
  const progressTimer = useRef(null)
  const HOLD_DURATION = 3000

  // Get GPS on mount
  useEffect(() => {
    requestGPS()
  }, [])

  // Request current GPS location
  const requestGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error')
      return
    }
    
    setGpsStatus('getting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsStatus('success')
      },
      (err) => {
        console.log('GPS error:', err.message)
        setGpsStatus('error')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const startHold = useCallback(() => {
    if (sent) return
    setIsHolding(true)
    setProgress(0)
    
    // Request fresh GPS when starting to hold
    requestGPS()
    
    const startTime = Date.now()
    progressTimer.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      setProgress(Math.min((elapsed / HOLD_DURATION) * 100, 100))
    }, 50)
    
    holdTimer.current = setTimeout(triggerSOS, HOLD_DURATION)
  }, [sent])

  const endHold = useCallback(() => {
    setIsHolding(false)
    setProgress(0)
    if (holdTimer.current) clearTimeout(holdTimer.current)
    if (progressTimer.current) clearInterval(progressTimer.current)
  }, [])

  const triggerSOS = () => {
    endHold()
    setSent(true)

    const sosAlert = {
      id: `sos_${Date.now()}`,
      odUserId: userId || 'anonymous',
      userName: userName || 'ผู้ใช้',
      phone: userPhone || null,
      district: userDistrict || null,
      lat: location?.lat || null,
      lng: location?.lng || null,
      location: location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'ไม่ทราบตำแหน่ง',
      time: new Date().toISOString(),
      resolved: false
    }

    // Save to SOS alerts (Admin only)
    const existingAlerts = JSON.parse(localStorage.getItem('sosAlerts') || '[]')
    existingAlerts.unshift(sosAlert)
    localStorage.setItem('sosAlerts', JSON.stringify(existingAlerts))

    // NOTE: SOS alerts are NOT saved to public reports (userReports)
    // They are ONLY visible in Admin Dashboard for privacy/safety

    console.log('SOS saved:', sosAlert)
    onSOSTriggered?.({ success: true, alert: sosAlert })
    
    setTimeout(() => setSent(false), 5000)
  }

  if (sent) {
    return (
      <div className="text-center py-6">
        <div className="w-24 h-24 mx-auto bg-green-500 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
        <h3 className="text-xl font-bold text-green-700">ส่ง SOS สำเร็จ!</h3>
        <p className="text-green-600 mt-2">เจ้าหน้าที่จะเห็นในหน้า Admin ทันที</p>
        {location && (
          <p className="text-sm text-slate-500 mt-2 flex items-center justify-center gap-1">
            <MapPin className="w-4 h-4" />
            {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="relative inline-block">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="#e2e8f0" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="46" fill="none"
            stroke={isHolding ? "#dc2626" : "#e2e8f0"}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={289}
            strokeDashoffset={289 - (289 * progress) / 100}
          />
        </svg>
        
        <button
          onMouseDown={startHold}
          onMouseUp={endHold}
          onMouseLeave={endHold}
          onTouchStart={startHold}
          onTouchEnd={endHold}
          className={`absolute inset-4 rounded-full flex flex-col items-center justify-center ${
            isHolding ? 'bg-red-700 scale-95' : 'bg-red-600 hover:bg-red-700'
          } shadow-lg transition-all`}
        >
          <Siren className="w-10 h-10 text-white" />
          <span className="text-white font-bold text-sm mt-1">SOS</span>
        </button>
      </div>
      
      <p className="text-slate-600 mt-4 text-sm">
        {isHolding ? (
          <span className="text-red-600 font-bold">กำลังส่ง... ({Math.ceil((100 - progress) / 33)})</span>
        ) : (
          'กดค้าง 3 วินาที เพื่อส่งสัญญาณฉุกเฉิน'
        )}
      </p>
      
      <a href="tel:191" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-green-500 text-white rounded-xl text-sm">
        <Phone className="w-4 h-4" />
        โทร 191
      </a>
    </div>
  )
}