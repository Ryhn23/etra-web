// Test script to verify commandId is properly included in metadata
const https = require('https');

const WEBHOOK_URL = 'https://n8n.nextray.online/webhook/e1d52c48-5940-4120-b059-68c2b202aeef';

// Test the new simplified payload structure
const testPayload = {
  messageId: 'test_command_fix_123',
  timestamp: new Date().toISOString(),
  messageType: 'text', // Always use 'text' for compatibility
  content: '/generate-image',
  userId: 'user123',
  sender: 'user',
  metadata: {
    commandId: 'generate-image', // Command ID in metadata
    userAgent: 'Test Script',
    sessionId: 'test_session_123',
    platform: 'test',
    language: 'en-US',
    timezone: 'UTC',
    hasImageAttachment: false,
    attachmentCount: 0
  }
};

console.log('Testing simplified command payload structure...');
console.log('Payload:');
console.log(JSON.stringify(testPayload, null, 2));

const data = JSON.stringify(testPayload);
const url = new URL(WEBHOOK_URL);

const options = {
  hostname: url.hostname,
  port: 443,
  path: url.pathname + url.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('Response:', responseData || '(empty)');
    console.log('Test completed');
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.write(data);
req.end();