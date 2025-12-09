import { AlertCircle } from 'lucide-react'

/**
 * WeakPointsGuide Component
 * Shows weak points in a home to avoid during attacks
 */
export default function WeakPointsGuide() {
  const points = [
    { safe: false, text: 'หน้าต่างกระจก - อาจแตกจากแรงระเบิด' },
    { safe: false, text: 'ใต้หลังคาสังกะสี - ไม่ทนเศษสะเก็ด' },
    { safe: false, text: 'ห้องติดถนนใหญ่ - เป้าหมายชัดเจน' },
    { safe: true, text: 'ห้องน้ำคอนกรีต - ปลอดภัยที่สุด' },
    { safe: true, text: 'ชั้นใต้ดิน/ห้องเก็บของ - มีผนังหนา' },
  ]

  return (
    <div className="bg-red-50 rounded-2xl p-4 border border-red-200">
      <h3 className="font-bold mb-3 flex items-center gap-2 text-red-800">
        <AlertCircle className="w-5 h-5" />
        จุดอ่อนในบ้านที่ควรหลีกเลี่ยง
      </h3>
      <div className="space-y-2 text-sm">
        {points.map((point, i) => (
          <div key={i} className="p-2 bg-white rounded-lg flex items-start gap-2">
            <span>{point.safe ? '✅' : '❌'}</span>
            <span className={point.safe ? 'text-green-800' : 'text-red-800'}>
              {point.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
