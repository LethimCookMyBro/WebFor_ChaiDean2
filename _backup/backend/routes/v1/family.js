const express = require('express');
const router = express.Router();
const familyService = require('../../services/familyService');
const { validateCoordinates } = require('../../middleware/security');

/**
 * POST /api/v1/family/register
 * Create or join a family group
 */
router.post('/register', (req, res) => {
  try {
    const { groupName, userId } = req.body;
    
    if (!groupName || !userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'กรุณาระบุชื่อกลุ่มและ user ID'
      });
    }
    
    const group = familyService.createFamilyGroup(userId, groupName);
    
    res.status(201).json({
      success: true,
      message: 'สร้างกลุ่มครอบครัวสำเร็จ',
      group
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/family/members
 * Get all family members
 */
router.get('/members', (req, res) => {
  try {
    const groupId = req.query.groupId || req.headers['x-group-id'];
    
    if (!groupId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'กรุณาระบุ group ID'
      });
    }
    
    const members = familyService.getFamilyStatus(groupId);
    
    res.json({
      success: true,
      members,
      count: members.length
    });
  } catch (error) {
    res.status(404).json({
      error: 'Not Found',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/family/status
 * Get family status overview
 */
router.get('/status', (req, res) => {
  try {
    const groupId = req.query.groupId || req.headers['x-group-id'];
    
    if (!groupId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'กรุณาระบุ group ID'
      });
    }
    
    const members = familyService.getFamilyStatus(groupId);
    const riskStats = familyService.calculateFamilyRisk(groupId);
    
    res.json({
      success: true,
      members: members.map(m => ({
        userId: m.userId,
        role: m.role,
        status: m.status,
        lastUpdated: m.lastUpdated,
        statusText: getStatusText(m.status)
      })),
      stats: riskStats
    });
  } catch (error) {
    res.status(404).json({
      error: 'Not Found',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/family/sos
 * Send SOS alert to family
 */
router.post('/sos', async (req, res) => {
  try {
    const userId = req.body.userId || req.headers['x-user-id'];
    const { lat, lon, message, alertType } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'กรุณาระบุ user ID'
      });
    }
    
    // Validate coordinates if provided
    if (lat !== undefined || lon !== undefined) {
      const coordErrors = validateCoordinates(lat, lon);
      if (coordErrors.length > 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: coordErrors.join(', ')
        });
      }
    }
    
    const location = (lat && lon) ? { lat: parseFloat(lat), lon: parseFloat(lon) } : null;
    
    const result = await familyService.sendSOSAlert(userId, location, message);
    
    res.json({
      success: true,
      message: '🆘 ส่งสัญญาณฉุกเฉินแล้ว',
      alert: result.alert,
      notificationsSent: result.notificationsSent,
      locationLink: location ? familyService.generateLocationLink(location.lat, location.lon) : null
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/family/update-status
 * Update own status
 */
router.post('/update-status', (req, res) => {
  try {
    const userId = req.body.userId || req.headers['x-user-id'];
    const { status, lat, lon } = req.body;
    
    if (!userId || !status) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'กรุณาระบุ user ID และ status'
      });
    }
    
    const location = (lat && lon) ? { lat: parseFloat(lat), lon: parseFloat(lon) } : null;
    
    const result = familyService.updateUserStatus(userId, status, location);
    
    res.json({
      success: true,
      message: 'อัปเดตสถานะสำเร็จ',
      status: result
    });
  } catch (error) {
    res.status(400).json({
      error: 'Bad Request',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/family/alerts
 * Get alert history
 */
router.get('/alerts', (req, res) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'];
    const limit = parseInt(req.query.limit) || 10;
    
    if (!userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'กรุณาระบุ user ID'
      });
    }
    
    const alerts = familyService.getAlertHistory(userId, limit);
    
    res.json({
      success: true,
      alerts,
      count: alerts.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * Helper: Get Thai status text
 */
function getStatusText(status) {
  const texts = {
    safe: 'ปลอดภัย',
    danger: 'ต้องการความช่วยเหลือ',
    unknown: 'ไม่ทราบสถานะ',
    evacuating: 'กำลังอพยพ'
  };
  return texts[status] || status;
}

module.exports = router;
