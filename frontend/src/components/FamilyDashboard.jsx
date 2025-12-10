import { useState, useEffect } from 'react'
import { Heart, MapPin, Clock, RefreshCw, UserPlus, Bell, X, Check, User, AlertTriangle, Skull, HelpCircle } from 'lucide-react'

/**
 * FamilyDashboard Component with 5 status options
 */

// Status options: ปลอดภัย, เสี่ยง, เสี่ยงสูง, เสียชีวิต, สูญหาย
const STATUS_OPTIONS = {
  safe: {
    label: 'ปลอดภัย',
    color: 'bg-green-500',
    textColor: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: Check
  },
  risk: {
    label: 'เสี่ยง',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: AlertTriangle
  },
  high_risk: {
    label: 'เสี่ยงสูง',
    color: 'bg-orange-500',
    textColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: AlertTriangle
  },
  deceased: {
    label: 'เสียชีวิต',
    color: 'bg-gray-700',
    textColor: 'text-gray-700',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    icon: Skull
  },
  missing: {
    label: 'สูญหาย',
    color: 'bg-purple-500',
    textColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: HelpCircle
  }
}

export default function FamilyDashboard({ userId, userName, onMemberClick, onRefresh }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [newMember, setNewMember] = useState({ name: '', phone: '', relationship: '' })
  const [addingMember, setAddingMember] = useState(false)
  
  // Get storage key for this user
  const getStorageKey = () => userId ? `user_${userId}_family` : 'familyMembers'
  
  // Fetch or load family members
  useEffect(() => {
    const stored = localStorage.getItem(getStorageKey())
    if (stored) {
      setMembers(JSON.parse(stored))
    }
    setLoading(false)
    setLastUpdated(new Date())
  }, [userId])
  
  const saveMembersToStorage = (updatedMembers) => {
    localStorage.setItem(getStorageKey(), JSON.stringify(updatedMembers))
    setMembers(updatedMembers)
  }
  
  const formatTimeAgo = (date) => {
    if (!date) return 'ไม่ทราบ'
    const now = new Date()
    const diff = Math.floor((now - new Date(date)) / 1000)
    if (diff < 60) return 'เมื่อสักครู่'
    if (diff < 3600) return `${Math.floor(diff / 60)} นาทีก่อน`
    if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงก่อน`
    return `${Math.floor(diff / 86400)} วันก่อน`
  }
  
  const handleRefresh = () => {
    setLastUpdated(new Date())
    onRefresh?.()
  }
  
  // Add new family member
  const handleAddMember = async () => {
    if (!newMember.name.trim()) {
      alert('กรุณาใส่ชื่อสมาชิก')
      return
    }
    
    setAddingMember(true)
    
    const memberData = {
      userId: `member_${Date.now()}`,
      name: newMember.name.trim(),
      phone: newMember.phone.trim() || null,
      relationship: newMember.relationship.trim() || null,
      status: 'safe',
      lastUpdated: new Date().toISOString()
    }
    
    const updatedMembers = [...members, memberData]
    saveMembersToStorage(updatedMembers)
    
    // Try to sync with backend
    try {
      await fetch('/api/v1/family/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: memberData.userId, groupName: 'default' })
      })
    } catch (e) {
      // Backend sync skipped silently
    }
    
    setNewMember({ name: '', phone: '', relationship: '' })
    setShowAddModal(false)
    setAddingMember(false)
  }
  
  // Update member status
  const handleUpdateStatus = (memberId, newStatus) => {
    const updatedMembers = members.map(m => {
      if (m.userId === memberId) {
        return { ...m, status: newStatus, lastUpdated: new Date().toISOString() }
      }
      return m
    })
    saveMembersToStorage(updatedMembers)
    setShowStatusModal(false)
    setSelectedMember(null)
    
    // Broadcast status update (would use WebSocket in production)
    try {
      fetch('/api/v1/family/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: memberId, status: newStatus })
      })
    } catch (e) {
      // Status sync skipped silently
    }
  }
  
  // Delete member
  const handleDeleteMember = (userId) => {
    if (!confirm('ต้องการลบสมาชิกนี้?')) return
    const updatedMembers = members.filter(m => m.userId !== userId)
    saveMembersToStorage(updatedMembers)
  }
  
  // Open status modal
  const openStatusModal = (member) => {
    setSelectedMember(member)
    setShowStatusModal(true)
  }
  
  // Stats
  const stats = {
    total: members.length,
    safe: members.filter(m => m.status === 'safe').length,
    risk: members.filter(m => m.status === 'risk' || m.status === 'high_risk').length,
    critical: members.filter(m => m.status === 'deceased' || m.status === 'missing').length
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              <span className="font-bold text-slate-800">สถานะครอบครัว</span>
              {members.length > 0 && (
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">
                  {members.length} คน
                </span>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {members.length > 0 && (
            <div className="flex gap-3 mt-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>ปลอดภัย {stats.safe}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span>เสี่ยง {stats.risk}</span>
              </div>
              {stats.critical > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-gray-700" />
                  <span>วิกฤต {stats.critical}</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Members List */}
        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {members.length === 0 ? (
            <div className="p-6 text-center text-slate-400">
              <User className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>ยังไม่มีสมาชิกในครอบครัว</p>
              <p className="text-sm">คลิก "เพิ่มสมาชิก" เพื่อเริ่มต้น</p>
            </div>
          ) : (
            members.map((member) => {
              const config = STATUS_OPTIONS[member.status] || STATUS_OPTIONS.safe
              const IconComponent = config.icon
              return (
                <div 
                  key={member.userId}
                  className={`p-3 flex items-center gap-3 ${config.bgColor}`}
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center text-white font-bold relative`}>
                    {member.name.charAt(0)}
                    {(member.status === 'high_risk' || member.status === 'missing') && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                        <Bell className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 flex items-center gap-2">
                      {member.name}
                      {member.relationship && (
                        <span className="text-xs text-slate-400">({member.relationship})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(member.lastUpdated)}</span>
                    </div>
                  </div>
                  
                  {/* Status Button */}
                  <button
                    onClick={() => openStatusModal(member)}
                    className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${config.textColor} ${config.bgColor} border ${config.borderColor} hover:opacity-80`}
                  >
                    <IconComponent className="w-3 h-3" />
                    {config.label}
                  </button>
                  
                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteMember(member.userId)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )
            })
          )}
        </div>
        
        {/* Add Member Button */}
        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={() => setShowAddModal(true)}
            className="w-full py-3 flex items-center justify-center gap-2 text-blue-600 hover:bg-blue-50 rounded-xl border-2 border-dashed border-blue-200"
          >
            <UserPlus className="w-5 h-5" />
            <span className="font-medium">เพิ่มสมาชิกครอบครัว</span>
          </button>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">เพิ่มสมาชิกครอบครัว</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ *</label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  placeholder="ชื่อเล่น หรือ ชื่อจริง"
                  className="w-full p-3 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ความสัมพันธ์</label>
                <select
                  value={newMember.relationship}
                  onChange={(e) => setNewMember({ ...newMember, relationship: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-xl"
                >
                  <option value="">-- เลือก --</option>
                  <option value="พ่อ">พ่อ</option>
                  <option value="แม่">แม่</option>
                  <option value="พี่">พี่</option>
                  <option value="น้อง">น้อง</option>
                  <option value="ลูก">ลูก</option>
                  <option value="สามี">สามี</option>
                  <option value="ภรรยา">ภรรยา</option>
                  <option value="ปู่">ปู่</option>
                  <option value="ย่า">ย่า</option>
                  <option value="ตา">ตา</option>
                  <option value="ยาย">ยาย</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทร</label>
                <input
                  type="tel"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                  placeholder="08X-XXX-XXXX"
                  className="w-full p-3 border border-slate-300 rounded-xl"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 border border-slate-300 rounded-xl">
                  ยกเลิก
                </button>
                <button
                  onClick={handleAddMember}
                  disabled={addingMember || !newMember.name.trim()}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl disabled:bg-blue-300"
                >
                  {addingMember ? 'กำลังเพิ่ม...' : 'เพิ่มสมาชิก'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Selection Modal */}
      {showStatusModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">อัปเดตสถานะ: {selectedMember.name}</h3>
              <button onClick={() => setShowStatusModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="space-y-2">
              {Object.entries(STATUS_OPTIONS).map(([key, config]) => {
                const IconComponent = config.icon
                return (
                  <button
                    key={key}
                    onClick={() => handleUpdateStatus(selectedMember.userId, key)}
                    className={`w-full p-4 rounded-xl flex items-center gap-3 border-2 transition-all ${
                      selectedMember.status === key 
                        ? `${config.bgColor} ${config.borderColor}` 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className={`font-medium ${config.textColor}`}>{config.label}</div>
                    </div>
                    {selectedMember.status === key && (
                      <Check className="w-5 h-5 text-green-500 ml-auto" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
