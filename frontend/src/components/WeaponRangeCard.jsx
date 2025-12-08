import { AlertTriangle } from 'lucide-react'

/**
 * WeaponRangeCard Component
 * Shows weapon range assessment for all weapon types
 */

const WEAPONS = [
  { key: 'artillery', name: 'ปืนใหญ่ภาคพื้น', range: 15 },
  { key: 'bm21_standard', name: 'BM-21 (มาตรฐาน)', range: 20 },
  { key: 'bm21_extended', name: 'BM-21 (ระยะไกล)', range: 52 },
  { key: 'phl03_standard', name: 'PHL-03 (มาตรฐาน)', range: 130 },
  { key: 'phl03_extended', name: 'PHL-03 (ระยะไกล)', range: 160 },
]

export default function WeaponRangeCard({ distanceFromBorder = 100 }) {
  const assessment = WEAPONS.map(weapon => ({
    ...weapon,
    inRange: distanceFromBorder <= weapon.range
  }))

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200">
      <h3 className="font-bold mb-3 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
        การประเมินความเสี่ยงจากอาวุธ
      </h3>
      <div className="space-y-2">
        {assessment.map((weapon) => (
          <div
            key={weapon.key}
            className={`p-3 rounded-xl flex items-center justify-between ${
              weapon.inRange 
                ? 'bg-red-50 border border-red-200' 
                : 'bg-green-50 border border-green-200'
            }`}
          >
            <div>
              <div className="font-medium text-slate-800">{weapon.name}</div>
              <div className="text-sm text-slate-500">ระยะยิง: {weapon.range} กม.</div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              weapon.inRange 
                ? 'bg-red-500 text-white' 
                : 'bg-green-500 text-white'
            }`}>
              {weapon.inRange ? 'อยู่ในระยะ' : 'ปลอดภัย'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { WEAPONS }
