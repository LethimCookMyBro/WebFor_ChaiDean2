import { useState, useEffect, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import ThreatBanner from '../components/ThreatBanner'
import QuickActions from '../components/QuickActions'
import LiveReports from '../components/LiveReports'
import ReportForm from '../components/ReportForm'
import AutoLocationBanner from '../components/AutoLocationBanner'
import API_BASE from '../config/api'

/**
 * HomeTab Page
 * Shows different content based on login status
 */
export default function HomeTab({ 
  threatLevel: propThreatLevel = 'YELLOW',
  onCheckClick
}) {
  const [adminReports, setAdminReports] = useState([])
  const [threatLevel, setThreatLevel] = useState(propThreatLevel)
  const [threatMessage, setThreatMessage] = useState('')
  const [threatUpdatedAt, setThreatUpdatedAt] = useState(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Load data from API
  const loadData = useCallback(async () => {
    setIsRefreshing(true)
    
    try {
      // Fetch broadcasts from API
      const broadcastRes = await fetch(`${API_BASE}/api/v1/status/broadcasts`, { credentials: 'include' })
      if (broadcastRes.ok) {
        const data = await broadcastRes.json()
        setAdminReports((data.broadcasts || []).filter(r => {
          const reportTime = new Date(r.created_at || r.time)
          const now = new Date()
          return (now - reportTime) < 24 * 60 * 60 * 1000
        }))
      }
    } catch (e) {
      // Fallback to localStorage
      const reports = JSON.parse(localStorage.getItem('adminBroadcasts') || '[]')
      setAdminReports(reports.filter(r => {
        const reportTime = new Date(r.created_at || r.time)
        const now = new Date()
        return (now - reportTime) < 24 * 60 * 60 * 1000
      }))
    }

    try {
      // Fetch threat level from API
      const threatRes = await fetch(`${API_BASE}/api/v1/status/threat-level`, { credentials: 'include' })
      if (threatRes.ok) {
        const data = await threatRes.json()
        if (data.level) setThreatLevel(data.level)
        if (data.message !== undefined) setThreatMessage(data.message)
        if (data.updatedAt) setThreatUpdatedAt(new Date(data.updatedAt))
      }
    } catch (e) {
      // Use prop or localStorage fallback
      setThreatLevel(propThreatLevel || localStorage.getItem('adminThreatLevel') || 'YELLOW')
    }
    
    setIsRefreshing(false)
  }, [propThreatLevel])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [loadData])

  // Handle manual refresh
  const handleRefresh = () => {
    loadData()
  }

  return (
    <div className="space-y-4">
      {/* Refresh Button - Mobile Friendly */}
      <div className="flex justify-end">
        <button 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm">รีเฟรช</span>
        </button>
      </div>

      {/* Auto Location Check - Shows danger zone warning */}
      <AutoLocationBanner />

      {/* Threat Banner */}
      <ThreatBanner 
        level={threatLevel} 
        customMessage={threatMessage}
        lastUpdated={threatUpdatedAt}
      />

      {/* Quick Actions */}
      <QuickActions 
        onCheckClick={onCheckClick}
      />

      {/* Admin Broadcasts (visible to all) */}
      {adminReports.length > 0 && (
        <div className="bg-red-50 rounded-2xl p-4 border-2 border-red-300">
          <h3 className="font-bold text-red-800 mb-2">📢 ประกาศจากเจ้าหน้าที่</h3>
          <div className="space-y-2">
            {adminReports.slice(0, 3).map((report, i) => (
              <div key={i} className="p-3 bg-white rounded-xl">
                <p className="font-medium">{report.message}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(report.time).toLocaleString('th-TH')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Reports (visible to all) */}
      <LiveReports />

      {/* Report Form (Anonymous) */}
      <ReportForm />
    </div>
  )
}

