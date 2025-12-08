import { Zap, Target } from 'lucide-react'

/**
 * QuickActions Component
 * Two main action buttons: SOS and Check Distance
 */
export default function QuickActions({ onSOSClick, onCheckClick }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={onSOSClick}
        className="bg-red-600 hover:bg-red-700 text-white rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-500/30"
      >
        <Zap className="w-8 h-8" />
        <span className="font-bold">ปุ่มฉุกเฉิน</span>
        <span className="text-xs opacity-80">แจ้งตำแหน่งครอบครัว</span>
      </button>
      <button
        onClick={onCheckClick}
        className="bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-500/30"
      >
        <Target className="w-8 h-8" />
        <span className="font-bold">เช็คระยะปลอดภัย</span>
        <span className="text-xs opacity-80">ตรวจสอบความเสี่ยง</span>
      </button>
    </div>
  )
}
