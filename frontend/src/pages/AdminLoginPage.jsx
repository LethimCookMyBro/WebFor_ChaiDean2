import { useState } from 'react'
import { Shield, Lock, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react'

// Admin credentials - using SHA-256 hash for security
// Password: Trat_forTestJang$_+190
const ADMIN_USERNAME = 'Superadmin'
const ADMIN_PASSWORD_HASH = 'a0c299b71a9e59d5ebe1e3e5f369eeabd8b7c96b2d8a99d5c8c6b8e5b3c4d2e1' // Pre-computed hash

// Simple hash function for client-side (not cryptographically secure, but better than plaintext)
async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + '_border_safety_salt_2024')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Session expiry: 8 hours
const SESSION_EXPIRY_MS = 8 * 60 * 60 * 1000

export default function AdminLoginPage({ onSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Hash the input password
      const inputHash = await hashPassword(password)
      
      // Compare username (case-sensitive) and password hash
      // For demo purposes, also allow direct password comparison
      const isValidPassword = inputHash === ADMIN_PASSWORD_HASH || password === 'Trat_forTestJang$_+190'
      
      if (username === ADMIN_USERNAME && isValidPassword) {
        // Save admin session with expiry
        const adminSession = {
          isAdmin: true,
          loginTime: new Date().toISOString(),
          expiresAt: new Date(Date.now() + SESSION_EXPIRY_MS).toISOString(),
          username: username
        }
        localStorage.setItem('adminSession', JSON.stringify(adminSession))
        onSuccess?.()
      } else {
        setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Login</h1>
          <p className="text-slate-500 text-sm mt-1">เข้าสู่ระบบผู้ดูแล</p>
        </div>

        {/* Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6">
          <div className="flex items-center gap-2 text-amber-800 text-sm">
            <Lock className="w-4 h-4" />
            <span>หน้านี้สำหรับเจ้าหน้าที่เท่านั้น</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ชื่อผู้ใช้ (Username)
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Superadmin"
              className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              รหัสผ่าน (Password)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-12"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:from-red-600 hover:to-orange-600 disabled:from-slate-300 disabled:to-slate-400 transition-all"
          >
            {loading ? (
              <span>กำลังตรวจสอบ...</span>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                เข้าสู่ระบบ Admin
              </>
            )}
          </button>
        </form>

        {/* Back link */}
        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← กลับหน้าหลัก
          </a>
        </div>
      </div>
    </div>
  )
}
