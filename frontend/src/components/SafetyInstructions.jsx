import { Shield } from 'lucide-react'

/**
 * SafetyInstructions Component
 * Step-by-step guide for explosion response
 */
export default function SafetyInstructions() {
  const steps = [
    { step: 1, title: 'หมอบลง', desc: 'นอนราบกับพื้นทันที' },
    { step: 2, title: 'หาที่กำบัง', desc: 'ผนังคอนกรีต, ใต้โต๊ะ, หรือมุมห้อง' },
    { step: 3, title: 'ปิดหูปิดปาก', desc: 'ป้องกันเศษสะเก็ดและควัน' },
    { step: 4, title: 'รอจนสงบ', desc: 'นับ 60 วินาทีก่อนเคลื่อนที่' },
  ]

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200">
      <h3 className="font-bold mb-3 flex items-center gap-2">
        <Shield className="w-5 h-5 text-blue-500" />
        วิธีหลบภัยเมื่อได้ยินเสียงระเบิด
      </h3>
      <div className="space-y-3">
        {steps.map((item) => (
          <div key={item.step} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold flex-shrink-0">
              {item.step}
            </div>
            <div>
              <div className="font-medium">{item.title}</div>
              <div className="text-sm text-slate-500">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
