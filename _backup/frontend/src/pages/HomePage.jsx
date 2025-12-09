import { useState } from 'react'
import axios from 'axios'
import LocationInput from '../components/LocationInput'
import RiskDisplay from '../components/RiskDisplay'
import EmergencyPanel from '../components/EmergencyPanel'
import RiskMap from '../map/RiskMap'

export default function HomePage({ riskData, setRiskData, loading, setLoading, error, setError }) {
  const [showEmergencyPanel, setShowEmergencyPanel] = useState(false)

  const handleLocate = async (locationType, inputValue) => {
    setLoading(true)
    setError(null)

    try {
      let payload = {}

      if (locationType === 'ip') {
        payload = { ip: inputValue }
      } else if (locationType === 'gps') {
        payload = { lat: inputValue.lat, lon: inputValue.lon }
      } else if (locationType === 'auto') {
        // Use browser geolocation
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          })
        })
        payload = { 
          lat: position.coords.latitude, 
          lon: position.coords.longitude 
        }
      }

      const response = await axios.post('/api/v1/locate', payload)
      setRiskData(response.data)

    } catch (err) {
      console.error('Location error:', err)
      if (err.code === 1) {
        setError('Location permission denied. Please enable GPS or enter IP/coordinates manually.')
      } else if (err.code === 2) {
        setError('Location unavailable. Please check your GPS settings.')
      } else if (err.code === 3) {
        setError('Location request timed out. Please try again.')
      } else {
        setError(err.response?.data?.message || 'Failed to get location. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <header className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          🛡️ Border Safety Risk Checker
        </h1>
        <p className="text-slate-400 text-lg">
          ตรวจสอบความเสี่ยงจากระยะปืนใหญ่ชายแดนไทย-กัมพูชา
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Input & Results */}
        <div className="lg:col-span-1 space-y-6">
          {/* Location Input */}
          <div className="glass-panel p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              📍 Check Your Location
            </h2>
            <LocationInput 
              onLocate={handleLocate} 
              loading={loading}
            />
            
            {error && (
              <div className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded-xl text-red-200">
                ⚠️ {error}
              </div>
            )}
          </div>

          {/* Risk Result */}
          {riskData && (
            <RiskDisplay data={riskData} />
          )}

          {/* Emergency Panel Toggle */}
          <button
            onClick={() => setShowEmergencyPanel(!showEmergencyPanel)}
            className="w-full btn-danger flex items-center justify-center gap-2"
          >
            🚨 {showEmergencyPanel ? 'Hide' : 'Show'} Emergency Instructions
          </button>

          {showEmergencyPanel && <EmergencyPanel />}
        </div>

        {/* Right Panel - Map */}
        <div className="lg:col-span-2">
          <div className="glass-panel p-4 map-container" style={{ height: '600px' }}>
            <RiskMap 
              riskData={riskData}
              userLocation={riskData ? { lat: riskData.lat, lon: riskData.lon } : null}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-slate-500 text-sm">
        <p>Data is approximate. Always follow official government advisories.</p>
        <p className="mt-1">© 2024 Border Safety Risk Checker</p>
      </footer>
    </div>
  )
}
