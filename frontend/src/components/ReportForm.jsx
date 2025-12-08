import { useState, useEffect } from 'react'
import { Send, MapPin, Navigation, AlertTriangle, CheckCircle, Loader, Radio } from 'lucide-react'

// ตำบลทั้งหมดในจังหวัดตราด
const TRAT_SUBDISTRICTS = {
  "เมืองตราด": ["บางพระ", "หนองเสม็ด", "หนองโสน", "หนองคันทรง", "ห้วงน้ำขาว", "อ่าวใหญ่", "วังกระแจะ", "ห้วยแร้ง", "เนินทราย", "ท่าพริก", "ท่ากุ่ม", "ตะกาง", "ชำราก", "แหลมกลัด"],
  "คลองใหญ่": ["คลองใหญ่", "ไม้รูด", "หาดเล็ก"],
  "เขาสมิง": ["เขาสมิง", "แสนตุ้ง", "วังตะเคียน", "ท่าโสม", "สะตอ", "ประณีต", "เทพนิมิต"],
  "บ่อไร่": ["บ่อพลอย", "ช้างทูน", "ด่านชุมพล", "หนองบอน", "นนทรีย์"],
  "แหลมงอบ": ["แหลมงอบ", "น้ำเชี่ยว", "บางปิด", "คลองใหญ่"],
  "เกาะกูด": ["เกาะกูด"],
  "เกาะช้าง": ["เกาะช้าง", "เกาะช้างใต้"]
}

const reportTypes = [
  { id: 'explosion', label: '💥 เสียงระเบิด' },
  { id: 'gunfire', label: '🔫 เสียงปืน' },
  { id: 'military', label: '🪖 การเคลื่อนพล' },
  { id: 'roadblock', label: '🚧 ถนนปิด' },
  { id: 'evacuation', label: '🏃 จุดอพยพเปิด' },
  { id: 'warning', label: '⚠️ แจ้งเตือนอื่นๆ' }
]

export default function ReportForm({ userId, userName, onSubmitSuccess }) {
  const [formData, setFormData] = useState({ type: '', description: '', locationType: 'manual' })
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [selectedSubdistrict, setSelectedSubdistrict] = useState('')
  const [location, setLocation] = useState(null)
  const [loadingLocation, setLoadingLocation] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  // District coordinates
  const districtCoords = {
    "เมืองตราด": { lat: 12.2428, lng: 102.5177 },
    "คลองใหญ่": { lat: 11.7667, lng: 102.8833 },
    "เขาสมิง": { lat: 12.4000, lng: 102.6500 },
    "บ่อไร่": { lat: 12.3833, lng: 102.8000 },
    "แหลมงอบ": { lat: 12.1833, lng: 102.3833 },
    "เกาะกูด": { lat: 11.6500, lng: 102.5667 },
    "เกาะช้าง": { lat: 12.0500, lng: 102.3500 }
  }

  const getGPSLocation = () => {
    setLoadingLocation(true)
    setError(null)
    
    if (!navigator.geolocation) {
      setError('เบราว์เซอร์ไม่รองรับ GPS')
      setLoadingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setFormData({ ...formData, locationType: 'gps' })
        setLoadingLocation(false)
      },
      () => {
        setError('ไม่สามารถเข้าถึง GPS ได้ กรุณาเลือกตำบล')
        setFormData({ ...formData, locationType: 'manual' })
        setLoadingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    
    if (!formData.type) {
      setError('กรุณาเลือกประเภทเหตุการณ์')
      return
    }

    let reportLocation = null
    let locationName = ''

    if (formData.locationType === 'gps' && location) {
      reportLocation = location
      locationName = `GPS: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
    } else if (selectedDistrict && selectedSubdistrict) {
      reportLocation = districtCoords[selectedDistrict]
      locationName = `ต.${selectedSubdistrict} อ.${selectedDistrict}`
    } else {
      setError('กรุณาระบุตำแหน่ง')
      return
    }

    setSubmitting(true)

    const newReport = {
      id: `rpt_${Date.now()}`,
      type: formData.type,
      userId: userId,
      userName: userName || 'ไม่ระบุ',
      lat: reportLocation?.lat || null,
      lng: reportLocation?.lng || null,
      location: locationName,
      province: 'ตราด',
      district: selectedDistrict || null,
      subdistrict: selectedSubdistrict || null,
      description: formData.description || null,
      time: new Date().toISOString(),
      verified: false,
      severity: 'unknown'
    }

    // Save to localStorage
    const existing = JSON.parse(localStorage.getItem('userReports') || '[]')
    existing.unshift(newReport)
    localStorage.setItem('userReports', JSON.stringify(existing))

    console.log('Report saved:', newReport)

    setSubmitted(true)
    setFormData({ type: '', description: '', locationType: 'manual' })
    setSelectedDistrict('')
    setSelectedSubdistrict('')
    setLocation(null)
    onSubmitSuccess?.(newReport)
    setSubmitting(false)

    setTimeout(() => setSubmitted(false), 3000)
  }

  if (submitted) {
    return (
      <div className="bg-green-50 rounded-2xl p-6 border border-green-200 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="font-bold text-green-800 text-lg">ส่งรายงานสำเร็จ!</h3>
        <p className="text-green-600 text-sm mt-1">รายงานจะแสดงในหน้า Admin ทันที</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200">
      <div className="flex items-center gap-2 mb-4">
        <Radio className="w-5 h-5 text-red-500" />
        <h3 className="font-bold text-lg">แจ้งเหตุการณ์</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">ประเภทเหตุการณ์ *</label>
          <div className="grid grid-cols-2 gap-2">
            {reportTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setFormData({ ...formData, type: type.id })}
                className={`p-2 rounded-xl text-left border-2 text-sm ${
                  formData.type === type.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Location Toggle */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">ตำแหน่ง *</label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, locationType: 'gps' })}
              className={`flex-1 p-2 rounded-lg text-sm border-2 ${formData.locationType === 'gps' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
            >
              📍 GPS
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, locationType: 'manual' })}
              className={`flex-1 p-2 rounded-lg text-sm border-2 ${formData.locationType === 'manual' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
            >
              🗺️ เลือกตำบล
            </button>
          </div>

          {formData.locationType === 'gps' && (
            <div className={`p-3 rounded-xl border ${location ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}>
              {loadingLocation ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader className="w-4 h-4 animate-spin" />
                  กำลังค้นหา...
                </div>
              ) : location ? (
                <div className="flex items-center gap-2 text-green-700">
                  <MapPin className="w-4 h-4" />
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </div>
              ) : (
                <button type="button" onClick={getGPSLocation} className="w-full flex items-center justify-center gap-2 text-blue-600 py-2">
                  <Navigation className="w-4 h-4" />
                  คลิกเพื่อระบุตำแหน่ง GPS
                </button>
              )}
            </div>
          )}

          {formData.locationType === 'manual' && (
            <div className="space-y-2">
              <select
                value={selectedDistrict}
                onChange={(e) => { setSelectedDistrict(e.target.value); setSelectedSubdistrict('') }}
                className="w-full p-3 border rounded-xl"
              >
                <option value="">-- เลือกอำเภอ --</option>
                {Object.keys(TRAT_SUBDISTRICTS).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {selectedDistrict && (
                <select
                  value={selectedSubdistrict}
                  onChange={(e) => setSelectedSubdistrict(e.target.value)}
                  className="w-full p-3 border rounded-xl"
                >
                  <option value="">-- เลือกตำบล --</option>
                  {TRAT_SUBDISTRICTS[selectedDistrict]?.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียด (ไม่บังคับ)</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="เช่น เสียงดังมาก..."
            rows={2}
            className="w-full p-3 border rounded-xl resize-none"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-red-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:bg-slate-300"
        >
          {submitting ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          {submitting ? 'กำลังส่ง...' : 'ส่งรายงาน'}
        </button>
      </form>
    </div>
  )
}
