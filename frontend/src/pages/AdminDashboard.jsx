import { useState, useEffect } from 'react'
import {
  Shield, Radio, AlertTriangle, CheckCircle, XCircle, 
  Clock, MapPin, Filter, RefreshCw, ChevronDown, ChevronUp,
  Home, Siren, Send, MessageSquare, Phone, Trash2, UserCheck, LogOut
} from 'lucide-react'

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
  
  // Broadcast form
  const [showBroadcastForm, setShowBroadcastForm] = useState(false)
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastSent, setBroadcastSent] = useState(false)
  const [pendingUsers, setPendingUsers] = useState([])
  const [allMembers, setAllMembers] = useState([])
  const [broadcasts, setBroadcasts] = useState([])
  
  // Admin logout
  const handleAdminLogout = () => {
    localStorage.removeItem('adminSession')
    window.location.href = '/'
  }
  
  // Fetch data
  const fetchData = () => {
    setLoading(true)
    const userReports = JSON.parse(localStorage.getItem('userReports') || '[]')
    const sosData = JSON.parse(localStorage.getItem('sosAlerts') || '[]')
    const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]')
    const pending = allUsers.filter(u => !u.approved)
    const approved = allUsers.filter(u => u.approved)
    setReports(userReports)
    setSosAlerts(sosData)
    setPendingUsers(pending)
    setAllMembers(allUsers)
    
    // Load broadcasts
    const broadcastData = JSON.parse(localStorage.getItem('adminBroadcasts') || '[]')
    setBroadcasts(broadcastData)
    
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
  const handleResolveSOS = (alertId) => {
    const updated = sosAlerts.map(a => a.id === alertId ? { ...a, resolved: true } : a)
    setSosAlerts(updated)
    localStorage.setItem('sosAlerts', JSON.stringify(updated))
  }

  // Delete SOS
  const handleDeleteSOS = (alertId) => {
    if (!confirm('ลบ SOS นี้?')) return
    const updated = sosAlerts.filter(a => a.id !== alertId)
    setSosAlerts(updated)
    localStorage.setItem('sosAlerts', JSON.stringify(updated))
  }

  // Approve user
  const handleApproveUser = (userId) => {
    const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]')
    const updated = allUsers.map(u => u.id === userId ? { ...u, approved: true } : u)
    localStorage.setItem('allUsers', JSON.stringify(updated))
    setPendingUsers(updated.filter(u => !u.approved))
  }

  // Reject user
  const handleRejectUser = (userId) => {
    if (!confirm('ปฏิเสธผู้สมัครนี้?')) return
    const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]')
    const updated = allUsers.filter(u => u.id !== userId)
    localStorage.setItem('allUsers', JSON.stringify(updated))
    setPendingUsers(updated.filter(u => !u.approved))
    setAllMembers(updated)
  }

  // Delete user (for bad data or violations)
  const handleDeleteUser = (userId, userName) => {
    if (!confirm(`ลบสมาชิก "${userName}"?\n\nข้อมูลทั้งหมดของผู้ใช้นี้จะถูกลบ`)) return
    const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]')
    const updated = allUsers.filter(u => u.id !== userId)
    localStorage.setItem('allUsers', JSON.stringify(updated))
    
    // Also clean up user-specific data
    localStorage.removeItem(`user_${userId}_reports`)
    localStorage.removeItem(`user_${userId}_family`)
    localStorage.removeItem(`user_${userId}_sos`)
    
    setPendingUsers(updated.filter(u => !u.approved))
    setAllMembers(updated)
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

  // Filter reports
  const filteredReports = reports.filter(r => {
    if (filter.type && r.type !== filter.type) return false
    if (filter.district && r.district !== filter.district) return false
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
        </div>

        {/* All Members Tab */}
        {activeTab === 'members' && (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="p-4 border-b bg-emerald-50">
              <h3 className="font-bold flex items-center gap-2 text-emerald-800">
                <UserCheck className="w-5 h-5" />
                สมาชิกทั้งหมด ({allMembers.length} คน)
              </h3>
              <p className="text-xs text-emerald-600 mt-1">ลบสมาชิกที่ให้ข้อมูลมั่วหรือทำผิดได้</p>
            </div>
            
            {allMembers.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <UserCheck className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>ยังไม่มีสมาชิก</p>
              </div>
            ) : (
              <div className="divide-y max-h-96 overflow-y-auto">
                {allMembers.map((user) => (
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
                      <button 
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        className="px-3 py-2 bg-red-100 text-red-600 rounded-lg text-sm flex items-center gap-1 hover:bg-red-200"
                      >
                        <Trash2 className="w-4 h-4" /> ลบ
                      </button>
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
                          onClick={() => handleApproveUser(user.id)}
                          className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm flex items-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4" /> อนุมัติ
                        </button>
                        <button 
                          onClick={() => handleRejectUser(user.id)}
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
              <h3 className="font-bold flex items-center gap-2 text-red-800">
                <Siren className="w-5 h-5" />
                สัญญาณ SOS
              </h3>
            </div>
            
            {sosAlerts.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Siren className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>ไม่มีสัญญาณ SOS</p>
              </div>
            ) : (
              <div className="divide-y">
                {sosAlerts.map((alert) => (
                  <div key={alert.id} className={`p-4 ${!alert.resolved ? 'bg-red-50' : ''}`}>
                    <div className="flex items-start gap-4">
                      <div className={`text-3xl ${!alert.resolved ? 'animate-pulse' : 'opacity-50'}`}>🆘</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{alert.userName || 'ผู้ใช้'}</span>
                          {!alert.resolved && <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-xs animate-pulse">ต้องการช่วย!</span>}
                        </div>
                        {alert.phone && (
                          <div className="flex items-center gap-2 mt-1">
                            <Phone className="w-3 h-3 text-green-600" />
                            <a href={`tel:${alert.phone}`} className="text-green-600 font-medium hover:underline">
                              {alert.phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}
                            </a>
                            <a href={`tel:${alert.phone}`} className="px-2 py-1 bg-green-500 text-white rounded text-xs">
                              📞 โทร
                            </a>
                          </div>
                        )}
                        {alert.district && (
                          <div className="text-sm text-blue-600 mt-1 font-medium">
                            📍 อ.{alert.district}
                          </div>
                        )}
                        <div className="text-sm text-slate-500 mt-1">
                          <MapPin className="w-3 h-3 inline" /> {alert.location}
                        </div>
                        <div className="text-xs text-slate-400">{formatTime(alert.time)}</div>
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
            {/* Filters */}
            <div className="bg-white rounded-xl p-3 border mb-4">
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
      </main>
    </div>
  )
}
