import { Eye } from 'lucide-react'

/**
 * FakeNewsGuide Component
 * Tips for identifying fake news
 */
export default function FakeNewsGuide() {
  return (
    <div className="bg-purple-50 rounded-2xl p-4 border border-purple-200">
      <h3 className="font-bold mb-3 flex items-center gap-2 text-purple-800">
        <Eye className="w-5 h-5" />
        วิธีเช็คข่าวลวง
      </h3>
      <div className="space-y-2 text-sm text-purple-900">
        <p>🔍 <strong>ตรวจสอบแหล่งที่มา</strong> - มาจากสื่อหลักหรือไม่?</p>
        <p>📅 <strong>ดูวันที่</strong> - ข่าวเก่าถูกนำมาแชร์ใหม่หรือเปล่า?</p>
        <p>🖼️ <strong>Reverse image search</strong> - รูปถูกตัดต่อไหม?</p>
        <p>⚠️ <strong>หลีกเลี่ยง</strong> - ข่าวที่กระตุ้นอารมณ์รุนแรง</p>
      </div>
      <div className="mt-3 p-2 bg-purple-200 rounded-lg text-center text-purple-800 font-medium text-sm">
        แหล่งข่าวที่น่าเชื่อถือ: กรมป้องกันและบรรเทาสาธารณภัย, กองทัพบก
      </div>
    </div>
  )
}
