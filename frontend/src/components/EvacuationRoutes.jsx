import { Navigation } from 'lucide-react'

/**
 * EvacuationRoutes Component
 * Shows recommended evacuation routes and their status
 */
export default function EvacuationRoutes({ routes = [] }) {
  const defaultRoutes = [
    { route: 'ทางหลวง 24 → อ.ขุนหาญ', status: 'open', time: '45 นาที' },
    { route: 'ทางหลวง 221 → อ.เมือง', status: 'congested', time: '1.5 ชม.' },
    { route: 'ทางลัด บ.โนนสูง', status: 'closed', time: '-' },
  ]

  const displayRoutes = routes.length > 0 ? routes : defaultRoutes

  const getStatusLabel = (status) => {
    switch (status) {
      case 'open': return { text: 'เปิด', className: 'bg-green-100 text-green-700' }
      case 'congested': return { text: 'รถติด', className: 'bg-yellow-100 text-yellow-700' }
      case 'closed': return { text: 'ปิด', className: 'bg-red-100 text-red-700' }
      default: return { text: 'ไม่ทราบ', className: 'bg-gray-100 text-gray-700' }
    }
  }

  return (
    <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
      <h3 className="font-bold mb-3 flex items-center gap-2 text-blue-800">
        <Navigation className="w-5 h-5" />
        เส้นทางอพยพแนะนำ
      </h3>
      <div className="space-y-2">
        {displayRoutes.map((route, i) => {
          const statusInfo = getStatusLabel(route.status)
          return (
            <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl">
              <div>
                <div className="font-medium text-slate-800">{route.route}</div>
                <div className="text-sm text-slate-500">{route.time}</div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
                {statusInfo.text}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
