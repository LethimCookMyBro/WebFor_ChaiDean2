import { useState, useEffect } from 'react'
import {
  Shield, Radio, CheckCircle, Clock, MapPin, RefreshCw, 
  Home, Send, MessageSquare, Trash2, LogOut, Activity, Search,
  FileText, ChevronLeft, ChevronRight, AlertTriangle
} from 'lucide-react'

// Threat levels
const THREAT_LEVELS = {
  GREEN: { level: 'GREEN', name: 'ปกติ', color: '#22c55e', bgColor: '#dcfce7' },
  YELLOW: { level: 'YELLOW', name: 'เฝ้าระวัง', color: '#eab308', bgColor: '#fef9c3' },
  ORANGE: { level: 'ORANGE', name: 'ยกระดับ', color: '#f97316', bgColor: '#ffedd5' },
  RED: { level: 'RED', name: 'อันตราย', color: '#dc2626', bgColor: '#fee2e2' },
}

const TRAT_DISTRICTS = ["เมืองตราด", "คลองใหญ่", "เขาสมิง", "บ่อไร่", "แหลมงอบ", "เกาะกูด", "เกาะช้าง"]

export default function AdminDashboard() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('reports')
  
  // Search/Filter states
  const [searchReports, setSearchReports] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterDistrict, setFilterDistrict] = useState('')

  // System Logs State
  const [logs, setLogs] = useState([])
  const [logPage, setLogPage] = useState(1)
  const [logTotalPages, setLogTotalPages] = useState(1)
  const [selectedLogs, setSelectedLogs] = useState([])
  const [logsPerPage] = useState(30)
  const [logDeleteAmount, setLogDeleteAmount] = useState('10')

  // Broadcast
  const [showBroadcastForm, setShowBroadcastForm] = useState(false)
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastSent, setBroadcastSent] = useState(false)
  const [broadcasts, setBroadcasts] = useState([])

  const [threatLevel, setThreatLevel] = useState(() => {
    return localStorage.getItem('adminThreatLevel') || 'YELLOW'
  })

  // API Base
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

  // Fetch Data
  const fetchData = async () => {
    setLoading(true)
    
    // 1. Fetch Reports (Mocking or API)
    // Try API first, fallback to localStorage
    try {
        const res = await fetch(`${API_BASE}/api/v1/reports`)
        if (res.ok) {
            const data = await res.json()
            setReports(data.reports || [])
        } else {
             // Fallback to localStorage if API fails (for development safety)
             const userReports = JSON.parse(localStorage.getItem('userReports') || '[]')
             setReports(userReports)
        }
    } catch (e) {
        const userReports = JSON.parse(localStorage.getItem('userReports') || '[]')
        setReports(userReports)
    }

    // 2. Fetch Broadcasts (LocalStorage for now)
    const broadcastData = JSON.parse(localStorage.getItem('adminBroadcasts') || '[]')
    setBroadcasts(broadcastData)

    // 3. Fetch Logs
    await fetchLogs(logPage)

    setLoading(false)
  }

  const fetchLogs = async (page) => {
      try {
          // Mock logs if API not ready, but let's try API
          // Since the validation requires pagination, we assume detailed implementation.
          // If API fails, I'll generate mock logs for UI demonstration as fallback?
          // No, better to try API.
          const res = await fetch(`${API_BASE}/api/v1/admin/logs?page=${page}&limit=${logsPerPage}`)
          if (res.ok) {
              const data = await res.json()
              setLogs(data.logs || [])
              setLogTotalPages(data.totalPages || 1)
          } else {
             // Fallback mock
             setLogs([]) 
          }
      } catch (e) {
          console.error("Fetch logs failed", e)
      }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line

  useEffect(() => {
      fetchLogs(logPage)
  }, [logPage]) // eslint-disable-line

  const handleThreatLevelChange = (level) => {
    setThreatLevel(level)
    localStorage.setItem('adminThreatLevel', level)
  }

  const handleAdminLogout = () => {
    localStorage.removeItem('adminSession')
    window.location.href = '/'
  }

  // Report Actions
  const handleVerifyReport = async (reportId, verified) => {
    // API Call
    try {
        await fetch(`${API_BASE}/api/v1/reports/${reportId}/verify`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ verified })
        })
        fetchData()
    } catch (e) {
        // Fallback localStorage
        const updated = reports.map(r => r.id === reportId ? { ...r, verified } : r)
        setReports(updated)
        localStorage.setItem('userReports', JSON.stringify(updated))
    }
  }

  const handleDeleteReport = async (reportId) => {
    if (!confirm('ยืนยันลบรายงานนี้?')) return
    try {
        await fetch(`${API_BASE}/api/v1/reports/${reportId}`, { method: 'DELETE' })
        fetchData()
    } catch (e) {
        const updated = reports.filter(r => r.id !== reportId)
        setReports(updated)
        localStorage.setItem('userReports', JSON.stringify(updated))
    }
  }

  // Log Actions
  const handlePageChange = (newPage) => {
      if (newPage >= 1 && newPage <= logTotalPages) {
          setLogPage(newPage)
      }
  }

  const handleSelectLog = (logId) => {
      if (selectedLogs.includes(logId)) {
          setSelectedLogs(selectedLogs.filter(id => id !== logId))
      } else {
          setSelectedLogs([...selectedLogs, logId])
      }
  }

  const handleSelectAllLogs = () => {
      if (selectedLogs.length === logs.length) {
          setSelectedLogs([])
      } else {
          setSelectedLogs(logs.map(l => l.id))
      }
  }

  const handleDeleteSelectedLogs = async () => {
      if (!confirm(`ยืนยันลบ ${selectedLogs.length} รายการ?`)) return
      // API Call
      try {
          await fetch(`${API_BASE}/api/v1/admin/logs/bulk-delete`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ logIds: selectedLogs })
          })
          fetchLogs(logPage)
          setSelectedLogs([])
      } catch (e) {
          alert('ลบข้อมูลไม่สำเร็จ')
      }
  }

  const handleDeleteByAmount = async () => {
      const amount = logDeleteAmount === 'all' ? 'ทั้งหมด' : `${logDeleteAmount} รายการล่าสุด`
      if (!confirm(`ยืนยันลบ Logs ${amount}?`)) return
      // API Call
      try {
        await fetch(`${API_BASE}/api/v1/admin/logs/prune`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ amount: logDeleteAmount })
        })
        fetchLogs(1)
      } catch (e) {
          alert('ลบข้อมูลไม่สำเร็จ')
      }
  }

  // Broadcast
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
    fetchData()
    setTimeout(() => setBroadcastSent(false), 3000)
  }

  const handleDeleteBroadcast = (id) => {
      if(!confirm('ลบประกาศ?')) return
      const updated = broadcasts.filter(b => b.id !== id)
      setBroadcasts(updated)
      localStorage.setItem('adminBroadcasts', JSON.stringify(updated))
  }


  // Filters
  const filteredReports = reports.filter(r => {
      if (filterType && r.type !== filterType) return false
      if (filterDistrict && r.district !== filterDistrict) return false
      if (searchReports) {
          const s = searchReports.toLowerCase()
          return r.type?.toLowerCase().includes(s) || 
                 r.location?.toLowerCase().includes(s) || 
                 r.description?.toLowerCase().includes(s) ||
                 r.ip?.includes(s) // Search by IP
      }
      return true
  })

  const formatTime = (t) => new Date(t).toLocaleString('th-TH')

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-400" />
            <div>
                <h1 className="font-bold">Admin Dashboard</h1>
                <p className="text-xs text-slate-400">จ.ตราด (Safe Border)</p>
            </div>
        </div>
        <div className="flex gap-2">
            <button onClick={fetchData} className="p-2 hover:bg-slate-800 rounded-lg">
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleAdminLogout} className="p-2 hover:bg-slate-800 rounded-lg text-red-400" title="Logout">
                <LogOut className="w-5 h-5" />
            </button>
            <a href="/" className="p-2 hover:bg-slate-800 rounded-lg">
                <Home className="w-5 h-5" />
            </a>
        </div>
      </header>

      <main className="p-4 max-w-6xl mx-auto">
        {/* Threat Level */}
        <div className="bg-white rounded-xl p-4 border mb-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3 font-bold text-slate-800">
                <Activity className="w-5 h-5" /> ควบคุมระดับภัยคุกคาม
            </div>
            <div className="grid grid-cols-4 gap-2">
                {Object.values(THREAT_LEVELS).map(l => (
                    <button
                        key={l.level}
                        onClick={() => handleThreatLevelChange(l.level)}
                        className={`p-3 rounded-xl transition-all ${threatLevel === l.level ? 'ring-2 ring-offset-2 scale-105' : 'opacity-60 hover:opacity-100'}`}
                        style={{ backgroundColor: l.bgColor, color: l.color, ringColor: l.color }}
                    >
                        <div className="text-2xl font-bold">{l.level}</div>
                        <div className="text-xs">{l.name}</div>
                    </button>
                ))}
            </div>
        </div>

        {/* Broadcast */}
        <div className="mb-6">
            <button onClick={() => setShowBroadcastForm(!showBroadcastForm)} className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium flex justify-center items-center gap-2 shadow-sm">
                <MessageSquare className="w-5 h-5" /> ประกาศรายงานสด (Broadcast)
            </button>
            {showBroadcastForm && (
                <div className="mt-2 bg-white p-4 rounded-xl border border-purple-100 shadow-sm">
                    <textarea 
                        value={broadcastMessage}
                        onChange={e => setBroadcastMessage(e.target.value)}
                        className="w-full p-3 border rounded-lg mb-2"
                        placeholder="ข้อความประกาศ..."
                        rows={3}
                    />
                    <div className="flex gap-2">
                        <button onClick={handleSendBroadcast} className="bg-purple-600 text-white px-4 py-2 rounded-lg flex gap-2 items-center">
                            <Send className="w-4 h-4"/> ส่งประกาศ
                        </button>
                        {broadcastSent && <span className="text-green-600 flex items-center">✓ ส่งแล้ว</span>}
                    </div>
                     {/* Broadcast List */}
                     <div className="mt-4 space-y-2">
                        {broadcasts.map(b => (
                            <div key={b.id} className="flex justify-between items-center bg-slate-50 p-2 rounded text-sm">
                                <span>{b.message} <span className="text-xs text-slate-400">({formatTime(b.time)})</span></span>
                                <button onClick={() => handleDeleteBroadcast(b.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
            <button onClick={() => setActiveTab('reports')} className={`flex-1 py-2 rounded-lg font-medium ${activeTab === 'reports' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600'}`}>
                📋 รายงาน ({reports.length})
            </button>
            <button onClick={() => setActiveTab('logs')} className={`flex-1 py-2 rounded-lg font-medium ${activeTab === 'logs' ? 'bg-slate-700 text-white' : 'bg-white border text-slate-600'}`}>
                📝 System Logs
            </button>
        </div>

        {/* Reports Tab */}
        {activeTab === 'reports' && (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b flex gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
                        <input 
                            type="text" 
                            placeholder="ค้นหา..." 
                            value={searchReports}
                            onChange={e => setSearchReports(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                        />
                    </div>
                    <select className="p-2 border rounded-lg text-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="">ทุกประเภท</option>
                        <option value="explosion">💥 ระเบิด</option>
                        <option value="gunfire">🔫 เสียงปืน</option>
                        <option value="military">🪖 ทหาร</option>
                        <option value="warning">⚠️ แจ้งเตือน</option>
                    </select>
                    <select className="p-2 border rounded-lg text-sm" value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)}>
                        <option value="">ทุกอำเภอ</option>
                        {TRAT_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-600 uppercase font-medium">
                            <tr>
                                <th className="px-4 py-3">เวลา</th>
                                <th className="px-4 py-3">ประเภท</th>
                                <th className="px-4 py-3">IP Address</th>
                                <th className="px-4 py-3">รายละเอียด</th>
                                <th className="px-4 py-3">สถานที่</th>
                                <th className="px-4 py-3">สถานะ</th>
                                <th className="px-4 py-3">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredReports.length === 0 ? (
                                <tr><td colSpan="7" className="p-8 text-center text-slate-400">ไม่พบรายงาน</td></tr>
                            ) : filteredReports.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">{formatTime(r.time)}</td>
                                    <td className="px-4 py-3 font-medium">{r.type}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block mt-2">{r.ip || r.ip_address || 'N/A'}</td>
                                    <td className="px-4 py-3 max-w-xs truncate" title={r.description}>{r.description || '-'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3 text-slate-400"/>
                                            {r.location}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {r.verified ? 
                                            <span className="text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3"/> ยืนยันแล้ว</span> : 
                                            <span className="text-amber-600 bg-amber-100 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit"><AlertTriangle className="w-3 h-3"/> รอตรวจสอบ</span>
                                        }
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleVerifyReport(r.id, !r.verified)}
                                                className={`p-1 rounded ${r.verified ? 'text-amber-500 hover:bg-amber-50' : 'text-green-500 hover:bg-green-50'}`}
                                                title={r.verified ? "ยกเลิกการยืนยัน" : "ยืนยันความถูกต้อง"}
                                            >
                                                <CheckCircle className="w-4 h-4"/>
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteReport(r.id)}
                                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                title="ลบ"
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
            <div className="bg-white rounded-xl border shadow-sm">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-slate-500"/>
                        <span className="font-bold">System Logs ({logs.length})</span>
                    </div>
                    <button onClick={() => fetchLogs(logPage)} className="text-sm text-blue-600 hover:underline">รีเฟรช</button>
                </div>
                
                {/* Bulk Actions */}
                <div className="p-4 border-b bg-slate-50 flex gap-4 items-center flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-sm">ลบจำนวน:</span>
                        <select 
                            value={logDeleteAmount} 
                            onChange={e => setLogDeleteAmount(e.target.value)}
                            className="p-1 border rounded text-sm"
                        >
                            <option value="10">10 ล่าสุด</option>
                            <option value="50">50 ล่าสุด</option>
                            <option value="100">100 ล่าสุด</option>
                            <option value="all">ทั้งหมด</option>
                        </select>
                        <button onClick={handleDeleteByAmount} className="px-3 py-1 bg-white border hover:bg-red-50 text-red-600 rounded text-sm transition-colors">ลบตามจำนวน</button>
                    </div>
                    
                    <div className="h-6 w-px bg-slate-300 mx-2 hidden sm:block"></div>

                    <div className="flex items-center gap-2">
                        <button onClick={handleSelectAllLogs} className="text-sm text-slate-600 hover:text-slate-900 border px-2 py-1 rounded bg-white">
                            {selectedLogs.length === logs.length && logs.length > 0 ? '[✓] เลือกทั้งหมด' : '[ ] เลือกทั้งหมด'}
                        </button>
                        {selectedLogs.length > 0 && (
                            <>
                                <span className="text-sm text-slate-500">เลือกแล้ว {selectedLogs.length} รายการ</span>
                                <button onClick={handleDeleteSelectedLogs} className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">ลบที่เลือก</button>
                            </>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-600 uppercase">
                            <tr>
                                <th className="px-4 py-3 w-10">#</th>
                                <th className="px-4 py-3">Time</th>
                                <th className="px-4 py-3">Message</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {logs.length === 0 ? (
                                <tr><td colSpan="3" className="p-8 text-center text-slate-400">ไม่มี Logs</td></tr>
                            ) : logs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedLogs.includes(log.id)}
                                            onChange={() => handleSelectLog(log.id)}
                                            className="rounded border-slate-300"
                                        />
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">{formatTime(log.timestamp || log.time)}</td>
                                    <td className="px-4 py-3 font-mono text-xs">{log.message}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t flex justify-center items-center gap-4">
                    <button 
                        disabled={logPage === 1}
                        onClick={() => handlePageChange(logPage - 1)}
                        className="p-2 border rounded hover:bg-slate-50 disabled:opacity-50"
                    >
                        <ChevronLeft className="w-4 h-4"/>
                    </button>
                    <span className="text-sm">หน้า {logPage} / {logTotalPages}</span>
                    <button 
                        disabled={logPage === logTotalPages}
                        onClick={() => handlePageChange(logPage + 1)}
                        className="p-2 border rounded hover:bg-slate-50 disabled:opacity-50"
                    >
                        <ChevronRight className="w-4 h-4"/>
                    </button>
                </div>
            </div>
        )}
      </main>
    </div>
  )
}
