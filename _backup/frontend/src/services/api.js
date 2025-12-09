/**
 * API Service
 * 
 * Centralized API calls for the Border Safety application
 */

const API_BASE = '/api/v1'

// Default options for fetch
const defaultOptions = {
  headers: {
    'Content-Type': 'application/json',
  },
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...defaultOptions,
      ...options,
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || 'API request failed')
    }
    
    return data
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error)
    throw error
  }
}

// ============================================
// Location API
// ============================================

export async function checkLocation(lat, lon) {
  return fetchAPI('/locate', {
    method: 'POST',
    body: JSON.stringify({ lat, lon }),
  })
}

export async function checkLocationByIP(ip) {
  return fetchAPI('/locate', {
    method: 'POST',
    body: JSON.stringify({ ip }),
  })
}

export async function getStatus() {
  return fetchAPI('/status')
}

// ============================================
// Family API
// ============================================

export async function registerFamily(groupName, userId) {
  return fetchAPI('/family/register', {
    method: 'POST',
    body: JSON.stringify({ groupName, userId }),
  })
}

export async function getFamilyMembers(groupId) {
  return fetchAPI(`/family/members?groupId=${groupId}`)
}

export async function getFamilyStatus(groupId) {
  return fetchAPI(`/family/status?groupId=${groupId}`)
}

export async function sendSOS(userId, lat, lon, message) {
  return fetchAPI('/family/sos', {
    method: 'POST',
    body: JSON.stringify({ 
      userId, 
      lat, 
      lon, 
      message,
      alertType: 'emergency' 
    }),
  })
}

export async function updateUserStatus(userId, status, lat, lon) {
  return fetchAPI('/family/update-status', {
    method: 'POST',
    body: JSON.stringify({ userId, status, lat, lon }),
  })
}

export async function getAlertHistory(userId, limit = 10) {
  return fetchAPI(`/family/alerts?userId=${userId}&limit=${limit}`)
}

// ============================================
// Health Check
// ============================================

export async function healthCheck() {
  try {
    const response = await fetch('/api/health')
    return response.ok
  } catch {
    return false
  }
}

export default {
  checkLocation,
  checkLocationByIP,
  getStatus,
  registerFamily,
  getFamilyMembers,
  getFamilyStatus,
  sendSOS,
  updateUserStatus,
  getAlertHistory,
  healthCheck,
}
