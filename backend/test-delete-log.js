const http = require('http');

// Test deleting log ID 27 (or just try to delete a hypothetical log)
const logId = 27;

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: `/api/v1/admin/logs/${logId}`,
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json'
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
  });
});

req.end();
