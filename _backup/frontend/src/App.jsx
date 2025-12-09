import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { Wifi, WifiOff, Clock, Bell, Activity, X, Shield, User, LogOut } from 'lucide-react'

// Import contexts
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Import components
import BottomNav from './components/BottomNav'
import SOSButton from './components/SOSButton'
import SelfDefenseGuide from './components/SelfDefenseGuide'
import FirstAidGuide from './components/FirstAidGuide'

// Import pages
import HomeTab from './pages/HomeTab'
import CheckTab from './pages/CheckTab'
import MapTab from './pages/MapTab'
import GuideTab from './pages/GuideTab'
import AdminDashboard from './pages/AdminDashboard'
import AdminLoginPage from './pages/AdminLoginPage'
import LoginPage from './pages/LoginPage'

// Threat levels
const THREAT_LEVELS = {
  GREEN: { level: 'GREEN', name: 'ปกติ', color: '#22c55e' },
  YELLOW: { level: 'YELLOW', name: 'เฝ้าระวัง', color: '#eab308' },
  ORANGE: { level: 'ORANGE', name: 'ยกระดับ', color: '#f97316' },
  RED: { level: 'RED', name: 'อันตราย', color: '#dc2626' },
}

/**
 * Main App with Auth
 */
function MainApp() {
  const { user, isLoggedIn, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('home')
  const [isOnline, setIsOnline] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [threatLevel, setThreatLevel] = useState(() => {
    return localStorage.getItem('adminThreatLevel') || 'YELLOW'
  })
  const [showSOSModal, setShowSOSModal] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

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

  // Handle protected actions
  const handleProtectedAction = (action) => {
    if (!isLoggedIn) {
      setShowLoginPrompt(true)
      return false
    }
    return true
  }

  const handleSOSClick = () => {
    if (handleProtectedAction('sos')) {
      setShowSOSModal(true)
    }
  }

  const handleSOSTriggered = (result) => {
    setShowSOSModal(false)
    if (result.success) {
      alert('📍 ส่ง SOS สำเร็จ!\nเจ้าหน้าที่จะเห็นในหน้า Admin')
    }
  }

  const currentThreat = THREAT_LEVELS[threatLevel]

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      {/* Header */}
      <header className="bg-slate-900 text-white safe-area-top">
        <div className="px-4 py-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
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
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn && (
              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded-lg"
                >
                  <User className="w-4 h-4" />
                  <span className="text-xs max-w-[60px] truncate">{user?.name}</span>
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 top-8 bg-white text-slate-800 rounded-lg shadow-lg p-2 z-50">
                    <button 
                      onClick={() => { logout(); setShowUserMenu(false) }}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 rounded w-full"
                    >
                      <LogOut className="w-4 h-4" />
                      ออกจากระบบ
                    </button>
                  </div>
                )}
              </div>
            )}
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
            onSOSClick={handleSOSClick}
            onCheckClick={() => setActiveTab('check')}
            isLoggedIn={isLoggedIn}
            onLoginRequired={() => setShowLoginPrompt(true)}
            userId={user?.id}
            userName={user?.name}
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

      {/* SOS Modal */}
      {showSOSModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm relative">
            <button 
              onClick={() => setShowSOSModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center pt-4">
              <h2 className="text-xl font-bold mb-4">ส่งสัญญาณฉุกเฉิน</h2>
              {console.log('[SOS Modal] User data:', user)}
              {console.log('[SOS Modal] isLoggedIn:', isLoggedIn)}
              {!user?.name && (
                <div className="text-amber-600 text-sm mb-3 bg-amber-50 p-2 rounded">
                  ⚠️ กรุณา login ก่อนกด SOS เพื่อให้มีข้อมูลครบ
                </div>
              )}
              <SOSButton userId={user?.id} userName={user?.name} userPhone={user?.phone} userDistrict={user?.district} onSOSTriggered={handleSOSTriggered} />
              <button onClick={() => setShowSOSModal(false)} className="mt-6 w-full bg-slate-200 text-slate-800 p-3 rounded-xl">
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Prompt */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4 text-center">ต้องล็อกอินก่อน</h2>
            <p className="text-slate-600 text-center mb-4">
              กรุณาล็อกอินเพื่อใช้งานฟีเจอร์นี้
            </p>
            <a 
              href="/login"
              className="block w-full py-3 bg-blue-500 text-white text-center rounded-xl font-medium"
            >
              ไปหน้าล็อกอิน
            </a>
            <button 
              onClick={() => setShowLoginPrompt(false)} 
              className="w-full mt-2 py-3 bg-slate-200 text-slate-800 rounded-xl"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Login Page Wrapper
 */
function LoginWrapper() {
  const navigate = useNavigate()
  return <LoginPage onSuccess={() => navigate('/')} />
}

/**
 * Admin Login Wrapper
 */
function AdminLoginWrapper() {
  const navigate = useNavigate()
  return <AdminLoginPage onSuccess={() => navigate('/admin')} />
}

/**
 * Protected Admin Route
 */
function AdminProtected() {
  const navigate = useNavigate()
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
      <Route path="/login" element={<LoginWrapper />} />
      <Route path="/admin-login" element={<AdminLoginWrapper />} />
      <Route path="/admin" element={<AdminProtected />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
