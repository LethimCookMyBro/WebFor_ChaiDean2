import { useState } from 'react'
import { Send, Bug, Lightbulb, CheckCircle, AlertTriangle, ArrowLeft, Loader } from 'lucide-react'
import API_BASE from '../config/api'

/**
 * FeedbackPage - ผู้ใช้แจ้งบัค หรือ ขอฟีเจอร์ใหม่
 */
export default function FeedbackPage({ onBack }) {
  const [type, setType] = useState('') // 'bug' or 'feature'
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contact, setContact] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!type) {
      setError('กรุณาเลือกประเภท')
      return
    }
    if (!title.trim()) {
      setError('กรุณากรอกหัวข้อ')
      return
    }

    setSubmitting(true)

    try {
      const csrfToken = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || ''
      
      const res = await fetch(`${API_BASE}/api/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({
          type,
          title: title.trim(),
          description: description.trim(),
          contact: contact.trim()
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'ส่งไม่สำเร็จ')
      }

      setSubmitted(true)
      setType('')
      setTitle('')
      setDescription('')
      setContact('')
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาด')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 p-4">
        <div className="max-w-md mx-auto bg-white rounded-2xl p-8 shadow-lg text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-700 mb-2">ส่งสำเร็จ!</h2>
          <p className="text-slate-600 mb-6">
            ขอบคุณสำหรับความคิดเห็นของคุณ<br />
            ทีมงานจะตรวจสอบและดำเนินการต่อไป
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setSubmitted(false)}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium"
            >
              ส่งอีกครั้ง
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium"
              >
                กลับหน้าหลัก
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-100 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-white/50 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-slate-800">แจ้งปัญหา / ขอฟีเจอร์</h1>
            <p className="text-sm text-slate-500">ส่งความคิดเห็นถึงผู้ดูแลระบบ</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-lg space-y-4">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">ประเภท *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('bug')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  type === 'bug' 
                    ? 'border-red-500 bg-red-50 text-red-700' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Bug className="w-8 h-8" />
                <span className="font-medium">🐛 แจ้งบัค</span>
                <span className="text-xs opacity-70">พบปัญหาในระบบ</span>
              </button>
              <button
                type="button"
                onClick={() => setType('feature')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  type === 'feature' 
                    ? 'border-yellow-500 bg-yellow-50 text-yellow-700' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Lightbulb className="w-8 h-8" />
                <span className="font-medium">💡 ขอฟีเจอร์</span>
                <span className="text-xs opacity-70">อยากให้มีสิ่งใหม่</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">หัวข้อ *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'bug' ? 'เช่น GPS ไม่ทำงาน' : 'เช่น อยากได้แผนที่แบบออฟไลน์'}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียด</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'bug' 
                ? 'อธิบายปัญหาที่พบ: เกิดขึ้นเมื่อไหร่, ใช้อุปกรณ์อะไร...' 
                : 'อธิบายฟีเจอร์ที่ต้องการ: ใช้งานยังไง, มีประโยชน์อะไร...'
              }
              rows={4}
              className="w-full p-3 border rounded-xl resize-none focus:ring-2 focus:ring-blue-500"
              maxLength={1000}
            />
          </div>

          {/* Contact (optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ช่องทางติดต่อกลับ <span className="text-slate-400">(ไม่บังคับ)</span>
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="อีเมลหรือเบอร์โทร"
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
              maxLength={100}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:bg-slate-300 transition-colors"
          >
            {submitting ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                กำลังส่ง...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                ส่งความคิดเห็น
              </>
            )}
          </button>
        </form>

        {/* Info */}
        <p className="text-center text-xs text-slate-400 mt-4">
          ความคิดเห็นของคุณจะช่วยพัฒนาระบบให้ดียิ่งขึ้น
        </p>
      </div>
    </div>
  )
}
