import { useState } from 'react'
import { Shield, Lock, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react'
import API_BASE from '../config/api'

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
      const response = await fetch(`${API_BASE}/api/v1/auth/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Important for cookies
        body: JSON.stringify({
          username: username.trim(),
          password
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 429) {
          setError(data.message || 'บัญชีถูกล็อคชั่วคราว กรุณารอสักครู่')
        } else if (response.status === 401) {
          setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
        } else {
          setError(data.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
        }
        setLoading(false)
        return
      }

      // Success - save minimal session info (not credentials)
      const adminSession = {
        isAdmin: true,
        loginTime: new Date().toISOString(),
        expiresAt: new Date(Date.now() + data.expiresIn * 1000).toISOString(),
        username: data.admin?.username
      }
      localStorage.setItem('adminSession', JSON.stringify(adminSession))
      
      onSuccess?.()
      
    } catch (err) {
      console.error('Login error:', err)
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
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
              placeholder=""
              className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
              autoComplete="username"
              maxLength={50}
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
                placeholder=""
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-12"
                required
                autoComplete="current-password"
                maxLength={128}
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
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
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
