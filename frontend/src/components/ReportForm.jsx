import { useState, useEffect } from 'react'
import { Send, MapPin, Navigation, AlertTriangle, CheckCircle, Loader, Radio, Shield, Wifi } from 'lucide-react'

// API Base - Dynamic for mobile compatibility
const API_BASE = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' 
    ? 'http://localhost:3001' 
    : `http://${window.location.hostname}:3001`)

const TRAT_SUBDISTRICTS = {
  "เมืองตราด": ["ชำราก", "ตะกาง", "ท่ากุ่ม", "ท่าพริก", "วังกระแจะ", "หนองคันทรง", "หนองเสม็ด", "หนองโสน", "ห้วงน้ำขาว", "ห้วยแร้ง", "อ่าวใหญ่", "เนินทราย", "แหลมกลัด"],
  "คลองใหญ่": ["คลองใหญ่", "หาดเล็ก", "ไม้รูด"],
  "บ่อไร่": ["ช้างทูน", "ด่านชุมพล", "นนทรีย์", "บ่อพลอย", "หนองบอน"],
  "เกาะกูด": ["เกาะกูด", "เกาะหมาก"],
  "เกาะช้าง": ["เกาะช้าง", "เกาะช้างใต้"],
  "เขาสมิง": ["ทุ่งนนทรี", "ท่าโสม", "ประณีต", "วังตะเคียน", "สะตอ", "เขาสมิง", "เทพนิมิต", "แสนตุ้ง"],
  "แหลมงอบ": ["คลองใหญ่", "น้ำเชี่ยว", "บางปิด", "แหลมงอบ"]
}

const reportTypes = [
  { id: 'explosion', label: '💥 เสียงระเบิด' },
  { id: 'gunfire', label: '🔫 เสียงปืน' },
  { id: 'military', label: '🪖 การเคลื่อนพล' },
  { id: 'roadblock', label: '🚧 ถนนปิด' },
  { id: 'evacuation', label: '🏃 จุดอพยพเปิด' },
  { id: 'warning', label: '⚠️ แจ้งเตือนอื่นๆ' }
]

export default function ReportForm({ onSubmitSuccess }) {
  const [clientIP, setClientIP] = useState(null)
  const [ipLoading, setIpLoading] = useState(true)
  const [ipError, setIpError] = useState(null)
  const [formData, setFormData] = useState({ type: '', description: '', locationType: 'manual' })
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [selectedSubdistrict, setSelectedSubdistrict] = useState('')
  const [location, setLocation] = useState(null)
  const [loadingLocation, setLoadingLocation] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  const districtCoords = {
    "เมืองตราด": { lat: 12.2428, lng: 102.5177 },
    "คลองใหญ่": { lat: 11.7667, lng: 102.8833 },
    "เขาสมิง": { lat: 12.4000, lng: 102.6500 },
    "บ่อไร่": { lat: 12.3833, lng: 102.8000 },
    "แหลมงอบ": { lat: 12.1833, lng: 102.3833 },
    "เกาะกูด": { lat: 11.6500, lng: 102.5667 },
    "เกาะช้าง": { lat: 12.0500, lng: 102.3500 }
  }

  useEffect(() => { fetchClientIP() }, [])

  const fetchClientIP = async () => {
    setIpLoading(true)
    setIpError(null)
    const apis = ['https://api.ipify.org?format=json', 'https://ipapi.co/json/']
    for (const api of apis) {
      try {
        const res = await fetch(api, { cache: 'no-cache' })
        if (!res.ok) continue
        const data = await res.json()
        if (data.ip && /^\d+\.\d+\.\d+\.\d+$/.test(data.ip)) {
          setClientIP(data.ip)
          setIpLoading(false)
          return
        }
      } catch (e) { continue }
    }
    setIpError('ไม่สามารถระบุตัวตนได้')
    setIpLoading(false)
  }

  const getGPSLocation = () => {
    setLoadingLocation(true)
    setError(null)
    if (!navigator.geolocation) { setError('Browser ไม่รองรับ GPS'); setLoadingLocation(false); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setFormData({ ...formData, locationType: 'gps' }); setLoadingLocation(false) },
      () => { setError('ไม่สามารถเข้าถึง GPS'); setFormData({ ...formData, locationType: 'manual' }); setLoadingLocation(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    
    // CRITICAL FIX: Fallback to fetch IP if not available
    let finalIP = clientIP
    if (!finalIP) {
      try {
        const res = await fetch('https://api.ipify.org?format=json', { cache: 'no-cache' })
        const data = await res.json()
        if (data.ip) {
          finalIP = data.ip
          setClientIP(data.ip)
        }
      } catch (err) {
        console.error('[IP Fallback] Failed:', err)
      }
    }
    
    if (!finalIP) { setError('ไม่สามารถระบุ IP ได้ กรุณารีเฟรช'); return }
    if (!formData.type) { setError('กรุณาเลือกประเภทเหตุการณ์'); return }
    
    // FIX: ใช้ GPS จริงเท่านั้น ไม่ใช้ districtCoords
    let realLat = null
    let realLng = null
    let locName = ''
    
    if (formData.locationType === 'gps' && location) {
      // ใช้ GPS จริงจากอุปกรณ์ผู้ใช้
      realLat = location.lat
      realLng = location.lng
      locName = `GPS: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
    } else if (selectedDistrict && selectedSubdistrict) {
      // เลือกตำบลด้วยตัวเอง - ไม่มีพิกัด GPS จริง
      realLat = null
      realLng = null
      locName = `ต.${selectedSubdistrict} อ.${selectedDistrict}`
    } else {
      setError('กรุณาระบุตำแหน่ง')
      return
    }
    
    setSubmitting(true)
    console.log('[Report] Saving with IP:', finalIP, 'GPS:', realLat, realLng)
    
    const newReport = {
      id: `rpt_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
      type: formData.type,
      userName: 'ไม่ระบุตัวตน',
      lat: realLat,  // null ถ้าไม่ได้ใช้ GPS จริง
      lng: realLng,  // null ถ้าไม่ได้ใช้ GPS จริง
      location: locName,
      province: 'ตราด',
      district: selectedDistrict || null,
      subdistrict: selectedSubdistrict || null,
      description: formData.description,
      time: new Date().toISOString(),
      verified: false,
      status: 'pending',
      ip: finalIP
    }
    
    // ส่งรายงานไป API เพื่อให้ sync ทุกอุปกรณ์
    try {
      // Get CSRF token from cookie
      const csrfToken = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || ''
      
      console.log('[Report] Sending to API:', `${API_BASE}/api/v1/reports`, newReport.type)
      
      const res = await fetch(`${API_BASE}/api/v1/reports`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({
          type: newReport.type,
          lat: newReport.lat,
          lng: newReport.lng,
          location: newReport.location,
          description: newReport.description,
          district: newReport.district,
          subdistrict: newReport.subdistrict,
          ip: finalIP
        })
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[Report] API Error:', res.status, errorData)
        throw new Error(`API Error: ${res.status} - ${errorData.message || errorData.error}`)
      }
      
      const result = await res.json()
      console.log('[Report] Saved to API successfully:', result)
    } catch (err) {
      console.error('[Report] API failed, saving locally:', err.message)
      // Fallback to localStorage if API fails
      const existing = JSON.parse(localStorage.getItem('userReports') || '[]')
      existing.unshift(newReport)
      localStorage.setItem('userReports', JSON.stringify(existing))
    }
    
    setSubmitted(true)
    setFormData({ type: '', description: '', locationType: 'manual' })
    setSelectedDistrict('')
    setSelectedSubdistrict('')
    setLocation(null)
    onSubmitSuccess?.(newReport)
    setSubmitting(false)
    setTimeout(() => setSubmitted(false), 5000)
  }

  if (ipLoading) return <div className="bg-white rounded-2xl p-8 border text-center"><Wifi className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-pulse" /><h3 className="font-bold text-lg mb-2">กำลังเตรียมระบบ</h3><p className="text-slate-500 text-sm">กำลังตรวจสอบการเชื่อมต่อ...</p></div>
  if (ipError || !clientIP) return <div className="bg-red-50 rounded-2xl p-8 border border-red-200 text-center"><Shield className="w-12 h-12 text-red-500 mx-auto mb-4" /><h3 className="font-bold text-red-700 text-lg mb-2">ไม่สามารถใช้งานได้</h3><p className="text-red-600 mb-4 text-sm">ระบบไม่สามารถระบุตัวตนของคุณได้<br />กรุณาปิด VPN หรือ Ad Blocker แล้วลองใหม่</p><button onClick={fetchClientIP} className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg">ลองใหม่</button></div>
  if (submitted) return <div className="bg-green-50 rounded-2xl p-6 border border-green-200 text-center"><CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" /><h3 className="font-bold text-green-800 text-lg">ส่งรายงานสำเร็จ!</h3><p className="text-green-600 text-sm mt-1">รายงานจะแสดงหลังจากเจ้าหน้าที่ตรวจสอบแล้ว</p></div>

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200">
      <div className="flex items-center gap-2 mb-4"><Radio className="w-5 h-5 text-red-500" /><h3 className="font-bold text-lg">แจ้งเหตุการณ์</h3></div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex gap-3 text-sm text-amber-800">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />
        <div><span className="font-bold">คำเตือน:</span> การแจ้งเหตุเท็จมีความผิดตามกฎหมาย<br />ระบบบันทึกข้อมูลของท่านไว้เพื่อการตรวจสอบ<div className="mt-2 flex items-center gap-2 text-xs"><span className="bg-amber-100 px-2 py-0.5 rounded font-mono border border-amber-300">IP: {clientIP}</span><span className="text-green-600">✓ ยืนยันตัวตนแล้ว</span></div></div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="block text-sm font-medium text-slate-700 mb-2">ประเภทเหตุการณ์ *</label><div className="grid grid-cols-2 gap-2">{reportTypes.map((type) => (<button key={type.id} type="button" onClick={() => setFormData({ ...formData, type: type.id })} className={`p-2 rounded-xl text-left border-2 text-sm ${formData.type === type.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>{type.label}</button>))}</div></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-2">ตำแหน่ง *</label>
          <div className="flex gap-2 mb-2"><button type="button" onClick={() => setFormData({ ...formData, locationType: 'gps' })} className={`flex-1 p-2 rounded-lg text-sm border-2 ${formData.locationType === 'gps' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>📍 GPS</button><button type="button" onClick={() => setFormData({ ...formData, locationType: 'manual' })} className={`flex-1 p-2 rounded-lg text-sm border-2 ${formData.locationType === 'manual' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>🗺️ เลือกตำบล</button></div>
          {formData.locationType === 'gps' && <div className={`p-3 rounded-xl border ${location ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}>{loadingLocation ? <div className="flex items-center gap-2 text-slate-500"><Loader className="w-4 h-4 animate-spin" />กำลังค้นหา...</div> : location ? <div className="flex items-center gap-2 text-green-700"><MapPin className="w-4 h-4" />{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</div> : <button type="button" onClick={getGPSLocation} className="w-full flex items-center justify-center gap-2 text-blue-600 py-2"><Navigation className="w-4 h-4" />คลิกเพื่อระบุตำแหน่ง GPS</button>}</div>}
          {formData.locationType === 'manual' && <div className="space-y-2"><select value={selectedDistrict} onChange={(e) => { setSelectedDistrict(e.target.value); setSelectedSubdistrict('') }} className="w-full p-3 border rounded-xl"><option value="">-- เลือกอำเภอ --</option>{Object.keys(TRAT_SUBDISTRICTS).map(d => <option key={d} value={d}>{d}</option>)}</select>{selectedDistrict && <select value={selectedSubdistrict} onChange={(e) => setSelectedSubdistrict(e.target.value)} className="w-full p-3 border rounded-xl"><option value="">-- เลือกตำบล --</option>{TRAT_SUBDISTRICTS[selectedDistrict]?.map(s => <option key={s} value={s}>{s}</option>)}</select>}</div>}
        </div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียด (ไม่บังคับ)</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="เช่น เสียงดังมาก..." rows={2} className="w-full p-3 border rounded-xl resize-none" /></div>
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>}
        <button type="submit" disabled={submitting || !clientIP} className="w-full py-3 bg-red-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:bg-slate-300">{submitting ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}{submitting ? 'กำลังส่ง...' : 'ส่งรายงาน'}</button>
      </form>
    </div>
  )
}
