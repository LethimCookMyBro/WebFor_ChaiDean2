import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

/**
 * Get user-specific storage key
 */
const getUserStorageKey = (userId, key) => `user_${userId}_${key}`

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load user from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('currentUser')
    if (stored) {
      try {
        const userData = JSON.parse(stored)
        // Check if user is approved
        if (userData.approved) {
          setUser(userData)
        }
      } catch (e) {
        localStorage.removeItem('currentUser')
      }
    }
    setLoading(false)
  }, [])

  // Register new user - with pending approval
  const register = (name, phone, district = '') => {
    if (!name.trim()) {
      throw new Error('กรุณาใส่ชื่อจริง')
    }
    if (!phone || phone.length !== 10) {
      throw new Error('กรุณาใส่เบอร์โทร 10 หลัก')
    }

    // Check if phone already registered
    const users = JSON.parse(localStorage.getItem('allUsers') || '[]')
    const existing = users.find(u => u.phone === phone)
    if (existing) {
      throw new Error('เบอร์นี้ลงทะเบียนแล้ว กรุณาเข้าสู่ระบบ')
    }

    const userId = `user_${Date.now()}`
    const newUser = {
      id: userId,
      name: name.trim(),
      phone: phone,
      district: district || 'ไม่ระบุ',
      approved: false, // Pending admin approval
      createdAt: new Date().toISOString()
    }

    // Save to users list
    users.push(newUser)
    localStorage.setItem('allUsers', JSON.stringify(users))

    // Initialize user-specific data storage
    localStorage.setItem(getUserStorageKey(userId, 'reports'), '[]')
    localStorage.setItem(getUserStorageKey(userId, 'family'), '[]')
    localStorage.setItem(getUserStorageKey(userId, 'sos'), '[]')

    return { pending: true, user: newUser }
  }

  // Login with phone
  const login = (phone) => {
    if (!phone || phone.length !== 10) {
      throw new Error('กรุณาใส่เบอร์โทร 10 หลัก')
    }

    const users = JSON.parse(localStorage.getItem('allUsers') || '[]')
    const found = users.find(u => u.phone === phone)

    if (!found) {
      return { notFound: true }
    }

    if (!found.approved) {
      return { pending: true, user: found }
    }

    // Set as current user
    localStorage.setItem('currentUser', JSON.stringify(found))
    setUser(found)
    return { success: true, user: found }
  }

  // Logout
  const logout = () => {
    localStorage.removeItem('currentUser')
    setUser(null)
  }

  // Get user-specific data
  const getUserData = (key) => {
    if (!user?.id) return []
    const data = localStorage.getItem(getUserStorageKey(user.id, key))
    return data ? JSON.parse(data) : []
  }

  // Set user-specific data
  const setUserData = (key, data) => {
    if (!user?.id) return
    localStorage.setItem(getUserStorageKey(user.id, key), JSON.stringify(data))
  }

  // Check if logged in and approved
  const isLoggedIn = !!user && user.approved

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isLoggedIn,
      login,
      register,
      logout,
      getUserData,
      setUserData,
      getUserStorageKey
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

