/**
 * Geolocation Service
 * 
 * Utilities for getting and managing user location
 */

// ข้อมูลจังหวัดชายแดน
export const BORDER_PROVINCES = {
  'บุรีรัมย์': { lat: 14.9951, lng: 103.1029, borderLat: 14.2, borderLng: 103.1 },
  'สุรินทร์': { lat: 14.8825, lng: 103.4939, borderLat: 14.1, borderLng: 103.5 },
  'ศรีสะเกษ': { lat: 15.1186, lng: 104.3224, borderLat: 14.3, borderLng: 104.3 },
  'อุบลราชธานี': { lat: 15.2286, lng: 104.8564, borderLat: 14.4, borderLng: 105.0 },
  'สระแก้ว': { lat: 13.824, lng: 102.0645, borderLat: 13.5, borderLng: 102.5 },
  'จันทบุรี': { lat: 12.6114, lng: 102.1039, borderLat: 12.4, borderLng: 102.4 },
  'ตราด': { lat: 12.2428, lng: 102.5177, borderLat: 11.8, borderLng: 102.8 },
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Get current GPS position
 * @returns Promise with location object
 */
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }
    
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      ...options,
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        })
      },
      (error) => {
        console.error('Geolocation error:', error)
        reject(error)
      },
      defaultOptions
    )
  })
}

/**
 * Find the nearest border point from user's location
 * @returns Object with distance and nearest province
 */
export function findNearestBorder(lat, lon) {
  let minDistance = Infinity
  let nearestProvince = null
  
  Object.entries(BORDER_PROVINCES).forEach(([name, province]) => {
    const dist = calculateDistance(lat, lon, province.borderLat, province.borderLng)
    if (dist < minDistance) {
      minDistance = dist
      nearestProvince = name
    }
  })
  
  return {
    distance: Math.round(minDistance),
    province: nearestProvince,
  }
}

/**
 * Get risk level based on distance from border
 */
export function getRiskLevel(distance) {
  if (distance <= 20) return { level: 'CRITICAL', color: '#dc2626', text: 'อันตรายสูงสุด', textEn: 'Critical' }
  if (distance <= 52) return { level: 'HIGH', color: '#ea580c', text: 'อันตรายสูง', textEn: 'High' }
  if (distance <= 130) return { level: 'MODERATE', color: '#f59e0b', text: 'เสี่ยงปานกลาง', textEn: 'Moderate' }
  if (distance <= 160) return { level: 'LOW', color: '#84cc16', text: 'เสี่ยงต่ำ', textEn: 'Low' }
  return { level: 'SAFE', color: '#22c55e', text: 'ปลอดภัย', textEn: 'Safe' }
}

/**
 * Check if location is within monitored provinces
 */
export function isInMonitoredArea(lat, lon) {
  // Rough bounding box for Thai-Cambodia border region
  return lat >= 11 && lat <= 16 && lon >= 102 && lon <= 106
}

/**
 * Create Google Maps link
 */
export function createMapsLink(lat, lon) {
  return `https://www.google.com/maps?q=${lat},${lon}`
}

export default {
  BORDER_PROVINCES,
  calculateDistance,
  getCurrentPosition,
  findNearestBorder,
  getRiskLevel,
  isInMonitoredArea,
  createMapsLink,
}
