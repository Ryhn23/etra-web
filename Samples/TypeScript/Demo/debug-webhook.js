// Debug script to test webhook payload structure
const https = require('https');

// Simulate the exact payload structure being sent from the frontend
const testPayloads = {
  generateImage: {
    messageId: 'msg_1735957200000_abc123',
    timestamp: new Date().toISOString(),
    messageType: 'generate-image', // This is what the current code sends
    commandId: 'generate-image',
    content: '/generate-image',
    userId: 'user_1735957200000_xyz789',
    sender: 'user',
    command: 'generate-image',
    tool: 'generate-image',
    attachments: [],
    metadata: {
      commandId: 'generate-image',
      attachments: [],
      activeTool: 'generate-image',
      toolCommand: 'generate-image'
    },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    sessionId: 'session_1735957200000_def456',
    platform: 'web',
    language: 'en-US',
    timezone: 'Asia/Jakarta',
    hasImageAttachment: false,
    attachmentCount: 0
  },
  
  generateAudio: {
    messageId: 'msg_1735957200000_ghi789',
    timestamp: new Date().toISOString(),
    messageType: 'generate-audio',
    commandId: 'generate-audio',
    content: '/generate-audio',
    userId: 'user_1735957200000_xyz789',
    sender: 'user',
    command: 'generate-audio',
    tool: 'generate-audio',
    attachments: [],
    metadata: {
      commandId: 'generate-audio',
      attachments: [],
      activeTool: 'generate-audio',
      toolCommand: 'generate-audio'
    },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    sessionId: 'session_1735957200000_def456',
    platform: 'web',
    language: 'en-US',
    timezone: 'Asia/Jakarta',
    hasImageAttachment: false,
    attachmentCount: 0
  },
  
  editImage: {
    messageId: 'msg_1735957200000_jkl012',
    timestamp: new Date().toISOString(),
    messageType: 'edit-image',
    commandId: 'edit-image',
    content: '/edit-image',
    userId: 'user_1735957200000_xyz789',
    sender: 'user',
    command: 'edit-image',
    tool: 'edit-image',
    attachments: [],
    metadata: {
      commandId: 'edit-image',
      attachments: [],
      activeTool: 'edit-image',
      toolCommand: 'edit-image'
    },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    sessionId: 'session_1735957200000_def456',
    platform: 'web',
    language: 'en-US',
    timezone: 'Asia/Jakarta',
    hasImageAttachment: false,
    attachmentCount: 0
  }
};

// Webhook URL from the config
const WEBHOOK_URL = 'https://n8n.nextray.online/webhook/e1d52c48-5940-4120-b059-68c2b202aeef';

function testWebhook(command) {
  const payload = testPayloads[command];
  if (!payload) {
    console.error(`Unknown command: ${command}`);
    return;
  }

  console.log(`\n=== Testing ${command} command ===`);
  console.log('Payload being sent:');
  console.log(JSON.stringify(payload, null, 2));
  console.log(`\nWebhook URL: ${WEBHOOK_URL}`);

  const data = JSON.stringify(payload);
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
    console.log(`\nResponse Status: ${res.statusCode}`);
    console.log('Response Headers:', res.headers);

    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      console.log('Response Body:', responseData);
      console.log(`=== ${command} test completed ===\n`);
    });
  });

  req.on('error', (error) => {
    console.error('Request error:', error.message);
  });

  req.write(data);
  req.end();
}

// Test all commands
console.log('Starting webhook debug tests...');
console.log('Testing the exact payload structure being sent from the frontend');

// Test each command with a delay between them
setTimeout(() => testWebhook('generateImage'), 1000);
setTimeout(() => testWebhook('generateAudio'), 3000);
setTimeout(() => testWebhook('editImage'), 5000);