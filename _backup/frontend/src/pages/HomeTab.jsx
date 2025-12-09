import { useState, useEffect } from 'react'
import ThreatBanner from '../components/ThreatBanner'
import QuickActions from '../components/QuickActions'
import LiveReports from '../components/LiveReports'
import ReportForm from '../components/ReportForm'
import { Lock } from 'lucide-react'

/**
 * HomeTab Page
 * Shows different content based on login status
 */
export default function HomeTab({ 
  threatLevel = 'YELLOW',
  onSOSClick, 
  onCheckClick,
  isLoggedIn = false,
  onLoginRequired,
  userId,
  userName
}) {
  const [adminReports, setAdminReports] = useState([])

  // Load admin broadcasts
  useEffect(() => {
    const loadAdminReports = () => {
      const reports = JSON.parse(localStorage.getItem('adminBroadcasts') || '[]')
      setAdminReports(reports.filter(r => {
        // Show only last 24 hours
        const reportTime = new Date(r.time)
        const now = new Date()
        return (now - reportTime) < 24 * 60 * 60 * 1000
      }))
    }
    loadAdminReports()
    const interval = setInterval(loadAdminReports, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-4">
      {/* Threat Banner */}
      <ThreatBanner level={threatLevel} />

      {/* Quick Actions */}
      <QuickActions 
        onSOSClick={isLoggedIn ? onSOSClick : onLoginRequired}
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

      {/* Protected: Report Form */}
      {isLoggedIn ? (
        <ReportForm userId={userId} userName={userName} />
      ) : (
        <div className="bg-slate-100 rounded-2xl p-6 border-2 border-dashed border-slate-300 text-center">
          <Lock className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="font-medium text-slate-600">แจ้งเหตุการณ์</p>
          <p className="text-sm text-slate-400 mb-3">ต้องล็อกอินก่อนใช้งาน</p>
          <a href="/login" className="inline-block px-4 py-2 bg-blue-500 text-white rounded-xl text-sm">
            ล็อกอิน
          </a>
        </div>
      )}
    </div>
  )
}

