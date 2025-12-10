const http = require('http');

const data = JSON.stringify({ level: 'RED' });

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/v1/status/threat-level',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
  });
});

req.write(data);
req.end();
