import { Activity } from 'lucide-react'

/**
 * ThreatBanner Component
 * DEFCON-style threat level display
 */

const THREAT_LEVELS = {
  GREEN: { level: 'GREEN', name: 'ปกติ', description: 'สถานการณ์สงบ', color: '#22c55e', bgColor: '#dcfce7' },
  YELLOW: { level: 'YELLOW', name: 'เฝ้าระวัง', description: 'ความตึงเครียดชายแดน', color: '#eab308', bgColor: '#fef9c3' },
  ORANGE: { level: 'ORANGE', name: 'ยกระดับ', description: 'มีการปะทะเล็กน้อย', color: '#f97316', bgColor: '#ffedd5' },
  RED: { level: 'RED', name: 'อันตราย', description: 'แนะนำให้อพยพ', color: '#dc2626', bgColor: '#fee2e2' },
}

export default function ThreatBanner({ 
  level = 'RED', 
  customMessage = null,
  lastUpdated = new Date() 
}) {
  const threatLevel = THREAT_LEVELS[level] || THREAT_LEVELS.RED

  return (
    <div
      className="rounded-2xl p-4 border-2 transition-all"
      style={{ backgroundColor: threatLevel.bgColor, borderColor: threatLevel.color }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full animate-pulse"
            style={{ backgroundColor: threatLevel.color }}
          />
          <div>
            <div className="text-xs opacity-70">สถานะภัยคุกคามปัจจุบัน</div>
            <div className="font-bold text-lg" style={{ color: threatLevel.color }}>
              {threatLevel.name}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs opacity-70">อัปเดตล่าสุด</div>
          <div className="font-mono text-sm">
            {lastUpdated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
          </div>
        </div>
      </div>
      <div className="mt-2 text-sm opacity-80">
        {customMessage || `${threatLevel.description} - มีการปะทะบริเวณชายแดน จ.ศรีสะเกษ และ อุบลราชธานี`}
      </div>
    </div>
  )
}

export { THREAT_LEVELS }
