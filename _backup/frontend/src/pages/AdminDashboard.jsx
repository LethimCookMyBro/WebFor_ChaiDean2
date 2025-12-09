import { useState, useEffect } from 'react'
import {
  Shield, Radio, AlertTriangle, CheckCircle, XCircle, 
  Clock, MapPin, Filter, RefreshCw, ChevronDown, ChevronUp,
  Home, Siren, Send, MessageSquare, Phone, Trash2, UserCheck, LogOut, Activity, FileText, Search, Edit
} from 'lucide-react'

// Threat levels
const THREAT_LEVELS = {
  GREEN: { level: 'GREEN', name: 'ปกติ', color: '#22c55e', bgColor: '#dcfce7' },
  YELLOW: { level: 'YELLOW', name: 'เฝ้าระวัง', color: '#eab308', bgColor: '#fef9c3' },
  ORANGE: { level: 'ORANGE', name: 'ยกระดับ', color: '#f97316', bgColor: '#ffedd5' },
  RED: { level: 'RED', name: 'อันตราย', color: '#dc2626', bgColor: '#fee2e2' },
}

// ตำบลจังหวัดตราด
const TRAT_DISTRICTS = ["เมืองตราด", "คลองใหญ่", "เขาสมิง", "บ่อไร่", "แหลมงอบ", "เกาะกูด", "เกาะช้าง"]

const reportTypes = [
  { id: 'explosion', label: '💥 ระเบิด', icon: '💥' },
  { id: 'gunfire', label: '🔫 ปืน', icon: '🔫' },
  { id: 'roadblock', label: '🚧 ถนนปิด', icon: '🚧' },
  { id: 'evacuation', label: '🏃 อพยพ', icon: '🏃' },
  { id: 'military', label: '🪖 ทหาร', icon: '🪖' },
  { id: 'warning', label: '⚠️ แจ้งเตือน', icon: '⚠️' },
  { id: 'sos', label: '🆘 SOS', icon: '🆘' }
]

export default function AdminDashboard() {
  const [reports, setReports] = useState([])
  const [sosAlerts, setSosAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ type: '', district: '' })
  const [expandedReport, setExpandedReport] = useState(null)
  const [activeTab, setActiveTab] = useState('reports')
  
  // Search states for each tab
  const [searchReports, setSearchReports] = useState('')
  const [searchSOS, setSearchSOS] = useState('')
  const [searchMembers, setSearchMembers] = useState('')
  const [searchLogs, setSearchLogs] = useState('')
  
  // Editing state
  const [editingUser, setEditingUser] = useState(null) // { phone, name, district, ... }
  
  // Broadcast form
  const [showBroadcastForm, setShowBroadcastForm] = useState(false)
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastSent, setBroadcastSent] = useState(false)
  const [pendingUsers, setPendingUsers] = useState([])
  const [allMembers, setAllMembers] = useState([])
  const [broadcasts, setBroadcasts] = useState([])
  const [logs, setLogs] = useState([])
  const [logStats, setLogStats] = useState(null)
  const [logFilter, setLogFilter] = useState({ level: '', category: '' })
  const [threatLevel, setThreatLevel] = useState(() => {
    return localStorage.getItem('adminThreatLevel') || 'YELLOW'
  })
  
  // Save threat level to localStorage when changed
  const handleThreatLevelChange = (level) => {
    setThreatLevel(level)
    localStorage.setItem('adminThreatLevel', level)
  }
  
  // Admin logout
  const handleAdminLogout = () => {
    localStorage.removeItem('adminSession')
    window.location.href = '/'
  }
  
  // API Base
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  
  // Fetch data from API
  const fetchData = async () => {
    setLoading(true)
    
    // Fetch pending users from API
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/admin/pending-users`)
      if (response.ok) {
        const data = await response.json()
        setPendingUsers(data.pending || [])
        setAllMembers([...data.pending || [], ...data.approved || []])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
    
    // Keep localStorage for reports (local data)
    const userReports = JSON.parse(localStorage.getItem('userReports') || '[]')
    setReports(userReports)

    // Fetch SOS from API
    try {
      const sosRes = await fetch(`${API_BASE}/api/v1/sos`)
      if (sosRes.ok) {
        const sosData = await sosRes.json()
        setSosAlerts(sosData.alerts || [])
      }
    } catch (error) {
      console.error('Error fetching SOS:', error)
    }
    
    // Load broadcasts
    const broadcastData = JSON.parse(localStorage.getItem('adminBroadcasts') || '[]')
    setBroadcasts(broadcastData)
    
    // Fetch logs from API
    try {
      const logsResponse = await fetch(`${API_BASE}/api/v1/admin/logs?limit=100`)
      if (logsResponse.ok) {
        const logsData = await logsResponse.json()
        setLogs(logsData.logs || [])
      }
      
      const statsResponse = await fetch(`${API_BASE}/api/v1/admin/logs/stats`)
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setLogStats(statsData.stats)
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    }
    
    setLoading(false)
  }
  
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000) // Refresh every 5 sec
    return () => clearInterval(interval)
  }, [])

  // Verify report
  const handleVerify = (reportId, verified) => {
    const updated = reports.map(r => r.id === reportId ? { ...r, verified } : r)
    setReports(updated)
    localStorage.setItem('userReports', JSON.stringify(updated))
  }

  // Delete report
  const handleDelete = (reportId) => {
    if (!confirm('ลบรายงานนี้?')) return
    const updated = reports.filter(r => r.id !== reportId)
    setReports(updated)
    localStorage.setItem('userReports', JSON.stringify(updated))
  }

  // Resolve SOS
  const handleResolveSOS = async (alertId) => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/sos/${alertId}/resolve`, {
        method: 'PUT'
      })
      if (response.ok) {
        fetchData() // Refresh list
      }
    } catch (error) {
      console.error('Error resolving SOS:', error)
    }
  }

  // Delete SOS
  const handleDeleteSOS = async (alertId) => {
    if (!confirm('ลบ SOS นี้?')) return
    try {
      const response = await fetch(`${API_BASE}/api/v1/sos/${alertId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        fetchData() // Refresh list
      }
    } catch (error) {
      console.error('Error deleting SOS:', error)
    }
  }

  // Approve user via API
  const handleApproveUser = async (phone) => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/admin/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      })
      if (response.ok) {
        fetchData() // Refresh list
      }
    } catch (error) {
      console.error('Error approving user:', error)
    }
  }

  // Reject user via API
  const handleRejectUser = async (phone) => {
    if (!confirm('ปฏิเสธผู้สมัครนี้?')) return
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/admin/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      })
      if (response.ok) {
        fetchData() // Refresh list
      }
    } catch (error) {
      console.error('Error rejecting user:', error)
    }
  }

  // Update user via API
  const handleUpdateUser = async (updatedData) => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/admin/users/${updatedData.originalPhone}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      })
      if (response.ok) {
        setEditingUser(null)
        fetchData() // Refresh list
        alert('บันทึกข้อมูลสำเร็จ')
      } else {
        const error = await response.json()
        alert('เกิดข้อผิดพลาด: ' + error.message)
      }
    } catch (error) {
      console.error('Error updating user:', error)
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    }
  }

  const handleSaveEdit = (e) => {
    e.preventDefault()
    if (!editingUser) return
    handleUpdateUser(editingUser)
  }

  // Delete user via API
  const handleDeleteUser = async (phone, userName) => {
    if (!confirm(`ลบสมาชิก "${userName}"?\n\nข้อมูลทั้งหมดของผู้ใช้นี้จะถูกลบ`)) return
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/admin/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      })
      if (response.ok) {
        fetchData() // Refresh list
      }
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  // Send broadcast
  const handleSendBroadcast = () => {
    if (!broadcastMessage.trim()) return
    
    const broadcast = {
      id: `bc_${Date.now()}`,
      message: broadcastMessage.trim(),
      time: new Date().toISOString(),
      from: 'admin'
    }
    
    const existing = JSON.parse(localStorage.getItem('adminBroadcasts') || '[]')
    existing.unshift(broadcast)
    localStorage.setItem('adminBroadcasts', JSON.stringify(existing))
    
    setBroadcastMessage('')
    setBroadcastSent(true)
    fetchData() // Refresh broadcasts list
    setTimeout(() => setBroadcastSent(false), 3000)
  }

  // Delete broadcast
  const handleDeleteBroadcast = (broadcastId) => {
    if (!confirm('ลบประกาศนี้?')) return
    const updated = broadcasts.filter(b => b.id !== broadcastId)
    localStorage.setItem('adminBroadcasts', JSON.stringify(updated))
    setBroadcasts(updated)
  }

  // Filter reports with search
  const filteredReports = reports.filter(r => {
    if (filter.type && r.type !== filter.type) return false
    if (filter.district && r.district !== filter.district) return false
    // Search filter
    if (searchReports) {
      const search = searchReports.toLowerCase()
      const matchesName = r.userName?.toLowerCase().includes(search)
      const matchesLocation = r.location?.toLowerCase().includes(search)
      const matchesDesc = r.description?.toLowerCase().includes(search)
      const matchesType = r.type?.toLowerCase().includes(search)
      if (!matchesName && !matchesLocation && !matchesDesc && !matchesType) return false
    }
    return true
  })

  // Filter SOS alerts with search
  const filteredSOS = sosAlerts.filter(a => {
    if (!searchSOS) return true
    const search = searchSOS.toLowerCase()
    const matchesName = a.userName?.toLowerCase().includes(search)
    const matchesPhone = a.phone?.includes(search)
    const matchesDistrict = a.district?.toLowerCase().includes(search)
    const matchesLocation = a.location?.toLowerCase().includes(search)
    return matchesName || matchesPhone || matchesDistrict || matchesLocation
  })

  // Filter members with search
  const filteredMembers = allMembers.filter(m => {
    if (!searchMembers) return true
    const search = searchMembers.toLowerCase()
    const matchesName = m.name?.toLowerCase().includes(search)
    const matchesPhone = m.phone?.includes(search)
    const matchesDistrict = m.district?.toLowerCase().includes(search)
    return matchesName || matchesPhone || matchesDistrict
  })

  // Filter logs with search
  const filteredLogs = logs.filter(log => {
    if (logFilter.level && log.level !== logFilter.level) return false
    if (logFilter.category && log.category !== logFilter.category) return false
    if (searchLogs) {
      const search = searchLogs.toLowerCase()
      const matchesMsg = log.message?.toLowerCase().includes(search)
      const matchesCategory = log.category?.toLowerCase().includes(search)
      return matchesMsg || matchesCategory
    }
    return true
  })

  const stats = {
    total: reports.length,
    unverified: reports.filter(r => !r.verified).length,
    sosActive: sosAlerts.filter(a => !a.resolved).length
  }

  const formatTime = (time) => {
    if (!time) return 'ไม่ทราบ'
    return new Date(time).toLocaleString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-slate-900 text-white">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-400" />
            <div>
              <h1 className="font-bold">Admin Dashboard</h1>
              <p className="text-xs text-slate-400">จ.ตราด</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
                      <button onClick={fetchData} className="p-2 hover:bg-slate-800 rounded-lg">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleAdminLogout} className="p-2 hover:bg-slate-800 rounded-lg text-red-400" title="ออกจากระบบ">
              <LogOut className="w-5 h-5" />
            </button>
            <a href="/" className="p-2 hover:bg-slate-800 rounded-lg">
              <Home className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-3 border text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-slate-500">รายงาน</div>
          </div>
          <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-200 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.unverified}</div>
            <div className="text-xs text-yellow-700">รอตรวจสอบ</div>
          </div>
          <div className={`rounded-xl p-3 border text-center ${stats.sosActive > 0 ? 'bg-red-50 border-red-300 animate-pulse' : 'bg-green-50 border-green-200'}`}>
            <div className={`text-2xl font-bold ${stats.sosActive > 0 ? 'text-red-600' : 'text-green-600'}`}>{stats.sosActive}</div>
            <div className={`text-xs ${stats.sosActive > 0 ? 'text-red-700' : 'text-green-700'}`}>SOS</div>
          </div>
          {pendingUsers.length > 0 && (
            <div className="bg-purple-50 rounded-xl p-3 border border-purple-200 text-center">
              <div className="text-2xl font-bold text-purple-600">{pendingUsers.length}</div>
              <div className="text-xs text-purple-700">รออนุมัติ</div>
            </div>
          )}
        </div>

        {/* Threat Level Control */}
        <div className="bg-white rounded-xl p-4 border mb-4">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            ควบคุมระดับภัยคุกคาม
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {Object.values(THREAT_LEVELS).map((level) => (
              <button
                key={level.level}
                onClick={() => handleThreatLevelChange(level.level)}
                className={`p-3 rounded-xl text-center transition-all ${
                  threatLevel === level.level
                    ? 'ring-2 ring-offset-2 scale-105'
                    : 'opacity-60 hover:opacity-100'
                }`}
                style={{ 
                  backgroundColor: level.bgColor, 
                  color: level.color,
                  ringColor: level.color
                }}
              >
                <div className="text-2xl font-bold">{level.level}</div>
                <div className="text-xs font-medium">{level.name}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            ระดับปัจจุบัน: <span className="font-bold" style={{ color: THREAT_LEVELS[threatLevel].color }}>
              {THREAT_LEVELS[threatLevel].name}
            </span> (บันทึกอัตโนมัติ)
          </p>
        </div>

        {/* Broadcast Button */}
        <button
          onClick={() => setShowBroadcastForm(!showBroadcastForm)}
          className="w-full mb-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-medium flex items-center justify-center gap-2"
        >
          <MessageSquare className="w-5 h-5" />
          📢 ประกาศรายงานสด (ถึงทุกคน)
        </button>

        {/* Broadcast Form */}
        {showBroadcastForm && (
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 mb-4">
            <h3 className="font-bold text-purple-800 mb-2">เขียนประกาศ</h3>
            <textarea
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="เช่น: มีรายงานเสียงระเบิดที่ อ.คลองใหญ่ ขอให้ประชาชนหลีกเลี่ยงพื้นที่"
              rows={3}
              className="w-full p-3 border border-purple-300 rounded-xl resize-none mb-2"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSendBroadcast}
                disabled={!broadcastMessage.trim()}
                className="flex-1 py-2 bg-purple-600 text-white rounded-xl flex items-center justify-center gap-2 disabled:bg-slate-300"
              >
                <Send className="w-4 h-4" />
                ส่งประกาศ
              </button>
              <button onClick={() => setShowBroadcastForm(false)} className="px-4 py-2 bg-slate-200 rounded-xl">
                ยกเลิก
              </button>
            </div>
            {broadcastSent && (
              <p className="text-green-600 text-sm mt-2 text-center">✓ ส่งประกาศแล้ว!</p>
            )}
            
            {/* Broadcast List */}
            {broadcasts.length > 0 && (
              <div className="mt-4 border-t border-purple-200 pt-3">
                <h4 className="font-medium text-purple-700 mb-2">ประกาศทั้งหมด ({broadcasts.length})</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {broadcasts.map((bc) => (
                    <div key={bc.id} className="flex items-start gap-2 p-2 bg-white rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm">{bc.message}</p>
                        <p className="text-xs text-slate-400">{formatTime(bc.time)}</p>
                      </div>
                      <button 
                        onClick={() => handleDeleteBroadcast(bc.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                        title="ลบ"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 py-2 rounded-lg font-medium ${activeTab === 'reports' ? 'bg-blue-500 text-white' : 'bg-white border'}`}
          >
            📋 รายงาน ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab('sos')}
            className={`flex-1 py-2 rounded-lg font-medium ${activeTab === 'sos' ? 'bg-red-500 text-white' : 'bg-white border'}`}
          >
            🆘 SOS ({sosAlerts.length})
          </button>
          {pendingUsers.length > 0 && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-2 rounded-lg font-medium ${activeTab === 'users' ? 'bg-purple-500 text-white' : 'bg-white border'}`}
            >
              👤 รออนุมัติ ({pendingUsers.length})
            </button>
          )}
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-2 rounded-lg font-medium ${activeTab === 'members' ? 'bg-emerald-500 text-white' : 'bg-white border'}`}
          >
            👥 สมาชิก ({allMembers.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 py-2 rounded-lg font-medium ${activeTab === 'logs' ? 'bg-slate-700 text-white' : 'bg-white border'}`}
          >
            📝 Logs
          </button>
        </div>

        {/* All Members Tab */}
        {activeTab === 'members' && (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="p-4 border-b bg-emerald-50">
              <h3 className="font-bold flex items-center gap-2 text-emerald-800 mb-2">
                <UserCheck className="w-5 h-5" />
                สมาชิกทั้งหมด ({filteredMembers.length} คน)
              </h3>
              <p className="text-xs text-emerald-600 mb-3">ลบสมาชิกที่ให้ข้อมูลมั่วหรือทำผิดได้</p>
              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchMembers}
                  onChange={(e) => setSearchMembers(e.target.value)}
                  placeholder="🔍 ค้นหา ชื่อ, เบอร์โทร, ตำบล..."
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
            
            {filteredMembers.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <UserCheck className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>{searchMembers ? 'ไม่พบผลลัพธ์' : 'ยังไม่มีสมาชิก'}</p>
              </div>
            ) : (
              <div className="divide-y max-h-96 overflow-y-auto">
                {filteredMembers.map((user) => (
                  <div key={user.id} className={`p-4 ${!user.approved ? 'bg-amber-50' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{user.name}</span>
                          {user.approved ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">อนุมัติแล้ว</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">รออนุมัติ</span>
                          )}
                        </div>
                        <div className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" />
                          <a href={`tel:${user.phone}`} className="text-blue-500 hover:underline">
                            {user.phone?.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}
                          </a>
                          {user.district && (
                            <span className="ml-2">📍 {user.district}</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">สมัคร: {formatTime(user.createdAt)}</div>
                      </div>
                      <div className="flex gap-2">
                        {user.approved && (
                          <button 
                            onClick={() => setEditingUser({ ...user, originalPhone: user.phone })}
                            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                            title="แก้ไข"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteUser(user.phone, user.name)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                          title="ลบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="p-4 border-b bg-purple-50">
              <h3 className="font-bold flex items-center gap-2 text-purple-800">
                <UserCheck className="w-5 h-5" />
                รออนุมัติสมาชิก
              </h3>
            </div>
            
            {pendingUsers.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <UserCheck className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>ไม่มีผู้ใช้รออนุมัติ</p>
              </div>
            ) : (
              <div className="divide-y">
                {pendingUsers.map((user) => (
                  <div key={user.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold">{user.name}</div>
                        <div className="text-sm text-slate-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <a href={`tel:${user.phone}`} className="text-blue-500 hover:underline">
                            {user.phone?.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}
                          </a>
                        </div>
                        <div className="text-xs text-slate-400">{formatTime(user.createdAt)}</div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleApproveUser(user.phone)}
                          className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm flex items-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4" /> อนุมัติ
                        </button>
                        <button 
                          onClick={() => handleRejectUser(user.phone)}
                          className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm flex items-center gap-1"
                        >
                          <XCircle className="w-4 h-4" /> ปฏิเสธ
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SOS Tab */}
        {activeTab === 'sos' && (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="p-4 border-b bg-red-50">
              <h3 className="font-bold flex items-center gap-2 text-red-800 mb-3">
                <Siren className="w-5 h-5" />
                สัญญาณ SOS ({filteredSOS.length})
              </h3>
              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchSOS}
                  onChange={(e) => setSearchSOS(e.target.value)}
                  placeholder="🔍 ค้นหา ชื่อ, เบอร์โทร, ตำบล..."
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
            
            {filteredSOS.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Siren className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>{searchSOS ? 'ไม่พบผลลัพธ์' : 'ไม่มีสัญญาณ SOS'}</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredSOS.map((alert) => (
                  <div key={alert.id} className={`p-4 ${!alert.resolved ? 'bg-red-50' : ''}`}>
                    <div className="flex items-start gap-4">
                      <div className={`text-3xl ${!alert.resolved ? 'animate-pulse' : 'opacity-50'}`}>🆘</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-lg">{alert.userName || 'ผู้ใช้ไม่ได้ล็อกอิน'}</span>
                          {!alert.resolved && <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-xs animate-pulse">ต้องการช่วย!</span>}
                        </div>
                        
                        {/* Phone */}
                        {alert.phone ? (
                          <div className="flex items-center gap-2 mt-2">
                            <Phone className="w-4 h-4 text-green-600" />
                            <a href={`tel:${alert.phone}`} className="text-green-600 font-bold hover:underline text-lg">
                              {alert.phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}
                            </a>
                            <a href={`tel:${alert.phone}`} className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm font-medium">
                              📞 โทรเลย
                            </a>
                          </div>
                        ) : (
                          <div className="text-amber-600 text-sm mt-1">⚠️ ไม่มีเบอร์โทร (ผู้ใช้ไม่ได้ล็อกอิน)</div>
                        )}
                        
                        {/* District/Tambon */}
                        {alert.district ? (
                          <div className="text-sm text-blue-600 mt-2 font-medium bg-blue-50 inline-block px-2 py-1 rounded">
                            📍 {alert.district}
                          </div>
                        ) : (
                          <div className="text-gray-500 text-sm mt-1">📍 ไม่ทราบที่อยู่ (ผู้ใช้ไม่ได้ล็อกอิน)</div>
                        )}
                        
                        {/* GPS Location */}
                        <div className="text-sm text-slate-600 mt-2 bg-slate-100 p-2 rounded">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          <span className="font-medium">พิกัด GPS:</span> {alert.location || 'ไม่สามารถระบุตำแหน่งได้'}
                          {alert.lat && alert.lng && (
                            <a 
                              href={`https://www.google.com/maps?q=${alert.lat},${alert.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-blue-500 hover:underline"
                            >
                              🗺️ ดูแผนที่
                            </a>
                          )}
                        </div>
                        
                        <div className="text-xs text-slate-400 mt-2">{formatTime(alert.time)}</div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {!alert.resolved && (
                          <button onClick={() => handleResolveSOS(alert.id)} className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm">
                            ✓ ช่วยแล้ว
                          </button>
                        )}
                        <button onClick={() => handleDeleteSOS(alert.id)} className="px-3 py-2 bg-red-100 text-red-600 rounded-lg text-sm flex items-center gap-1">
                          <Trash2 className="w-3 h-3" /> ลบ
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <>
            {/* Filters + Search */}
            <div className="bg-white rounded-xl p-3 border mb-4">
              {/* Search Box */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchReports}
                  onChange={(e) => setSearchReports(e.target.value)}
                  placeholder="🔍 ค้นหา ชื่อ, สถานที่, รายละเอียด..."
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div className="flex gap-2">
                <select value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })} className="p-2 border rounded-lg text-sm flex-1">
                  <option value="">ทุกประเภท</option>
                  {reportTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <select value={filter.district} onChange={(e) => setFilter({ ...filter, district: e.target.value })} className="p-2 border rounded-lg text-sm flex-1">
                  <option value="">ทุกอำเภอ</option>
                  {TRAT_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {/* Reports List */}
            <div className="bg-white rounded-xl border overflow-hidden">
              {filteredReports.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Radio className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>ยังไม่มีรายงาน</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredReports.map((report) => (
                    <div key={report.id} className="p-4">
                      <div className="flex items-start gap-3 cursor-pointer" onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}>
                        <div className="text-xl">{reportTypes.find(t => t.id === report.type)?.icon || '📢'}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{reportTypes.find(t => t.id === report.type)?.label || report.type}</span>
                            {report.verified ? (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">✓</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">รอ</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">{report.location || report.district} • {formatTime(report.time)}</div>
                          <div className="text-xs text-slate-400">โดย: {report.userName || 'ไม่ระบุ'}</div>
                        </div>
                        {expandedReport === report.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>

                      {expandedReport === report.id && (
                        <div className="mt-3 pl-8 space-y-2">
                          {report.description && <div className="p-2 bg-slate-50 rounded-lg text-sm">{report.description}</div>}
                          <div className="flex gap-2">
                            {!report.verified ? (
                              <button onClick={() => handleVerify(report.id, true)} className="px-3 py-1 bg-green-500 text-white rounded text-sm">ยืนยัน</button>
                            ) : (
                              <button onClick={() => handleVerify(report.id, false)} className="px-3 py-1 bg-yellow-500 text-white rounded text-sm">ยกเลิก</button>
                            )}
                            <button onClick={() => handleDelete(report.id)} className="px-3 py-1 bg-red-500 text-white rounded text-sm">ลบ</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            {/* Log Stats */}
            {logStats && (
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-white rounded-lg p-3 border text-center">
                  <div className="text-xl font-bold">{logStats.total}</div>
                  <div className="text-xs text-slate-500">ทั้งหมด</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-center">
                  <div className="text-xl font-bold text-blue-600">{logStats.lastHour?.total || 0}</div>
                  <div className="text-xs text-blue-700">1 ชั่วโมง</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 border border-red-200 text-center">
                  <div className="text-xl font-bold text-red-600">{logStats.last24Hours?.errors || 0}</div>
                  <div className="text-xs text-red-700">Errors (24ชม.)</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200 text-center">
                  <div className="text-xl font-bold text-purple-600">{logStats.last24Hours?.security || 0}</div>
                  <div className="text-xs text-purple-700">Security</div>
                </div>
              </div>
            )}

            {/* Log Filters */}
            <div className="bg-white rounded-lg p-3 border flex flex-col gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchLogs}
                  onChange={(e) => setSearchLogs(e.target.value)}
                  placeholder="🔍 ค้นหา logs..."
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div className="flex gap-2">
                <select 
                  value={logFilter.level} 
                  onChange={(e) => setLogFilter({ ...logFilter, level: e.target.value })}
                  className="p-2 border rounded-lg text-sm flex-1"
                >
                  <option value="">ทุกระดับ</option>
                  <option value="ERROR">ERROR</option>
                  <option value="WARN">WARN</option>
                  <option value="INFO">INFO</option>
                  <option value="SECURITY">SECURITY</option>
                  <option value="DEBUG">DEBUG</option>
                </select>
                <select 
                  value={logFilter.category} 
                  onChange={(e) => setLogFilter({ ...logFilter, category: e.target.value })}
                  className="p-2 border rounded-lg text-sm flex-1"
                >
                  <option value="">ทุกหมวด</option>
                  <option value="AUTH">AUTH</option>
                  <option value="SYSTEM">SYSTEM</option>
                  <option value="SERVER">SERVER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
            </div>

            {/* Logs List */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="p-3 border-b bg-slate-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  <span className="font-bold">System Logs ({filteredLogs.length})</span>
                </div>
                <span className="text-xs text-slate-400">{logs.length} รายการ</span>
              </div>
              
              <div className="divide-y max-h-[500px] overflow-y-auto font-mono text-xs">
                {filteredLogs
                  .slice(0, 100)
                  .map((log) => {
                    const levelColors = {
                      DEBUG: 'text-gray-500 bg-gray-50',
                      INFO: 'text-blue-600 bg-blue-50',
                      WARN: 'text-yellow-600 bg-yellow-50',
                      ERROR: 'text-red-600 bg-red-50',
                      SECURITY: 'text-purple-600 bg-purple-50'
                    };
                    const colorClass = levelColors[log.level] || 'text-slate-600';
                    
                    return (
                      <div key={log.id} className={`p-2 ${colorClass}`}>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-400 shrink-0">
                            {new Date(log.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${colorClass}`}>
                            {log.level}
                          </span>
                          <span className="text-slate-500">[{log.category}]</span>
                          <span className="flex-1 break-all">{log.message}</span>
                        </div>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div className="mt-1 ml-20 text-[10px] text-slate-400 break-all">
                            {JSON.stringify(log.metadata)}
                          </div>
                        )}
                      </div>
                    );
                  })
                }
                {logs.length === 0 && (
                  <div className="p-8 text-center text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>ยังไม่มี logs</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" />
                แก้ไขข้อมูลสมาชิก
              </h3>
              
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ-สกุล</label>
                  <input
                    type="text"
                    required
                    value={editingUser.name}
                    onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทรศัพท์ (Login ID)</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={editingUser.phone}
                    onChange={e => setEditingUser({...editingUser, phone: e.target.value})}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  />
                  {editingUser.phone !== editingUser.originalPhone && (
                     <p className="text-xs text-red-500 mt-1">⚠️ การเปลี่ยนเบอร์โทรจะทำให้ผู้ใช้ถูก Logout ทันที</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ตำบล</label>
                  <select
                    value={editingUser.district || ''}
                    onChange={e => setEditingUser({...editingUser, district: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="">ระบุตำบล...</option>
                    {TRAT_DISTRICTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="flex-1 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    บันทึก
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
