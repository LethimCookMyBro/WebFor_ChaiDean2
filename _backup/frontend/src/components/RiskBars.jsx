import { Target, Users, Radio, Navigation, AlertTriangle, Shield, Truck, Wifi } from 'lucide-react'

/**
 * RiskBars Component
 * ความเสี่ยงหลายมิติ - แสดงเป็นภาษาไทย
 * 
 * หมายเหตุ: ค่าเหล่านี้ควรมาจาก API หรือการคำนวณจริง
 * ปัจจุบันเป็นสูตรประมาณการจากระยะห่างชายแดน
 */

// Risk calculation formulas based on distance from border
function calculateRisks(distanceFromBorder) {
  // ความเสี่ยงจากการโจมตี - ลดลงตามระยะทาง
  // 0-20km: สูงมาก, 20-52km: สูง, 52-130km: ปานกลาง, >130km: ต่ำ
  let ballisticRisk = 0
  if (distanceFromBorder <= 20) {
    ballisticRisk = 90 - (distanceFromBorder * 2) // 90% at 0km, 50% at 20km
  } else if (distanceFromBorder <= 52) {
    ballisticRisk = 50 - ((distanceFromBorder - 20) * 0.9) // 50% at 20km, 21% at 52km
  } else if (distanceFromBorder <= 130) {
    ballisticRisk = 20 - ((distanceFromBorder - 52) * 0.15) // ~8% at 130km
  } else {
    ballisticRisk = 5
  }

  // ความเสี่ยงการเดินทาง - ถนนในเขตชายแดนอาจถูกปิด
  let movementRisk = 0
  if (distanceFromBorder <= 30) {
    movementRisk = 70 - (distanceFromBorder * 1.5)
  } else if (distanceFromBorder <= 80) {
    movementRisk = 35 - ((distanceFromBorder - 30) * 0.4)
  } else {
    movementRisk = 15
  }

  // ความเสี่ยงด้านการสื่อสาร - สัญญาณอาจถูกรบกวน
  let commsRisk = 0
  if (distanceFromBorder <= 20) {
    commsRisk = 40
  } else if (distanceFromBorder <= 50) {
    commsRisk = 25
  } else {
    commsRisk = 10
  }

  // ความพร้อมในการอพยพ - ยิ่งใกล้ยิ่งต้องพร้อม
  let evacuationReadiness = 0
  if (distanceFromBorder <= 20) {
    evacuationReadiness = 95 // ต้องพร้อมสูงมาก
  } else if (distanceFromBorder <= 52) {
    evacuationReadiness = 75
  } else if (distanceFromBorder <= 130) {
    evacuationReadiness = 50
  } else {
    evacuationReadiness = 20
  }

  return {
    ballistic: Math.round(Math.max(0, Math.min(100, ballisticRisk))),
    movement: Math.round(Math.max(0, Math.min(100, movementRisk))),
    comms: Math.round(Math.max(0, Math.min(100, commsRisk))),
    evacuation: Math.round(Math.max(0, Math.min(100, evacuationReadiness)))
  }
}

export default function RiskBars({ distanceFromBorder = 100 }) {
  const calculatedRisks = calculateRisks(distanceFromBorder)

  const risks = [
    { 
      key: 'ballistic',
      name: 'ความเสี่ยงจากการโจมตี',
      description: 'โอกาสอยู่ในระยะยิงของอาวุธ',
      value: calculatedRisks.ballistic,
      icon: Target,
      inverseColor: false // สูง = แดง
    },
    { 
      key: 'movement',
      name: 'ความเสี่ยงการเดินทาง',
      description: 'โอกาสถนนถูกปิดหรือไม่ปลอดภัย',
      value: calculatedRisks.movement,
      icon: Truck,
      inverseColor: false
    },
    { 
      key: 'comms',
      name: 'ความเสี่ยงด้านการสื่อสาร',
      description: 'โอกาสสัญญาณถูกรบกวน',
      value: calculatedRisks.comms,
      icon: Wifi,
      inverseColor: false
    },
    { 
      key: 'evacuation',
      name: 'ความพร้อมอพยพที่ต้องการ',
      description: 'ระดับความเตรียมพร้อมที่แนะนำ',
      value: calculatedRisks.evacuation,
      icon: Shield,
      inverseColor: true // สูง = เขียว (ดี)
    },
  ]

  const getBarColor = (value, inverse = false) => {
    if (inverse) {
      // สำหรับ "ความพร้อมอพยพ" - สูง = ดี = เขียว
      if (value > 70) return '#22c55e'
      if (value > 40) return '#f59e0b'
      return '#ef4444'
    }
    // ค่าปกติ - สูง = แย่ = แดง
    if (value > 70) return '#ef4444'
    if (value > 40) return '#f59e0b'
    return '#22c55e'
  }

  const getRiskLabel = (value, inverse = false) => {
    if (inverse) {
      if (value > 70) return 'พร้อมสูง'
      if (value > 40) return 'พร้อมปานกลาง'
      return 'ต้องเตรียม'
    }
    if (value > 70) return 'สูง'
    if (value > 40) return 'ปานกลาง'
    return 'ต่ำ'
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-4 text-white">
      <h3 className="font-bold mb-1 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
        การประเมินความเสี่ยงหลายมิติ
      </h3>
      <p className="text-xs text-slate-400 mb-4">
        คำนวณจากระยะห่างชายแดน {distanceFromBorder} กม.
      </p>
      
      <div className="space-y-4">
        {risks.map((risk) => (
          <div key={risk.key} className="bg-slate-700/50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <risk.icon className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-white">{risk.name}</span>
              </div>
              <span 
                className="text-xs font-medium px-2 py-0.5 rounded"
                style={{ 
                  backgroundColor: `${getBarColor(risk.value, risk.inverseColor)}20`,
                  color: getBarColor(risk.value, risk.inverseColor)
                }}
              >
                {getRiskLabel(risk.value, risk.inverseColor)}
              </span>
            </div>
            <div className="h-2.5 bg-slate-600 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${risk.value}%`,
                  backgroundColor: getBarColor(risk.value, risk.inverseColor),
                }}
              />
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-slate-400">{risk.description}</span>
              <span className="text-xs font-mono text-slate-300">{risk.value}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-slate-700/30 rounded-xl text-xs text-slate-400">
        <p>💡 <strong>หมายเหตุ:</strong> ค่าเหล่านี้เป็นการประมาณการจากระยะห่างชายแดน กรุณาติดตามข่าวสารจากหน่วยงานราชการ</p>
      </div>
    </div>
  )
}
