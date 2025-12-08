import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const AuthContext = createContext(null)

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Token refresh threshold (2 minutes before expiry)
const REFRESH_THRESHOLD_MS = 2 * 60 * 1000

// Inactivity timeout (30 minutes)
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000

export function AuthProvider({ children }) {
  // User state - kept in memory only (not localStorage)
  const [user, setUser] = useState(null)
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
      throw new Error('กรุณาใส่เบอร์โทร 10 หลัก')
    }
    
    const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ phone })
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || 'เข้าสู่ระบบไม่สำเร็จ')
    }
    
    // Set user in memory
    setUser({
      id: data.user.id,
      phone: data.user.phone,
      authenticated: true
    })
    
    // Set expiry and schedule refresh
    const expiry = new Date(Date.now() + data.expiresIn * 1000)
    setExpiresAt(expiry)
    scheduleRefresh(data.expiresIn * 1000)
    resetInactivityTimer()
    
    return { success: true, user: data.user }
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
