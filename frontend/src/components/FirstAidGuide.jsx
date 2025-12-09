import { useState } from 'react'
import { Heart, ChevronDown, ChevronUp, AlertTriangle, Droplet, Bone, Flame, Zap } from 'lucide-react'

/**
 * FirstAidGuide Component
 * คู่มือปฐมพยาบาลเบื้องต้น
 */
export default function FirstAidGuide() {
  const [expanded, setExpanded] = useState(false)
  const [activeSection, setActiveSection] = useState(null)

  const guides = [
    {
      id: 'bleeding',
      icon: <Droplet className="w-5 h-5 text-red-500" />,
      title: '🩸 แผลเลือดออก',
      color: 'bg-red-50 border-red-200',
      steps: [
        'ล้างมือ (ถ้าทำได้) หรือใส่ถุงมือ',
        'กดแผลด้วยผ้าสะอาดอย่างแน่น 10-15 นาที',
        'ยกส่วนที่บาดเจ็บให้สูงกว่าหัวใจ',
        'ถ้าเลือดซึมทะลุผ้า ห้ามเอาออก ให้เพิ่มผ้าทับ',
        'หากเลือดไม่หยุดใน 20 นาที หรือแผลลึก → รีบไปโรงพยาบาล'
      ]
    },
    {
      id: 'fracture',
      icon: <Bone className="w-5 h-5 text-slate-600" />,
      title: '🦴 กระดูกหัก/ข้อเคลื่อน',
      color: 'bg-slate-50 border-slate-200',
      steps: [
        'ห้ามขยับส่วนที่บาดเจ็บ!',
        'ตรึงส่วนที่บาดเจ็บด้วยไม้หรือผ้าพันแผล',
        'ประคบเย็นลดบวม (ห่อน้ำแข็งด้วยผ้า)',
        'ยกส่วนที่บาดเจ็บให้สูง',
        'ถ้ากระดูกทิ่มออกมา ห้ามดันกลับ → รีบไปโรงพยาบาล'
      ]
    },
    {
      id: 'burn',
      icon: <Flame className="w-5 h-5 text-orange-500" />,
      title: '🔥 แผลไฟไหม้/น้ำร้อนลวก',
      color: 'bg-orange-50 border-orange-200',
      steps: [
        'ล้างด้วยน้ำเย็น (ไม่ใช่น้ำแข็ง) อย่างน้อย 10-20 นาที',
        'ถอดเครื่องประดับ/เสื้อผ้าบริเวณแผล (ถ้าไม่ติด)',
        'ห้ามใช้ยาสีฟัน น้ำมัน ไข่ขาว ทาแผล!',
        'ปิดแผลด้วยผ้าสะอาดหรือพลาสติกใส',
        'ถ้าแผลบวมมาก/มีตุ่มน้ำ/ใบหน้า → ไปโรงพยาบาล'
      ]
    },
    {
      id: 'shock',
      icon: <Zap className="w-5 h-5 text-yellow-600" />,
      title: '⚡ ช็อก / หมดสติ',
      color: 'bg-yellow-50 border-yellow-200',
      steps: [
        'ตรวจสอบการหายใจ - มองอก ฟังเสียง รู้สึกลม',
        'ถ้าหายใจ: ให้นอนราบ ยกขาสูง 30 ซม.',
        'ถ้าไม่หายใจ: โทร 1669 และเริ่ม CPR ทันที',
        'คลายเสื้อผ้าที่รัด ห่มผ้าให้อบอุ่น',
        'ห้ามให้น้ำหรืออาหารถ้าหมดสติ'
      ]
    },
    {
      id: 'cpr',
      icon: <Heart className="w-5 h-5 text-pink-500" />,
      title: '💓 CPR เบื้องต้น',
      color: 'bg-pink-50 border-pink-200',
      steps: [
        '1. โทร 1669 ก่อน!',
        '2. วางมือกลางหน้าอก (ระหว่างหัวนม)',
        '3. กดลึก 5-6 ซม. อัตรา 100-120 ครั้ง/นาที',
        '4. กด 30 ครั้ง → เปิดทางเดินหายใจ → เป่าปาก 2 ครั้ง',
        '5. ทำซ้ำจนกว่าทีมแพทย์จะมาถึง'
      ]
    }
  ]

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between bg-gradient-to-r from-green-500 to-teal-500 text-white"
      >
        <div className="flex items-center gap-3">
          <Heart className="w-6 h-6" />
          <div className="text-left">
            <h3 className="font-bold">🏥 ปฐมพยาบาลเบื้องต้น</h3>
            <p className="text-sm opacity-80">แผลเลือดออก กระดูกหัก ไฟไหม้ CPR</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-3">
          {/* Warning */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <strong>สำคัญ:</strong> นี่คือการปฐมพยาบาลเบื้องต้นเท่านั้น! 
                หากบาดเจ็บรุนแรง โทร <a href="tel:1669" className="underline font-bold">1669</a> ทันที
              </div>
            </div>
          </div>

          {/* Guide sections */}
          {guides.map((guide) => (
            <div key={guide.id} className={`rounded-xl border overflow-hidden ${guide.color}`}>
              <button
                onClick={() => setActiveSection(activeSection === guide.id ? null : guide.id)}
                className="w-full p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  {guide.icon}
                  <span className="font-medium text-slate-800">{guide.title}</span>
                </div>
                {activeSection === guide.id ? 
                  <ChevronUp className="w-4 h-4 text-slate-500" /> : 
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                }
              </button>
              
              {activeSection === guide.id && (
                <div className="px-4 pb-4">
                  <ol className="space-y-2">
                    {guide.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="w-5 h-5 flex-shrink-0 bg-white rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ))}

          {/* Emergency reminder */}
          <div className="text-center py-2 text-sm text-slate-500">
            📞 เหตุฉุกเฉิน: <a href="tel:1669" className="text-green-600 font-bold">1669</a> (ฟรี 24 ชม.)
          </div>
        </div>
      )}
    </div>
  )
}
