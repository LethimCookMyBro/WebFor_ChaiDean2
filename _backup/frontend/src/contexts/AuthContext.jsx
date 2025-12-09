import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const AuthContext = createContext(null)

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Token refresh threshold (2 minutes before expiry)
const REFRESH_THRESHOLD_MS = 2 * 60 * 1000

// Inactivity timeout - EXTENDED to 24 hours for better UX (was 30 minutes)
const INACTIVITY_TIMEOUT_MS = 24 * 60 * 60 * 1000 // 24 hours

// LocalStorage key for session persistence
const SESSION_STORAGE_KEY = 'borderSafety_session'

/**
 * Save user session to localStorage for persistence across page refreshes
 * Only stores non-sensitive session metadata
 */
function saveSessionToStorage(userData) {
  if (!userData) {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    return
  }
  try {
    const sessionData = {
      id: userData.id,
      name: userData.name,
      phone: userData.phone,
      district: userData.district,
      authenticated: true,
      savedAt: Date.now()
    }
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData))
  } catch (e) {
    console.warn('[Auth] Failed to save session to storage:', e)
  }
}

/**
 * Load user session from localStorage
 * Returns null if no valid session found
 */
function loadSessionFromStorage() {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!stored) return null
    
    const sessionData = JSON.parse(stored)
    
    // Check if session is still valid (24 hour max age)
    const sessionAge = Date.now() - (sessionData.savedAt || 0)
    if (sessionAge > INACTIVITY_TIMEOUT_MS) {
      localStorage.removeItem(SESSION_STORAGE_KEY)
      return null
    }
    
    return sessionData
  } catch (e) {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    return null
  }
}

export function AuthProvider({ children }) {
  // User state - persisted to localStorage for session recovery
  const [user, setUser] = useState(() => loadSessionFromStorage())
  const [loading, setLoading] = useState(true)
  const [expiresAt, setExpiresAt] = useState(null)
  
  // Refs for timers
  const refreshTimer = useRef(null)
  const inactivityTimer = useRef(null)
  const lastActivity = useRef(Date.now())
  
  // Refresh token function
  const refreshToken = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include'
      })
      
      if (!response.ok) {
        console.log('[Auth] Refresh failed, logging out')
        setUser(null)
        setExpiresAt(null)
        return false
      }
      
      const data = await response.json()
      
      // Update expiry time
      const newExpiry = new Date(Date.now() + data.expiresIn * 1000)
      setExpiresAt(newExpiry)
      
      // Schedule next refresh
      scheduleRefresh(data.expiresIn * 1000)
      
      return true
    } catch (error) {
      console.error('[Auth] Refresh error:', error)
      return false
    }
  }, [])
  
  // Schedule token refresh
  const scheduleRefresh = useCallback((expiresInMs) => {
    // Clear existing timer
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current)
    }
    
    // Schedule refresh before expiry
    const refreshIn = expiresInMs - REFRESH_THRESHOLD_MS
    if (refreshIn > 0) {
      refreshTimer.current = setTimeout(() => {
        refreshToken()
      }, refreshIn)
    }
  }, [refreshToken])
  
  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    lastActivity.current = Date.now()
    
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current)
    }
    
    if (user) {
      inactivityTimer.current = setTimeout(() => {
        console.log('[Auth] Inactivity timeout, logging out')
        logout()
      }, INACTIVITY_TIMEOUT_MS)
    }
  }, [user])
  
  // Track user activity
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    
    const handleActivity = () => {
      resetInactivityTimer()
    }
    
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true })
    })
    
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [resetInactivityTimer])
  
  // Initialize - check if user has valid session
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try to refresh token to validate session
        const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include'
        })
        
        if (response.ok) {
          const data = await response.json()
          
          // We have a valid session - get user info from a profile endpoint or decode from response
          // For now, set minimal user info
          setUser({ authenticated: true })
          
          const expiry = new Date(Date.now() + data.expiresIn * 1000)
          setExpiresAt(expiry)
          scheduleRefresh(data.expiresIn * 1000)
          resetInactivityTimer()
        }
      } catch (error) {
        console.log('[Auth] No valid session')
      }
      
      setLoading(false)
    }
    
    initAuth()
    
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    }
  }, [scheduleRefresh, resetInactivityTimer])
  
  // Login with phone
  const login = async (phone) => {
    if (!phone || phone.length !== 10) {
      return { success: false, message: 'กรุณาใส่เบอร์โทร 10 หลัก' }
    }
    
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone })
      })
      
      const data = await response.json()
      
      // Handle pending status (403)
      if (response.status === 403 && data.pending) {
        return { success: false, pending: true, message: data.message }
      }
      
      // Handle unauthorized (401) - phone not registered
      if (response.status === 401) {
        return { success: false, notFound: true, message: data.message || 'เบอร์โทรนี้ยังไม่ได้ลงทะเบียน' }
      }
      
      // Handle too many requests (429)
      if (response.status === 429) {
        return { success: false, message: data.message || 'คุณลองเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่' }
      }
      
      // Handle other errors
      if (!response.ok) {
        return { success: false, message: data.message || 'เข้าสู่ระบบไม่สำเร็จ' }
      }
      
      console.log('[AUTH] Login success, user data:', data.user)
      
      // Set user in memory with ALL user data
      const userData = {
        id: data.user.id,
        name: data.user.name || 'ผู้ใช้',
        phone: data.user.phone,
        district: data.user.district || null,
        authenticated: true
      }
      setUser(userData)
      
      // Save to localStorage for session persistence
      saveSessionToStorage(userData)
      
      // Set expiry and schedule refresh
      const expiry = new Date(Date.now() + data.expiresIn * 1000)
      setExpiresAt(expiry)
      scheduleRefresh(data.expiresIn * 1000)
      resetInactivityTimer()
      
      return { success: true, user: data.user }
    } catch (error) {
      console.error('[AUTH] Login error:', error)
      return { success: false, message: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' }
    }
  }
  
  // Register - this should be handled differently in a real app
  const register = async (name, phone, district = '') => {
    // For now, registration can still use localStorage for pending users
    // The actual user data should be stored server-side
    if (!name.trim()) {
      throw new Error('กรุณาใส่ชื่อจริง')
    }
    if (!phone || phone.length !== 10) {
      throw new Error('กรุณาใส่เบอร์โทร 10 หลัก')
    }
    
    // TODO: Implement server-side registration
    // For now, return pending status
    return { pending: true, message: 'รอการอนุมัติจาก Admin' }
  }
  
  // Logout
  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('[Auth] Logout error:', error)
    }
    
    // Clear state
    setUser(null)
    setExpiresAt(null)
    
    // Clear localStorage session
    saveSessionToStorage(null)
    
    // Clear timers
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
  }
  
  // Check if logged in
  const isLoggedIn = !!user?.authenticated
  
  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isLoggedIn,
      expiresAt,
      login,
      register,
      logout,
      refreshToken
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export default AuthContext
