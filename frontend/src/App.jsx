import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { Wifi, WifiOff, Clock, Activity, Shield, MapPin, MapPinOff } from 'lucide-react'

// Import components
import BottomNav from './components/BottomNav'
import SelfDefenseGuide from './components/SelfDefenseGuide'
import FirstAidGuide from './components/FirstAidGuide'

// Import pages
import HomeTab from './pages/HomeTab'
import CheckTab from './pages/CheckTab'
import MapTab from './pages/MapTab'
import GuideTab from './pages/GuideTab'
import AdminDashboard from './pages/AdminDashboard'
import AdminLoginPage from './pages/AdminLoginPage'

// Threat levels
const THREAT_LEVELS = {
  GREEN: { level: 'GREEN', name: 'ปกติ', color: '#22c55e' },
  YELLOW: { level: 'YELLOW', name: 'เฝ้าระวัง', color: '#eab308' },
  ORANGE: { level: 'ORANGE', name: 'ยกระดับ', color: '#f97316' },
  RED: { level: 'RED', name: 'อันตราย', color: '#dc2626' },
}

/**
 * Main App (No Auth)
 */
function MainApp() {
  const [activeTab, setActiveTab] = useState('home')
  const [isOnline, setIsOnline] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [threatLevel, setThreatLevel] = useState(() => {
    return localStorage.getItem('adminThreatLevel') || 'YELLOW'
  })
  const [locationStatus, setLocationStatus] = useState('pending') // 'pending' | 'granted' | 'denied' | 'unavailable'
  const [userLocation, setUserLocation] = useState(null)
  
  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [startY, setStartY] = useState(0)
  const PULL_THRESHOLD = 80

  // Request GPS permission immediately on load
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable')
      return
    }

    // Request location immediately
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationStatus('granted')
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
        // Store for other components to use
        localStorage.setItem('userLocation', JSON.stringify({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: Date.now()
        }))
      },
      (error) => {
        setLocationStatus('denied')
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 60000 
      }
    )
  }, [])

  // Update time every second (for real-time display)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Poll for threat level changes from Admin (every 5 seconds)
  useEffect(() => {
    const checkThreatLevel = () => {
      const level = localStorage.getItem('adminThreatLevel') || 'YELLOW'
      setThreatLevel(level)
    }
    const interval = setInterval(checkThreatLevel, 5000)
    return () => clearInterval(interval)
  }, [])

  // Online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOnline(navigator.onLine)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Pull-to-refresh handlers
  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY)
    }
  }

  const handleTouchMove = (e) => {
    if (startY === 0 || isRefreshing) return
    if (window.scrollY > 0) {
      setPullDistance(0)
      return
    }
    const currentY = e.touches[0].clientY
    const diff = currentY - startY
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.5, 120))
    }
  }

  const handleTouchEnd = () => {
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(60)
      // Refresh the page
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } else {
      setPullDistance(0)
    }
    setStartY(0)
  }

  const currentThreat = THREAT_LEVELS[threatLevel]

  return (
    <div 
      className="min-h-screen bg-slate-100 pb-20"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div 
          className="fixed top-0 left-0 right-0 flex justify-center items-center bg-blue-500 text-white z-50 transition-all"
          style={{ height: pullDistance }}
        >
          <div className="flex items-center gap-2">
            {isRefreshing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">กำลังรีเฟรช...</span>
              </>
            ) : pullDistance >= PULL_THRESHOLD ? (
              <span className="text-sm font-medium">ปล่อยเพื่อรีเฟรช ↓</span>
            ) : (
              <span className="text-sm font-medium">ดึงลงเพื่อรีเฟรช...</span>
            )}
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="bg-slate-900 text-white safe-area-top" style={{ marginTop: pullDistance }}>
        <div className="px-4 py-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            {/* Online Status */}
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-xs">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-xs">Offline</span>
              </>
            )}
            
            {/* GPS Status */}
            {locationStatus === 'granted' ? (
              <>
                <MapPin className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-xs">GPS</span>
              </>
            ) : locationStatus === 'denied' ? (
              <>
                <MapPinOff className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-xs">No GPS</span>
              </>
            ) : locationStatus === 'pending' ? (
              <>
                <MapPin className="w-4 h-4 text-yellow-400 animate-pulse" />
                <span className="text-yellow-400 text-xs">GPS...</span>
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <a href="/admin" className="p-1 hover:bg-slate-800 rounded" title="Admin">
              <Shield className="w-4 h-4 text-slate-400" />
            </a>
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="font-mono text-xs">
              {currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Border Safety</h1>
              <p className="text-sm text-slate-400">เตือนภัยชายแดน จ.ตราด</p>
            </div>
            <div 
              className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1"
              style={{ backgroundColor: currentThreat.color }}
            >
              <Activity className="w-4 h-4" />
              {currentThreat.level}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-lg mx-auto">
        {activeTab === 'home' && (
          <HomeTab 
            threatLevel={threatLevel}
            onCheckClick={() => setActiveTab('check')}
          />
        )}
        {activeTab === 'check' && <CheckTab />}
        {activeTab === 'map' && <MapTab />}
        {activeTab === 'guide' && <GuideTab />}
        {activeTab === 'safety' && (
          <div className="space-y-4">
            <SelfDefenseGuide />
            <FirstAidGuide />
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

/**
 * Admin Login Wrapper
 */
function AdminLoginWrapper() {
  const handleLoginSuccess = () => {
    // Force reload to trigger AdminProtected re-check
    window.location.reload();
  };
  return <AdminLoginPage onSuccess={handleLoginSuccess} />;
}

/**
 * Protected Admin Route
 */
function AdminProtected() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const session = localStorage.getItem('adminSession')
    if (session) {
      try {
        const data = JSON.parse(session)
        // Check session expiry
        if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
          localStorage.removeItem('adminSession')
          setIsAdmin(false)
        } else if (data.isAdmin) {
          setIsAdmin(true)
        }
      } catch (e) {
        localStorage.removeItem('adminSession')
      }
    }
    setChecking(false)
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">กำลังตรวจสอบ...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return <AdminLoginWrapper />
  }

  return <AdminDashboard />
}

/**
 * App with Routing
 */
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MainApp />} />
      <Route path="/admin-login" element={<AdminLoginWrapper />} />
      <Route path="/admin" element={<AdminProtected />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
