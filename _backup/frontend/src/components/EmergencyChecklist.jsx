import { FileText, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

/**
 * EmergencyChecklist Component
 * 72-hour emergency preparedness checklist - Updated version
 */
export default function EmergencyChecklist() {
  const [checkedItems, setCheckedItems] = useState(new Set())
  const [expanded, setExpanded] = useState(false)

  // Essential items
  const essentialItems = [
    { id: 1, icon: '💧', text: 'น้ำดื่ม (3 ลิตร/คน/วัน)', note: 'ถ้าแบกไม่ไหว → 1.5 ลิตร/วัน ขั้นต่ำ' },
    { id: 2, icon: '🍞', text: 'อาหารแห้งที่เก็บง่าย', note: 'ปลากระป๋อง, ข้าวสาร 1 ถุงเล็ก, มาม่า, บิสกิต, นมกล่อง UHT' },
    { id: 3, icon: '🔦', text: 'ไฟฉาย + ถ่านสำรอง', note: 'ควรเป็นขนาดเล็กแบบส่องได้ไกล' },
    { id: 4, icon: '💊', text: 'ยาประจำตัว', note: 'ความดัน/เบาหวาน/หัวใจ + ยาแก้ปวด/แก้แพ้ 1-2 เม็ด' },
    { id: 5, icon: '📻', text: 'วิทยุแบตเตอรี่', note: 'สำหรับฟังข่าวความปลอดภัย/เส้นทางอพยพ' },
    { id: 6, icon: '📄', text: 'เอกสารสำคัญ (สำเนา)', note: 'บัตรประชาชน, ทะเบียนบ้าน, เบอร์ญาติ ใส่ถุงซิปกันน้ำ' },
    { id: 7, icon: '💵', text: 'เงินสด', note: 'ใบละ 20/50 ให้เยอะกว่าธนบัตรใหญ่' },
    { id: 8, icon: '👕', text: 'เสื้อผ้า 2-3 ชุด', note: 'ผ้าขนหนูผืนเล็ก 1 ผืน' },
  ]

  // Safety & Communication items
  const safetyItems = [
    { id: 9, icon: '🔋', text: 'Power Bank 1 ก้อน', note: '10,000 mAh ก็พอ ไม่ต้องใหญ่' },
    { id: 10, icon: '🔌', text: 'สายชาร์จ + หัวชาร์จ', note: 'อย่าเก็บรวมกับ power bank กลัวพังพร้อมกัน' },
    { id: 11, icon: '📯', text: 'นกหวีด', note: 'ใช้เรียกคนช่วยเมื่อหลบในหลุม/หลังบ้าน/ป่า' },
    { id: 12, icon: '📓', text: 'สมุดเล็ก + ปากกา', note: 'จดเบอร์โทร, จุดรวมพล, ชื่อญาติ (เวลาสัญญาณล่ม)' },
  ]

  // Optional items
  const optionalItems = [
    { id: 13, icon: '😷', text: 'หน้ากากกันฝุ่น/ควัน' },
    { id: 14, icon: '🩹', text: 'ผ้าพันแผล + แอลกอฮอล์แพด 3-5 ชิ้น' },
    { id: 15, icon: '🗑️', text: 'ถุงขยะ 2-3 ใบ', note: 'กันน้ำ, ใส่ของ, ปูรองนั่ง' },
    { id: 16, icon: '🔥', text: 'ไฟแช็ก 1 อัน' },
    { id: 17, icon: '👟', text: 'รองเท้าผ้าใบคู่หนึ่ง', note: 'สำหรับวิ่งหลบ/อพยพ' },
  ]

  const allItems = [...essentialItems, ...safetyItems, ...optionalItems]

  const toggleItem = (id) => {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(id)) {
      newChecked.delete(id)
    } else {
      newChecked.add(id)
    }
    setCheckedItems(newChecked)
  }

  const progress = (checkedItems.size / allItems.length) * 100

  const renderItem = (item) => (
    <button
      key={item.id}
      onClick={() => toggleItem(item.id)}
      className={`flex items-start gap-2 rounded-lg p-2 text-left transition-all w-full ${
        checkedItems.has(item.id) 
          ? 'bg-white/40 line-through opacity-70' 
          : 'bg-white/20 hover:bg-white/30'
      }`}
    >
      <span className="text-lg">{item.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium">{item.text}</div>
        {item.note && <div className="text-[10px] opacity-80">{item.note}</div>}
      </div>
      {checkedItems.has(item.id) && (
        <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      )}
    </button>
  )

  return (
    <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between mb-2"
      >
        <h2 className="font-bold text-lg flex items-center gap-2">
          <FileText className="w-5 h-5" />
          🎒 รายการเตรียมพร้อม 72 ชั่วโมง
        </h2>
        {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      
      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span>ความพร้อม</span>
          <span>{checkedItems.size}/{allItems.length}</span>
        </div>
        <div className="h-2 bg-white/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {expanded && (
        <div className="space-y-4">
          {/* Essential Items */}
          <div>
            <h3 className="text-sm font-bold mb-2 opacity-90">📦 ของจำเป็น</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {essentialItems.map(renderItem)}
            </div>
          </div>

          {/* Safety & Communication */}
          <div>
            <h3 className="text-sm font-bold mb-2 opacity-90">📡 ความปลอดภัย & การสื่อสาร</h3>
            <p className="text-[10px] opacity-70 mb-2">จำเป็นมากสำหรับพื้นที่มีเสียงปืน/การยิงเป็นระยะ</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {safetyItems.map(renderItem)}
            </div>
          </div>

          {/* Optional Items */}
          <div>
            <h3 className="text-sm font-bold mb-2 opacity-90">✨ ของเสริมที่ควรมี</h3>
            <p className="text-[10px] opacity-70 mb-2">ไม่จำเป็น 100% แต่ช่วยชีวิตได้มาก</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {optionalItems.map(renderItem)}
            </div>
          </div>
        </div>
      )}

      {!expanded && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          {essentialItems.slice(0, 4).map((item) => (
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
              <span className="flex-1 text-xs truncate">{item.text}</span>
              {checkedItems.has(item.id) && (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
      
      {!expanded && (
        <button 
          onClick={() => setExpanded(true)}
          className="w-full mt-2 py-1 text-xs bg-white/20 rounded-lg hover:bg-white/30"
        >
          ดูทั้งหมด ({allItems.length} รายการ) ▼
        </button>
      )}
    </div>
  )
}
