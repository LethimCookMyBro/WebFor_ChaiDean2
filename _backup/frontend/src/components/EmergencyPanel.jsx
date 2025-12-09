export default function EmergencyPanel() {
  return (
    <div className="glass-panel p-6 border border-red-500/50">
      <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
        🚨 Emergency Instructions | คำแนะนำฉุกเฉิน
      </h3>

      <div className="space-y-4 text-slate-300">
        {/* Immediate Actions */}
        <div>
          <h4 className="font-semibold text-white mb-2">Immediate Actions:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Stay calm and assess your surroundings</li>
            <li>Move away from windows and exterior walls</li>
            <li>Seek shelter in reinforced structures if available</li>
            <li>Keep emergency supplies accessible</li>
          </ul>
        </div>

        {/* Thai Instructions */}
        <div>
          <h4 className="font-semibold text-white mb-2">คำแนะนำเบื้องต้น:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>ตั้งสติ และประเมินสถานการณ์รอบตัว</li>
            <li>หลีกเลี่ยงหน้าต่างและผนังด้านนอก</li>
            <li>หลบในอาคารที่แข็งแรงถ้าหาได้</li>
            <li>เตรียมสิ่งของจำเป็นฉุกเฉินไว้ใกล้มือ</li>
          </ul>
        </div>

        {/* Emergency Contacts */}
        <div className="mt-4 p-4 bg-red-900/30 rounded-lg">
          <h4 className="font-semibold text-white mb-2">📞 Emergency Contacts:</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-slate-400">Emergency:</span>
              <span className="text-white font-mono ml-2">191</span>
            </div>
            <div>
              <span className="text-slate-400">Police:</span>
              <span className="text-white font-mono ml-2">191</span>
            </div>
            <div>
              <span className="text-slate-400">Ambulance:</span>
              <span className="text-white font-mono ml-2">1669</span>
            </div>
            <div>
              <span className="text-slate-400">Fire:</span>
              <span className="text-white font-mono ml-2">199</span>
            </div>
          </div>
        </div>

        {/* Civil Defense */}
        <div className="p-4 bg-slate-800/50 rounded-lg">
          <p className="text-sm text-slate-400">
            <strong className="text-white">Note:</strong> This is a placeholder panel. 
            In production, integrate with official Thai Civil Defense (กรมป้องกันและบรรเทาสาธารณภัย) 
            resources and real-time alerts.
          </p>
        </div>
      </div>
    </div>
  )
}
