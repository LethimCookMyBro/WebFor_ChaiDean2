import { Home, Target, Map, FileText, Heart } from 'lucide-react'

/**
 * BottomNav Component
 * Fixed bottom navigation with 5 tabs
 */
export default function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'home', icon: Home, label: 'หน้าหลัก' },
    { id: 'check', icon: Target, label: 'เช็คระยะ' },
    { id: 'map', icon: Map, label: 'แผนที่' },
    { id: 'guide', icon: FileText, label: 'คู่มือ' },
    { id: 'safety', icon: Heart, label: 'ความปลอดภัย' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 z-50 safe-area-bottom shadow-lg">
      <div className="flex justify-around max-w-lg mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center p-2 rounded-xl transition-all duration-200 min-w-[56px] ${
              activeTab === tab.id 
                ? 'text-blue-600 bg-blue-50 scale-105' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] mt-0.5 font-medium whitespace-nowrap">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
