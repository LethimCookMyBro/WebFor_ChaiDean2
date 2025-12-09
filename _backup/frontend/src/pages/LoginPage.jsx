import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { User, Phone, LogIn, UserPlus, Shield, AlertCircle, Clock, MapPin, ChevronDown } from 'lucide-react'
import { TRAT_TAMBONS } from '../data/tratTambons'

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function LoginPage({ onSuccess }) {
  const { login, isLoggedIn } = useAuth()
  const [mode, setMode] = useState('login') // 'login' or 'register'
  const [realName, setRealName] = useState('')
  const [phone, setPhone] = useState('')
  const [district, setDistrict] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showPending, setShowPending] = useState(false)
  const [pendingUser, setPendingUser] = useState(null)
  const [selectedAmphoe, setSelectedAmphoe] = useState('')
  const [selectedTambon, setSelectedTambon] = useState('')

  // รายชื่ออำเภอจาก TRAT_TAMBONS
  const amphoeList = Object.keys(TRAT_TAMBONS)
  
  // รายชื่อตำบลตามอำเภอที่เลือก
  const getTambonList = (amphoe) => {
    return amphoe && TRAT_TAMBONS[amphoe] ? Object.keys(TRAT_TAMBONS[amphoe]) : []
  }


  // Validate Thai phone number (10 digits starting with 0)
  const validatePhone = (phoneNum) => {
    const cleaned = phoneNum.replace(/\D/g, '')
    return cleaned.length === 10 && cleaned.startsWith('0')
  }

  // Format phone number for display
  const formatPhone = (value) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length <= 3) return cleaned
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
  }

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10)
    setPhone(value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'register') {
        // Validate inputs
        if (!realName.trim()) {
          throw new Error('กรุณาใส่ชื่อจริง')
        }
        if (!validatePhone(phone)) {
          throw new Error('เบอร์โทรต้องมี 10 หลัก เริ่มด้วย 0')
        }
        if (!selectedAmphoe || !selectedTambon) {
          throw new Error('กรุณาเลือกอำเภอและตำบล')
        }
        
        const district = `ต.${selectedTambon} อ.${selectedAmphoe}`
        
        // Register via API
        const response = await fetch(`${API_BASE}/api/v1/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: realName.trim(),
            phone,
            district
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'ลงทะเบียนไม่สำเร็จ')
        }

        // Show pending approval
        setPendingUser({ name: realName, phone })
        setShowPending(true)
        
      } else {
        // Login - validate phone first
        if (!validatePhone(phone)) {
          throw new Error('เบอร์โทรต้องมี 10 หลัก เริ่มด้วย 0')
        }
        
        // Use the async login from AuthContext
        const result = await login(phone)
        
        console.log('[LOGIN] Result:', result)
        
        if (result.success) {
          onSuccess?.()
        } else if (result.pending) {
          setShowPending(true)
          setPendingUser({ phone })
        } else if (result.notFound) {
          setError('ไม่พบบัญชี กรุณาสมัครสมาชิกก่อน')
        } else {
          setError(result.message || 'เข้าสู่ระบบไม่สำเร็จ')
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Show pending approval message
  if (showPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">รอการอนุมัติ</h1>
          <p className="text-slate-600 mb-4">
            {mode === 'register' 
              ? 'การสมัครของคุณกำลังรอ Admin ตรวจสอบ'
              : 'บัญชีของคุณรออนุมัติจาก Admin'}
          </p>
          {pendingUser && (
            <div className="bg-slate-100 rounded-xl p-4 mb-6 text-left">
              {pendingUser.name && (
                <p className="text-sm text-slate-600">
                  <strong>ชื่อ:</strong> {pendingUser.name}
                </p>
              )}
              <p className="text-sm text-slate-600">
                <strong>เบอร์โทร:</strong> {formatPhone(pendingUser.phone || phone)}
              </p>
            </div>
          )}
          <p className="text-sm text-slate-500 mb-4">
            กรุณารอ Admin อนุมัติบัญชีของคุณ<br/>
            คุณจะสามารถเข้าใช้งานได้หลังจากได้รับการอนุมัติ
          </p>
          <a 
            href="/"
            className="block w-full py-3 bg-slate-200 text-slate-800 rounded-xl font-medium"
          >
            กลับหน้าหลัก
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Border Safety</h1>
          <p className="text-slate-500 text-sm mt-1">ระบบเตือนภัยชายแดน จ.ตราด</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-xl font-medium transition-colors ${
              mode === 'login' 
                ? 'bg-blue-500 text-white' 
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2 rounded-xl font-medium transition-colors ${
              mode === 'register' 
                ? 'bg-blue-500 text-white' 
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            สมัครใหม่
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Real Name - required for register */}
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <User className="w-4 h-4 inline mr-1" />
                ชื่อจริง <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                placeholder="เช่น สมชาย ใจดี"
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="text-xs text-slate-400 mt-1">กรุณาใช้ชื่อจริง เพื่อความปลอดภัย</p>
            </div>
          )}

          {/* Phone - required for both */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <Phone className="w-4 h-4 inline mr-1" />
              เบอร์โทรศัพท์ <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formatPhone(phone)}
              onChange={handlePhoneChange}
              placeholder="08X-XXX-XXXX"
              className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-xs text-slate-400 mt-1">
              {phone.length}/10 หลัก {phone.length === 10 && '✓'}
            </p>
          </div>

          {mode === 'register' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                อำเภอ/ตำบล <span className="text-red-500">*</span>
              </label>
              
              {/* Amphoe Selection */}
              <div className="relative">
                <select
                  value={selectedAmphoe}
                  onChange={(e) => {
                    setSelectedAmphoe(e.target.value)
                    setSelectedTambon('')
                  }}
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                  required
                >
                  <option value="">-- เลือกอำเภอ --</option>
                  {amphoeList.map((amphoe) => (
                    <option key={amphoe} value={amphoe}>อ.{amphoe}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
              
              {/* Tambon Selection */}
              {selectedAmphoe && (
                <div className="relative animate-fadeIn">
                  <select
                    value={selectedTambon}
                    onChange={(e) => setSelectedTambon(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                    required
                  >
                    <option value="">-- เลือกตำบล --</option>
                    {getTambonList(selectedAmphoe).map((tambon) => (
                      <option key={tambon} value={tambon}>ต.{tambon}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              )}
              
              <p className="text-xs text-slate-400">สำหรับเจ้าหน้าที่ไปช่วยเหลือได้ง่ายขึ้น</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (mode === 'register' && (!realName.trim() || !selectedAmphoe || !selectedTambon)) || phone.length !== 10}
            className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-blue-600 disabled:bg-slate-300 transition-colors"
          >
            {loading ? (
              <span>กำลังดำเนินการ...</span>
            ) : mode === 'register' ? (
              <>
                <UserPlus className="w-5 h-5" />
                สมัครสมาชิก
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                เข้าสู่ระบบ
              </>
            )}
          </button>
        </form>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-xl">
          <p className="text-sm text-blue-800">
            <strong>ทำไมต้องล็อกอิน?</strong>
          </p>
          <ul className="text-xs text-blue-700 mt-2 space-y-1">
            <li>• แจ้งเหตุการณ์ได้</li>
            <li>• ส่ง SOS ฉุกเฉินได้</li>
            <li>• ข้อมูลแยกตามผู้ใช้แต่ละคน</li>
          </ul>
        </div>

        {/* Note about approval */}
        {mode === 'register' && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-700"> 
              <Clock className="w-3 h-3 inline mr-1" />
              หลังสมัครแล้ว ต้องรอ Admin ตรวจสอบและอนุมัติบัญชี
            </p>
          </div>
        )}

        {/* Guest Access */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-400">
            ไม่สมัครก็ดูแผนที่/เช็คระยะ/คู่มือได้
          </p>
        </div>
      </div>
    </div>
  )
}
