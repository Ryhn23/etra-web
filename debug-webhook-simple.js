// Simplified debug script to test different payload structures
const https = require('https');

const WEBHOOK_URL = 'https://n8n.nextray.online/webhook/e1d52c48-5940-4120-b059-68c2b202aeef';

const testPayloads = {
  // Current structure (what's being sent now)
  current: {
    messageId: 'test_current_123',
    timestamp: new Date().toISOString(),
    messageType: 'generate-image', // This might be the issue
    commandId: 'generate-image',
    content: '/generate-image',
    userId: 'user123',
    sender: 'user'
  },
  
  // Simplified structure with messageType as 'command'
  simplified: {
    messageId: 'test_simple_123',
    timestamp: new Date().toISOString(),
    messageType: 'command', // Fixed to 'command'
    commandId: 'generate-image',
    content: '/generate-image',
    userId: 'user123',
    sender: 'user'
  },
  
  // Structure matching test-webhook.json but with command
  standard: {
    messageId: 'test_standard_123',
    timestamp: new Date().toISOString(),
    messageType: 'text', // Like test-webhook.json
    command: 'generate-image', // Using 'command' field instead
    content: '/generate-image',
    userId: 'user123',
    sender: 'user'
  },
  
  // Structure with command in metadata
  metadata: {
    messageId: 'test_metadata_123',
    timestamp: new Date().toISOString(),
    messageType: 'text',
    content: '/generate-image',
    userId: 'user123',
    sender: 'user',
    metadata: {
      commandId: 'generate-image'
    }
  }
};

function testWebhook(payloadName) {
  const payload = testPayloads[payloadName];
  if (!payload) {
    console.error(`Unknown payload: ${payloadName}`);
    return;
  }

  console.log(`\n=== Testing ${payloadName} payload ===`);
  console.log('Payload:');
  console.log(JSON.stringify(payload, null, 2));

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
    console.log(`Status: ${res.statusCode}`);
    
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      console.log('Response:', responseData || '(empty)');
      console.log(`=== ${payloadName} test completed ===\n`);
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error.message);
  });

  req.write(data);
  req.end();
}

console.log('Testing different payload structures to identify the issue...');

// Test each payload structure
setTimeout(() => testWebhook('current'), 1000);
setTimeout(() => testWebhook('simplified'), 3000);
setTimeout(() => testWebhook('standard'), 5000);
setTimeout(() => testWebhook('metadata'), 7000);