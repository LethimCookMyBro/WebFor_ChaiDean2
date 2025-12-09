export default function StatusBanner({ type, message, gpsWarning }) {
  return (
    <div className="w-full">
      {/* Main Disclaimer */}
      {type === 'disclaimer' && (
        <div className="bg-gradient-to-r from-amber-900/80 to-amber-800/80 border-b border-amber-600 py-2 px-4 text-center">
          <p className="text-amber-100 text-sm font-medium">
            {message}
          </p>
        </div>
      )}

      {/* GPS Warning */}
      {gpsWarning && (
        <div className="bg-gradient-to-r from-blue-900/80 to-blue-800/80 border-b border-blue-600 py-2 px-4 text-center">
          <p className="text-blue-100 text-sm">
            📍 {gpsWarning}
          </p>
        </div>
      )}
    </div>
  )
}
