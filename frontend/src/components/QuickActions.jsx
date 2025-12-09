import { Target } from 'lucide-react'

/**
 * QuickActions Component
 * Two main action buttons: SOS and Check Distance
 */
export default function QuickActions({ onCheckClick }) {
  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={onCheckClick}
        className="w-full bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl p-4 flex flex-row items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-orange-500/30"
      >
        <Target className="w-8 h-8" />
        <div className="text-left">
          <span className="block font-bold text-lg">เช็คระยะปลอดภัย</span>
          <span className="block text-xs opacity-90">ตรวจสอบความเสี่ยงจากชายแดน</span>
        </div>
      </button>
    </div>
  )
}
