import { FileText, CheckCircle } from 'lucide-react'
import { useState } from 'react'

/**
 * EmergencyChecklist Component
 * 72-hour emergency preparedness checklist
 */
export default function EmergencyChecklist() {
  const [checkedItems, setCheckedItems] = useState(new Set())

  const items = [
    { id: 1, icon: '💧', text: 'น้ำดื่ม (3 ลิตร/คน/วัน)' },
    { id: 2, icon: '🍞', text: 'อาหารแห้ง/กระป๋อง' },
    { id: 3, icon: '🔦', text: 'ไฟฉาย + ถ่าน' },
    { id: 4, icon: '💊', text: 'ยาประจำตัว' },
    { id: 5, icon: '📻', text: 'วิทยุแบตเตอรี่' },
    { id: 6, icon: '📄', text: 'เอกสารสำคัญ (ถ่ายสำเนา)' },
    { id: 7, icon: '💵', text: 'เงินสด' },
    { id: 8, icon: '👕', text: 'เสื้อผ้า 3 ชุด' },
  ]

  const toggleItem = (id) => {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(id)) {
      newChecked.delete(id)
    } else {
      newChecked.add(id)
    }
    setCheckedItems(newChecked)
  }

  const progress = (checkedItems.size / items.length) * 100

  return (
    <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white">
      <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
        <FileText className="w-5 h-5" />
        รายการเตรียมพร้อม 72 ชั่วโมง
      </h2>
      
      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span>ความพร้อม</span>
          <span>{checkedItems.size}/{items.length}</span>
        </div>
        <div className="h-2 bg-white/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => toggleItem(item.id)}
            className={`flex items-center gap-2 rounded-lg p-2 text-left transition-all ${
              checkedItems.has(item.id) 
                ? 'bg-white/40 line-through opacity-70' 
                : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            <span>{item.icon}</span>
            <span className="flex-1 text-xs">{item.text}</span>
            {checkedItems.has(item.id) && (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
