import { useState, useEffect } from 'react'
import {
  Shield, Radio, CheckCircle, Clock, MapPin, RefreshCw, 
  Home, Send, MessageSquare, Trash2, LogOut, Activity, Search,
  FileText, ChevronLeft, ChevronRight, AlertTriangle, Lock, Ban,
  ExternalLink, Edit
} from 'lucide-react'
import API_BASE from '../config/api'

// Threat levels
const THREAT_LEVELS = {
  GREEN: { level: 'GREEN', name: 'ปกติ', color: '#22c55e', bgColor: '#dcfce7' },
  YELLOW: { level: 'YELLOW', name: 'เฝ้าระวัง', color: '#eab308', bgColor: '#fef9c3' },
  ORANGE: { level: 'ORANGE', name: 'ยกระดับ', color: '#f97316', bgColor: '#ffedd5' },
  RED: { level: 'RED', name: 'อันตราย', color: '#dc2626', bgColor: '#fee2e2' },
}

const TRAT_DISTRICTS = ["เมืองตราด", "คลองใหญ่", "เขาสมิง", "บ่อไร่", "แหลมงอบ", "เกาะกูด", "เกาะช้าง"]

// Report Type Translations
const REPORT_TYPE_LABELS = {
  'explosion': '💥 เสียงระเบิด',
  'gunfire': '🔫 เสียงปืน',
  'military': '🪖 การเคลื่อนพล',
  'roadblock': '🚧 ถนนปิด',
  'evacuation': '🏃 จุดอพยพเปิด',
  'warning': '⚠️ แจ้งเตือนอื่นๆ'
}

export default function AdminDashboard() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('reports')
  
  // Search/Filter states
  const [searchReports, setSearchReports] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterDistrict, setFilterDistrict] = useState('')

  // Pagination states
  const [reportsPage, setReportsPage] = useState(1)
  const REPORTS_PER_PAGE = 30

  // Report Selection & Edit State
  const [selectedReports, setSelectedReports] = useState([])
  const [customReportDeleteCount, setCustomReportDeleteCount] = useState('')
  const [editingReport, setEditingReport] = useState(null)
  const [editForm, setEditForm] = useState({ description: '', location: '', type: '' })

  // System Logs State
  const [logs, setLogs] = useState([])
  const [logsPage, setLogsPage] = useState(1)
  const [selectedLogs, setSelectedLogs] = useState([])
  const LOGS_PER_PAGE = 30
  const [logDeleteAmount, setLogDeleteAmount] = useState('10')
  const [customDeleteCount, setCustomDeleteCount] = useState('')

  // Security State
  const [blockedIPs, setBlockedIPs] = useState([])
  const [securityLogs, setSecurityLogs] = useState([])

  // Broadcast
  const [showBroadcastForm, setShowBroadcastForm] = useState(false)
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastSent, setBroadcastSent] = useState(false)
  const [broadcasts, setBroadcasts] = useState([])

  const [threatLevel, setThreatLevel] = useState(() => {
    return localStorage.getItem('adminThreatLevel') || 'YELLOW'
  })
  const [threatMessage, setThreatMessage] = useState('')

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [startY, setStartY] = useState(0)
  const PULL_THRESHOLD = 80

  // Helper: Get CSRF token from cookie
  const getCSRFToken = () => {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/)
    return match ? match[1] : ''
  }

  // Helper: Build headers with CSRF token
  const getHeaders = (includeContent = true) => {
    const headers = {
      'X-CSRF-Token': getCSRFToken()
    }
    if (includeContent) {
      headers['Content-Type'] = 'application/json'
    }
    return headers
  }

  // Fetch Data
  const fetchData = async () => {
    setLoading(true)
    
    // 1. Fetch Reports from API (syncs across devices)
    try {
      const res = await fetch(`${API_BASE}/api/v1/reports`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setReports(data.reports || [])
      }
    } catch (e) {
      console.warn('Failed to fetch reports from API')
      setReports([])
    }

    // 2. Fetch Broadcasts from API
    try {
      const res = await fetch(`${API_BASE}/api/v1/status/broadcasts`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setBroadcasts(data.broadcasts || [])
      }
    } catch (e) {
      // Fallback to localStorage for backwards compatibility
      const broadcastData = JSON.parse(localStorage.getItem('adminBroadcasts') || '[]')
      setBroadcasts(broadcastData)
    }

    // 3. Fetch Threat Level from API
    try {
      const res = await fetch(`${API_BASE}/api/v1/status/threat-level`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data.level) setThreatLevel(data.level)
        if (data.message !== undefined) setThreatMessage(data.message)
      }
    } catch (e) {
      // Use localStorage as fallback
    }

    // 4. Fetch System Logs from API
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/logs`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
      }
    } catch (e) {
      const savedLogs = JSON.parse(localStorage.getItem('systemLogs') || '[]')
      setLogs(savedLogs)
    }

    // 5. Fetch Blocked IPs from API
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/blocked-ips`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setBlockedIPs(data.blockedIPs || [])
      }
    } catch (e) {
      console.warn('Failed to fetch blocked IPs from API')
    }

    // 6. Fetch Security Logs (local for now)
    const savedSecLogs = JSON.parse(localStorage.getItem('securityLogs') || '[]')
    setSecurityLogs(savedSecLogs)

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])

  // Pull-to-refresh handlers
  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY)
    }
  }

  const handleTouchMove = (e) => {
    if (startY === 0 || isRefreshing) return
    if (window.scrollY > 0) {
      setPullDistance(0)
      return
    }
    const currentY = e.touches[0].clientY
    const diff = currentY - startY
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.5, 120))
    }
  }

  const handleTouchEnd = () => {
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(60)
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } else {
      setPullDistance(0)
    }
    setStartY(0)
  }

  const handleThreatLevelChange = async (level) => {
    setThreatLevel(level)
    // Sync to backend API with custom message
    try {
      await fetch(`${API_BASE}/api/v1/status/threat-level`, {
        method: 'PUT',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ level, message: threatMessage })
      })
    } catch (e) {
      console.warn('Failed to sync threat level to API')
    }
    localStorage.setItem('adminThreatLevel', level) // Backup
  }

  const handleSaveThreatMessage = async () => {
    try {
      await fetch(`${API_BASE}/api/v1/status/threat-level`, {
        method: 'PUT',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ level: threatLevel, message: threatMessage })
      })
      alert('บันทึกข้อความสำเร็จ!')
    } catch (e) {
      alert('ไม่สามารถบันทึกได้')
    }
  }

  const handleAdminLogout = () => {
    localStorage.removeItem('adminSession')
    window.location.href = '/'
  }

  // Helper Functions
  const getReportTypeLabel = (type) => REPORT_TYPE_LABELS[type] || type

  const addSystemLog = (message) => {
    const newLog = {
      id: `log_${Date.now()}_${Math.random()}`,
      message,
      time: new Date().toISOString()
    }
    const updated = [newLog, ...logs]
    setLogs(updated)
    localStorage.setItem('systemLogs', JSON.stringify(updated))
  }

  // --- Report Actions ---
  const handleVerifyReport = async (reportId, currentStatus) => {
    // Optimistic UI update
    const updated = reports.map(r => r.id === reportId ? { ...r, verified: !currentStatus } : r)
    setReports(updated)
    
    // API Call - sync to backend
    try {
        await fetch(`${API_BASE}/api/v1/reports/${reportId}/verify`, {
            method: 'PUT',
            headers: getHeaders(),
            credentials: 'include',
            body: JSON.stringify({ verified: !currentStatus })
        })
        addSystemLog(`Verified report ${reportId}`)
    } catch (e) {
        console.error("API Error", e)
    }
  }

  const handleDeleteReport = async (reportId) => {
    if (!confirm('ยืนยันลบรายงานนี้?')) return
    
    // Delete from API first
    try {
        await fetch(`${API_BASE}/api/v1/reports/${reportId}`, {
          method: 'DELETE',
          headers: getHeaders(false),
          credentials: 'include'
        })
    } catch (e) {
        console.error('API Error', e)
    }
    
    // Update state
    const updated = reports.filter(r => r.id !== reportId)
    setReports(updated)
    setSelectedReports(prev => prev.filter(id => id !== reportId))
    addSystemLog(`Deleted report ${reportId}`)
  }

  // --- Edit Report ---
  const handleEditReport = (report) => {
    setEditingReport(report)
    setEditForm({
      description: report.description || '',
      location: report.location || '',
      type: report.type || ''
    })
  }

  const handleSaveEdit = async () => {
    if (!editingReport) return
    
    // Update via API
    try {
      await fetch(`${API_BASE}/api/v1/reports/${editingReport.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          type: editForm.type,
          description: editForm.description,
          location: editForm.location
        })
      })
    } catch (e) {
      console.error('API Error', e)
    }
    
    // Update state
    const updated = reports.map(r => 
      r.id === editingReport.id 
        ? { ...r, description: editForm.description, location: editForm.location, type: editForm.type, editedAt: new Date().toISOString() } 
        : r
    )
    setReports(updated)
    setEditingReport(null)
    addSystemLog(`Edited report ${editingReport.id}`)
  }

  // --- Bulk Report Selection & Delete ---
  const toggleReportSelection = (reportId) => {
    setSelectedReports(prev => prev.includes(reportId) ? prev.filter(id => id !== reportId) : [...prev, reportId])
  }

  const toggleSelectAllReports = () => {
    const currentIds = getPaginatedReports().map(r => r.id)
    const allSelected = currentIds.every(id => selectedReports.includes(id))
    if (allSelected) {
      setSelectedReports(prev => prev.filter(id => !currentIds.includes(id)))
    } else {
      setSelectedReports(prev => [...new Set([...prev, ...currentIds])])
    }
  }

  const handleDeleteSelectedReports = async () => {
    if (selectedReports.length === 0) return
    if (!confirm(`ยืนยันลบ ${selectedReports.length} รายงาน?`)) return
    
    // Delete via API for each selected report
    for (const reportId of selectedReports) {
      try {
        await fetch(`${API_BASE}/api/v1/reports/${reportId}`, {
          method: 'DELETE',
          headers: getHeaders(false),
          credentials: 'include'
        })
      } catch (e) {
        console.error('Failed to delete report:', reportId, e)
      }
    }
    
    // Update state
    const updated = reports.filter(r => !selectedReports.includes(r.id))
    setReports(updated)
    setSelectedReports([])
    addSystemLog(`Bulk deleted ${selectedReports.length} reports`)
  }

  const handleBulkDeleteReports = async (countInput) => {
    let count = 0
    if (countInput === 'all') count = reports.length
    else count = Math.min(parseInt(countInput) || 0, reports.length)
    
    if (count <= 0) return
    if (!confirm(`ยืนยันลบ ${count} รายงานล่าสุด?`)) return
    
    // Get IDs of reports to delete (newest first)
    const idsToDelete = reports.slice(0, count).map(r => r.id)
    
    // Delete via API
    for (const reportId of idsToDelete) {
      try {
        await fetch(`${API_BASE}/api/v1/reports/${reportId}`, {
          method: 'DELETE',
          headers: getHeaders(false),
          credentials: 'include'
        })
      } catch (e) {
        console.error('Failed to delete report:', reportId, e)
      }
    }
    
    // Update state
    const updated = reports.slice(count)
    setReports(updated)
    setSelectedReports([])
    addSystemLog(`Bulk deleted ${count} reports`)
  }

  // --- Log Actions ---
  const handleDeleteSelectedLogs = async () => {
      if (selectedLogs.length === 0) return
      if (!confirm(`ยืนยันลบ ${selectedLogs.length} รายการ?`)) return
      
      // Delete via API
      for (const logId of selectedLogs) {
        try {
          await fetch(`${API_BASE}/api/v1/admin/logs/${logId}`, {
            method: 'DELETE',
            headers: getHeaders(false),
            credentials: 'include'
          })
        } catch (e) {
          console.error('Failed to delete log:', logId, e)
        }
      }
      
      const updated = logs.filter(log => !selectedLogs.includes(log.id))
      setLogs(updated)
      setSelectedLogs([])
      // addSystemLog not needed as we just deleted logs
  }

  const handleBulkDeleteLogs = async (countInput) => {
      if (countInput === 'all') {
        if (!confirm('ยืนยันลบ Logs ทั้งหมด?')) return
        try {
            await fetch(`${API_BASE}/api/v1/admin/logs`, {
                method: 'DELETE',
                headers: getHeaders(false),
                credentials: 'include'
            })
            setLogs([])
            setSelectedLogs([])
        } catch (e) {
            console.error('Failed to clear logs:', e)
        }
        return
      }

      let count = Math.min(parseInt(countInput) || 0, logs.length)
      if (count <= 0) return
      if (!confirm(`ยืนยันลบ Logs ${count} รายการล่าสุด?`)) return
      
      // Get IDs to delete (first 'count' elements are newest)
      const idsToDelete = logs.slice(0, count).map(l => l.id)

      // Delete via API
      for (const logId of idsToDelete) {
        try {
          await fetch(`${API_BASE}/api/v1/admin/logs/${logId}`, {
            method: 'DELETE',
            headers: getHeaders(false),
            credentials: 'include'
          })
        } catch (e) {
          console.error('Failed to delete log:', logId, e)
        }
      }
      
      const updated = logs.slice(count)
      setLogs(updated)
      setSelectedLogs([])
  }

  const toggleLogSelection = (logId) => {
      setSelectedLogs(prev => prev.includes(logId) ? prev.filter(id => id !== logId) : [...prev, logId])
  }

  const toggleSelectAllLogs = () => {
      const currentIds = getPaginatedLogs().map(l => l.id)
      const allSelected = currentIds.every(id => selectedLogs.includes(id))
      if (allSelected) {
          setSelectedLogs(prev => prev.filter(id => !currentIds.includes(id)))
      } else {
          setSelectedLogs(prev => [...new Set([...prev, ...currentIds])])
      }
  }

  // --- Security Actions ---
  const addSecurityLog = (ip, action, details) => {
    const log = {
        id: `sec_${Date.now()}`,
        ip,
        action,
        details,
        time: new Date().toISOString()
    }
    const updated = [log, ...securityLogs]
    setSecurityLogs(updated)
    localStorage.setItem('securityLogs', JSON.stringify(updated))
  }

  const handleBlockIP = async (ip) => {
      if (!ip || ip === 'N/A' || ip === 'unknown') return alert('Invalid IP')
      const exists = blockedIPs.some(b => (b.ip || b) === ip)
      if (exists) return alert('IP already blocked')
      if (!confirm(`Block IP: ${ip}?`)) return

      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/blocked-ips`, {
          method: 'POST',
          headers: getHeaders(),
          credentials: 'include',
          body: JSON.stringify({ ip, reason: 'Manual block by admin' })
        })
        
        if (res.ok) {
          const data = await res.json()
          setBlockedIPs(prev => [...prev, data.record])
          addSecurityLog(ip, 'blocked', 'Manual block by admin (via API)')
        } else {
          const err = await res.json()
          alert(err.error || 'Failed to block IP')
        }
      } catch (e) {
        console.error('API Error, falling back to localStorage', e)
        // Fallback to localStorage
        const updated = [...blockedIPs, { ip, blockedAt: new Date().toISOString() }]
        setBlockedIPs(updated)
        localStorage.setItem('blockedIPs', JSON.stringify(updated))
        addSecurityLog(ip, 'blocked', 'Manual block by admin (local)')
      }
  }

  const handleUnblockIP = async (ipOrObj) => {
      const ip = typeof ipOrObj === 'string' ? ipOrObj : ipOrObj.ip
      if (!confirm(`Unblock IP: ${ip}?`)) return
      
      try {
        const res = await fetch(`${API_BASE}/api/v1/admin/blocked-ips/${ip}`, {
          method: 'DELETE',
          headers: getHeaders(false),
          credentials: 'include'
        })
        
        if (res.ok) {
          setBlockedIPs(prev => prev.filter(b => (b.ip || b) !== ip))
          addSecurityLog(ip, 'unblocked', 'Manual unblock by admin (via API)')
        } else {
          const err = await res.json()
          alert(err.error || 'Failed to unblock IP')
        }
      } catch (e) {
        console.error('API Error, falling back to localStorage', e)
        const updated = blockedIPs.filter(b => (b.ip || b) !== ip)
        setBlockedIPs(updated)
        localStorage.setItem('blockedIPs', JSON.stringify(updated))
        addSecurityLog(ip, 'unblocked', 'Manual unblock by admin (local)')
      }
  }

  const checkSpamIP = () => {
     // Simple client-side check
     const oneHourAgo = Date.now() - 3600000
     const recent = reports.filter(r => new Date(r.time).getTime() > oneHourAgo)
     const counts = {}
     recent.forEach(r => {
         const ip = r.ip || r.ip_address
         if(ip && ip !== 'N/A') counts[ip] = (counts[ip] || 0) + 1
     })
     return Object.entries(counts).filter(([_, c]) => c >= 5).map(([ip, count]) => ({ ip, count }))
  }

  // --- Broadcast ---
  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) return
    
    try {
      const res = await fetch(`${API_BASE}/api/v1/status/broadcasts`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ message: broadcastMessage.trim() })
      })
      
      if (res.ok) {
        const data = await res.json()
        setBroadcasts(prev => [data.broadcast, ...prev])
        setBroadcastMessage('')
        setBroadcastSent(true)
        setTimeout(() => setBroadcastSent(false), 3000)
      } else {
        alert('Failed to send broadcast')
      }
    } catch (e) {
      console.error('API Error', e)
      // Fallback to localStorage
      const broadcast = {
        id: `bc_${Date.now()}`,
        message: broadcastMessage.trim(),
        time: new Date().toISOString(),
        from: 'admin'
      }
      const existing = JSON.parse(localStorage.getItem('adminBroadcasts') || '[]')
      existing.unshift(broadcast)
      localStorage.setItem('adminBroadcasts', JSON.stringify(existing))
      setBroadcasts([broadcast, ...broadcasts])
      setBroadcastMessage('')
      setBroadcastSent(true)
      setTimeout(() => setBroadcastSent(false), 3000)
    }
  }

  const handleDeleteBroadcast = async (id) => {
    if(!confirm('ลบประกาศ?')) return
    
    try {
      const res = await fetch(`${API_BASE}/api/v1/status/broadcasts/${id}`, {
        method: 'DELETE',
        headers: getHeaders(false),
        credentials: 'include'
      })
      
      if (res.ok) {
        setBroadcasts(prev => prev.filter(b => b.id !== id))
      } else {
        alert('Failed to delete broadcast')
      }
    } catch (e) {
      console.error('API Error, falling back to localStorage', e)
      const updated = broadcasts.filter(b => b.id !== id)
      setBroadcasts(updated)
      localStorage.setItem('adminBroadcasts', JSON.stringify(updated))
    }
  }

  // --- Filtering & Pagination ---
  const filteredReports = reports.filter(r => {
      if (filterType && r.type !== filterType) return false
      if (filterDistrict && r.district !== filterDistrict) return false
      if (searchReports) {
          const s = searchReports.toLowerCase()
          return (r.type && r.type.toLowerCase().includes(s)) || 
                 (r.location && r.location.toLowerCase().includes(s)) ||
                 (r.description && r.description.toLowerCase().includes(s)) ||
                 (r.ip && r.ip.includes(s))
      }
      return true
  })

  const getPaginatedReports = () => {
      const start = (reportsPage - 1) * REPORTS_PER_PAGE
      return filteredReports.slice(start, start + REPORTS_PER_PAGE)
  }

  const totalReportsPages = Math.ceil(filteredReports.length / REPORTS_PER_PAGE)

  const getPaginatedLogs = () => {
      const start = (logsPage - 1) * LOGS_PER_PAGE
      return logs.slice(start, start + LOGS_PER_PAGE)
  }
  
  const totalLogsPages = Math.ceil(logs.length / LOGS_PER_PAGE)

  const formatTime = (t) => new Date(t).toLocaleString('th-TH')

  return (
    <div 
      className="min-h-screen bg-slate-100"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div 
          className="fixed top-0 left-0 right-0 flex justify-center items-center bg-blue-500 text-white z-50 transition-all"
          style={{ height: pullDistance }}
        >
          <div className="flex items-center gap-2">
            {isRefreshing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">กำลังรีเฟรช...</span>
              </>
            ) : pullDistance >= PULL_THRESHOLD ? (
              <span className="text-sm font-medium">ปล่อยเพื่อรีเฟรช ↓</span>
            ) : (
              <span className="text-sm font-medium">ดึงลงเพื่อรีเฟรช...</span>
            )}
          </div>
        </div>
      )}
      
      <header className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center shadow-md" style={{ marginTop: pullDistance }}>
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
        {/* Threat Level Control */}
        <div className="bg-white rounded-xl p-4 border mb-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3 font-bold text-slate-800">
                <Activity className="w-5 h-5" /> ควบคุมระดับภัยคุกคาม
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
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
            
            {/* Custom Message Input */}
            <div className="border-t pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    ✏️ ข้อความแจ้งเตือน (แสดงในหน้าแรก)
                </label>
                <textarea
                    value={threatMessage}
                    onChange={e => setThreatMessage(e.target.value)}
                    className="w-full p-3 border rounded-lg text-sm"
                    placeholder="เช่น: สถานการณ์รุนแรง แนะนำให้อพยพออกจากพื้นที่ อ.คลองใหญ่"
                    rows={2}
                />
                <div className="flex justify-end mt-2">
                    <button 
                        onClick={handleSaveThreatMessage}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                    >
                        💾 บันทึกข้อความ
                    </button>
                </div>
            </div>
        </div>

        {/* Broadcast System */}
        <div className="mb-6">
            <button onClick={() => setShowBroadcastForm(!showBroadcastForm)} className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium flex justify-center items-center gap-2 shadow-sm">
                <MessageSquare className="w-5 h-5" /> ประกาศรายงานสด (Broadcast)
            </button>
            {showBroadcastForm && (
                <div className="mt-2 bg-white p-4 rounded-xl border border-purple-100 shadow-sm animate-fadeIn">
                    <textarea 
                        value={broadcastMessage}
                        onChange={e => setBroadcastMessage(e.target.value)}
                        className="w-full p-3 border rounded-lg mb-2"
                        placeholder="ข้อความประกาศ... (เช่น แจ้งเตือนพายุเข้า)"
                        rows={3}
                    />
                    <div className="flex gap-2">
                        <button onClick={handleSendBroadcast} className="bg-purple-600 text-white px-4 py-2 rounded-lg flex gap-2 items-center hover:bg-purple-700">
                            <Send className="w-4 h-4"/> ส่งประกาศ
                        </button>
                        {broadcastSent && <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> ส่งแล้ว</span>}
                    </div>
                     <div className="mt-4 space-y-2">
                        {broadcasts.map(b => (
                            <div key={b.id} className="flex justify-between items-center bg-slate-50 p-2 rounded text-sm border">
                                <span>{b.message} <span className="text-xs text-slate-400">({formatTime(b.created_at)})</span></span>
                                <button onClick={() => handleDeleteBroadcast(b.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${activeTab === 'reports' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600'}`}>
                📋 รายงาน ({reports.length})
            </button>
            <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${activeTab === 'logs' ? 'bg-slate-700 text-white' : 'bg-white border text-slate-600'}`}>
                📝 System Logs
            </button>
            <button onClick={() => setActiveTab('security')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${activeTab === 'security' ? 'bg-red-600 text-white' : 'bg-white border text-slate-600'}`}>
                🛡️ Security
            </button>
        </div>

        {/* --- REPORTS TAB --- */}
        {activeTab === 'reports' && (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b flex gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
                        <input 
                            type="text" 
                            placeholder="ค้นหา (ประเภท, สถานที่, IP)..." 
                            value={searchReports}
                            onChange={e => setSearchReports(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                        />
                    </div>
                    <select className="p-2 border rounded-lg text-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="">ทุกประเภท</option>
                        {Object.entries(REPORT_TYPE_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                        ))}
                    </select>
                    <select className="p-2 border rounded-lg text-sm" value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)}>
                        <option value="">ทุกอำเภอ</option>
                        {TRAT_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>

                {/* Bulk Actions Bar */}
                <div className="p-3 bg-slate-100 border-b flex gap-3 items-center flex-wrap text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={getPaginatedReports().length > 0 && getPaginatedReports().every(r => selectedReports.includes(r.id))}
                            onChange={toggleSelectAllReports}
                            className="w-4 h-4 rounded"
                        />
                        <span>เลือกทั้งหน้า</span>
                    </label>
                    {selectedReports.length > 0 && (
                        <>
                            <span className="text-blue-600 font-medium">เลือกแล้ว {selectedReports.length}</span>
                            <button onClick={handleDeleteSelectedReports} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">
                                🗑️ ลบที่เลือก ({selectedReports.length})
                            </button>
                        </>
                    )}
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-600">ลบจำนวน:</span>
                    {[10, 50, 100].map(cnt => (
                        <button key={cnt} onClick={() => handleBulkDeleteReports(cnt)} disabled={reports.length === 0} className="px-2 py-1 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 rounded text-xs">
                            {cnt}
                        </button>
                    ))}
                    <button onClick={() => handleBulkDeleteReports('all')} disabled={reports.length === 0} className="px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 rounded text-xs">
                        ทั้งหมด
                    </button>
                    <div className="flex items-center gap-1">
                        <input
                            type="number"
                            min="1"
                            max={reports.length}
                            value={customReportDeleteCount}
                            onChange={(e) => setCustomReportDeleteCount(e.target.value)}
                            placeholder="จำนวน"
                            className="w-16 px-2 py-1 border rounded text-xs"
                        />
                        <button
                            onClick={() => { if (customReportDeleteCount && parseInt(customReportDeleteCount) > 0) { handleBulkDeleteReports(customReportDeleteCount); setCustomReportDeleteCount('') }}}
                            disabled={!customReportDeleteCount}
                            className="px-2 py-1 bg-orange-500 text-white disabled:bg-slate-300 rounded text-xs"
                        >
                            ลบ
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-600 uppercase font-medium">
                            <tr>
                                <th className="px-2 py-3 w-10">
                                    <input
                                        type="checkbox"
                                        checked={getPaginatedReports().length > 0 && getPaginatedReports().every(r => selectedReports.includes(r.id))}
                                        onChange={toggleSelectAllReports}
                                        className="w-4 h-4 rounded"
                                    />
                                </th>
                                <th className="px-3 py-3">เวลา</th>
                                <th className="px-3 py-3">ประเภท</th>
                                <th className="px-3 py-3">IP Address</th>
                                <th className="px-3 py-3">รายละเอียด</th>
                                <th className="px-3 py-3">สถานที่</th>
                                <th className="px-3 py-3">พิกัด GPS</th>
                                <th className="px-3 py-3">สถานะ</th>
                                <th className="px-3 py-3">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {getPaginatedReports().length === 0 ? (
                                <tr><td colSpan="9" className="p-8 text-center text-slate-400">ไม่พบรายงาน</td></tr>
                            ) : getPaginatedReports().map(r => (
                                <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${selectedReports.includes(r.id) ? 'bg-blue-50' : ''}`}>
                                    <td className="px-2 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedReports.includes(r.id)}
                                            onChange={() => toggleReportSelection(r.id)}
                                            className="w-4 h-4 rounded"
                                        />
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-slate-500">{formatTime(r.created_at)}</td>
                                    <td className="px-3 py-3 font-medium">{getReportTypeLabel(r.type)}</td>
                                    <td className="px-3 py-3">
                                        <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                            {r.ip || r.ip_address || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 max-w-xs truncate" title={r.description}>{r.description || '-'}</td>
                                    <td className="px-3 py-3">
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3 text-slate-400"/>
                                            {r.location || 'ไม่ระบุ'}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3">
                                        {r.lat && r.lng ? (
                                            <a
                                                href={`https://www.google.com/maps?q=${r.lat},${r.lng}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-500 hover:underline text-xs flex items-center gap-1"
                                            >
                                                📍 {Number(r.lat).toFixed(4)}, {Number(r.lng).toFixed(4)}
                                                <ExternalLink className="w-3 h-3"/>
                                            </a>
                                        ) : (
                                            <span className="text-slate-400 text-xs">ไม่มีพิกัด</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-3">
                                        {r.verified ? 
                                            <span className="text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3"/> ยืนยัน</span> : 
                                            <span className="text-amber-600 bg-amber-100 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit"><AlertTriangle className="w-3 h-3"/> รอ</span>
                                        }
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="flex gap-1">
                                            <button 
                                                onClick={() => handleVerifyReport(r.id, r.verified)}
                                                className={`p-1 rounded ${r.verified ? 'text-amber-500 hover:bg-amber-50' : 'text-green-500 hover:bg-green-50'}`}
                                                title={r.verified ? "ยกเลิกยืนยัน" : "ยืนยัน"}
                                            >
                                                <CheckCircle className="w-4 h-4"/>
                                            </button>
                                            <button 
                                                onClick={() => handleEditReport(r)}
                                                className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                                                title="แก้ไข"
                                            >
                                                <Edit className="w-4 h-4"/>
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteReport(r.id)}
                                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                title="ลบ"
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                            <button
                                                onClick={() => handleBlockIP(r.ip || r.ip_address)}
                                                className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                                                title="Block IP"
                                            >
                                                <Ban className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Reports Pagination */}
                {totalReportsPages > 1 && (
                    <div className="p-4 border-t flex justify-center items-center gap-4">
                        <button 
                            disabled={reportsPage === 1}
                            onClick={() => setReportsPage(p => Math.max(1, p - 1))}
                            className="p-2 border rounded hover:bg-slate-50 disabled:opacity-50"
                        >
                            <ChevronLeft className="w-4 h-4"/>
                        </button>
                        <span className="text-sm">หน้า {reportsPage} / {totalReportsPages}</span>
                        <button 
                            disabled={reportsPage === totalReportsPages}
                            onClick={() => setReportsPage(p => Math.min(totalReportsPages, p + 1))}
                            className="p-2 border rounded hover:bg-slate-50 disabled:opacity-50"
                        >
                            <ChevronRight className="w-4 h-4"/>
                        </button>
                    </div>
                )}
            </div>
        )}

        {/* --- SYSTEM LOGS TAB --- */}
        {activeTab === 'logs' && (
            <div className="bg-white rounded-xl border shadow-sm">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-slate-500"/>
                        <span className="font-bold">System Logs ({logs.length})</span>
                    </div>
                    <button onClick={fetchData} className="text-sm text-blue-600 hover:underline">รีเฟรช</button>
                </div>
                
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
                        <button onClick={() => handleBulkDeleteLogs(logDeleteAmount)} className="px-3 py-1 bg-white border hover:bg-red-50 text-red-600 rounded text-sm">ลบ</button>
                    </div>
                    
                    <div className="h-6 w-px bg-slate-300 mx-2 hidden sm:block"></div>
                    
                    {/* Custom delete input */}
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            min="1" 
                            max={logs.length}
                            value={customDeleteCount}
                            onChange={(e) => setCustomDeleteCount(e.target.value)}
                            placeholder="จำนวน"
                            className="w-20 px-2 py-1 border rounded text-sm"
                        />
                        <button 
                            onClick={() => { 
                                if (customDeleteCount && parseInt(customDeleteCount) > 0) {
                                    handleBulkDeleteLogs(customDeleteCount)
                                    setCustomDeleteCount('')
                                }
                            }}
                            disabled={!customDeleteCount || parseInt(customDeleteCount) < 1}
                            className="px-3 py-1 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white rounded text-sm"
                        >
                            ลบ
                        </button>
                    </div>

                    <div className="h-6 w-px bg-slate-300 mx-2 hidden sm:block"></div>

                    <div className="flex items-center gap-2">
                        <button onClick={toggleSelectAllLogs} className="text-sm border px-2 py-1 rounded bg-white">
                            {selectedLogs.length > 0 && selectedLogs.length === getPaginatedLogs().length ? '[✓] เลือกหน้านี้' : '[ ] เลือกหน้านี้'}
                        </button>
                        {selectedLogs.length > 0 && (
                            <button onClick={handleDeleteSelectedLogs} className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">ลบ ({selectedLogs.length})</button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-600 uppercase">
                            <tr>
                                <th className="px-4 py-3 w-10">#</th>
                                <th className="px-4 py-3">Time</th>
                                <th className="px-4 py-3">IP Address</th>
                                <th className="px-4 py-3">Message</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {getPaginatedLogs().length === 0 ? (
                                <tr><td colSpan="4" className="p-8 text-center text-slate-400">ไม่มี Logs</td></tr>
                            ) : getPaginatedLogs().map(log => (
                                <tr key={log.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedLogs.includes(log.id)}
                                            onChange={() => toggleLogSelection(log.id)}
                                            className="rounded border-slate-300"
                                        />
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">{formatTime(log.timestamp || log.time)}</td>
                                    <td className="px-4 py-3">
                                        {log.ip ? (
                                            <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                {log.ip}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs">{log.message}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Logs Pagination */}
                {totalLogsPages > 1 && (
                    <div className="p-4 border-t flex justify-center items-center gap-4">
                        <button 
                            disabled={logsPage === 1}
                            onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                            className="p-2 border rounded hover:bg-slate-50 disabled:opacity-50"
                        >
                            <ChevronLeft className="w-4 h-4"/>
                        </button>
                        <span className="text-sm">หน้า {logsPage} / {totalLogsPages}</span>
                        <button 
                            disabled={logsPage === totalLogsPages}
                            onClick={() => setLogsPage(p => Math.min(totalLogsPages, p + 1))}
                            className="p-2 border rounded hover:bg-slate-50 disabled:opacity-50"
                        >
                            <ChevronRight className="w-4 h-4"/>
                        </button>
                    </div>
                )}
            </div>
        )}

        {/* --- SECURITY TAB --- */}
        {activeTab === 'security' && (
            <div className="space-y-6">
                 {/* Spam Alerts */}
                 {checkSpamIP().length > 0 && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                        <h4 className="font-bold text-red-800 flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-5 h-5"/> ตรวจพบ Spam (IP ที่ส่งถี่เกินไป)
                        </h4>
                        <div className="space-y-2">
                            {checkSpamIP().map(({ip, count}) => (
                                <div key={ip} className="flex justify-between items-center bg-white p-2 rounded border">
                                    <span className="font-mono">{ip} ({count} ครั้ง/ชม.)</span>
                                    <button onClick={() => handleBlockIP(ip)} className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">Block Now</button>
                                </div>
                            ))}
                        </div>
                    </div>
                 )}

                 <div className="grid md:grid-cols-2 gap-6">
                    {/* Blocked IPs */}
                    <div className="bg-white rounded-xl border p-4 shadow-sm">
                        <h3 className="font-bold mb-4 flex items-center gap-2"><Lock className="w-5 h-5"/> IP ที่ถูกระงับการใช้งาน ({blockedIPs.length})</h3>
                        
                        <div className="flex gap-2 mb-4">
                            <input 
                                type="text" 
                                placeholder="ระบุ IP (x.x.x.x)" 
                                id="manualBlockIp"
                                className="flex-1 border rounded-lg px-3 py-2 text-sm"
                            />
                            <button 
                                onClick={() => {
                                    const ip = document.getElementById('manualBlockIp').value.trim()
                                    if(ip) {
                                        handleBlockIP(ip)
                                        document.getElementById('manualBlockIp').value = ''
                                    }
                                }}
                                className="bg-red-600 text-white px-3 rounded-lg text-sm hover:bg-red-700"
                            >
                                Block
                            </button>
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-2">
                            {blockedIPs.length === 0 ? <p className="text-center text-slate-400 py-4">ไม่มี IP ที่ถูก Block</p> : blockedIPs.map((item, idx) => {
                                const ip = typeof item === 'string' ? item : item.ip
                                const blockedAt = item.blockedAt ? new Date(item.blockedAt).toLocaleString('th-TH') : ''
                                return (
                                    <div key={ip || idx} className="flex justify-between items-center bg-slate-50 p-2 rounded text-sm border">
                                        <div>
                                            <span className="font-mono text-slate-700">{ip}</span>
                                            {blockedAt && <span className="text-xs text-slate-400 ml-2">({blockedAt})</span>}
                                        </div>
                                        <button onClick={() => handleUnblockIP(item)} className="text-blue-600 hover:underline text-xs">ปลดล็อค</button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Security Logs */}
                    <div className="bg-white rounded-xl border p-4 shadow-sm">
                        <h3 className="font-bold mb-4 flex items-center gap-2"><FileText className="w-5 h-5"/> Security Logs</h3>
                        <div className="max-h-80 overflow-y-auto space-y-2">
                            {securityLogs.length === 0 ? <p className="text-center text-slate-400 py-4">ไม่มีประวัติความปลอดภัย</p> : securityLogs.map(log => (
                                <div key={log.id} className={`p-2 rounded text-sm border-l-4 ${log.action === 'blocked' ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}`}>
                                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                                        <span>{new Date(log.time).toLocaleString()}</span>
                                        <span className="font-mono">{log.ip}</span>
                                    </div>
                                    <div className="font-medium">{log.details}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>
            </div>
        )}

        {/* Edit Report Modal */}
        {editingReport && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-500" />
                แก้ไขรายงาน
              </h2>
              
              {/* Report ID */}
              <div className="mb-4 text-xs text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded">
                ID: {editingReport.id}
              </div>
              
              {/* ประเภท */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">ประเภท</label>
                <select
                  value={editForm.type}
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="explosion">💥 เสียงระเบิด</option>
                  <option value="gunfire">🔫 เสียงปืน</option>
                  <option value="military">🪖 การเคลื่อนพล</option>
                  <option value="roadblock">🚧 ถนนปิด</option>
                  <option value="evacuation">🏃 จุดอพยพเปิด</option>
                  <option value="warning">⚠️ แจ้งเตือนอื่นๆ</option>
                </select>
              </div>
              
              {/* สถานที่ */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">สถานที่</label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ต.xxx อ.xxx"
                />
              </div>
              
              {/* รายละเอียด */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียด</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  placeholder="รายละเอียดเพิ่มเติม..."
                />
              </div>
              
              {/* Report Info */}
              <div className="mb-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">IP:</span>
                  <span className="font-mono">{editingReport.ip || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">เวลาส่ง:</span>
                  <span>{new Date(editingReport.time).toLocaleString('th-TH')}</span>
                </div>
                {editingReport.lat && editingReport.lng && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">พิกัด:</span>
                    <span>{Number(editingReport.lat).toFixed(4)}, {Number(editingReport.lng).toFixed(4)}</span>
                    <a
                      href={`https://www.google.com/maps?q=${editingReport.lat},${editingReport.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline flex items-center gap-1"
                    >
                      🔗 ดูแผนที่
                    </a>
                  </div>
                )}
              </div>
              
              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setEditingReport(null)}
                  className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 rounded-lg font-medium transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
