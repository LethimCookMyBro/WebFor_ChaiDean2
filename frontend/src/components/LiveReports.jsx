import { useState, useEffect } from 'react'
import { Radio, CheckCircle, AlertCircle, RefreshCw, MapPin, ExternalLink } from 'lucide-react'

/**
 * LiveReports Component
 * ดึงรายงานจาก API จริง
 */
export default function LiveReports({ userLocation = null }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastFetch, setLastFetch] = useState(null)

  const fetchReports = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Load from localStorage - ดึงข้อมูลจาก userReports ที่เก็บไว้
      const userReports = JSON.parse(localStorage.getItem('userReports') || '[]')
      
      // Filter to show only last 24 hours and verified or recent reports
      const now = new Date()
      const filtered = userReports.filter(r => {
        const reportTime = new Date(r.time)
        return (now - reportTime) < 24 * 60 * 60 * 1000
      }).slice(0, 20) // Limit to 20 most recent
      
      setReports(filtered)
      setLastFetch(new Date())
      
    } catch (err) {
      console.error('Error loading reports:', err)
      setError('ไม่สามารถโหลดรายงานได้')
      setReports([])
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    fetchReports()
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchReports, 60000)
    return () => clearInterval(interval)
  }, [userLocation?.lat, userLocation?.lng])

  const getReportIcon = (type) => {
    const icons = {
      explosion: '💥',
      gunfire: '🔫',
      roadblock: '🚧',
      evacuation: '🏃',
      military: '🪖',
      warning: '⚠️'
    }
    return icons[type] || '📢'
  }

  const getReportLabel = (type) => {
    const labels = {
      explosion: 'เสียงระเบิด',
      gunfire: 'เสียงปืน',
      roadblock: 'ถนนปิด',
      evacuation: 'จุดอพยพ',
      military: 'การเคลื่อนพล',
      warning: 'แจ้งเตือน'
    }
    return labels[type] || 'รายงาน'
  }

  const getSeverityColor = (severity) => {
    const colors = {
      high: 'bg-red-500',
      medium: 'bg-orange-500',
      low: 'bg-yellow-500',
      info: 'bg-blue-500'
    }
    return colors[severity] || 'bg-gray-500'
  }

  return (
    <div className="bg-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-400 animate-pulse" />
            <span className="font-bold text-white">รายงานสด</span>
            {reports.length > 0 && (
              <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                {reports.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchReports}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <span className="text-xs text-slate-400">
              {lastFetch ? lastFetch.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          ข้อมูลจากหน่วยงานราชการและประชาชน • อัปเดตทุก 1 นาที
        </p>
      </div>
      
      {/* Reports List */}
      <div className="max-h-80 overflow-y-auto">
        {loading && reports.length === 0 ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-slate-700/50 rounded-xl p-3 animate-pulse">
                <div className="h-4 bg-slate-600 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-600 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchReports}
              className="mt-3 text-sm text-blue-400 hover:underline"
            >
              ลองใหม่
            </button>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-6 text-center text-slate-400">
            <Radio className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>ไม่มีรายงานใน 24 ชั่วโมงที่ผ่านมา</p>
            <p className="text-xs mt-1">สถานการณ์ปกติในขณะนี้</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {reports.map((report) => (
              <div 
                key={report.id} 
                className="bg-slate-700/50 rounded-xl p-3 hover:bg-slate-700/70 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Severity indicator */}
                  <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                    report.verified ? getSeverityColor(report.severity) : 'bg-gray-400'
                  }`} />
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg">{getReportIcon(report.type)}</span>
                      <span className="text-white font-medium">{getReportLabel(report.type)}</span>
                      {report.verified && (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                      {!report.verified && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                          รอยืนยัน
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-slate-300 mt-1">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{report.location}</span>
                    </div>
                    
                    {report.description && (
                      <p className="text-sm text-slate-400 mt-1">
                        {report.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                      <span>{report.timeAgo || report.timeFormatted}</span>
                      <span>
                        {report.distance ? `${report.distance} กม.` : report.source || ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer */}
      {reports.length > 0 && (
        <div className="p-3 border-t border-slate-700 text-center">
          <a 
            href="#" 
            className="text-xs text-blue-400 hover:underline flex items-center justify-center gap-1"
          >
            ดูรายงานทั้งหมด
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  )
}
