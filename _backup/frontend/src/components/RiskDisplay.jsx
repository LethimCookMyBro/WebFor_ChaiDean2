export default function RiskDisplay({ data }) {
  if (!data) return null

  const getZoneStyles = (zone) => {
    const styles = {
      high_danger: {
        bg: 'bg-gradient-to-br from-red-600 to-red-800',
        border: 'border-red-500',
        icon: '🔴',
        pulse: true
      },
      bm21_range: {
        bg: 'bg-gradient-to-br from-orange-600 to-orange-800',
        border: 'border-orange-500',
        icon: '🟠',
        pulse: false
      },
      phl03_range: {
        bg: 'bg-gradient-to-br from-yellow-600 to-yellow-800',
        border: 'border-yellow-500',
        icon: '🟡',
        pulse: false
      },
      safe: {
        bg: 'bg-gradient-to-br from-green-600 to-green-800',
        border: 'border-green-500',
        icon: '🟢',
        pulse: false
      },
      out_of_scope: {
        bg: 'bg-gradient-to-br from-gray-600 to-gray-800',
        border: 'border-gray-500',
        icon: 'ℹ️',
        pulse: false
      },
      invalid_input: {
        bg: 'bg-gradient-to-br from-red-900 to-red-950',
        border: 'border-red-700',
        icon: '❌',
        pulse: false
      }
    }
    return styles[zone] || styles.invalid_input
  }

  const style = getZoneStyles(data.zone)
  const zoneInfo = data.zone_info || {}

  return (
    <div className={`glass-panel overflow-hidden ${style.pulse ? 'animate-pulse-slow' : ''}`}>
      {/* Zone Header */}
      <div className={`${style.bg} p-4 border-b ${style.border}`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{style.icon}</span>
          <div>
            <h3 className="text-xl font-bold text-white">
              {zoneInfo.message_en || data.zone}
            </h3>
            <p className="text-white/80 text-sm">
              {zoneInfo.message_th}
            </p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-4 space-y-4">
        {/* Distance */}
        {data.distance_km !== null && (
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Distance to Border</span>
            <span className="text-2xl font-bold text-white">
              {data.distance_km} km
            </span>
          </div>
        )}

        {/* Coordinates */}
        {data.lat && data.lon && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Coordinates</span>
            <span className="text-slate-200 font-mono">
              {data.lat.toFixed(4)}, {data.lon.toFixed(4)}
            </span>
          </div>
        )}

        {/* Province */}
        {data.province && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Province</span>
            <span className="text-slate-200">
              {data.province.name_en} ({data.province.name_th})
            </span>
          </div>
        )}

        {/* Action */}
        {zoneInfo.action && (
          <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
            <p className="text-slate-300 text-sm">
              💡 <strong>Recommendation:</strong> {zoneInfo.action}
            </p>
          </div>
        )}

        {/* Timestamp */}
        <div className="text-right text-xs text-slate-500">
          Checked: {new Date(data.timestamp).toLocaleString('th-TH')}
        </div>
      </div>
    </div>
  )
}
