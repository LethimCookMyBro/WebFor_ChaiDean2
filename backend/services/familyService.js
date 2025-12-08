/**
 * Family Service
 * 
 * Manages family groups, member status, and SOS alerts
 * Note: This uses in-memory storage for demo. For production, use a database.
 */

const { sendAlert } = require('../sendAlert');

// In-memory storage (replace with database in production)
const familyGroups = new Map();
const userStatuses = new Map();
const alertHistory = [];

// Status types
const STATUS_TYPES = {
  SAFE: 'safe',
  DANGER: 'danger',
  UNKNOWN: 'unknown',
  EVACUATING: 'evacuating'
};

// Alert types
const ALERT_TYPES = {
  EMERGENCY: 'emergency',
  DANGER: 'danger',
  SAFE: 'safe',
  CHECK_IN: 'check_in'
};

/**
 * Create a new family group
 */
function createFamilyGroup(creatorId, groupName) {
  const groupId = `family_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const group = {
    id: groupId,
    name: groupName,
    createdBy: creatorId,
    members: [{ userId: creatorId, role: 'admin', joinedAt: new Date() }],
    createdAt: new Date()
  };
  
  familyGroups.set(groupId, group);
  
  return group;
}

/**
 * Add member to family group
 */
function addFamilyMember(groupId, userId, role = 'member') {
  const group = familyGroups.get(groupId);
  if (!group) {
    throw new Error('Family group not found');
  }
  
  // Check if already a member
  if (group.members.find(m => m.userId === userId)) {
    throw new Error('User is already a member');
  }
  
  group.members.push({
    userId,
    role,
    joinedAt: new Date()
  });
  
  return group;
}

/**
 * Get family members with their status
 */
function getFamilyStatus(groupId) {
  const group = familyGroups.get(groupId);
  if (!group) {
    throw new Error('Family group not found');
  }
  
  return group.members.map(member => {
    const status = userStatuses.get(member.userId) || {
      status: STATUS_TYPES.UNKNOWN,
      lastUpdated: null
    };
    
    return {
      userId: member.userId,
      role: member.role,
      ...status
    };
  });
}

/**
 * Update user status
 */
function updateUserStatus(userId, status, location = null) {
  if (!Object.values(STATUS_TYPES).includes(status)) {
    throw new Error('Invalid status type');
  }
  
  const statusRecord = {
    status,
    location,
    lastUpdated: new Date()
  };
  
  userStatuses.set(userId, statusRecord);
  
  return statusRecord;
}

/**
 * Send SOS alert to family members
 */
async function sendSOSAlert(userId, location, message = null) {
  // Find all family groups this user belongs to
  const userGroups = [];
  familyGroups.forEach((group, groupId) => {
    if (group.members.find(m => m.userId === userId)) {
      userGroups.push(group);
    }
  });
  
  // Create alert record
  const alert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    type: ALERT_TYPES.EMERGENCY,
    location,
    message: message || 'SOS - ต้องการความช่วยเหลือ!',
    timestamp: new Date(),
    notifiedGroups: userGroups.map(g => g.id)
  };
  
  alertHistory.push(alert);
  
  // Update user status to danger
  updateUserStatus(userId, STATUS_TYPES.DANGER, location);
  
  // Notify all family members
  const notifications = [];
  for (const group of userGroups) {
    for (const member of group.members) {
      if (member.userId !== userId) {
        notifications.push({
          recipientId: member.userId,
          alert
        });
        
        // Send notification (stub)
        sendAlert({
          type: 'family_sos',
          recipient: member.userId,
          data: alert
        });
      }
    }
  }
  
  return {
    alert,
    notificationsSent: notifications.length
  };
}

/**
 * Get alert history for a user
 */
function getAlertHistory(userId, limit = 10) {
  return alertHistory
    .filter(a => a.userId === userId)
    .slice(-limit)
    .reverse();
}

/**
 * Calculate risk for a family group
 */
function calculateFamilyRisk(groupId) {
  const members = getFamilyStatus(groupId);
  
  const stats = {
    total: members.length,
    safe: 0,
    danger: 0,
    unknown: 0,
    evacuating: 0
  };
  
  members.forEach(m => {
    stats[m.status] = (stats[m.status] || 0) + 1;
  });
  
  // Calculate overall risk level
  let riskLevel = 'low';
  if (stats.danger > 0) {
    riskLevel = 'critical';
  } else if (stats.unknown > stats.safe) {
    riskLevel = 'high';
  } else if (stats.unknown > 0) {
    riskLevel = 'moderate';
  }
  
  return {
    ...stats,
    riskLevel
  };
}

/**
 * Generate shareable location link
 */
function generateLocationLink(lat, lon) {
  return `https://www.google.com/maps?q=${lat},${lon}`;
}

// Initialize demo data
function initDemoData() {
  // Create demo family group
  const demoGroup = createFamilyGroup('user_demo', 'ครอบครัวสมชาย');
  
  // Add demo members
  addFamilyMember(demoGroup.id, 'user_father', 'member');
  addFamilyMember(demoGroup.id, 'user_mother', 'member');
  addFamilyMember(demoGroup.id, 'user_child', 'member');
  
  // Set initial statuses
  updateUserStatus('user_demo', STATUS_TYPES.SAFE, { lat: 14.5, lon: 103.5 });
  updateUserStatus('user_father', STATUS_TYPES.SAFE, { lat: 14.6, lon: 103.4 });
  updateUserStatus('user_mother', STATUS_TYPES.SAFE, { lat: 14.5, lon: 103.5 });
  updateUserStatus('user_child', STATUS_TYPES.UNKNOWN, null);
  
  console.log('📦 Demo family data initialized');
}

// Initialize on module load
initDemoData();

module.exports = {
  createFamilyGroup,
  addFamilyMember,
  getFamilyStatus,
  updateUserStatus,
  sendSOSAlert,
  getAlertHistory,
  calculateFamilyRisk,
  generateLocationLink,
  STATUS_TYPES,
  ALERT_TYPES
};
