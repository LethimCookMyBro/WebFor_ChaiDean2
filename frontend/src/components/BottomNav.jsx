import { Home, Target, Map, FileText } from 'lucide-react'

/**
 * BottomNav Component
 * Fixed bottom navigation with 4 tabs
 */
export default function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'home', icon: Home, label: 'หน้าหลัก' },
    { id: 'check', icon: Target, label: 'เช็คระยะ' },
    { id: 'map', icon: Map, label: 'แผนที่' },
    { id: 'guide', icon: FileText, label: 'คู่มือ' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 z-50 safe-area-bottom shadow-lg">
      <div className="flex justify-around max-w-md mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center p-2 rounded-xl transition-all duration-200 min-w-[60px] ${
              activeTab === tab.id 
                ? 'text-blue-600 bg-blue-50 scale-105' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <tab.icon className={`w-6 h-6 ${activeTab === tab.id ? 'stroke-[2.5]' : ''}`} />
            <span className="text-xs mt-1 font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
