/**
 * Send Alert Service
 * 
 * Main entry point for sending alerts via configured notification channels.
 * Connects to the notificationService for multi-channel delivery.
 */

const { sendMultiChannelAlert, sendLineNotify, sendSMS, sendPushNotification, sendEmail } = require('./services/notificationService');

/**
 * Send alert to user(s)
 * 
 * @param {Object} options - Alert options
 * @param {string} options.type - Alert type: 'high_danger', 'family_sos', 'status_update', 'evacuation'
 * @param {string} options.recipient - Recipient user ID or 'all'
 * @param {Object} options.data - Alert data (location, message, etc.)
 * @returns {Object} Result of send operation
 */
async function sendAlert(options) {
  const { type, recipient, data } = options;
  
  console.log(`[ALERT] Sending ${type} alert to ${recipient}`);
  console.log(`[ALERT] Data:`, JSON.stringify(data, null, 2));
  
  try {
    switch (type) {
      case 'high_danger':
        // High danger zone alert - send to all configured channels
        return await sendHighDangerAlert(recipient, data);
        
      case 'family_sos':
        // Family SOS - urgent alert to family members
        return await sendFamilySOSAlert(recipient, data);
        
      case 'status_update':
        // Status update notification
        return await sendStatusUpdate(recipient, data);
        
      case 'evacuation':
        // Evacuation notice
        return await sendEvacuationAlert(recipient, data);
        
      default:
        console.log(`[ALERT] Unknown alert type: ${type}`);
        return { success: false, reason: 'unknown_type' };
    }
  } catch (error) {
    console.error(`[ALERT] Error sending alert:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * High danger zone alert
 */
async function sendHighDangerAlert(recipient, data) {
  const message = `⚠️ คำเตือน: คุณอยู่ในเขตอันตราย!\n📍 ระยะจากชายแดน: ${data.distance || 'ไม่ทราบ'} กม.\n🎯 ระดับความเสี่ยง: ${data.riskLevel || 'สูง'}\n\n${data.recommendation || 'กรุณาเตรียมพร้อมอพยพตามคำแนะนำของเจ้าหน้าที่'}`;
  
  // Use LINE Notify for high danger alerts
  const result = await sendLineNotify(message);
  
  return {
    alertType: 'high_danger',
    sent: result.success,
    timestamp: new Date()
  };
}

/**
 * Family SOS alert
 */
async function sendFamilySOSAlert(recipient, data) {
  const alertData = {
    location: data.location,
    message: data.message || 'ครอบครัวต้องการความช่วยเหลือ!',
    phoneNumber: data.phoneNumber,
    deviceToken: data.deviceToken,
    email: data.email
  };
  
  const result = await sendMultiChannelAlert(recipient, alertData);
  
  return {
    alertType: 'family_sos',
    sent: result.sent,
    channels: result.results,
    timestamp: result.timestamp
  };
}

/**
 * Status update notification
 */
async function sendStatusUpdate(recipient, data) {
  const message = `📢 อัปเดตสถานะครอบครัว\n👤 ${data.memberName || 'สมาชิก'}: ${getStatusText(data.status)}\n⏰ ${new Date().toLocaleString('th-TH')}`;
  
  // Use LINE Notify for status updates
  const result = await sendLineNotify(message);
  
  return {
    alertType: 'status_update',
    sent: result.success,
    timestamp: new Date()
  };
}

/**
 * Evacuation alert
 */
async function sendEvacuationAlert(recipient, data) {
  const message = `🚨 แจ้งเตือนอพยพ 🚨\n📍 พื้นที่: ${data.area || 'ไม่ระบุ'}\n🚗 เส้นทาง: ${data.route || 'ตามป้ายบอกทาง'}\n⏰ เวลา: ทันที\n\n${data.instructions || 'กรุณาอพยพตามคำสั่งเจ้าหน้าที่'}`;
  
  // Send to all channels for evacuation alerts
  const lineResult = await sendLineNotify(message);
  
  return {
    alertType: 'evacuation',
    sent: lineResult.success,
    timestamp: new Date()
  };
}

/**
 * Helper: Get Thai status text
 */
function getStatusText(status) {
  const texts = {
    safe: 'ปลอดภัย ✅',
    danger: 'ต้องการความช่วยเหลือ 🆘',
    unknown: 'ไม่ทราบสถานะ ❓',
    evacuating: 'กำลังอพยพ 🏃'
  };
  return texts[status] || status;
}

module.exports = { sendAlert };
