const express = require('express');
const axios = require('axios');
const router = express.Router();
const { calculateRisk, ZONES } = require('../../riskCalculator');
const { sendAlert } = require('../../sendAlert');

// Bangkok fallback coordinates
const BANGKOK_FALLBACK = {
  lat: 13.7563,
  lon: 100.5018
};

/**
 * POST /api/v1/locate
 * Accept either {ip} or {lat, lon}
 */
router.post('/', async (req, res) => {
  try {
    const { ip, lat, lon } = req.body;
    let coordinates = { lat: null, lon: null };
    let locationSource = 'unknown';
    let fallbackUsed = false;
    let gpsWarning = null;

    // Case 1: Direct coordinates provided
    if (lat !== undefined && lon !== undefined) {
      coordinates.lat = parseFloat(lat);
      coordinates.lon = parseFloat(lon);
      locationSource = 'gps';
    }
    // Case 2: IP address provided
    else if (ip) {
      try {
        const geoResult = await resolveIpLocation(ip);
        if (geoResult.success) {
          coordinates = geoResult.coordinates;
          locationSource = 'ip';
        } else {
          // Fallback to Bangkok
          coordinates = BANGKOK_FALLBACK;
          locationSource = 'fallback';
          fallbackUsed = true;
          gpsWarning = 'IP geolocation failed. Showing Bangkok. Please enable GPS for accurate results.';
        }
      } catch (error) {
        // Fallback to Bangkok on error
        coordinates = BANGKOK_FALLBACK;
        locationSource = 'fallback';
        fallbackUsed = true;
        gpsWarning = 'IP geolocation service unavailable. Please enable GPS for accurate results.';
      }
    }
    // Case 3: Try to use request IP
    else if (req.clientIp) {
      try {
        const geoResult = await resolveIpLocation(req.clientIp);
        if (geoResult.success) {
          coordinates = geoResult.coordinates;
          locationSource = 'request_ip';
        } else {
          coordinates = BANGKOK_FALLBACK;
          locationSource = 'fallback';
          fallbackUsed = true;
          gpsWarning = 'Could not determine location from IP. Please enable GPS or enter coordinates manually.';
        }
      } catch (error) {
        coordinates = BANGKOK_FALLBACK;
        locationSource = 'fallback';
        fallbackUsed = true;
        gpsWarning = 'Geolocation service unavailable. Please enable GPS or enter coordinates manually.';
      }
    }
    // Case 4: No location info at all
    else {
      coordinates = BANGKOK_FALLBACK;
      locationSource = 'fallback';
      fallbackUsed = true;
      gpsWarning = 'No location provided. Showing Bangkok. Please enable GPS or enter location.';
    }

    // Calculate risk
    const riskResult = calculateRisk(coordinates.lat, coordinates.lon);

    // Send alert for high danger zones (stub)
    if (riskResult.zone === ZONES.HIGH_DANGER) {
      sendAlert({
        type: 'high_danger',
        coordinates,
        timestamp: riskResult.timestamp
      });
    }

    // Return result
    res.json({
      ...riskResult,
      location_source: locationSource,
      fallback_used: fallbackUsed,
      gps_warning: gpsWarning
    });

  } catch (error) {
    console.error('Locate error:', error.message);
    res.status(500).json({
      error: 'Failed to process location',
      zone: ZONES.INVALID_INPUT,
      message: error.message
    });
  }
});

/**
 * Resolve IP address to coordinates using ip-api.com
 * @param {string} ip - IP address
 * @returns {object} - {success: boolean, coordinates: {lat, lon}}
 */
async function resolveIpLocation(ip) {
  try {
    // Skip private/local IPs
    if (isPrivateIP(ip)) {
      return { success: false, coordinates: null, reason: 'Private IP address' };
    }

    // Use HTTPS endpoint for secure communication
    const apiUrl = process.env.IP_GEO_API_URL || 'https://ipapi.co';
    const response = await axios.get(`${apiUrl}/${ip}/json/`, {
      timeout: 5000,
      headers: {
        'User-Agent': 'BorderSafetyApp/2.0'
      }
    });

    // ipapi.co returns different format than ip-api.com
    if (response.data && !response.data.error) {
      return {
        success: true,
        coordinates: {
          lat: response.data.latitude,
          lon: response.data.longitude
        },
        city: response.data.city,
        country: response.data.country_name
      };
    }

    return { success: false, coordinates: null, reason: response.data.reason || 'Unknown error' };
  } catch (error) {
    return { success: false, coordinates: null, reason: error.message };
  }
}

/**
 * Check if IP is private/local
 * @param {string} ip - IP address
 * @returns {boolean}
 */
function isPrivateIP(ip) {
  if (!ip) return true;
  if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') return true;
  if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) return true;
  return false;
}

module.exports = router;
