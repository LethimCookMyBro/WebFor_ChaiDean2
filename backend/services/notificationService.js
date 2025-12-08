/**
 * Notification Service
 * 
 * Handles sending notifications via multiple channels:
 * - LINE Notify
 * - SMS (Twilio)
 * - Push Notification (FCM)
 * - Email (SendGrid)
 * 
 * Note: All integrations use stubs by default. 
 * Replace with actual API calls in production.
 */

const axios = require('axios').default || require('axios');

// ============================================
// LINE Notify
// ============================================

async function sendLineNotify(message, token = process.env.LINE_NOTIFY_TOKEN) {
  if (!token) {
    console.log('[LINE] Token not configured, skipping');
    return { success: false, reason: 'no_token' };
  }

  try {
    // In production, uncomment this:
    // const response = await axios.post('https://notify-api.line.me/api/notify',
    //   `message=${encodeURIComponent(message)}`,
    //   {
    //     headers: {
    //       'Content-Type': 'application/x-www-form-urlencoded',
    //       'Authorization': `Bearer ${token}`
    //     }
    //   }
    // );
    // return { success: true, response: response.data };

    // Stub implementation
    console.log(`[LINE NOTIFY] Would send: ${message.substring(0, 50)}...`);
    return { success: true, stub: true };
  } catch (error) {
    console.error('[LINE] Error:', error.message);
    return { success: false, error: error.message };
  }
}

// ============================================
// Twilio SMS
// ============================================

async function sendSMS(phoneNumber, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log('[SMS] Twilio not configured, skipping');
    return { success: false, reason: 'not_configured' };
  }

  try {
    // In production, uncomment this:
    // const client = require('twilio')(accountSid, authToken);
    // const sms = await client.messages.create({
    //   body: message,
    //   from: fromNumber,
    //   to: phoneNumber
    // });
    // return { success: true, sid: sms.sid };

    // Stub implementation
    console.log(`[SMS] Would send to ${phoneNumber}: ${message.substring(0, 30)}...`);
    return { success: true, stub: true };
  } catch (error) {
    console.error('[SMS] Error:', error.message);
    return { success: false, error: error.message };
  }
}

// ============================================
// Firebase Cloud Messaging
// ============================================

async function sendPushNotification(deviceToken, title, body, data = {}) {
  const serverKey = process.env.FCM_SERVER_KEY;

  if (!serverKey) {
    console.log('[FCM] Server key not configured, skipping');
    return { success: false, reason: 'not_configured' };
  }

  try {
    // In production, uncomment this:
    // const response = await axios.post('https://fcm.googleapis.com/fcm/send',
    //   {
    //     to: deviceToken,
    //     notification: { title, body },
    //     data
    //   },
    //   {
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'Authorization': `key=${serverKey}`
    //     }
    //   }
    // );
    // return { success: true, response: response.data };

    // Stub implementation
    console.log(`[FCM] Would send push: "${title}" to ${deviceToken.substring(0, 20)}...`);
    return { success: true, stub: true };
  } catch (error) {
    console.error('[FCM] Error:', error.message);
    return { success: false, error: error.message };
  }
}

// ============================================
// SendGrid Email
// ============================================

async function sendEmail(to, subject, htmlContent) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@bordersafety.local';

  if (!apiKey) {
    console.log('[EMAIL] SendGrid not configured, skipping');
    return { success: false, reason: 'not_configured' };
  }

  try {
    // In production, uncomment this:
    // const response = await axios.post('https://api.sendgrid.com/v3/mail/send',
    //   {
    //     personalizations: [{ to: [{ email: to }] }],
    //     from: { email: fromEmail },
    //     subject,
    //     content: [{ type: 'text/html', value: htmlContent }]
    //   },
    //   {
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'Authorization': `Bearer ${apiKey}`
    //     }
    //   }
    // );
    // return { success: true, response: response.status };

    // Stub implementation
    console.log(`[EMAIL] Would send to ${to}: ${subject}`);
    return { success: true, stub: true };
  } catch (error) {
    console.error('[EMAIL] Error:', error.message);
    return { success: false, error: error.message };
  }
}

// ============================================
// Multi-channel Alert
// ============================================

async function sendMultiChannelAlert(userId, alertData) {
  const results = {
    line: null,
    sms: null,
    push: null,
    email: null
  };

  const message = `🆘 SOS Alert จาก ${userId}\n📍 ตำแหน่ง: ${alertData.location?.lat}, ${alertData.location?.lon}\n⏰ เวลา: ${new Date().toLocaleString('th-TH')}\n💬 ${alertData.message || 'ต้องการความช่วยเหลือ!'}`;

  // Send to all configured channels in parallel
  const promises = [];

  // LINE Notify
  if (process.env.LINE_NOTIFY_TOKEN) {
    promises.push(
      sendLineNotify(message).then(r => { results.line = r; })
    );
  }

  // SMS (if phone number provided)
  if (alertData.phoneNumber) {
    promises.push(
      sendSMS(alertData.phoneNumber, message.substring(0, 160)).then(r => { results.sms = r; })
    );
  }

  // Push notification
  if (alertData.deviceToken) {
    promises.push(
      sendPushNotification(
        alertData.deviceToken,
        '🆘 SOS Alert',
        alertData.message || 'ครอบครัวต้องการความช่วยเหลือ!',
        { location: alertData.location }
      ).then(r => { results.push = r; })
    );
  }

  // Email
  if (alertData.email) {
    const html = `
      <h1>🆘 SOS Alert</h1>
      <p><strong>จาก:</strong> ${userId}</p>
      <p><strong>ตำแหน่ง:</strong> <a href="https://maps.google.com/?q=${alertData.location?.lat},${alertData.location?.lon}">เปิดใน Google Maps</a></p>
      <p><strong>เวลา:</strong> ${new Date().toLocaleString('th-TH')}</p>
      <p><strong>ข้อความ:</strong> ${alertData.message || 'ต้องการความช่วยเหลือ!'}</p>
    `;
    promises.push(
      sendEmail(alertData.email, '🆘 SOS Alert - Border Safety', html).then(r => { results.email = r; })
    );
  }

  await Promise.allSettled(promises);

  return {
    sent: true,
    results,
    timestamp: new Date()
  };
}

module.exports = {
  sendLineNotify,
  sendSMS,
  sendPushNotification,
  sendEmail,
  sendMultiChannelAlert
};
