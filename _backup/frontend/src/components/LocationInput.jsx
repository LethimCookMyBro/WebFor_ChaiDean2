import { useState } from 'react'

export default function LocationInput({ onLocate, loading }) {
  const [inputType, setInputType] = useState('auto')
  const [ipAddress, setIpAddress] = useState('')
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (inputType === 'auto') {
      onLocate('auto')
    } else if (inputType === 'ip') {
      onLocate('ip', ipAddress)
    } else if (inputType === 'coords') {
      onLocate('gps', { lat: parseFloat(lat), lon: parseFloat(lon) })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Input Type Selector */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setInputType('auto')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            inputType === 'auto'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          📱 Auto GPS
        </button>
        <button
          type="button"
          onClick={() => setInputType('ip')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            inputType === 'ip'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          🌐 IP Address
        </button>
        <button
          type="button"
          onClick={() => setInputType('coords')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            inputType === 'coords'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          🎯 Coordinates
        </button>
      </div>

      {/* Input Fields */}
      {inputType === 'auto' && (
        <div className="p-4 bg-slate-800/50 rounded-xl text-center">
          <p className="text-slate-300 mb-2">
            Click the button below to use your device's GPS
          </p>
          <p className="text-slate-500 text-sm">
            กดปุ่มด้านล่างเพื่อใช้ GPS ของอุปกรณ์
          </p>
        </div>
      )}

      {inputType === 'ip' && (
        <div>
          <label className="block text-slate-300 mb-2 text-sm">
            IP Address (leave empty for your current IP)
          </label>
          <input
            type="text"
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
            placeholder="e.g., 8.8.8.8"
            className="input-field"
          />
        </div>
      )}

      {inputType === 'coords' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 mb-2 text-sm">Latitude</label>
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="e.g., 14.5"
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-2 text-sm">Longitude</label>
            <input
              type="number"
              step="any"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              placeholder="e.g., 103.5"
              className="input-field"
              required
            />
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <svg className="loading-spinner w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            Checking...
          </>
        ) : (
          <>
            🔍 Check Risk Level
          </>
        )}
      </button>
    </form>
  )
}
